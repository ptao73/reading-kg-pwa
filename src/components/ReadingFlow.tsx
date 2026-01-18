"use client";

import { useState, useEffect } from "react";
import type { Book, ValidReadingEvent } from "@/types/database";
import { createReadingEvent, getRecentEvents } from "@/lib/events";
import { BookSelector } from "./BookSelector";
import { EndedDialog } from "./EndedDialog";
import { SyncStatus } from "./SyncStatus";

type FlowState = "idle" | "selecting" | "recording" | "ending";

export function ReadingFlow() {
  const [state, setState] = useState<FlowState>("idle");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [recentEvents, setRecentEvents] = useState<ValidReadingEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentEvents();
  }, []);

  const loadRecentEvents = async () => {
    const events = await getRecentEvents(10);
    setRecentEvents(events);
  };

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setState("recording");
  };

  const handleFinished = async () => {
    if (!selectedBook) return;
    setLoading(true);
    await createReadingEvent(selectedBook.id, "finished", 100);
    setLoading(false);
    setSelectedBook(null);
    setState("idle");
    loadRecentEvents();
  };

  const handleEnded = () => {
    setState("ending");
  };

  const handleEndedConfirm = async (completion: number) => {
    if (!selectedBook) return;
    setLoading(true);
    await createReadingEvent(selectedBook.id, "ended", completion);
    setLoading(false);
    setSelectedBook(null);
    setState("idle");
    loadRecentEvents();
  };

  const handleCancel = () => {
    setSelectedBook(null);
    setState("idle");
  };

  return (
    <div className="reading-flow">
      <SyncStatus />

      {state === "idle" && (
        <div className="flow-idle">
          <button
            className="btn-primary btn-large"
            onClick={() => setState("selecting")}
          >
            Record Reading Event
          </button>

          {recentEvents.length > 0 && (
            <div className="recent-events">
              <h3>Recent Events</h3>
              <ul>
                {recentEvents.map((event) => (
                  <li key={event.id} className="event-item">
                    <span className="event-type">
                      {event.event_type === "finished" ? "Finished" : "Ended"}
                    </span>
                    <span className="event-completion">
                      {event.completion}%
                    </span>
                    <span className="event-date">
                      {new Date(event.occurred_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {state === "selecting" && (
        <BookSelector
          onSelect={handleBookSelect}
          onCancel={handleCancel}
        />
      )}

      {state === "recording" && selectedBook && (
        <div className="flow-recording">
          <h2>Recording for:</h2>
          <div className="selected-book">
            <div className="book-title">{selectedBook.title}</div>
            {selectedBook.author && (
              <div className="book-author">{selectedBook.author}</div>
            )}
          </div>

          <div className="recording-actions">
            <button
              className="btn-finished"
              onClick={handleFinished}
              disabled={loading}
            >
              Finished (100%)
            </button>
            <button
              className="btn-ended"
              onClick={handleEnded}
              disabled={loading}
            >
              Ended (Partial)
            </button>
            <button
              className="btn-cancel"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {state === "ending" && selectedBook && (
        <EndedDialog
          bookTitle={selectedBook.title}
          onConfirm={handleEndedConfirm}
          onCancel={() => setState("recording")}
        />
      )}
    </div>
  );
}
