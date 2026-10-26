import { getCollection, type CollectionEntry } from 'astro:content';

type E = CollectionEntry<'content'>;
export interface Lecture { slug: string; title: string; href: string; entry: E }
export interface Topic { slug: string; title: string; href: string; entry?: E; lectures: Lecture[] }
export type Section = 'syllabus' | 'schedule' | 'problems' | 'assignments' | 'resources' | 'announcements';
export const SECTIONS: { key: Section; label: string }[] = [
  { key: 'syllabus', label: 'Syllabus' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'problems', label: 'Practice problems' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'resources', label: 'Resources' },
  { key: 'announcements', label: 'Announcements' },
];
export interface Root {
  kind: string; slug: string; href: string; entry: E; topics: Topic[];
  sections: Partial<Record<Section, E>>; announcements: E[];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (p: string) => (/^(https?:|#|mailto:)/.test(p) ? p : base + p);

const seg = (e: E) => e.id.split('/');
const pretty = (s: string) => s.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const num = (e: E) => e.data.order ?? (e.data.lecture !== undefined ? Number(e.data.lecture) : 999);
const cmp = (a: { n: number; s: string }, b: { n: number; s: string }) =>
  a.n - b.n || a.s.localeCompare(b.s, undefined, { numeric: true });

/**
 * Layout convention (everything is discovered, nothing is registered):
 *   content/<courses|resources>/<slug>/{course|resource}.md
 *   content/<kind>/<slug>/topics/<topic>/topic.md            (optional)
 *   content/<kind>/<slug>/topics/<topic>/<lecture>/notes.mdx
 */
export async function getTree(): Promise<Root[]> {
  const all = (await getCollection('content')).filter((e) => e.data.visibility !== 'hidden');
  const roots = all
    .filter((e) => e.data.type === 'course' || e.data.type === 'resource')
    .map((entry) => {
      const [kind, slug] = seg(entry);
      return { kind, slug, href: `/${kind}/${slug}/`, entry, topics: [] as Topic[], sections: {} as Root['sections'], announcements: [] as E[] };
    })
    .sort((a, b) => cmp({ n: num(a.entry), s: a.slug }, { n: num(b.entry), s: b.slug }));

  for (const r of roots) {
    const prefix = `${r.kind}/${r.slug}/`;
    for (const e of all) {
      if (!e.id.startsWith(prefix)) continue;
      const parts = seg(e);
      if (e.data.type === 'page' && parts.length === 3) {
        const key = (e.data as { section?: string }).section as Section | undefined;
        if (key && SECTIONS.some((s) => s.key === key)) r.sections[key] = e;
      }
      if (e.data.type === 'announcement' && parts[2] === 'announcements') r.announcements.push(e);
    }
    r.announcements.sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
    const inRoot = all.filter((e) => e.id.startsWith(`${r.kind}/${r.slug}/topics/`));
    const topicSlugs = [...new Set(inRoot.map((e) => seg(e)[3]))];
    r.topics = topicSlugs
      .map((ts) => {
        const entry = inRoot.find((e) => e.data.type === 'topic' && seg(e)[3] === ts);
        const href = `/${r.kind}/${r.slug}/${ts}/`;
        const lectures = inRoot
          .filter((e) => e.data.type === 'lecture' && seg(e)[3] === ts)
          .sort((a, b) => cmp({ n: num(a), s: seg(a)[4] }, { n: num(b), s: seg(b)[4] }))
          .map((e) => ({ slug: seg(e)[4], title: e.data.title, href: `${href}${seg(e)[4]}/`, entry: e }));
        return { slug: ts, title: entry?.data.title ?? pretty(ts), href, entry, lectures };
      })
      .sort((a, b) => cmp({ n: a.entry ? num(a.entry) : 999, s: a.slug }, { n: b.entry ? num(b.entry) : 999, s: b.slug }));
  }
  return roots;
}

export const classesLabel = (range?: string) =>
  range ? (/[–-]/.test(range) ? `Classes ${range}` : `Class ${range}`) : 'not scheduled';

export interface ClassItem {
  n: number; unit: string; phase: string; title: string; note?: string;
  pages: { label: string; href: string }[]; unitTopic: Topic;
}

/** Class-by-class plan, read from the schedule page's `class_plan` front matter. */
export function getClassPlan(root: Root): ClassItem[] {
  const raw = ((root.sections.schedule?.data as { class_plan?: any[] } | undefined)?.class_plan ?? []) as any[];
  return raw.map((c) => {
    const unitTopic: Topic =
      root.topics.find((t) => (t.entry?.data as { unit?: string } | undefined)?.unit === c.unit) ??
      { slug: '', title: String(c.unit), href: root.href, lectures: [] };
    const pages = (c.pages ?? []).map((p: { label: string; to: string }) => {
      const [path, hash] = String(p.to).split('#');
      return { label: p.label, href: `${root.href}${path}/${hash ? `#${hash}` : ''}` };
    });
    return { n: c.n, unit: c.unit, phase: c.phase, title: c.title, note: c.note, pages, unitTopic };
  });
}
