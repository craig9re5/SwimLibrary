import type { APIRoute } from "astro";
import {
  getAllBooks,
  getChaptersByBookSlug,
  type BookEntry,
  type ChapterEntry,
} from "../../../../lib/library";

export async function getStaticPaths() {
  const books = await getAllBooks();
  return Promise.all(
    books.map(async (book) => ({
      params: { slug: book.data.slug },
      props: {
        book,
        chapters: await getChaptersByBookSlug(book.data.slug),
      },
    })),
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { book, chapters } = props as {
    book: BookEntry;
    chapters: ChapterEntry[];
  };

  const payload = {
    title: book.data.title,
    author: book.data.author,
    summary: book.data.summary,
    slug: book.data.slug,
    chapters: chapters.map((c, i) => ({
      title: c.data.title,
      order: c.data.order ?? i + 1,
      body: c.body || "",
    })),
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
