import {
  getCollection,
  getEntry,
  type CollectionEntry,
} from "astro:content";
import { calculateReadingStats } from "./wordCount";

export type BookEntry = CollectionEntry<"books">;
export type ChapterEntry = CollectionEntry<"chapters">;

export interface BookWithChapters {
  book: BookEntry;
  chapters: ChapterEntry[];
}

export interface AdjacentChapters {
  previous: ChapterEntry | undefined;
  next: ChapterEntry | undefined;
}

const compareBooksByUpdated = (a: BookEntry, b: BookEntry) =>
  b.data.updated.getTime() - a.data.updated.getTime() ||
  a.data.title.localeCompare(b.data.title, "zh-CN");

const compareChapters = (a: ChapterEntry, b: ChapterEntry) =>
  a.data.order - b.data.order || a.id.localeCompare(b.id);

/** Return every book, newest update first. Optionally cap the result length. */
export async function getBooksByUpdated(limit?: number): Promise<BookEntry[]> {
  const books = (await getCollection("books")).sort(compareBooksByUpdated);

  if (limit === undefined) return books;
  return books.slice(0, Math.max(0, Math.trunc(limit)));
}

/** Alias used by pages that need the full, consistently ordered catalogue. */
export const getAllBooks = getBooksByUpdated;

/** Look up a book by its stable public slug. */
export async function getBookBySlug(
  slug: string,
): Promise<BookEntry | undefined> {
  return getEntry("books", slug);
}

/** Return all featured books, with the most recently updated one first. */
export async function getFeaturedBooks(): Promise<BookEntry[]> {
  const books = await getBooksByUpdated();
  return books.filter((book) => book.data.featured);
}

/** Return the lead featured book used by the library home page. */
export async function getFeaturedBook(): Promise<BookEntry | undefined> {
  const [featuredBook] = await getFeaturedBooks();
  return featuredBook;
}

/** Return the chapters for a book in their declared reading order. */
export async function getChaptersByBookSlug(
  bookSlug: string,
): Promise<ChapterEntry[]> {
  const chapters = await getCollection(
    "chapters",
    ({ data }) => data.book === bookSlug,
  );

  return chapters.sort(compareChapters);
}

/** Extract the route-safe chapter slug from a chapter collection entry. */
export function getChapterSlug(chapter: ChapterEntry): string {
  return chapter.id.split("/").at(-1) ?? chapter.id;
}

/** Look up one chapter by its parent book slug and chapter slug. */
export async function getChapterBySlug(
  bookSlug: string,
  chapterSlug: string,
): Promise<ChapterEntry | undefined> {
  return getEntry("chapters", `${bookSlug}/${chapterSlug}`);
}

/** Load a book and its ordered table of contents together. */
export async function getBookWithChapters(
  bookSlug: string,
): Promise<BookWithChapters | undefined> {
  const [book, chapters] = await Promise.all([
    getBookBySlug(bookSlug),
    getChaptersByBookSlug(bookSlug),
  ]);

  if (!book) return undefined;
  return { book, chapters };
}

/** Resolve the previous and next chapter for reader navigation. */
export async function getAdjacentChapters(
  bookSlug: string,
  chapterSlug: string,
): Promise<AdjacentChapters> {
  const chapters = await getChaptersByBookSlug(bookSlug);
  const currentIndex = chapters.findIndex(
    (chapter) => getChapterSlug(chapter) === chapterSlug,
  );

  if (currentIndex < 0) return { previous: undefined, next: undefined };

  return {
    previous: chapters[currentIndex - 1],
    next: chapters[currentIndex + 1],
  };
}

/** Calculate aggregate word count and reading stats for an entire book */
export function calculateBookStats(chapters: ChapterEntry[]) {
  let totalCharacters = 0;
  for (const chapter of chapters) {
    const stats = calculateReadingStats(chapter.body || "");
    totalCharacters += stats.totalCount;
  }

  let formattedTotal = "";
  if (totalCharacters >= 10000) {
    formattedTotal = (totalCharacters / 10000).toFixed(1).replace(/\.0$/, "") + " 万字";
  } else if (totalCharacters >= 1000) {
    formattedTotal = totalCharacters.toLocaleString("zh-CN") + " 字";
  } else {
    formattedTotal = `${totalCharacters} 字`;
  }

  const estimatedHours = (totalCharacters / 350 / 60).toFixed(1).replace(/\.0$/, "");

  return {
    totalCharacters,
    formattedTotal,
    estimatedHours,
  };
}

