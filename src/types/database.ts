// TypeScript types matching Supabase schema

export type ReadingEventType = "finished" | "ended" | "correction";

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  merged_into: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingEvent {
  id: string;
  user_id: string;
  book_id: string;
  event_type: ReadingEventType;
  occurred_at: string;
  completion: number;
  target_event_id: string | null;
  client_event_id: string;
  created_at: string;
}

// For creating new records (omit server-generated fields)
export type BookInsert = Omit<Book, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type BookUpdate = Partial<Omit<Book, "id" | "user_id" | "created_at">>;

export type ReadingEventInsert = Omit<ReadingEvent, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

// Valid reading events (excludes corrections and corrected events)
export type ValidReadingEvent = Omit<ReadingEvent, "event_type"> & {
  event_type: "finished" | "ended";
};

// Supabase Database type for client
export interface Database {
  public: {
    Tables: {
      books: {
        Row: Book;
        Insert: BookInsert;
        Update: BookUpdate;
      };
      reading_events: {
        Row: ReadingEvent;
        Insert: ReadingEventInsert;
        Update: never; // append-only, no updates allowed
      };
    };
    Views: {
      valid_reading_events: {
        Row: ValidReadingEvent;
      };
    };
    Enums: {
      reading_event_type: ReadingEventType;
    };
  };
}
