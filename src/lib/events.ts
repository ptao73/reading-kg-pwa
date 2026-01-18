import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";
import type { ReadingEvent, ValidReadingEvent } from "@/types/database";
import { addToOfflineQueue, OfflineAction } from "./offline-queue";

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
