"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book } from "@/types/database";
import {
  createReadingEvent,
  correctEvent,
  getRecentEventsWithBooks,
  setCurrentBook,
  getCurrentBookId,
  type EventWithBook,
} from "@/lib/events";
import { getBook } from "@/lib/books";
import { CurrentBookCard } from "./CurrentBookCard";
import { EventHistory } from "./EventHistory";
import { BookSelector } from "./BookSelector";
import { EndedDialog } from "./EndedDialog";
import { SyncStatus } from "./SyncStatus";

type FlowState =
  | "loading"           // Initial load
  | "no_book"           // No current book selected (need to select one)
  | "reading"           // Currently reading a book
  | "ending"            // Entering completion percentage
  | "selecting_next";   // Just finished/ended, selecting next book

export function ReadingFlow() {
  const [state, setState] = useState<FlowState>("loading");
  const [currentBook, setCurrentBookState] = useState<Book | null>(null);
  const [readingStartedAt, setReadingStartedAt] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<EventWithBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [undoingEventId, setUndoingEventId] = useState<string | null>(null);

  // Load initial state
  const loadState = useCallback(async () => {
    // Get recent events with book info
    const events = await getRecentEventsWithBooks(10);
    setRecentEvents(events);

    // Get the most recent event's occurred_at as reading start time
    const lastEventTime = events.length > 0 ? events[0].occurred_at : null;
    setReadingStartedAt(lastEventTime);

    // Check if there's a stored current book
    const currentBookId = getCurrentBookId();

    if (currentBookId) {
      const book = await getBook(currentBookId);
      if (book) {
        setCurrentBookState(book);
        setState("reading");
        return;
      }
    }

    // No current book - user needs to select one
    setState("no_book");
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleBookSelect = (book: Book) => {
    setCurrentBook(book.id);
    setCurrentBookState(book);
    setState("reading");
  };

  const handleFinished = async () => {
    if (!currentBook) return;
    setLoading(true);

    await createReadingEvent(currentBook.id, "finished", 100);

    // Clear current book and prompt for next
    setCurrentBook(null);
    setCurrentBookState(null);

    // Refresh events
    const events = await getRecentEventsWithBooks(10);
    setRecentEvents(events);
    setReadingStartedAt(events.length > 0 ? events[0].occurred_at : null);

    setLoading(false);
    setState("selecting_next");
  };

  const handleEnded = () => {
    setState("ending");
  };

  const handleEndedConfirm = async (completion: number) => {
    if (!currentBook) return;
    setLoading(true);

    await createReadingEvent(currentBook.id, "ended", completion);

    // Clear current book and prompt for next
    setCurrentBook(null);
    setCurrentBookState(null);

    // Refresh events
    const events = await getRecentEventsWithBooks(10);
    setRecentEvents(events);
    setReadingStartedAt(events.length > 0 ? events[0].occurred_at : null);

    setLoading(false);
    setState("selecting_next");
  };

  const handleEndedCancel = () => {
    setState("reading");
  };

  const handleSwitchBook = () => {
    setState("no_book");
  };

  const handleCancelSelect = () => {
    // If user cancels selection but had a book, go back to reading
    if (currentBook) {
      setState("reading");
    }
    // Otherwise stay in no_book state (they need to select something)
  };

  const handleUndo = async (eventId: string) => {
    setUndoingEventId(eventId);

    // Create a correction event (this cancels the target event)
    await correctEvent(eventId, 0);

    // Refresh events
    const events = await getRecentEventsWithBooks(10);
    setRecentEvents(events);

    // Update reading started time
    setReadingStartedAt(events.length > 0 ? events[0].occurred_at : null);

    setUndoingEventId(null);
  };

  // Loading state
  if (state === "loading") {
    return (
      <div className="reading-flow">
        <SyncStatus />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // No book selected - show selector
  if (state === "no_book") {
    return (
      <div className="reading-flow">
        <SyncStatus />

        <div className="no-book-prompt">
          <h2>What are you reading?</h2>
          <p>Select or create a book to start tracking.</p>
        </div>

        <BookSelector
          onSelect={handleBookSelect}
          onCancel={handleCancelSelect}
        />

        <EventHistory
          events={recentEvents}
          onUndo={handleUndo}
          undoingEventId={undoingEventId}
        />
      </div>
    );
  }

  // Selecting next book after finishing/ending
  if (state === "selecting_next") {
    return (
      <div className="reading-flow">
        <SyncStatus />

        <div className="next-book-prompt">
          <h2>What's next?</h2>
          <p>Select your next book to read.</p>
        </div>

        <BookSelector
          onSelect={handleBookSelect}
          onCancel={() => {
            // User can skip selecting next book
            setState("no_book");
          }}
        />

        <EventHistory
          events={recentEvents}
          onUndo={handleUndo}
          undoingEventId={undoingEventId}
        />
      </div>
    );
  }

  // Entering completion percentage for "ended"
  if (state === "ending" && currentBook) {
    return (
      <div className="reading-flow">
        <EndedDialog
          bookTitle={currentBook.title}
          onConfirm={handleEndedConfirm}
          onCancel={handleEndedCancel}
        />
      </div>
    );
  }

  // Currently reading a book
  if (state === "reading" && currentBook) {
    return (
      <div className="reading-flow">
        <SyncStatus />

        <CurrentBookCard
          book={currentBook}
          readingStartedAt={readingStartedAt}
          onFinished={handleFinished}
          onEnded={handleEnded}
          onSwitchBook={handleSwitchBook}
          loading={loading}
        />

        <EventHistory
          events={recentEvents}
          onUndo={handleUndo}
          undoingEventId={undoingEventId}
        />
      </div>
    );
  }

  // Fallback - shouldn't reach here
  return (
    <div className="reading-flow">
      <SyncStatus />
      <div className="loading">Something went wrong. Refreshing...</div>
    </div>
  );
}
