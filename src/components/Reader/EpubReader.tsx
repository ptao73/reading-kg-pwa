"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ParsedContent, Position, TextSegment } from "@/types/content";

interface EpubReaderProps {
  content: ParsedContent;
  initialPosition?: Position;
  fontSize: number;
  onPositionChange: (position: Position, percentage: number) => void;
}

export function EpubReader({
  content,
  initialPosition,
  fontSize,
  onPositionChange,
}: EpubReaderProps) {
  const [currentChapter, setCurrentChapter] = useState(
    initialPosition?.chapter ?? 0
  );
  const [currentSegment, setCurrentSegment] = useState(
    initialPosition?.segment ?? 0
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const chapter = content.chapters[currentChapter];
  const segments = chapter?.segments ?? [];
  const totalChapters = content.chapters.length;

  // Calculate total segments across all chapters
  const totalSegments = content.chapters.reduce(
    (sum, ch) => sum + ch.segments.length,
    0
  );

  // Calculate overall progress
  const calculateProgress = useCallback(
    (chapterIdx: number, segmentIdx: number) => {
      let segmentsBefore = 0;
      for (let i = 0; i < chapterIdx; i++) {
        segmentsBefore += content.chapters[i]?.segments.length ?? 0;
      }
      segmentsBefore += segmentIdx;
      return totalSegments > 0 ? (segmentsBefore / totalSegments) * 100 : 0;
    },
    [content.chapters, totalSegments]
  );

  // Navigate to next segment
  const goNext = useCallback(() => {
    if (currentSegment < segments.length - 1) {
      setCurrentSegment((prev) => prev + 1);
    } else if (currentChapter < totalChapters - 1) {
      setCurrentChapter((prev) => prev + 1);
      setCurrentSegment(0);
    }
  }, [currentSegment, segments.length, currentChapter, totalChapters]);

  // Navigate to previous segment
  const goPrev = useCallback(() => {
    if (currentSegment > 0) {
      setCurrentSegment((prev) => prev - 1);
    } else if (currentChapter > 0) {
      setCurrentChapter((prev) => prev - 1);
      const prevChapter = content.chapters[currentChapter - 1];
      setCurrentSegment((prevChapter?.segments.length ?? 1) - 1);
    }
  }, [currentSegment, currentChapter, content.chapters]);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Report position changes
  useEffect(() => {
    const position: Position = {
      chapter: currentChapter,
      segment: currentSegment,
    };
    const percentage = calculateProgress(currentChapter, currentSegment);
    onPositionChange(position, percentage);
  }, [currentChapter, currentSegment, calculateProgress, onPositionChange]);

  // Touch handling for mobile swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        goPrev();
      } else {
        goNext();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Click navigation zones (left third = prev, right third = next)
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
    // Middle third does nothing (allows text selection)
  };

  // Jump to specific chapter
  const goToChapter = (chapterIdx: number) => {
    if (chapterIdx >= 0 && chapterIdx < totalChapters) {
      setCurrentChapter(chapterIdx);
      setCurrentSegment(0);
    }
  };

  // Render segments with context
  const renderSegment = (segment: TextSegment, idx: number) => {
    const isActive = idx === currentSegment;
    const className = `epub-segment epub-segment-${segment.type} ${
      isActive ? "epub-segment-active" : ""
    }`;

    return (
      <div key={segment.id} className={className}>
        {segment.text}
      </div>
    );
  };

  // Calculate visible range (show current segment with context)
  const visibleStart = Math.max(0, currentSegment - 1);
  const visibleEnd = Math.min(segments.length, currentSegment + 3);
  const visibleSegments = segments.slice(visibleStart, visibleEnd);

  if (!chapter) {
    return <div className="epub-reader-error">No content available</div>;
  }

  return (
    <div
      ref={containerRef}
      className="epub-reader"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Chapter title */}
      <div className="epub-chapter-header">
        <span className="epub-chapter-title">{chapter.title}</span>
        <span className="epub-chapter-progress">
          {currentChapter + 1} / {totalChapters}
        </span>
      </div>

      {/* Content */}
      <div className="epub-content">
        {visibleSegments.map((seg, idx) =>
          renderSegment(seg, visibleStart + idx)
        )}
      </div>

      {/* Segment progress */}
      <div className="epub-segment-progress">
        {currentSegment + 1} / {segments.length}
      </div>

      {/* Navigation hints */}
      <div className="epub-nav-hints">
        <span className="epub-nav-hint epub-nav-prev">
          {currentSegment > 0 || currentChapter > 0 ? "←" : ""}
        </span>
        <span className="epub-nav-hint epub-nav-next">
          {currentSegment < segments.length - 1 || currentChapter < totalChapters - 1
            ? "→"
            : ""}
        </span>
      </div>
    </div>
  );
}
