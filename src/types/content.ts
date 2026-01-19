// Content Domain Types (V2)

// ============================================
// Content Resources
// ============================================

export type ContentResourceType = "txt" | "epub" | "pdf" | "ocr";

export interface ContentResource {
  id: string;
  user_id: string;
  book_id: string;
  type: ContentResourceType;
  file_hash: string;
  file_size_bytes: number;
  original_filename: string | null;
  parsed_structure: ParsedStructure | null;
  created_at: string;
}

export type ContentResourceInsert = {
  id?: string;
  user_id: string;
  book_id: string;
  type: ContentResourceType;
  file_hash: string;
  file_size_bytes: number;
  original_filename?: string | null;
  parsed_structure?: ParsedStructure | null;
  created_at?: string;
};

// ============================================
// Parsed Structure (varies by format)
// ============================================

export interface ParsedStructure {
  title?: string;
  chapters: ChapterInfo[];
  totalSegments: number;
  encoding?: string;  // For TXT files
  pageCount?: number; // For PDF files
}

export interface ChapterInfo {
  id: string;
  title: string;
  level: number;
  startPosition: Position;
  endPosition?: Position;
}

// ============================================
// Position (unified across formats)
// ============================================

export interface Position {
  // For TXT/EPUB: segment-based navigation
  chapter?: number;
  segment?: number;
  offset?: number;

  // For PDF: page-based navigation
  page?: number;

  // For precise position
  percentage?: number;
}

// ============================================
// Reading Progress
// ============================================

export interface ReadingProgress {
  id: string;
  user_id: string;
  resource_id: string;
  current_position: Position;
  percentage_read: number;
  last_read_at: string;
}

export type ReadingProgressInsert = {
  id?: string;
  user_id: string;
  resource_id: string;
  current_position: Position;
  percentage_read?: number;
  last_read_at?: string;
};

export type ReadingProgressUpdate = {
  current_position?: Position;
  percentage_read?: number;
  last_read_at?: string;
};

// ============================================
// Annotations
// ============================================

export type AnnotationType = "highlight" | "bookmark" | "note";

export interface Annotation {
  id: string;
  user_id: string;
  resource_id: string;
  type: AnnotationType;
  position_start: Position;
  position_end: Position | null;
  note: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export type AnnotationInsert = {
  id?: string;
  user_id: string;
  resource_id: string;
  type: AnnotationType;
  position_start: Position;
  position_end?: Position | null;
  note?: string | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ============================================
// Reading Sessions (for streak calculation)
// ============================================

export interface ReadingSession {
  id: string;
  user_id: string;
  resource_id: string | null;
  session_date: string;
  session_start: string;
  session_end: string;
  duration_minutes: number;
  created_at: string;
}

export type ReadingSessionInsert = {
  id?: string;
  user_id: string;
  resource_id?: string | null;
  session_date: string;
  session_start: string;
  session_end: string;
  duration_minutes: number;
  created_at?: string;
};

// ============================================
// User Settings
// ============================================

export interface UserSettings {
  user_id: string;
  streak_threshold_minutes: number;
  reader_font_size: number;
  reader_theme: "light" | "dark";
  created_at: string;
  updated_at: string;
}

export type UserSettingsUpdate = {
  streak_threshold_minutes?: number;
  reader_font_size?: number;
  reader_theme?: "light" | "dark";
  updated_at?: string;
};

// ============================================
// IndexedDB File Storage
// ============================================

export interface StoredFile {
  hash: string;
  data: ArrayBuffer;
  type: ContentResourceType;
  createdAt: number;
}

export interface ParsedContent {
  resourceId: string;
  chapters: ChapterContent[];
  fullText?: string;  // For search functionality
  metadata: ContentMetadata;
}

export interface ChapterContent {
  id: string;
  title: string;
  content: string;
  segments: TextSegment[];
}

export interface TextSegment {
  id: string;
  text: string;
  type: "paragraph" | "heading" | "quote" | "list";
}

export interface ContentMetadata {
  title?: string;
  author?: string;
  language?: string;
  encoding?: string;
  pageCount?: number;
  wordCount?: number;
}

// ============================================
// Book Search Candidate (from external APIs)
// ============================================

export type BookSearchSource = "local" | "open_library" | "google_books";

export interface BookCandidate {
  source: BookSearchSource;
  title: string;
  author: string | null;
  publisher: string | null;
  publish_year: number | null;
  language: string | null;
  region_hint: "HK" | "TW" | "CN" | "EN" | "OTHER" | null;
  isbn10: string | null;
  isbn13: string | null;
  cover: string | null;
  // For local matches only
  localBookId?: string;
  // External identifiers
  externalId?: string;
}

// ============================================
// Streak Data
// ============================================

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayCheckedIn: boolean;
  lastCheckInDate: string | null;
  totalReadingDays: number;
}
