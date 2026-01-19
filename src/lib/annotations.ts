import { supabase } from "./supabase";
import type { Annotation, AnnotationInsert, Position } from "@/types/content";

// ============================================
// Annotation Colors
// ============================================

export const HIGHLIGHT_COLORS = [
  { name: "yellow", value: "#fef08a" },
  { name: "green", value: "#bbf7d0" },
  { name: "blue", value: "#bfdbfe" },
  { name: "pink", value: "#fbcfe8" },
  { name: "orange", value: "#fed7aa" },
];

export const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].value;

// ============================================
// Get Annotations
// ============================================

export async function getAnnotations(resourceId: string): Promise<Annotation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("resource_id", resourceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch annotations:", error);
    return [];
  }

  return (data ?? []) as Annotation[];
}

// ============================================
// Create Annotation
// ============================================

export async function createAnnotation(
  resourceId: string,
  type: "highlight" | "bookmark" | "note",
  positionStart: Position,
  positionEnd?: Position | null,
  note?: string,
  color?: string
): Promise<Annotation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const annotation: AnnotationInsert = {
    user_id: user.id,
    resource_id: resourceId,
    type,
    position_start: positionStart,
    position_end: positionEnd ?? null,
    note: note ?? null,
    color: color ?? (type === "highlight" ? DEFAULT_HIGHLIGHT_COLOR : null),
  };

  const { data, error } = await supabase
    .from("annotations")
    .insert(annotation)
    .select()
    .single();

  if (error) {
    console.error("Failed to create annotation:", error);
    return null;
  }

  return data as Annotation;
}

// ============================================
// Update Annotation
// ============================================

export async function updateAnnotation(
  id: string,
  updates: { note?: string; color?: string }
): Promise<Annotation | null> {
  const { data, error } = await supabase
    .from("annotations")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update annotation:", error);
    return null;
  }

  return data as Annotation;
}

// ============================================
// Delete Annotation
// ============================================

export async function deleteAnnotation(id: string): Promise<boolean> {
  const { error } = await supabase.from("annotations").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete annotation:", error);
    return false;
  }

  return true;
}

// ============================================
// Create Bookmark
// ============================================

export async function createBookmark(
  resourceId: string,
  position: Position,
  note?: string
): Promise<Annotation | null> {
  return createAnnotation(resourceId, "bookmark", position, null, note);
}

// ============================================
// Get Bookmarks
// ============================================

export async function getBookmarks(resourceId: string): Promise<Annotation[]> {
  const annotations = await getAnnotations(resourceId);
  return annotations.filter((a) => a.type === "bookmark");
}

// ============================================
// Create Highlight
// ============================================

export async function createHighlight(
  resourceId: string,
  positionStart: Position,
  positionEnd: Position,
  color?: string,
  note?: string
): Promise<Annotation | null> {
  return createAnnotation(
    resourceId,
    "highlight",
    positionStart,
    positionEnd,
    note,
    color
  );
}

// ============================================
// Get Highlights
// ============================================

export async function getHighlights(resourceId: string): Promise<Annotation[]> {
  const annotations = await getAnnotations(resourceId);
  return annotations.filter((a) => a.type === "highlight");
}

// ============================================
// Create Note
// ============================================

export async function createNote(
  resourceId: string,
  position: Position,
  note: string
): Promise<Annotation | null> {
  return createAnnotation(resourceId, "note", position, null, note);
}

// ============================================
// Get Notes
// ============================================

export async function getNotes(resourceId: string): Promise<Annotation[]> {
  const annotations = await getAnnotations(resourceId);
  return annotations.filter((a) => a.type === "note");
}

// ============================================
// Check if Position is Highlighted
// ============================================

export function isPositionHighlighted(
  annotations: Annotation[],
  position: Position
): Annotation | null {
  for (const annotation of annotations) {
    if (annotation.type !== "highlight") continue;

    const start = annotation.position_start;
    const end = annotation.position_end;

    if (!end) continue;

    // Check if position falls within highlight range
    // For segment-based navigation
    if (
      start.chapter !== undefined &&
      end.chapter !== undefined &&
      position.chapter !== undefined
    ) {
      if (position.chapter < start.chapter || position.chapter > end.chapter) {
        continue;
      }

      if (
        start.segment !== undefined &&
        end.segment !== undefined &&
        position.segment !== undefined
      ) {
        // Same chapter
        if (start.chapter === end.chapter) {
          if (
            position.segment >= start.segment &&
            position.segment <= end.segment
          ) {
            return annotation;
          }
        } else {
          // Multi-chapter highlight
          if (position.chapter === start.chapter) {
            if (position.segment >= start.segment) return annotation;
          } else if (position.chapter === end.chapter) {
            if (position.segment <= end.segment) return annotation;
          } else {
            // In between chapters
            return annotation;
          }
        }
      }
    }

    // For page-based navigation (PDF)
    if (start.page !== undefined && end.page !== undefined && position.page !== undefined) {
      if (position.page >= start.page && position.page <= end.page) {
        return annotation;
      }
    }
  }

  return null;
}

// ============================================
// Export All Annotations
// ============================================

export async function exportAnnotations(
  resourceId: string
): Promise<string> {
  const annotations = await getAnnotations(resourceId);

  const lines: string[] = [];
  lines.push("# Annotations Export");
  lines.push("");

  const bookmarks = annotations.filter((a) => a.type === "bookmark");
  const highlights = annotations.filter((a) => a.type === "highlight");
  const notes = annotations.filter((a) => a.type === "note");

  if (bookmarks.length > 0) {
    lines.push("## Bookmarks");
    for (const bookmark of bookmarks) {
      const pos = formatPosition(bookmark.position_start);
      lines.push(`- ${pos}${bookmark.note ? `: ${bookmark.note}` : ""}`);
    }
    lines.push("");
  }

  if (highlights.length > 0) {
    lines.push("## Highlights");
    for (const highlight of highlights) {
      const pos = formatPosition(highlight.position_start);
      lines.push(`- ${pos}${highlight.note ? `: ${highlight.note}` : ""}`);
    }
    lines.push("");
  }

  if (notes.length > 0) {
    lines.push("## Notes");
    for (const note of notes) {
      const pos = formatPosition(note.position_start);
      lines.push(`- ${pos}: ${note.note}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatPosition(pos: Position): string {
  if (pos.page !== undefined) {
    return `Page ${pos.page}`;
  }
  if (pos.chapter !== undefined) {
    return `Chapter ${pos.chapter + 1}${pos.segment !== undefined ? `, Paragraph ${pos.segment + 1}` : ""}`;
  }
  return "Unknown position";
}
