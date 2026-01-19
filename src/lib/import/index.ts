import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import {
  storeFile,
  storeParsedContent,
  calculateFileHash,
  hasFile,
} from "@/lib/indexeddb";
import { parseTxt } from "./txt-parser";
import { parseEpub } from "./epub-parser";
import { parsePdf } from "./pdf-parser";
import type {
  ContentResource,
  ContentResourceType,
  ParsedStructure,
} from "@/types/content";

// ============================================
// File Type Detection
// ============================================

export function detectFileType(file: File): ContentResourceType | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // TXT
  if (
    extension === "txt" ||
    mimeType === "text/plain" ||
    mimeType.startsWith("text/")
  ) {
    return "txt";
  }

  // EPUB
  if (extension === "epub" || mimeType === "application/epub+zip") {
    return "epub";
  }

  // PDF
  if (extension === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }

  return null;
}

// ============================================
// Import Result
// ============================================

export interface ImportResult {
  success: boolean;
  resource?: ContentResource;
  error?: string;
  alreadyExists?: boolean;
}

// ============================================
// Main Import Function
// ============================================

export async function importFile(
  file: File,
  bookId: string
): Promise<ImportResult> {
  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // 2. Detect file type
  const fileType = detectFileType(file);
  if (!fileType) {
    return { success: false, error: "Unsupported file type" };
  }

  // 3. Read file as ArrayBuffer
  const buffer = await file.arrayBuffer();

  // 4. Calculate hash
  const fileHash = await calculateFileHash(buffer);

  // 5. Check if file already exists in IndexedDB
  const fileExists = await hasFile(fileHash);

  // 6. Check if resource already exists in Supabase for this book
  const { data: existingResource } = await supabase
    .from("content_resources")
    .select("*")
    .eq("book_id", bookId)
    .eq("file_hash", fileHash)
    .single();

  if (existingResource) {
    return {
      success: true,
      resource: existingResource as ContentResource,
      alreadyExists: true,
    };
  }

  // 7. Parse the file based on type
  let parsedStructure: ParsedStructure | null = null;
  const resourceId = uuidv4();

  try {
    switch (fileType) {
      case "txt": {
        const { parsed, structure } = await parseTxt(buffer, resourceId);
        parsedStructure = structure;

        // Store parsed content in IndexedDB
        await storeParsedContent(parsed);
        break;
      }
      case "epub": {
        const { parsed: epubParsed, structure: epubStructure, coverUrl } =
          await parseEpub(buffer, resourceId);
        parsedStructure = epubStructure;

        // Store parsed content in IndexedDB
        await storeParsedContent(epubParsed);

        // If cover was extracted, we can store it in the resource metadata
        // The cover URL is a blob URL that will be invalid after page reload
        // So we just use it for immediate display if needed
        break;
      }
      case "pdf": {
        const { parsed: pdfParsed, structure: pdfStructure } =
          await parsePdf(buffer, resourceId);
        parsedStructure = pdfStructure;

        // Note: parsed content is already stored in parsePdf
        break;
      }
      default:
        return { success: false, error: "Unsupported file type" };
    }
  } catch (err) {
    console.error("Parse error:", err);
    return {
      success: false,
      error: `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  // 8. Store raw file in IndexedDB (if not already there)
  if (!fileExists) {
    await storeFile(fileHash, buffer, fileType);
  }

  // 9. Create resource record in Supabase
  const resourceData = {
    id: resourceId,
    user_id: user.id,
    book_id: bookId,
    type: fileType,
    file_hash: fileHash,
    file_size_bytes: buffer.byteLength,
    original_filename: file.name,
    parsed_structure: parsedStructure,
  };

  const { data: newResource, error } = await supabase
    .from("content_resources")
    .insert(resourceData)
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return { success: false, error: "Failed to save resource metadata" };
  }

  return {
    success: true,
    resource: newResource as ContentResource,
  };
}

// ============================================
// Get Resources for a Book
// ============================================

export async function getBookResources(
  bookId: string
): Promise<ContentResource[]> {
  const { data, error } = await supabase
    .from("content_resources")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching resources:", error);
    return [];
  }

  return (data ?? []) as ContentResource[];
}

// ============================================
// Delete Resource
// ============================================

export async function deleteResource(resourceId: string): Promise<boolean> {
  const { error } = await supabase
    .from("content_resources")
    .delete()
    .eq("id", resourceId);

  if (error) {
    console.error("Error deleting resource:", error);
    return false;
  }

  // Note: We don't delete from IndexedDB here because
  // the file might be shared with other resources
  // Use cleanupOrphanedFiles() for that

  return true;
}
