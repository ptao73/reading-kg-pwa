import type { BookCandidate } from "@/types/content";
import type { RegionHint } from "@/types/database";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

// ============================================
// Types for Google Books API responses
// ============================================

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  language?: string;
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksSearchResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
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

  // Hong Kong
  if (
    publisherLower.includes("hong kong") ||
    publisherLower.includes("香港")
  ) {
    return "HK";
  }

  // Taiwan
  if (
    publisherLower.includes("taiwan") ||
    publisherLower.includes("台灣") ||
    publisherLower.includes("臺灣")
  ) {
    return "TW";
  }

  // Mainland China
  if (
    publisherLower.includes("china") ||
    publisherLower.includes("中国") ||
    publisherLower.includes("beijing") ||
    publisherLower.includes("shanghai")
  ) {
    return "CN";
  }

  // Language-based
  if (langLower === "zh" || langLower === "zh-cn" || langLower === "zh-tw") {
    if (langLower === "zh-tw") return "TW";
    return "CN";
  }

  if (langLower === "en") {
    return "EN";
  }

  return "OTHER";
}

function extractYear(publishedDate?: string): number | null {
  if (!publishedDate) return null;
  const match = publishedDate.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

function extractISBNs(
  identifiers?: Array<{ type: string; identifier: string }>
): { isbn10: string | null; isbn13: string | null } {
  if (!identifiers) return { isbn10: null, isbn13: null };

  let isbn10: string | null = null;
  let isbn13: string | null = null;

  for (const id of identifiers) {
    if (id.type === "ISBN_10") {
      isbn10 = id.identifier;
    } else if (id.type === "ISBN_13") {
      isbn13 = id.identifier;
    }
  }

  return { isbn10, isbn13 };
}

function getCoverUrl(imageLinks?: GoogleBooksVolumeInfo["imageLinks"]): string | null {
  if (!imageLinks) return null;
  // Prefer thumbnail, upgrade to https
  const url = imageLinks.thumbnail || imageLinks.smallThumbnail;
  return url?.replace("http://", "https://") ?? null;
}

// ============================================
// Search by Query
// ============================================

export async function searchGoogleBooks(
  query: string,
  limit = 10
): Promise<BookCandidate[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `${GOOGLE_BOOKS_API}?q=${encodedQuery}&maxResults=${limit}&printType=books`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Google Books search failed:", response.status);
      return [];
    }

    const data: GoogleBooksSearchResponse = await response.json();

    if (!data.items) return [];

    return data.items.map((item) => {
      const info = item.volumeInfo;
      const { isbn10, isbn13 } = extractISBNs(info.industryIdentifiers);

      return {
        source: "google_books" as const,
        title: info.title ?? "Unknown Title",
        author: info.authors?.join(", ") ?? null,
        publisher: info.publisher ?? null,
        publish_year: extractYear(info.publishedDate),
        language: info.language ?? null,
        region_hint: inferRegionHint(info.publisher, info.language),
        isbn10,
        isbn13,
        cover: getCoverUrl(info.imageLinks),
        externalId: item.id,
      };
    });
  } catch (error) {
    console.error("Google Books search error:", error);
    return [];
  }
}

// ============================================
// Lookup by ISBN
// ============================================

export async function lookupGoogleBooksISBN(
  isbn: string
): Promise<BookCandidate | null> {
  try {
    const cleaned = isbn.replace(/[-\s]/g, "");
    const url = `${GOOGLE_BOOKS_API}?q=isbn:${cleaned}&maxResults=1`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Google Books ISBN lookup failed:", response.status);
      return null;
    }

    const data: GoogleBooksSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const info = item.volumeInfo;
    const { isbn10, isbn13 } = extractISBNs(info.industryIdentifiers);

    return {
      source: "google_books",
      title: info.title ?? "Unknown Title",
      author: info.authors?.join(", ") ?? null,
      publisher: info.publisher ?? null,
      publish_year: extractYear(info.publishedDate),
      language: info.language ?? null,
      region_hint: inferRegionHint(info.publisher, info.language),
      isbn10: isbn10 || (cleaned.length === 10 ? cleaned : null),
      isbn13: isbn13 || (cleaned.length === 13 ? cleaned : null),
      cover: getCoverUrl(info.imageLinks),
      externalId: item.id,
    };
  } catch (error) {
    console.error("Google Books ISBN lookup error:", error);
    return null;
  }
}
