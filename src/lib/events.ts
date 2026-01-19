import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";
import type { Book, ReadingEvent, ValidReadingEvent } from "@/types/database";
import { addToOfflineQueue, OfflineAction } from "./offline-queue";

// Event with joined book information
export interface EventWithBook extends ValidReadingEvent {
  book: Book;
}

// Current reading state derived from event history
export interface ReadingState {
  currentBook: Book | null;
  readingStartedAt: string | null; // ISO timestamp when current book started (last event occurred_at)
  lastEvent: EventWithBook | null;
}

export async function createReadingEvent(
  bookId: string,
  eventType: "finished" | "ended",
  completion: number
): Promise<ReadingEvent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const clientEventId = uuidv4();
  const event = {
    user_id: user.id,
    book_id: bookId,
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    completion,
    target_event_id: null,
    client_event_id: clientEventId,
  };

  const { data, error } = await supabase
    .from("reading_events")
    .insert(event)
    .select()
    .single();

  if (error) {
    // Queue for offline sync if network error
    if (error.message.includes("network") || error.code === "PGRST116") {
      const action: OfflineAction = {
        id: clientEventId,
        type: "create_event",
        payload: event,
        timestamp: Date.now(),
      };
      addToOfflineQueue(action);
    }
    console.error("Error creating event:", error);
    return null;
  }

  return data as ReadingEvent;
}

export async function correctEvent(
  targetEventId: string,
  newCompletion: number
): Promise<ReadingEvent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const clientEventId = uuidv4();

  // Get target event to copy book_id
  const { data: targetEvent } = await supabase
    .from("reading_events")
    .select("book_id")
    .eq("id", targetEventId)
    .single();

  if (!targetEvent) return null;

  const correction = {
    user_id: user.id,
    book_id: (targetEvent as { book_id: string }).book_id,
    event_type: "correction" as const,
    occurred_at: new Date().toISOString(),
    completion: newCompletion,
    target_event_id: targetEventId,
    client_event_id: clientEventId,
  };

  const { data, error } = await supabase
    .from("reading_events")
    .insert(correction)
    .select()
    .single();

  if (error) {
    console.error("Error creating correction:", error);
    return null;
  }

  return data as ReadingEvent;
}

export async function getValidEvents(
  bookId?: string
): Promise<ValidReadingEvent[]> {
  let query = supabase.from("valid_reading_events").select("*");

  if (bookId) {
    query = query.eq("book_id", bookId);
  }

  const { data, error } = await query.order("occurred_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return (data ?? []) as ValidReadingEvent[];
}

export async function getRecentEvents(limit = 10): Promise<ValidReadingEvent[]> {
  const { data, error } = await supabase
    .from("valid_reading_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent events:", error);
    return [];
  }

  return (data ?? []) as ValidReadingEvent[];
}

// Get recent events with book information joined
export async function getRecentEventsWithBooks(limit = 10): Promise<EventWithBook[]> {
  const { data, error } = await supabase
    .from("valid_reading_events")
    .select("*, book:books(*)")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent events with books:", error);
    return [];
  }

  return (data ?? []) as EventWithBook[];
}

// Derive the current reading state from event history
// Per FDS: "When a book is finished or ended, the next book implicitly starts after that moment"
// This means: if there's at least one event, the user is "ready to record" for SOME book
// The "current book" is what the user will read NEXT (selected after last event)
export async function getCurrentReadingState(): Promise<ReadingState> {
  // Get the most recent valid event with book info
  const { data, error } = await supabase
    .from("valid_reading_events")
    .select("*, book:books(*)")
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching current reading state:", error);
    return { currentBook: null, readingStartedAt: null, lastEvent: null };
  }

  if (!data || data.length === 0) {
    // No events yet - user needs to select their first book
    return { currentBook: null, readingStartedAt: null, lastEvent: null };
  }

  const lastEvent = data[0] as EventWithBook;

  // The current book is stored in localStorage after each event
  // (because after finishing/ending a book, user selects the NEXT book)
  // If not set, we return null to prompt selection
  const storedCurrentBookId = typeof window !== "undefined"
    ? localStorage.getItem("reading_kg_current_book_id")
    : null;

  if (!storedCurrentBookId) {
    return {
      currentBook: null,
      readingStartedAt: lastEvent.occurred_at,
      lastEvent
    };
  }

  // Fetch the current book
  const { data: bookData, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", storedCurrentBookId)
    .single();

  if (bookError || !bookData) {
    return {
      currentBook: null,
      readingStartedAt: lastEvent.occurred_at,
      lastEvent
    };
  }

  return {
    currentBook: bookData as Book,
    readingStartedAt: lastEvent.occurred_at,
    lastEvent,
  };
}

// Store the current book being read (after selecting next book)
export function setCurrentBook(bookId: string | null): void {
  if (typeof window === "undefined") return;

  if (bookId) {
    localStorage.setItem("reading_kg_current_book_id", bookId);
  } else {
    localStorage.removeItem("reading_kg_current_book_id");
  }
}

// Get the stored current book ID
export function getCurrentBookId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("reading_kg_current_book_id");
}
