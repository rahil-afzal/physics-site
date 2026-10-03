import { getCollection, type CollectionEntry } from 'astro:content';

type E = CollectionEntry<'content'>;
export interface Lecture { slug: string; title: string; href: string; entry: E }
export interface Topic { slug: string; title: string; href: string; entry?: E; lectures: Lecture[] }
export interface Root { kind: string; slug: string; href: string; entry: E; topics: Topic[] }

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
      return { kind, slug, href: `/${kind}/${slug}/`, entry, topics: [] as Topic[] };
    })
    .sort((a, b) => cmp({ n: num(a.entry), s: a.slug }, { n: num(b.entry), s: b.slug }));

  for (const r of roots) {
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
