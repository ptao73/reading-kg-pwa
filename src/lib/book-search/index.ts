import { supabase } from "@/lib/supabase";
import { searchOpenLibrary, lookupOpenLibraryISBN } from "./open-library";
import { searchGoogleBooks, lookupGoogleBooksISBN } from "./google-books";
import type { BookCandidate } from "@/types/content";
import type { Book, RegionHint } from "@/types/database";

// ============================================
// Region Ranking (HK/TW > CN > EN > OTHER)
// ============================================

const REGION_PRIORITY: Record<RegionHint | "null", number> = {
  HK: 1,
  TW: 2,
  CN: 3,
  EN: 4,
  OTHER: 5,
  null: 6,
};

export function rankByRegion(candidates: BookCandidate[]): BookCandidate[] {
  return [...candidates].sort((a, b) => {
    const priorityA = REGION_PRIORITY[a.region_hint ?? "null"];
    const priorityB = REGION_PRIORITY[b.region_hint ?? "null"];
    return priorityA - priorityB;
  });
}

// ============================================
// ISBN Detection
// ============================================

const ISBN_10_REGEX = /^(?:\d[- ]?){9}[\dXx]$/;
const ISBN_13_REGEX = /^(?:\d[- ]?){13}$/;

export function isISBN(query: string): boolean {
  const cleaned = query.replace(/[-\s]/g, "");
  return ISBN_10_REGEX.test(query) || ISBN_13_REGEX.test(query) ||
         cleaned.length === 10 || cleaned.length === 13;
}

// ============================================
// Local Library Search (Stage 1)
// ============================================

export async function searchLocalLibrary(query: string): Promise<BookCandidate[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Search by title, author, or ISBN
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .is("merged_into", null)
    .or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%,isbn10.ilike.%${query}%,isbn13.ilike.%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Local search error:", error);
    return [];
  }

  return (data ?? []).map((book: Book) => ({
    source: "local" as const,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publish_year: book.publish_year,
    language: book.language,
    region_hint: book.region_hint,
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    cover: book.cover,
    localBookId: book.id,
  }));
}

// ============================================
// External Search (Stage 2)
// ============================================

export interface SearchOptions {
  localOnly?: boolean;
  includeISBNLookup?: boolean;
}

export interface SearchResult {
  local: BookCandidate[];
  external: BookCandidate[];
  isISBNQuery: boolean;
}

export async function searchBooks(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { local: [], external: [], isISBNQuery: false };
  }

  const isISBNQuery = isISBN(trimmedQuery);

  // Stage 1: Local search (always)
  const local = await searchLocalLibrary(trimmedQuery);

  // If local-only mode, return early
  if (options.localOnly) {
    return { local, external: [], isISBNQuery };
  }

  // Stage 2: External search (parallel)
  let external: BookCandidate[] = [];

  if (isISBNQuery) {
    // ISBN lookup from both sources
    const [openLibResult, googleResult] = await Promise.all([
      lookupOpenLibraryISBN(trimmedQuery),
      lookupGoogleBooksISBN(trimmedQuery),
    ]);

    const results: BookCandidate[] = [];
    if (openLibResult) results.push(openLibResult);
    if (googleResult) results.push(googleResult);

    // Deduplicate by ISBN
    external = deduplicateByISBN(results);
  } else {
    // Keyword search from both sources
    const [openLibResults, googleResults] = await Promise.all([
      searchOpenLibrary(trimmedQuery, 5),
      searchGoogleBooks(trimmedQuery, 5),
    ]);

    // Merge and deduplicate
    const combined = [...openLibResults, ...googleResults];
    external = deduplicateByTitle(combined);
  }

  // Rank by region preference
  external = rankByRegion(external);

  return { local, external, isISBNQuery };
}

// ============================================
// Deduplication
// ============================================

function deduplicateByISBN(candidates: BookCandidate[]): BookCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const isbn = c.isbn13 || c.isbn10;
    if (!isbn) return true; // Keep if no ISBN
    if (seen.has(isbn)) return false;
    seen.add(isbn);
    return true;
  });
}

function deduplicateByTitle(candidates: BookCandidate[]): BookCandidate[] {
  const seen = new Map<string, BookCandidate>();

  for (const candidate of candidates) {
    // Normalize title for comparison
    const key = candidate.title.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, "");

    if (!seen.has(key)) {
      seen.set(key, candidate);
    } else {
      // Keep the one with more metadata
      const existing = seen.get(key)!;
      const existingScore = metadataScore(existing);
      const candidateScore = metadataScore(candidate);

      if (candidateScore > existingScore) {
        seen.set(key, candidate);
      }
    }
  }

  return Array.from(seen.values());
}

function metadataScore(candidate: BookCandidate): number {
  let score = 0;
  if (candidate.author) score += 1;
  if (candidate.publisher) score += 1;
  if (candidate.publish_year) score += 1;
  if (candidate.isbn13) score += 2;
  if (candidate.isbn10) score += 1;
  if (candidate.cover) score += 1;
  if (candidate.region_hint) score += 1;
  return score;
}

// ============================================
// Save External Candidate to Library
// ============================================

export async function saveToLibrary(candidate: BookCandidate): Promise<Book | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const bookData = {
    user_id: user.id,
    title: candidate.title,
    author: candidate.author,
    publisher: candidate.publisher,
    publish_year: candidate.publish_year,
    language: candidate.language,
    region_hint: candidate.region_hint,
    isbn10: candidate.isbn10,
    isbn13: candidate.isbn13,
    cover: candidate.cover,
  };

  const { data, error } = await supabase
    .from("books")
    .insert(bookData)
    .select()
    .single();

  if (error) {
    console.error("Save to library error:", error);
    return null;
  }

  return data as Book;
}

// Re-export types
export type { BookCandidate, SearchResult };
