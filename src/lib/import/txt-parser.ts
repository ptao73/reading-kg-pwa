import jschardet from "jschardet";
import type {
  ParsedStructure,
  ChapterInfo,
  ParsedContent,
  ChapterContent,
  TextSegment,
  ContentMetadata,
} from "@/types/content";

// ============================================
// Encoding Detection
// ============================================

export function detectEncoding(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  // jschardet expects a string, so we need to convert
  // Use Latin-1 to preserve byte values
  let binaryString = "";
  for (let i = 0; i < Math.min(uint8Array.length, 65536); i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }

  const result = jschardet.detect(binaryString);

  // Default to UTF-8 if detection confidence is low
  if (!result.encoding || result.confidence < 0.5) {
    return "UTF-8";
  }

  // Normalize encoding names
  const encoding = result.encoding.toUpperCase();
  if (encoding === "GB2312" || encoding === "GBK" || encoding === "GB18030") {
    return "GBK";
  }
  if (encoding === "BIG5" || encoding === "BIG5-HKSCS") {
    return "BIG5";
  }
  if (encoding.includes("UTF-8") || encoding === "ASCII") {
    return "UTF-8";
  }

  return encoding;
}

export async function decodeText(
  buffer: ArrayBuffer,
  encoding?: string
): Promise<{ text: string; encoding: string }> {
  const detectedEncoding = encoding || detectEncoding(buffer);

  try {
    const decoder = new TextDecoder(detectedEncoding);
    const text = decoder.decode(buffer);
    return { text, encoding: detectedEncoding };
  } catch {
    // Fallback to UTF-8
    const decoder = new TextDecoder("UTF-8");
    const text = decoder.decode(buffer);
    return { text, encoding: "UTF-8" };
  }
}

// ============================================
// Text Segmentation
// ============================================

const CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千\d]+[章节回篇卷集部]/,
  /^Chapter\s+\d+/i,
  /^CHAPTER\s+[IVXLCDM\d]+/i,
  /^[一二三四五六七八九十]+[、.．]/,
  /^\d+[、.．]\s+/,
  /^【.+】$/,
  /^《.+》$/,
];

function isChapterHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;

  return CHAPTER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function segmentText(text: string): {
  chapters: ChapterContent[];
  structure: ParsedStructure;
} {
  const lines = text.split(/\r?\n/);
  const chapters: ChapterContent[] = [];
  let currentChapter: ChapterContent | null = null;
  let currentSegments: TextSegment[] = [];
  let segmentId = 0;
  let chapterId = 0;
  let totalSegments = 0;

  const flushCurrentChapter = () => {
    if (currentChapter) {
      currentChapter.segments = currentSegments;
      currentChapter.content = currentSegments.map((s) => s.text).join("\n\n");
      chapters.push(currentChapter);
    }
    currentSegments = [];
  };

  const addSegment = (text: string, type: TextSegment["type"] = "paragraph") => {
    if (text.trim()) {
      currentSegments.push({
        id: `seg-${segmentId++}`,
        text: text.trim(),
        type,
      });
      totalSegments++;
    }
  };

  // Start with a default chapter if no chapter headings found
  currentChapter = {
    id: `ch-${chapterId++}`,
    title: "开始",
    content: "",
    segments: [],
  };

  let currentParagraph = "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for chapter heading
    if (isChapterHeading(trimmedLine)) {
      // Flush current paragraph
      if (currentParagraph) {
        addSegment(currentParagraph);
        currentParagraph = "";
      }

      // Flush current chapter
      flushCurrentChapter();

      // Start new chapter
      currentChapter = {
        id: `ch-${chapterId++}`,
        title: trimmedLine,
        content: "",
        segments: [],
      };
      continue;
    }

    // Empty line marks paragraph boundary
    if (!trimmedLine) {
      if (currentParagraph) {
        addSegment(currentParagraph);
        currentParagraph = "";
      }
      continue;
    }

    // Accumulate paragraph text
    if (currentParagraph) {
      currentParagraph += "\n" + trimmedLine;
    } else {
      currentParagraph = trimmedLine;
    }
  }

  // Flush remaining content
  if (currentParagraph) {
    addSegment(currentParagraph);
  }
  flushCurrentChapter();

  // Build structure
  const structure: ParsedStructure = {
    chapters: chapters.map((ch, idx) => ({
      id: ch.id,
      title: ch.title,
      level: 1,
      startPosition: { chapter: idx, segment: 0 },
    })),
    totalSegments,
  };

  return { chapters, structure };
}

// ============================================
// Main Parser
// ============================================

export async function parseTxt(
  buffer: ArrayBuffer,
  resourceId: string
): Promise<{ parsed: ParsedContent; structure: ParsedStructure }> {
  // Detect and decode
  const { text, encoding } = await decodeText(buffer);

  // Segment into chapters and paragraphs
  const { chapters, structure } = segmentText(text);

  // Add encoding to structure
  structure.encoding = encoding;

  // Calculate word count (for Chinese, count characters)
  const fullText = text.replace(/\s+/g, "");
  const wordCount = fullText.length;

  // Build metadata
  const metadata: ContentMetadata = {
    encoding,
    wordCount,
  };

  // Build parsed content
  const parsed: ParsedContent = {
    resourceId,
    chapters,
    fullText: text,
    metadata,
  };

  return { parsed, structure };
}

// ============================================
// Utility: Get segment by position
// ============================================

export function getSegmentAtPosition(
  parsed: ParsedContent,
  chapter: number,
  segment: number
): TextSegment | null {
  if (chapter < 0 || chapter >= parsed.chapters.length) return null;
  const ch = parsed.chapters[chapter];
  if (segment < 0 || segment >= ch.segments.length) return null;
  return ch.segments[segment];
}

export function getChapterText(
  parsed: ParsedContent,
  chapterIndex: number
): string | null {
  if (chapterIndex < 0 || chapterIndex >= parsed.chapters.length) return null;
  return parsed.chapters[chapterIndex].content;
}
