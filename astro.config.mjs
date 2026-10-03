import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// GitHub Pages: site/base are derived from the repo name in CI (GITHUB_REPOSITORY).
// Override anywhere with SITE_URL / SITE_BASE (e.g. for a custom domain: SITE_BASE=/).
const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const userSite = repo?.endsWith('.github.io');

export default defineConfig({
  site: process.env.SITE_URL ?? (owner ? `https://${owner}.github.io` : undefined),
  base: process.env.SITE_BASE ?? (repo && !userSite ? `/${repo}` : '/'),
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { throwOnError: true }]], // bad LaTeX fails the build
  },
});
