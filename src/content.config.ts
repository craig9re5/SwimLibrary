import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const entrySegments = (entry: string) => entry.replaceAll("\\", "/").split("/");
const withoutExtension = (filename: string) => filename.replace(/\.[^.]+$/, "");

const channel = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((index) =>
    channel(parseInt(hex.slice(index, index + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// 封面墨色只有奶白 #fff8e9 与深墨 #251e15 两种：
// L ≤ 0.1706 时奶白达标，L ≥ 0.2369 时深墨达标，中间是两者都不达标的死区。
const inkContrastIsSafe = (hex: string) => {
  const luminance = relativeLuminance(hex);
  return !(luminance > 0.1706 && luminance < 0.2369);
};

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
    rights: z.string().min(1),
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
