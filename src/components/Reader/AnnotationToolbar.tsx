"use client";

import { useState } from "react";
import {
  createHighlight,
  createBookmark,
  createNote,
  HIGHLIGHT_COLORS,
  DEFAULT_HIGHLIGHT_COLOR,
} from "@/lib/annotations";
import type { Position, Annotation } from "@/types/content";

interface AnnotationToolbarProps {
  resourceId: string;
  currentPosition: Position;
  hasSelection: boolean;
  selectionStart?: Position;
  selectionEnd?: Position;
  onAnnotationCreated: (annotation: Annotation) => void;
  onClose: () => void;
}

export function AnnotationToolbar({
  resourceId,
  currentPosition,
  hasSelection,
  selectionStart,
  selectionEnd,
  onAnnotationCreated,
  onClose,
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_HIGHLIGHT_COLOR);
  const [creating, setCreating] = useState(false);

  const handleHighlight = async () => {
    if (!hasSelection || !selectionStart || !selectionEnd) return;

    setCreating(true);
    const annotation = await createHighlight(
      resourceId,
      selectionStart,
      selectionEnd,
      selectedColor
    );
    setCreating(false);

    if (annotation) {
      onAnnotationCreated(annotation);
      onClose();
    }
  };

  const handleBookmark = async () => {
    setCreating(true);
    const annotation = await createBookmark(resourceId, currentPosition, noteText || undefined);
    setCreating(false);

    if (annotation) {
      onAnnotationCreated(annotation);
      onClose();
    }
  };

  const handleNote = async () => {
    if (!noteText.trim()) return;

    setCreating(true);
    const annotation = await createNote(resourceId, currentPosition, noteText.trim());
    setCreating(false);

    if (annotation) {
      onAnnotationCreated(annotation);
      onClose();
    }
  };

  return (
    <div className="annotation-toolbar">
      <div className="annotation-toolbar-buttons">
        {/* Highlight button (only if selection) */}
        {hasSelection && (
          <button
            className="annotation-btn annotation-btn-highlight"
            onClick={() => setShowColorPicker(!showColorPicker)}
            disabled={creating}
            style={{ backgroundColor: selectedColor }}
          >
            Highlight
          </button>
        )}

        {/* Bookmark button */}
        <button
          className="annotation-btn annotation-btn-bookmark"
          onClick={handleBookmark}
          disabled={creating}
        >
          Bookmark
        </button>

        {/* Note button */}
        <button
          className="annotation-btn annotation-btn-note"
          onClick={() => setShowNoteInput(!showNoteInput)}
          disabled={creating}
        >
          Note
        </button>

        {/* Close button */}
        <button className="annotation-btn annotation-btn-close" onClick={onClose}>
          ×
        </button>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className="annotation-color-picker">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.name}
              className={`color-swatch ${selectedColor === color.value ? "active" : ""}`}
              style={{ backgroundColor: color.value }}
              onClick={() => {
                setSelectedColor(color.value);
                handleHighlight();
              }}
            />
          ))}
        </div>
      )}

      {/* Note input */}
      {showNoteInput && (
        <div className="annotation-note-input">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            autoFocus
          />
          <div className="annotation-note-actions">
            <button
              className="btn-primary"
              onClick={handleNote}
              disabled={!noteText.trim() || creating}
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
