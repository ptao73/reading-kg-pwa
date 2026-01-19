import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { StoredFile, ParsedContent, ContentResourceType } from "@/types/content";

// ============================================
// Database Schema
// ============================================

interface ReadingDBSchema extends DBSchema {
  files: {
    key: string; // file hash (SHA-256)
    value: StoredFile;
    indexes: {
      "by-type": ContentResourceType;
      "by-created": number;
    };
  };
  parsedContent: {
    key: string; // resource_id
    value: ParsedContent;
    indexes: {
      "by-resource": string;
    };
  };
}

const DB_NAME = "reading-kg-content";
const DB_VERSION = 1;

// ============================================
// Database Instance
// ============================================

let dbInstance: IDBPDatabase<ReadingDBSchema> | null = null;

async function getDB(): Promise<IDBPDatabase<ReadingDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ReadingDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Files store
      if (!db.objectStoreNames.contains("files")) {
        const filesStore = db.createObjectStore("files", { keyPath: "hash" });
        filesStore.createIndex("by-type", "type");
        filesStore.createIndex("by-created", "createdAt");
      }

      // Parsed content store
      if (!db.objectStoreNames.contains("parsedContent")) {
        const contentStore = db.createObjectStore("parsedContent", {
          keyPath: "resourceId",
        });
        contentStore.createIndex("by-resource", "resourceId");
      }
    },
  });

  return dbInstance;
}

// ============================================
// File Operations
// ============================================

export async function storeFile(
  hash: string,
  data: ArrayBuffer,
  type: ContentResourceType
): Promise<void> {
  const db = await getDB();
  const storedFile: StoredFile = {
    hash,
    data,
    type,
    createdAt: Date.now(),
  };
  await db.put("files", storedFile);
}

export async function getFile(hash: string): Promise<StoredFile | undefined> {
  const db = await getDB();
  return db.get("files", hash);
}

export async function deleteFile(hash: string): Promise<void> {
  const db = await getDB();
  await db.delete("files", hash);
}

export async function hasFile(hash: string): Promise<boolean> {
  const db = await getDB();
  const file = await db.get("files", hash);
  return !!file;
}

export async function getFilesByType(
  type: ContentResourceType
): Promise<StoredFile[]> {
  const db = await getDB();
  return db.getAllFromIndex("files", "by-type", type);
}

// ============================================
// Parsed Content Operations
// ============================================

export async function storeParsedContent(content: ParsedContent): Promise<void> {
  const db = await getDB();
  await db.put("parsedContent", content);
}

export async function getParsedContent(
  resourceId: string
): Promise<ParsedContent | undefined> {
  const db = await getDB();
  return db.get("parsedContent", resourceId);
}

export async function deleteParsedContent(resourceId: string): Promise<void> {
  const db = await getDB();
  await db.delete("parsedContent", resourceId);
}

export async function hasParsedContent(resourceId: string): Promise<boolean> {
  const db = await getDB();
  const content = await db.get("parsedContent", resourceId);
  return !!content;
}

// ============================================
// Utility Functions
// ============================================

export async function calculateFileHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    return { usage, quota, percentage };
  }
  return { usage: 0, quota: 0, percentage: 0 };
}

export async function clearAllContent(): Promise<void> {
  const db = await getDB();
  await db.clear("files");
  await db.clear("parsedContent");
}

// ============================================
// Cleanup: Remove orphaned files
// ============================================

export async function cleanupOrphanedFiles(
  validHashes: Set<string>
): Promise<number> {
  const db = await getDB();
  const allFiles = await db.getAll("files");
  let deletedCount = 0;

  for (const file of allFiles) {
    if (!validHashes.has(file.hash)) {
      await db.delete("files", file.hash);
      deletedCount++;
    }
  }

  return deletedCount;
}
