import type { BookCandidate } from "@/types/content";
import type { RegionHint } from "@/types/database";

const OPEN_LIBRARY_API = "https://openlibrary.org";

// ============================================
// Types for Open Library API responses
// ============================================

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  publisher?: string[];
  publish_year?: number[];
  isbn?: string[];
  language?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibrarySearchDoc[];
}

interface OpenLibraryISBNResponse {
  title?: string;
  authors?: { key: string; name?: string }[];
  publishers?: string[];
  publish_date?: string;
  covers?: number[];
  languages?: { key: string }[];
}

// ============================================
// Helper Functions
// ============================================

function inferRegionHint(
  publisher?: string,
  language?: string
): RegionHint | null {
  if (!publisher && !language) return null;

  const publisherLower = publisher?.toLowerCase() ?? "";
  const langLower = language?.toLowerCase() ?? "";

  // Hong Kong publishers
  if (
    publisherLower.includes("hong kong") ||
    publisherLower.includes("香港") ||
    publisherLower.includes("hk")
  ) {
    return "HK";
  }

  // Taiwan publishers
  if (
    publisherLower.includes("taiwan") ||
    publisherLower.includes("台灣") ||
    publisherLower.includes("臺灣") ||
    publisherLower.includes("taipei") ||
    publisherLower.includes("台北")
  ) {
    return "TW";
  }

  // Mainland China publishers
  if (
    publisherLower.includes("china") ||
    publisherLower.includes("中国") ||
    publisherLower.includes("beijing") ||
    publisherLower.includes("shanghai") ||
    publisherLower.includes("北京") ||
    publisherLower.includes("上海")
  ) {
    return "CN";
  }

  // Language-based inference
  if (langLower === "chi" || langLower === "zh" || langLower === "chinese") {
    return "CN"; // Default Chinese to CN, can be refined
  }

  if (langLower === "eng" || langLower === "en" || langLower === "english") {
    return "EN";
  }

  return "OTHER";
}

function extractYear(publishDate?: string): number | null {
  if (!publishDate) return null;
  const match = publishDate.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

function getCoverUrl(coverId?: number): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

function normalizeISBN(isbn: string): { isbn10: string | null; isbn13: string | null } {
  const cleaned = isbn.replace(/[-\s]/g, "");
  if (cleaned.length === 10) {
    return { isbn10: cleaned, isbn13: null };
  }
  if (cleaned.length === 13) {
    return { isbn10: null, isbn13: cleaned };
  }
  return { isbn10: null, isbn13: null };
}

// ============================================
// Search by Query
// ============================================

export async function searchOpenLibrary(
  query: string,
  limit = 10
): Promise<BookCandidate[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `${OPEN_LIBRARY_API}/search.json?q=${encodedQuery}&limit=${limit}&fields=key,title,author_name,publisher,publish_year,isbn,language,cover_i,first_publish_year`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Open Library search failed:", response.status);
      return [];
    }

    const data: OpenLibrarySearchResponse = await response.json();

    return data.docs.map((doc) => {
      const isbn = doc.isbn?.[0];
      const { isbn10, isbn13 } = isbn ? normalizeISBN(isbn) : { isbn10: null, isbn13: null };
      const publisher = doc.publisher?.[0] ?? null;
      const language = doc.language?.[0] ?? null;

      return {
        source: "open_library" as const,
        title: doc.title,
        author: doc.author_name?.join(", ") ?? null,
        publisher,
        publish_year: doc.first_publish_year ?? doc.publish_year?.[0] ?? null,
        language,
        region_hint: inferRegionHint(publisher, language),
        isbn10,
        isbn13,
        cover: getCoverUrl(doc.cover_i),
        externalId: doc.key,
      };
    });
  } catch (error) {
    console.error("Open Library search error:", error);
    return [];
  }
}

// ============================================
// Lookup by ISBN
// ============================================

export async function lookupOpenLibraryISBN(
  isbn: string
): Promise<BookCandidate | null> {
  try {
    const cleaned = isbn.replace(/[-\s]/g, "");
    const url = `${OPEN_LIBRARY_API}/isbn/${cleaned}.json`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      console.error("Open Library ISBN lookup failed:", response.status);
      return null;
    }

    const data: OpenLibraryISBNResponse = await response.json();

    // Need to fetch author names separately if only keys are provided
    let authorName: string | null = null;
    if (data.authors && data.authors.length > 0) {
      const authorKeys = data.authors.map((a) => a.key);
      const authorNames = await Promise.all(
        authorKeys.slice(0, 3).map(async (key) => {
          try {
            const authorUrl = `${OPEN_LIBRARY_API}${key}.json`;
            const authorRes = await fetch(authorUrl);
            if (authorRes.ok) {
              const authorData = await authorRes.json();
              return authorData.name ?? null;
            }
          } catch {
            return null;
          }
          return null;
        })
      );
      authorName = authorNames.filter(Boolean).join(", ") || null;
    }

    const { isbn10, isbn13 } = normalizeISBN(cleaned);
    const publisher = data.publishers?.[0] ?? null;
    const language = data.languages?.[0]?.key?.replace("/languages/", "") ?? null;

    return {
      source: "open_library",
      title: data.title ?? "Unknown Title",
      author: authorName,
      publisher,
      publish_year: extractYear(data.publish_date),
      language,
      region_hint: inferRegionHint(publisher, language),
      isbn10,
      isbn13,
      cover: getCoverUrl(data.covers?.[0]),
      externalId: cleaned,
    };
  } catch (error) {
    console.error("Open Library ISBN lookup error:", error);
    return null;
  }
}
