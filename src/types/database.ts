// TypeScript types matching Supabase schema

export type ReadingEventType = "finished" | "ended" | "correction";

// Region hint for edition ranking: HK/TW > CN > EN/OTHER
export type RegionHint = "HK" | "TW" | "CN" | "EN" | "OTHER";

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  // V2: Extended metadata
  publisher: string | null;
  publish_year: number | null;
  language: string | null;
  region_hint: RegionHint | null;
  isbn: string | null;      // Legacy field
  isbn10: string | null;    // V2: ISBN-10
  isbn13: string | null;    // V2: ISBN-13
  cover: string | null;     // V2: Cover image URL
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
export type BookInsert = {
  id?: string;
  user_id: string;
  title: string;
  author?: string | null;
  publisher?: string | null;
  publish_year?: number | null;
  language?: string | null;
  region_hint?: RegionHint | null;
  isbn?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  cover?: string | null;
  merged_into?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BookUpdate = {
  id?: string;
  user_id?: string;
  title?: string;
  author?: string | null;
  publisher?: string | null;
  publish_year?: number | null;
  language?: string | null;
  region_hint?: RegionHint | null;
  isbn?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  cover?: string | null;
  merged_into?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ReadingEventInsert = {
  id?: string;
  user_id: string;
  book_id: string;
  event_type: ReadingEventType;
  occurred_at: string;
  completion: number;
  target_event_id?: string | null;
  client_event_id: string;
  created_at?: string;
};

// Valid reading events (excludes corrections and corrected events)
export interface ValidReadingEvent {
  id: string;
  user_id: string;
  book_id: string;
  event_type: "finished" | "ended";
  occurred_at: string;
  completion: number;
  target_event_id: string | null;
  client_event_id: string;
  created_at: string;
}

// Supabase Database type for client
export type Database = {
  public: {
    Tables: {
      books: {
        Row: Book;
        Insert: BookInsert;
        Update: BookUpdate;
        Relationships: [
          {
            foreignKeyName: "books_merged_into_fkey";
            columns: ["merged_into"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "books_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      reading_events: {
        Row: ReadingEvent;
        Insert: ReadingEventInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "reading_events_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_events_target_event_id_fkey";
            columns: ["target_event_id"];
            isOneToOne: false;
            referencedRelation: "reading_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      valid_reading_events: {
        Row: ValidReadingEvent;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      reading_event_type: ReadingEventType;
    };
    CompositeTypes: Record<string, never>;
  };
};
