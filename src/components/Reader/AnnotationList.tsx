"use client";

import { useState } from "react";
import { deleteAnnotation, updateAnnotation } from "@/lib/annotations";
import type { Annotation, Position } from "@/types/content";

interface AnnotationListProps {
  annotations: Annotation[];
  onNavigate: (position: Position) => void;
  onAnnotationDeleted: (id: string) => void;
  onAnnotationUpdated: (annotation: Annotation) => void;
  onClose: () => void;
}

export function AnnotationList({
  annotations,
  onNavigate,
  onAnnotationDeleted,
  onAnnotationUpdated,
  onClose,
}: AnnotationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const bookmarks = annotations.filter((a) => a.type === "bookmark");
  const highlights = annotations.filter((a) => a.type === "highlight");
  const notes = annotations.filter((a) => a.type === "note");

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const success = await deleteAnnotation(id);
    setDeleting(null);
    if (success) {
      onAnnotationDeleted(id);
    }
  };

  const handleEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditNote(annotation.note || "");
  };

  const handleSaveEdit = async (id: string) => {
    const updated = await updateAnnotation(id, { note: editNote });
    if (updated) {
      onAnnotationUpdated(updated);
    }
    setEditingId(null);
    setEditNote("");
  };

  const formatPosition = (pos: Position): string => {
    if (pos.page !== undefined) {
      return `Page ${pos.page}`;
    }
    if (pos.chapter !== undefined) {
      return `Ch.${pos.chapter + 1}${pos.segment !== undefined ? ` P.${pos.segment + 1}` : ""}`;
    }
    return "";
  };

  const renderAnnotation = (annotation: Annotation) => {
    const isEditing = editingId === annotation.id;
    const isDeleting = deleting === annotation.id;

    return (
      <div key={annotation.id} className="annotation-item">
        <div className="annotation-item-header">
          <span
            className="annotation-position"
            onClick={() => onNavigate(annotation.position_start)}
          >
            {formatPosition(annotation.position_start)}
          </span>
          {annotation.type === "highlight" && annotation.color && (
            <span
              className="annotation-color-indicator"
              style={{ backgroundColor: annotation.color }}
            />
          )}
          <div className="annotation-actions">
            <button
              className="annotation-action-btn"
              onClick={() => handleEdit(annotation)}
              disabled={isDeleting}
            >
              Edit
            </button>
            <button
              className="annotation-action-btn annotation-action-delete"
              onClick={() => handleDelete(annotation.id)}
              disabled={isDeleting}
            >
              {isDeleting ? "..." : "Delete"}
            </button>
          </div>
        </div>
        {isEditing ? (
          <div className="annotation-edit">
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="annotation-edit-actions">
              <button className="btn-small" onClick={() => handleSaveEdit(annotation.id)}>
                Save
              </button>
              <button className="btn-small btn-secondary" onClick={() => setEditingId(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          annotation.note && <div className="annotation-note">{annotation.note}</div>
        )}
      </div>
    );
  };

  return (
    <div className="annotation-list-overlay" onClick={onClose}>
      <div className="annotation-list" onClick={(e) => e.stopPropagation()}>
        <div className="annotation-list-header">
          <h3>Annotations</h3>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="annotation-list-content">
          {annotations.length === 0 ? (
            <div className="annotation-empty">No annotations yet</div>
          ) : (
            <>
              {bookmarks.length > 0 && (
                <div className="annotation-section">
                  <h4>Bookmarks ({bookmarks.length})</h4>
                  {bookmarks.map(renderAnnotation)}
                </div>
              )}

              {highlights.length > 0 && (
                <div className="annotation-section">
                  <h4>Highlights ({highlights.length})</h4>
                  {highlights.map(renderAnnotation)}
                </div>
              )}

              {notes.length > 0 && (
                <div className="annotation-section">
                  <h4>Notes ({notes.length})</h4>
                  {notes.map(renderAnnotation)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
