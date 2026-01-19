"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { Position } from "@/types/content";

// Configure PDF.js worker (bundle locally for offline support)
if (typeof window !== "undefined") {
  try {
    const worker = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" }
    );
    pdfjsLib.GlobalWorkerOptions.workerPort = worker;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/reading-kg-pwa/pdf.worker.min.mjs";
  }
}

interface PdfReaderProps {
  fileBuffer: ArrayBuffer;
  initialPosition?: Position;
  onPositionChange: (position: Position, percentage: number) => void;
}

export function PdfReader({
  fileBuffer,
  initialPosition,
  onPositionChange,
}: PdfReaderProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPosition?.page ?? 1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF document
  useEffect(() => {
    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
        const pdfDoc = await loadingTask.promise;

        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);

        // Set initial page from position
        if (initialPosition?.page) {
          setCurrentPage(
            Math.min(Math.max(1, initialPosition.page), pdfDoc.numPages)
          );
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
        setError("Failed to load PDF document");
      } finally {
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      if (pdf) {
        pdf.destroy();
      }
    };
  }, [fileBuffer]);

  // Sync to externally provided position (e.g. loaded progress)
  useEffect(() => {
    if (!initialPosition?.page || totalPages === 0) return;
    const clamped = Math.min(Math.max(1, initialPosition.page), totalPages);
    setCurrentPage(clamped);
  }, [initialPosition?.page, totalPages]);

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    async function renderPage() {
      try {
        const page = await pdf!.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d")!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch (err) {
        console.error("Failed to render page:", err);
      }
    }

    renderPage();
  }, [pdf, currentPage, scale]);

  // Report position changes
  useEffect(() => {
    if (totalPages > 0) {
      const position: Position = { page: currentPage };
      const percentage = (currentPage / totalPages) * 100;
      onPositionChange(position, percentage);
    }
  }, [currentPage, totalPages, onPositionChange]);

  // Navigation
  const goNext = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage, totalPages]);

  const goPrev = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          goPrev();
          break;
        case "+":
        case "=":
          e.preventDefault();
          setScale((s) => Math.min(s + 0.25, 3));
          break;
        case "-":
          e.preventDefault();
          setScale((s) => Math.max(s - 0.25, 0.5));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Touch handling
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;

    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        goPrev();
      } else {
        goNext();
      }
    }

    touchStartX.current = null;
  };

  // Click navigation (left/right zones)
  const handleClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      goPrev();
    } else if (x > (2 * width) / 3) {
      goNext();
    }
  };

  if (loading) {
    return <div className="pdf-reader-loading">Loading PDF...</div>;
  }

  if (error) {
    return <div className="pdf-reader-error">{error}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="pdf-reader"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Page info */}
      <div className="pdf-page-info">
        <button
          className="pdf-nav-btn"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          disabled={currentPage <= 1}
        >
          ←
        </button>
        <span className="pdf-page-number">
          <input
            type="number"
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            onClick={(e) => e.stopPropagation()}
            min={1}
            max={totalPages}
            className="pdf-page-input"
          />
          <span> / {totalPages}</span>
        </span>
        <button
          className="pdf-nav-btn"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          disabled={currentPage >= totalPages}
        >
          →
        </button>
      </div>

      {/* Zoom controls */}
      <div className="pdf-zoom-controls">
        <button
          className="pdf-zoom-btn"
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.max(s - 0.25, 0.5));
          }}
        >
          −
        </button>
        <span className="pdf-zoom-level">{Math.round(scale * 100)}%</span>
        <button
          className="pdf-zoom-btn"
          onClick={(e) => {
            e.stopPropagation();
            setScale((s) => Math.min(s + 0.25, 3));
          }}
        >
          +
        </button>
      </div>

      {/* Canvas container */}
      <div className="pdf-canvas-container">
        <canvas ref={canvasRef} className="pdf-canvas" />
      </div>
    </div>
  );
}
