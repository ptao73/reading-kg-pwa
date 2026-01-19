"use client";

import type { Book } from "@/types/database";

interface CurrentBookCardProps {
  book: Book;
  readingStartedAt: string | null;
  onFinished: () => void;
  onEnded: () => void;
  onSwitchBook: () => void;
  loading: boolean;
}

export function CurrentBookCard({
  book,
  readingStartedAt,
  onFinished,
  onEnded,
  onSwitchBook,
  loading,
}: CurrentBookCardProps) {
  const formatDuration = (startDate: string | null): string => {
    if (!startDate) return "";

    const start = new Date(startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Started today";
    if (diffDays === 1) return "Started yesterday";
    if (diffDays < 7) return `Reading for ${diffDays} days`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Reading for ${weeks} week${weeks > 1 ? "s" : ""}`;
    }
    const months = Math.floor(diffDays / 30);
    return `Reading for ${months} month${months > 1 ? "s" : ""}`;
  };

  return (
    <div className="current-book-card">
      <div className="current-book-label">Currently Reading</div>

      <div className="current-book-info">
        <div className="current-book-title">{book.title}</div>
        {book.author && (
          <div className="current-book-author">{book.author}</div>
        )}
        {readingStartedAt && (
          <div className="current-book-duration">
            {formatDuration(readingStartedAt)}
          </div>
        )}
      </div>

      <div className="reading-actions">
        <button
          className="btn-finished"
          onClick={onFinished}
          disabled={loading}
        >
          Finished (100%)
        </button>
        <button
          className="btn-ended"
          onClick={onEnded}
          disabled={loading}
        >
          Ended (Partial)
        </button>
      </div>

      <button
        className="btn-switch-book"
        onClick={onSwitchBook}
        disabled={loading}
      >
        Switch to different book
      </button>
    </div>
  );
}
