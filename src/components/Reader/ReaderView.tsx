"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getParsedContent, getFile } from "@/lib/indexeddb";
import { parseTxt } from "@/lib/import/txt-parser";
import { parseEpub } from "@/lib/import/epub-parser";
import { parsePdf } from "@/lib/import/pdf-parser";
import { TxtReader } from "./TxtReader";
import { EpubReader } from "./EpubReader";
import { PdfReader } from "./PdfReader";
import { ReaderControls } from "./ReaderControls";
import type {
  ContentResource,
  ParsedContent,
  Position,
  ReadingProgress,
} from "@/types/content";
import type { Book } from "@/types/database";

interface ReaderViewProps {
  resource: ContentResource;
  book: Book;
  onClose: () => void;
}

type ReaderTheme = "light" | "dark";

export function ReaderView({ resource, book, onClose }: ReaderViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ParsedContent | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<ReaderTheme>("dark");
  const [showControls, setShowControls] = useState(false);
  const [showToc, setShowToc] = useState(false);

  // Load content and progress on mount
  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError(null);

      try {
        // 1. Try to get parsed content from IndexedDB
        let parsed = await getParsedContent(resource.id);

        // 2. For PDF, we always need the raw file buffer for rendering
        if (resource.type === "pdf") {
          const file = await getFile(resource.file_hash);
          if (!file) {
            setError("PDF file not found. Please re-import the file.");
            return;
          }
          setPdfBuffer(file.data);

          // Parse if not already parsed
          if (!parsed) {
            const result = await parsePdf(file.data, resource.id);
            parsed = result.parsed;
          }
        }

        // 3. If not found (non-PDF), re-parse from file
        if (!parsed) {
          const file = await getFile(resource.file_hash);
          if (!file) {
            setError("Content not found. Please re-import the file.");
            return;
          }

          if (resource.type === "txt") {
            const result = await parseTxt(file.data, resource.id);
            parsed = result.parsed;
          } else if (resource.type === "epub") {
            const result = await parseEpub(file.data, resource.id);
            parsed = result.parsed;
          } else if (resource.type !== "pdf") {
            setError(`${resource.type.toUpperCase()} reader not yet implemented`);
            return;
          }
        }

        setContent(parsed);

        // 3. Load reading progress from Supabase
        const { data: progressData } = await supabase
          .from("reading_progress")
          .select("*")
          .eq("resource_id", resource.id)
          .single();

        if (progressData) {
          setProgress(progressData as ReadingProgress);
        }

        // 4. Load user settings
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from("user_settings")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (settings) {
            setFontSize(settings.reader_font_size || 18);
            setTheme((settings.reader_theme as ReaderTheme) || "dark");
          }
        }
      } catch (err) {
        console.error("Load error:", err);
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [resource]);

  // Save progress to Supabase
  const saveProgress = useCallback(
    async (position: Position, percentage: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const progressData = {
        user_id: user.id,
        resource_id: resource.id,
        current_position: position,
        percentage_read: Math.round(percentage),
        last_read_at: new Date().toISOString(),
      };

      // Upsert progress
      await supabase.from("reading_progress").upsert(progressData, {
        onConflict: "user_id,resource_id",
      });

      setProgress((prev) =>
        prev
          ? { ...prev, ...progressData }
          : ({ id: "", ...progressData } as ReadingProgress)
      );
    },
    [resource.id]
  );

  // Handle position change with debounce
  const handlePositionChange = useCallback(
    (position: Position, percentage: number) => {
      // Debounce save - only save every 2 seconds
      const timeout = setTimeout(() => {
        saveProgress(position, percentage);
      }, 2000);

      return () => clearTimeout(timeout);
    },
    [saveProgress]
  );

  // Save settings
  const saveSettings = useCallback(
    async (newFontSize: number, newTheme: ReaderTheme) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          reader_font_size: newFontSize,
          reader_theme: newTheme,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    },
    []
  );

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    saveSettings(size, theme);
  };

  const handleThemeChange = (newTheme: ReaderTheme) => {
    setTheme(newTheme);
    saveSettings(fontSize, newTheme);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`reader-container reader-${theme}`}>
        <div className="reader-loading">Loading...</div>
      </div>
    );
  }

  // Error state (PDF can work with just the buffer)
  const hasContent = content || (resource.type === "pdf" && pdfBuffer);
  if (error || !hasContent) {
    return (
      <div className={`reader-container reader-${theme}`}>
        <div className="reader-error">
          <p>{error || "Failed to load content"}</p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`reader-container reader-${theme}`}>
      {/* Header */}
      <div
        className="reader-header"
        onClick={() => setShowControls(!showControls)}
      >
        <button onClick={onClose} className="btn-back">
          ←
        </button>
        <div className="reader-title">{book.title}</div>
        <button onClick={() => setShowToc(!showToc)} className="btn-toc">
          ☰
        </button>
      </div>

      {/* Controls overlay */}
      {showControls && (
        <ReaderControls
          fontSize={fontSize}
          onFontSizeChange={handleFontSizeChange}
          theme={theme}
          onThemeChange={handleThemeChange}
          progress={progress?.percentage_read ?? 0}
          onClose={() => setShowControls(false)}
        />
      )}

      {/* Table of Contents (not shown for PDF) */}
      {showToc && content && resource.type !== "pdf" && (
        <div className="reader-toc-overlay" onClick={() => setShowToc(false)}>
          <div className="reader-toc" onClick={(e) => e.stopPropagation()}>
            <h3>目录</h3>
            <ul>
              {content.chapters.map((chapter, idx) => (
                <li
                  key={chapter.id}
                  className={
                    idx === (progress?.current_position?.chapter ?? 0)
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    handlePositionChange({ chapter: idx, segment: 0 }, 0);
                    setShowToc(false);
                  }}
                >
                  {chapter.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Reader content based on type */}
      {resource.type === "txt" && content && (
        <TxtReader
          content={content}
          initialPosition={progress?.current_position}
          fontSize={fontSize}
          onPositionChange={handlePositionChange}
        />
      )}

      {resource.type === "epub" && content && (
        <EpubReader
          content={content}
          initialPosition={progress?.current_position}
          fontSize={fontSize}
          onPositionChange={handlePositionChange}
        />
      )}

      {resource.type === "pdf" && pdfBuffer && (
        <PdfReader
          fileBuffer={pdfBuffer}
          initialPosition={progress?.current_position}
          onPositionChange={handlePositionChange}
        />
      )}

      {/* Progress bar */}
      <div className="reader-progress-bar">
        <div
          className="reader-progress-fill"
          style={{ width: `${progress?.percentage_read ?? 0}%` }}
        />
      </div>
    </div>
  );
}
