"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ParsedContent, Position, TextSegment } from "@/types/content";

interface TxtReaderProps {
  content: ParsedContent;
  initialPosition?: Position;
  fontSize: number;
  onPositionChange: (position: Position, percentage: number) => void;
  onSegmentClick?: (segment: TextSegment, position: Position) => void;
}

export function TxtReader({
  content,
  initialPosition,
  fontSize,
  onPositionChange,
  onSegmentClick,
}: TxtReaderProps) {
  const [currentChapter, setCurrentChapter] = useState(
    initialPosition?.chapter ?? 0
  );
  const [currentSegment, setCurrentSegment] = useState(
    initialPosition?.segment ?? 0
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Calculate total segments before current position
  const calculatePercentage = useCallback(
    (chapter: number, segment: number): number => {
      let totalBefore = 0;
      for (let i = 0; i < chapter; i++) {
        totalBefore += content.chapters[i]?.segments.length ?? 0;
      }
      totalBefore += segment;

      const totalSegments = content.chapters.reduce(
        (sum, ch) => sum + ch.segments.length,
        0
      );

      return totalSegments > 0 ? (totalBefore / totalSegments) * 100 : 0;
    },
    [content.chapters]
  );

  // Update position and notify parent
  const updatePosition = useCallback(
    (chapter: number, segment: number) => {
      setCurrentChapter(chapter);
      setCurrentSegment(segment);

      const percentage = calculatePercentage(chapter, segment);
      onPositionChange({ chapter, segment }, percentage);
    },
    [calculatePercentage, onPositionChange]
  );

  // Navigate to next segment
  const goNext = useCallback(() => {
    const chapter = content.chapters[currentChapter];
    if (!chapter) return;

    if (currentSegment < chapter.segments.length - 1) {
      updatePosition(currentChapter, currentSegment + 1);
    } else if (currentChapter < content.chapters.length - 1) {
      updatePosition(currentChapter + 1, 0);
    }
  }, [content.chapters, currentChapter, currentSegment, updatePosition]);

  // Navigate to previous segment
  const goPrev = useCallback(() => {
    if (currentSegment > 0) {
      updatePosition(currentChapter, currentSegment - 1);
    } else if (currentChapter > 0) {
      const prevChapter = content.chapters[currentChapter - 1];
      updatePosition(currentChapter - 1, prevChapter.segments.length - 1);
    }
  }, [content.chapters, currentChapter, currentSegment, updatePosition]);

  // Go to specific chapter
  const goToChapter = useCallback(
    (chapterIndex: number) => {
      if (chapterIndex >= 0 && chapterIndex < content.chapters.length) {
        updatePosition(chapterIndex, 0);
      }
    },
    [content.chapters.length, updatePosition]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Scroll to current segment
  useEffect(() => {
    const key = `${currentChapter}-${currentSegment}`;
    const element = segmentRefs.current.get(key);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentChapter, currentSegment]);

  const currentChapterData = content.chapters[currentChapter];
  if (!currentChapterData) {
    return <div className="reader-empty">No content available</div>;
  }

  // Display current segment and surrounding context
  const visibleSegments = currentChapterData.segments.slice(
    Math.max(0, currentSegment - 1),
    currentSegment + 3
  );

  return (
    <div className="txt-reader" ref={containerRef}>
      {/* Chapter title */}
      <div className="reader-chapter-title">{currentChapterData.title}</div>

      {/* Content */}
      <div className="reader-content" style={{ fontSize: `${fontSize}px` }}>
        {visibleSegments.map((segment, idx) => {
          const actualIndex = Math.max(0, currentSegment - 1) + idx;
          const isActive = actualIndex === currentSegment;
          const key = `${currentChapter}-${actualIndex}`;

          return (
            <div
              key={segment.id}
              ref={(el) => {
                if (el) segmentRefs.current.set(key, el);
              }}
              className={`reader-segment ${isActive ? "active" : ""} ${segment.type}`}
              onClick={() => {
                updatePosition(currentChapter, actualIndex);
                onSegmentClick?.(segment, { chapter: currentChapter, segment: actualIndex });
              }}
            >
              {segment.text}
            </div>
          );
        })}
      </div>

      {/* Navigation hint */}
      <div className="reader-nav-hint">
        <span>← 上一段</span>
        <span>
          {currentSegment + 1} / {currentChapterData.segments.length}
        </span>
        <span>下一段 →</span>
      </div>

      {/* Touch/click areas for navigation */}
      <div className="reader-touch-zones">
        <div className="touch-prev" onClick={goPrev} />
        <div className="touch-next" onClick={goNext} />
      </div>
    </div>
  );
}

// Export navigation helpers
export { TxtReader };
