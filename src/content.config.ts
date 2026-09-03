import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { inkContrastIsSafe } from "./lib/color";

const entrySegments = (entry: string) => entry.replaceAll("\\", "/").split("/");
const withoutExtension = (filename: string) => filename.replace(/\.[^.]+$/, "");

const books = defineCollection({
  loader: glob({
    base: "./src/content/books",
    pattern: "*/index.md",
    generateId: ({ entry }) => entrySegments(entry)[0],
  }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    author: z.string().min(1),
    summary: z.string().min(1),
    category: z.enum(["政治评论", "文学小说", "散文随笔"]),
    tags: z.array(z.string().min(1)).min(1),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    featured: z.boolean().default(false),
    accent: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .refine(inkContrastIsSafe, {
        message:
          "accent 的相对亮度须 ≤0.17（配奶白墨 #fff8e9）或 ≥0.24（配深墨 #251e15）；介于两者之间时两种墨色都达不到 4.5:1",
      }),
    coverLabel: z.string().min(1),
  }),
});

const chapters = defineCollection({
  loader: glob({
    base: "./src/content/books",
    pattern: "*/chapters/*.md",
    generateId: ({ entry }) => {
      const segments = entrySegments(entry);
      const filename = segments.at(-1) ?? "chapter";
      return `${segments[0]}/${withoutExtension(filename)}`;
    },
  }),
  schema: z.object({
    title: z.string().min(1),
    book: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    order: z.number().int().positive(),
    excerpt: z.string().min(1).optional(),
  }),
});

export const collections = { books, chapters };
