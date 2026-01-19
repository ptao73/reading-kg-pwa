import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";
import type { Book, BookUpdate } from "@/types/database";
import { addToOfflineQueue, type OfflineAction } from "./offline-queue";

export async function createBook(
  title: string,
  author?: string,
  isbn?: string,
  publisher?: string
): Promise<Book | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const book = {
    user_id: user.id,
    title,
    author: author ?? null,
    isbn: isbn ?? null,
    publisher: publisher ?? null,
    merged_into: null,
  };

  const { data, error } = await supabase
    .from("books")
    .insert(book)
    .select()
    .single();

  if (error) {
    if (error.message.includes("network") || error.message.includes("failed to fetch")) {
      const action: OfflineAction = {
        id: uuidv4(),
        type: "create_book",
        payload: book,
        timestamp: Date.now(),
      };
      addToOfflineQueue(action);
    }
    console.error("Error creating book:", error);
    return null;
  }

  return data as Book;
}

export async function getBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .is("merged_into", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching books:", error);
    return [];
  }

  return (data ?? []) as Book[];
}

export async function getBook(id: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching book:", error);
    return null;
  }

  return data as Book;
}

export async function updateBook(
  id: string,
  updates: BookUpdate
): Promise<Book | null> {
  const { data, error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating book:", error);
    return null;
  }

  return data as Book;
}

export async function mergeBooks(
  sourceId: string,
  targetId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("books")
    .update({ merged_into: targetId })
    .eq("id", sourceId);

  if (error) {
    console.error("Error merging books:", error);
    return false;
  }

  return true;
}

export async function searchBooks(query: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .is("merged_into", null)
    .or(`title.ilike.%${query}%,author.ilike.%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error searching books:", error);
    return [];
  }

  return (data ?? []) as Book[];
}
