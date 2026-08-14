import type { APIRoute } from "astro";
import { getAllBooks, getChaptersByBookSlug, getChapterSlug } from "../lib/library";
import { cleanMarkdown, calculateReadingStats } from "../lib/wordCount";

export interface SearchIndexItem {
  id: string;
  bookSlug: string;
  bookTitle: string;
  bookAuthor: string;
  bookAccent: string;
  chapterSlug: string;
  chapterTitle: string;
  chapterOrder: number;
  excerpt: string;
  plainText: string;
  wordCount: number;
  readingTimeMinutes: number;
}

export const GET: APIRoute = async () => {
  const books = await getAllBooks();
  const searchItems: SearchIndexItem[] = [];

  for (const book of books) {
    const chapters = await getChaptersByBookSlug(book.data.slug);

    for (const chapter of chapters) {
      const chapterSlug = getChapterSlug(chapter);
      const rawBody = chapter.body || "";
      const plainText = cleanMarkdown(rawBody);
      const stats = calculateReadingStats(rawBody);

      searchItems.push({
        id: `${book.data.slug}/${chapterSlug}`,
        bookSlug: book.data.slug,
        bookTitle: book.data.title,
        bookAuthor: book.data.author,
        bookAccent: book.data.accent,
        chapterSlug,
        chapterTitle: chapter.data.title,
        chapterOrder: chapter.data.order,
        excerpt: chapter.data.excerpt || plainText.slice(0, 120),
        // Keep a reasonable searchable length per chapter
        plainText: plainText,
        wordCount: stats.totalCount,
        readingTimeMinutes: stats.readingTimeMinutes,
      });
    }
  }

  return new Response(JSON.stringify(searchItems), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
