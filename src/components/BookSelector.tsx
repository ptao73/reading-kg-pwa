"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book } from "@/types/database";
import { searchBooks, createBook, getBooks } from "@/lib/books";

interface BookSelectorProps {
  onSelect: (book: Book) => void;
  onCancel: () => void;
}

export function BookSelector({ onSelect, onCancel }: BookSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getBooks().then(setRecentBooks);
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const books = await searchBooks(searchQuery);
    setResults(books);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const book = await createBook(
      newTitle.trim(),
      newAuthor.trim() || undefined
    );
    setCreating(false);
    if (book) {
      onSelect(book);
    }
  };

  const displayBooks = query.trim() ? results : recentBooks;

  return (
    <div className="book-selector">
      <div className="selector-header">
        <h2>Select a Book</h2>
        <button onClick={onCancel} className="btn-close">
          &times;
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by title or author..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
        autoFocus
      />

      {loading && <div className="loading">Searching...</div>}

      <div className="book-list">
        {displayBooks.map((book) => (
          <div
            key={book.id}
            className="book-item"
            onClick={() => onSelect(book)}
          >
            <div className="book-title">{book.title}</div>
            {book.author && <div className="book-author">{book.author}</div>}
          </div>
        ))}
        {!loading && query.trim() && results.length === 0 && (
          <div className="no-results">
            No books found. Create a new one?
          </div>
        )}
      </div>

      <button
        className="btn-create"
        onClick={() => setShowCreate(!showCreate)}
      >
        {showCreate ? "Cancel" : "+ Create New Book"}
      </button>

      {showCreate && (
        <div className="create-form">
          <input
            type="text"
            placeholder="Book title (required)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Author (optional)"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            className="input-field"
          />
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim() || creating}
            className="btn-submit"
          >
            {creating ? "Creating..." : "Create Book"}
          </button>
        </div>
      )}
    </div>
  );
}
