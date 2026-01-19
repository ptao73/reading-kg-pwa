import ePub, { Book as EpubBook, NavItem, SpineItem } from "epubjs";
import { v4 as uuidv4 } from "uuid";
import { storeParsedContent } from "@/lib/indexeddb";
import type {
  ParsedContent,
  ChapterContent,
  TextSegment,
  ParsedStructure,
  ChapterInfo,
} from "@/types/content";

// ============================================
// EPUB Parser
// ============================================

export interface EpubParseResult {
  parsed: ParsedContent;
  structure: ParsedStructure;
  coverUrl: string | null;
}

export async function parseEpub(
  buffer: ArrayBuffer,
  resourceId: string
): Promise<EpubParseResult> {
  // Create epub instance from buffer
  const book = ePub(buffer);
  await book.ready;

  // Get metadata
  const metadata = await book.loaded.metadata;
  const navigation = await book.loaded.navigation;
  const spine = await book.loaded.spine;

  // Extract cover
  const coverUrl = await extractCover(book);

  // Build chapters from navigation/spine
  const chapters: ChapterContent[] = [];
  const chapterInfos: ChapterInfo[] = [];
  let totalSegments = 0;

  // Get TOC items or fall back to spine
  const tocItems = navigation.toc;

  if (tocItems && tocItems.length > 0) {
    // Use TOC-based navigation
    let chapterIndex = 0;
    for (const item of tocItems) {
      const chapterContent = await parseNavItem(book, item, chapterIndex);
      if (chapterContent) {
        chapters.push(chapterContent);
        chapterInfos.push({
          id: chapterContent.id,
          title: chapterContent.title,
          level: 1,
          startPosition: { chapter: chapterIndex, segment: 0 },
        });
        totalSegments += chapterContent.segments.length;
        chapterIndex++;
      }
    }
  } else {
    // Fall back to spine-based navigation
    const spineItems = (spine as unknown as { items: SpineItem[] }).items || [];
    let chapterIndex = 0;

    for (const item of spineItems) {
      try {
        const contents = await book.load(item.href);
        const doc = parseHTML(contents as string);
        const text = extractTextFromDocument(doc);

        if (text.trim()) {
          const segments = textToSegments(text);
          const chapterId = uuidv4();

          chapters.push({
            id: chapterId,
            title: `Chapter ${chapterIndex + 1}`,
            content: text,
            segments,
          });

          chapterInfos.push({
            id: chapterId,
            title: `Chapter ${chapterIndex + 1}`,
            level: 1,
            startPosition: { chapter: chapterIndex, segment: 0 },
          });

          totalSegments += segments.length;
          chapterIndex++;
        }
      } catch (err) {
        console.warn("Failed to parse spine item:", item.href, err);
      }
    }
  }

  // If no chapters found, create a single chapter from all content
  if (chapters.length === 0) {
    const fallbackChapter = await createFallbackChapter(book);
    if (fallbackChapter) {
      chapters.push(fallbackChapter);
      chapterInfos.push({
        id: fallbackChapter.id,
        title: fallbackChapter.title,
        level: 1,
        startPosition: { chapter: 0, segment: 0 },
      });
      totalSegments = fallbackChapter.segments.length;
    }
  }

  const parsed: ParsedContent = {
    resourceId,
    chapters,
    metadata: {
      title: metadata.title || undefined,
      author: metadata.creator || undefined,
      language: metadata.language || undefined,
    },
  };

  const structure: ParsedStructure = {
    title: metadata.title,
    chapters: chapterInfos,
    totalSegments,
  };

  // Store parsed content
  await storeParsedContent(parsed);

  // Cleanup
  book.destroy();

  return { parsed, structure, coverUrl };
}

// ============================================
// Helper Functions
// ============================================

async function extractCover(book: EpubBook): Promise<string | null> {
  try {
    const coverUrl = await book.coverUrl();
    return coverUrl || null;
  } catch {
    return null;
  }
}

async function parseNavItem(
  book: EpubBook,
  item: NavItem,
  index: number
): Promise<ChapterContent | null> {
  try {
    const href = item.href.split("#")[0]; // Remove anchor
    const contents = await book.load(href);
    const doc = parseHTML(contents as string);
    const text = extractTextFromDocument(doc);

    if (!text.trim()) return null;

    const segments = textToSegments(text);
    const chapterId = uuidv4();

    return {
      id: chapterId,
      title: item.label?.trim() || `Chapter ${index + 1}`,
      content: text,
      segments,
    };
  } catch (err) {
    console.warn("Failed to parse nav item:", item.href, err);
    return null;
  }
}

function parseHTML(html: string): Document {
  // Use DOMParser in browser
  if (typeof window !== "undefined") {
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
  }

  // Server-side fallback (basic regex extraction)
  throw new Error("HTML parsing requires browser environment");
}

function extractTextFromDocument(doc: Document): string {
  // Remove scripts and styles
  const scripts = doc.querySelectorAll("script, style, noscript");
  scripts.forEach((el) => el.remove());

  // Get body text
  const body = doc.body || doc.documentElement;

  // Extract text with structure preservation
  const textParts: string[] = [];
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);

  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim();
    if (text) {
      textParts.push(text);
    }
  }

  // Also extract by block elements for better structure
  const blocks = body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, div, li");
  const blockTexts: string[] = [];

  blocks.forEach((block) => {
    const text = block.textContent?.trim();
    if (text && !blockTexts.includes(text)) {
      blockTexts.push(text);
    }
  });

  // Use block-based extraction if available, otherwise use walker
  return blockTexts.length > 0 ? blockTexts.join("\n\n") : textParts.join(" ");
}

function textToSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Split by double newlines or paragraph breaks
  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect segment type
    let type: TextSegment["type"] = "paragraph";

    // Check for headings (short lines that might be titles)
    if (trimmed.length < 50 && !trimmed.includes("。") && !trimmed.includes(".")) {
      type = "heading";
    }

    // Check for quotes (lines starting with quotes)
    if (trimmed.startsWith('"') || trimmed.startsWith('"') || trimmed.startsWith("「")) {
      type = "quote";
    }

    segments.push({
      id: uuidv4(),
      text: trimmed,
      type,
    });
  }

  return segments;
}

async function createFallbackChapter(book: EpubBook): Promise<ChapterContent | null> {
  try {
    // Try to get all text from the book
    const spine = await book.loaded.spine;
    const spineItems = (spine as unknown as { items: SpineItem[] }).items || [];

    let allText = "";

    for (const item of spineItems) {
      try {
        const contents = await book.load(item.href);
        const doc = parseHTML(contents as string);
        const text = extractTextFromDocument(doc);
        if (text.trim()) {
          allText += text + "\n\n";
        }
      } catch {
        // Skip failed items
      }
    }

    if (!allText.trim()) return null;

    const segments = textToSegments(allText);
    const chapterId = uuidv4();

    return {
      id: chapterId,
      title: "Content",
      content: allText,
      segments,
    };
  } catch {
    return null;
  }
}
