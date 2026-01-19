import * as pdfjsLib from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";
import { storeParsedContent } from "@/lib/indexeddb";
import type {
  ParsedContent,
  ChapterContent,
  TextSegment,
  ParsedStructure,
  ChapterInfo,
} from "@/types/content";

// Configure PDF.js worker (bundle locally for offline support)
if (typeof window !== "undefined") {
  try {
    const worker = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" }
    );
    pdfjsLib.GlobalWorkerOptions.workerPort = worker;
  } catch {
    // Fallback to public worker asset if module workers are unsupported
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/reading-kg-pwa/pdf.worker.min.mjs";
  }
}

// ============================================
// PDF Parser
// ============================================

export interface PdfParseResult {
  parsed: ParsedContent;
  structure: ParsedStructure;
}

export async function parsePdf(
  buffer: ArrayBuffer,
  resourceId: string
): Promise<PdfParseResult> {
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  const chapters: ChapterContent[] = [];
  const chapterInfos: ChapterInfo[] = [];
  let totalSegments = 0;

  // Get document metadata
  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as { Title?: string; Author?: string } | undefined;
  const title = info?.Title || undefined;
  const author = info?.Author || undefined;

  // Try to get outline (table of contents)
  const outline = await pdf.getOutline().catch(() => null);

  if (outline && outline.length > 0) {
    // Use outline to define chapters
    const chapterRanges = await buildChapterRanges(pdf, outline, numPages);

    for (let i = 0; i < chapterRanges.length; i++) {
      const range = chapterRanges[i];
      const chapterText = await extractPagesText(pdf, range.startPage, range.endPage);
      const segments = textToSegments(chapterText);
      const chapterId = uuidv4();

      chapters.push({
        id: chapterId,
        title: range.title,
        content: chapterText,
        segments,
      });

      chapterInfos.push({
        id: chapterId,
        title: range.title,
        level: range.level,
        startPosition: { chapter: i, segment: 0, page: range.startPage },
      });

      totalSegments += segments.length;
    }
  } else {
    // No outline - create chapters by page groups (10 pages per chapter)
    const pagesPerChapter = 10;
    const numChapters = Math.ceil(numPages / pagesPerChapter);

    for (let i = 0; i < numChapters; i++) {
      const startPage = i * pagesPerChapter + 1;
      const endPage = Math.min((i + 1) * pagesPerChapter, numPages);
      const chapterText = await extractPagesText(pdf, startPage, endPage);
      const segments = textToSegments(chapterText);
      const chapterId = uuidv4();

      chapters.push({
        id: chapterId,
        title: `Pages ${startPage}-${endPage}`,
        content: chapterText,
        segments,
      });

      chapterInfos.push({
        id: chapterId,
        title: `Pages ${startPage}-${endPage}`,
        level: 1,
        startPosition: { chapter: i, segment: 0, page: startPage },
      });

      totalSegments += segments.length;
    }
  }

  const parsed: ParsedContent = {
    resourceId,
    chapters,
    metadata: {
      title,
      author,
      pageCount: numPages,
    },
  };

  const structure: ParsedStructure = {
    title,
    chapters: chapterInfos,
    totalSegments,
    pageCount: numPages,
  };

  // Store parsed content
  await storeParsedContent(parsed);

  return { parsed, structure };
}

// ============================================
// Helper Functions
// ============================================

interface ChapterRange {
  title: string;
  level: number;
  startPage: number;
  endPage: number;
}

interface OutlineItem {
  title: string;
  dest: string | any[] | null;
  items?: OutlineItem[];
}

async function buildChapterRanges(
  pdf: pdfjsLib.PDFDocumentProxy,
  outline: OutlineItem[],
  numPages: number
): Promise<ChapterRange[]> {
  const ranges: ChapterRange[] = [];

  // Flatten outline and get page numbers
  const flatOutline = await flattenOutline(pdf, outline, 1);

  // Sort by page number
  flatOutline.sort((a, b) => a.page - b.page);

  // Build ranges
  for (let i = 0; i < flatOutline.length; i++) {
    const current = flatOutline[i];
    const next = flatOutline[i + 1];

    ranges.push({
      title: current.title,
      level: current.level,
      startPage: current.page,
      endPage: next ? next.page - 1 : numPages,
    });
  }

  // If no ranges, create one for the whole document
  if (ranges.length === 0) {
    ranges.push({
      title: "Document",
      level: 1,
      startPage: 1,
      endPage: numPages,
    });
  }

  return ranges;
}

interface FlatOutlineItem {
  title: string;
  level: number;
  page: number;
}

async function flattenOutline(
  pdf: pdfjsLib.PDFDocumentProxy,
  outline: OutlineItem[],
  level: number
): Promise<FlatOutlineItem[]> {
  const result: FlatOutlineItem[] = [];

  for (const item of outline) {
    let page = 1;

    if (item.dest) {
      try {
        // Get destination page
        const dest = typeof item.dest === "string"
          ? await pdf.getDestination(item.dest)
          : item.dest;

        if (dest && dest[0]) {
          const pageRef = dest[0];
          const pageIndex = await pdf.getPageIndex(pageRef);
          page = pageIndex + 1;
        }
      } catch {
        // Keep default page 1
      }
    }

    result.push({
      title: item.title || `Section`,
      level,
      page,
    });

    // Recursively process sub-items
    if (item.items && item.items.length > 0) {
      const subItems = await flattenOutline(pdf, item.items, level + 1);
      result.push(...subItems);
    }
  }

  return result;
}

async function extractPagesText(
  pdf: pdfjsLib.PDFDocumentProxy,
  startPage: number,
  endPage: number
): Promise<string> {
  const textParts: string[] = [];

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let lastY: number | null = null;
      const lines: string[] = [];
      let currentLine = "";

      for (const item of textContent.items) {
        if (!("str" in item)) continue;

        const textItem = item as { str: string; transform: number[] };
        const y = textItem.transform[5];

        // New line detection (Y position changed significantly)
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = textItem.str;
        } else {
          currentLine += textItem.str;
        }

        lastY = y;
      }

      // Add last line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      textParts.push(lines.join("\n"));
    } catch (err) {
      console.warn(`Failed to extract text from page ${pageNum}:`, err);
    }
  }

  return textParts.join("\n\n");
}

function textToSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Split long paragraphs by single newlines if they exist
    const lines = trimmed.split(/\n/);

    if (lines.length > 1) {
      // Multiple lines - might be a list or formatted text
      for (const line of lines) {
        if (line.trim()) {
          segments.push({
            id: uuidv4(),
            text: line.trim(),
            type: "paragraph",
          });
        }
      }
    } else {
      // Single paragraph
      let type: TextSegment["type"] = "paragraph";

      // Detect headings (short, no period at end)
      if (trimmed.length < 80 && !trimmed.endsWith(".") && !trimmed.endsWith("。")) {
        type = "heading";
      }

      segments.push({
        id: uuidv4(),
        text: trimmed,
        type,
      });
    }
  }

  return segments;
}
