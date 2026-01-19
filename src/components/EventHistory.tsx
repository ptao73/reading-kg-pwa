"use client";

import type { EventWithBook } from "@/lib/events";

interface EventHistoryProps {
  events: EventWithBook[];
  onUndo: (eventId: string) => void;
  undoingEventId: string | null;
}

export function EventHistory({ events, onUndo, undoingEventId }: EventHistoryProps) {
  if (events.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="event-history">
      <h3>Recent</h3>
      <ul>
        {events.map((event, index) => (
          <li key={event.id} className="event-history-item">
            <div className="event-history-main">
              <span className="event-history-book">{event.book?.title ?? "Unknown"}</span>
              <span className={`event-history-type event-type-${event.event_type}`}>
                {event.event_type === "finished" ? "Finished" : `Ended ${event.completion}%`}
              </span>
            </div>
            <div className="event-history-meta">
              <span className="event-history-date">{formatDate(event.occurred_at)}</span>
              {index === 0 && (
                <button
                  className="btn-undo"
                  onClick={() => onUndo(event.id)}
                  disabled={undoingEventId === event.id}
                >
                  {undoingEventId === event.id ? "..." : "Undo"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
