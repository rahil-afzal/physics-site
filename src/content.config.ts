import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One collection for everything under content/. Course/topic/lecture relationships come
// from the directory path, not from frontmatter, so nothing is duplicated or registered.
const content = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './content' }),
  schema: z
    .object({
      type: z.enum(['course', 'resource', 'topic', 'lecture', 'lab', 'problem']),
      title: z.string(),
      description: z.string().optional(),
      course_code: z.string().optional(),
      audience: z.string().optional(),
      term: z.string().optional(),
      instructor: z.string().optional(),
      status: z.enum(['planned', 'developing', 'taught', 'archived']).optional(),
      order: z.number().optional(),
      visibility: z.enum(['public', 'hidden']).default('public'),
      official_scope: z.array(z.string()).optional(),
      teaching_scope: z.array(z.string()).optional(),
      lecture: z.union([z.string(), z.number()]).optional(),
      prerequisites: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    })
    .passthrough(), // extra schema fields (course:, topic:, resource:) are allowed
});

export const collections = { content };
