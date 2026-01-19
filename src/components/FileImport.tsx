"use client";

import { useState, useRef, useCallback } from "react";
import { importFile, detectFileType } from "@/lib/import";
import type { ContentResource } from "@/types/content";

interface FileImportProps {
  bookId: string;
  bookTitle: string;
  onImportComplete: (resource: ContentResource) => void;
  onCancel: () => void;
}

export function FileImport({
  bookId,
  bookTitle,
  onImportComplete,
  onCancel,
}: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setProgress(null);

      // Validate file type
      const fileType = detectFileType(file);
      if (!fileType) {
        setError("Unsupported file type. Please use TXT, EPUB, or PDF.");
        return;
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError("File too large. Maximum size is 100MB.");
        return;
      }

      setIsImporting(true);
      setProgress("Reading file...");

      try {
        setProgress("Processing content...");
        const result = await importFile(file, bookId);

        if (!result.success) {
          setError(result.error || "Import failed");
          return;
        }

        if (result.alreadyExists) {
          setProgress("File already imported");
        } else {
          setProgress("Import complete!");
        }

        // Small delay to show success message
        setTimeout(() => {
          if (result.resource) {
            onImportComplete(result.resource);
          }
        }, 500);
      } catch (err) {
        setError(
          `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsImporting(false);
      }
    },
    [bookId, onImportComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog file-import-dialog">
        <div className="dialog-header">
          <h2>Import Content</h2>
          <button onClick={onCancel} className="btn-close" disabled={isImporting}>
            &times;
          </button>
        </div>

        <div className="import-book-info">
          <span className="import-label">For book:</span>
          <span className="import-book-title">{bookTitle}</span>
        </div>

        <div
          className={`drop-zone ${isDragging ? "dragging" : ""} ${isImporting ? "importing" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={isImporting ? undefined : handleClickUpload}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".txt,.epub,.pdf,text/plain,application/epub+zip,application/pdf"
            style={{ display: "none" }}
            disabled={isImporting}
          />

          {isImporting ? (
            <div className="import-progress">
              <div className="spinner" />
              <p>{progress}</p>
            </div>
          ) : (
            <>
              <div className="drop-icon">+</div>
              <p className="drop-text">
                Drag & drop a file here, or click to select
              </p>
              <p className="drop-formats">Supported: TXT, EPUB, PDF</p>
            </>
          )}
        </div>

        {error && <div className="import-error">{error}</div>}

        <div className="dialog-actions">
          <button
            onClick={onCancel}
            className="btn-cancel"
            disabled={isImporting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
