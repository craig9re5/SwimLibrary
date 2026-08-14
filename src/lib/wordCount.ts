/**
 * Utility functions for counting characters/words and calculating reading time.
 */

export interface ReadingStats {
  characters: number;
  words: number;
  totalCount: number;
  formattedCount: string;
  readingTimeMinutes: number;
}

/**
 * Strip common Markdown formatting to get pure readable text
 */
export function cleanMarkdown(markdown: string): string {
  return markdown
    // Remove frontmatter if present
    .replace(/^---[\s\S]*?---\s*/, "")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Remove links but keep text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Remove headings markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Remove bold / italic / strikethrough
    .replace(/(\*\*|__|\*|_|~~)(.*?)\1/g, "$2")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Calculate reading stats from text (Markdown or plain text)
 */
export function calculateReadingStats(text: string): ReadingStats {
  const plainText = cleanMarkdown(text);

  // Match Chinese / Japanese / Korean ideographs
  const cjkChars = plainText.match(/[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/g) || [];
  
  // Match Latin / alphanumeric word tokens
  const nonCjkText = plainText.replace(/[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/g, " ");
  const latinWords = nonCjkText.trim().split(/\s+/).filter(Boolean);

  const totalCount = cjkChars.length + latinWords.length;

  // Reading speed: ~350 characters/words per minute for comfortable reading
  const readingTimeMinutes = Math.max(1, Math.ceil(totalCount / 350));

  let formattedCount = "";
  if (totalCount >= 10000) {
    formattedCount = (totalCount / 10000).toFixed(1).replace(/\.0$/, "") + " 万字";
  } else if (totalCount >= 1000) {
    formattedCount = totalCount.toLocaleString("zh-CN") + " 字";
  } else {
    formattedCount = `${totalCount} 字`;
  }

  return {
    characters: cjkChars.length,
    words: latinWords.length,
    totalCount,
    formattedCount,
    readingTimeMinutes,
  };
}
