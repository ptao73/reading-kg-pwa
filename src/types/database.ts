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
export type BookInsert = {
  id?: string;
  user_id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  merged_into?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BookUpdate = {
  id?: string;
  user_id?: string;
  title?: string;
  author?: string | null;
  isbn?: string | null;
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
