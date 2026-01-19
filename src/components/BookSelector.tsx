"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book } from "@/types/database";
import type { BookCandidate } from "@/types/content";
import { createBook, getBooks } from "@/lib/books";
import {
  searchBooks as searchBooksAPI,
  saveToLibrary,
  type SearchResult,
} from "@/lib/book-search";
import { ISBNScanner } from "./ISBNScanner";

interface BookSelectorProps {
  onSelect: (book: Book) => void;
  onCancel: () => void;
}

export function BookSelector({ onSelect, onCancel }: BookSelectorProps) {
  const [query, setQuery] = useState("");
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchingOnline, setSearchingOnline] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newPublisher, setNewPublisher] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingCandidate, setSavingCandidate] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Load recent books on mount
  useEffect(() => {
    getBooks().then(setRecentBooks);
  }, []);

  // Stage 1: Local search (debounced)
  const handleLocalSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResult(null);
      return;
    }
    setLoading(true);
    const result = await searchBooksAPI(searchQuery, { localOnly: true });
    setSearchResult(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleLocalSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleLocalSearch]);

  // Stage 2: External search (user-triggered)
  const handleOnlineSearch = async () => {
    if (!query.trim()) return;
    setSearchingOnline(true);
    const result = await searchBooksAPI(query);
    setSearchResult(result);
    setSearchingOnline(false);
  };

  // Handle ISBN detected from scanner
  const handleISBNDetected = async (isbn: string) => {
    setShowScanner(false);
    setQuery(isbn);
    // Trigger online search for ISBN
    setSearchingOnline(true);
    const result = await searchBooksAPI(isbn);
    setSearchResult(result);
    setSearchingOnline(false);
  };

  // Create new book manually
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const book = await createBook(
      newTitle.trim(),
      newAuthor.trim() || undefined,
      undefined, // isbn
      newPublisher.trim() || undefined
    );
    setCreating(false);
    if (book) {
      onSelect(book);
    }
  };

  // Save external candidate to library
  const handleSaveCandidate = async (candidate: BookCandidate) => {
    setSavingCandidate(candidate.externalId ?? candidate.title);
    const book = await saveToLibrary(candidate);
    setSavingCandidate(null);
    if (book) {
      onSelect(book);
    }
  };

  // Handle selecting a local book
  const handleSelectLocal = (candidate: BookCandidate) => {
    if (candidate.localBookId) {
      // Find the full book object from recent books or search results
      const book = recentBooks.find((b) => b.id === candidate.localBookId);
      if (book) {
        onSelect(book);
        return;
      }
    }
    // Fallback: create a minimal Book object
    onSelect({
      id: candidate.localBookId!,
      user_id: "",
      title: candidate.title,
      author: candidate.author,
      publisher: candidate.publisher,
      publish_year: candidate.publish_year,
      language: candidate.language,
      region_hint: candidate.region_hint,
      isbn: null,
      isbn10: candidate.isbn10,
      isbn13: candidate.isbn13,
      cover: candidate.cover,
      merged_into: null,
      created_at: "",
      updated_at: "",
    });
  };

  // Pre-fill create form from search query
  const handleShowCreate = () => {
    setShowCreate(true);
    if (query.trim() && !newTitle) {
      setNewTitle(query.trim());
    }
  };

  const hasLocalResults = searchResult && searchResult.local.length > 0;
  const hasExternalResults = searchResult && searchResult.external.length > 0;
  const showOnlineSearchButton =
    query.trim() && !hasExternalResults && !searchingOnline;

  return (
    <div className="book-selector">
      <div className="selector-header">
        <h2>Select a Book</h2>
        <button onClick={onCancel} className="btn-close">
          &times;
        </button>
      </div>

      <div className="search-row">
        <input
          type="text"
          placeholder="Search by title, author, or ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
          autoFocus
        />
        <button
          className="btn-scan-isbn"
          onClick={() => setShowScanner(true)}
          title="Scan ISBN"
        >
          📷
        </button>
      </div>

      {loading && <div className="loading">Searching library...</div>}

      <div className="book-list">
        {/* Recent books (when no search query) */}
        {!query.trim() && recentBooks.length > 0 && (
          <>
            <div className="search-section-label">Recent Books</div>
            {recentBooks.slice(0, 5).map((book) => (
              <div
                key={book.id}
                className="book-item"
                onClick={() => onSelect(book)}
              >
                {book.cover && (
                  <img src={book.cover} alt="" className="book-cover-thumb" />
                )}
                <div className="book-item-info">
                  <div className="book-title">{book.title}</div>
                  {book.author && <div className="book-author">{book.author}</div>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Local results (Stage 1) */}
        {hasLocalResults && (
          <>
            <div className="search-section-label">In Your Library</div>
            {searchResult.local.map((candidate) => (
              <div
                key={candidate.localBookId}
                className="book-item book-item-local"
                onClick={() => handleSelectLocal(candidate)}
              >
                {candidate.cover && (
                  <img
                    src={candidate.cover}
                    alt=""
                    className="book-cover-thumb"
                  />
                )}
                <div className="book-item-info">
                  <div className="book-title">{candidate.title}</div>
                  {candidate.author && (
                    <div className="book-author">{candidate.author}</div>
                  )}
                  <div className="book-meta">
                    {candidate.publisher && <span>{candidate.publisher}</span>}
                    {candidate.publish_year && (
                      <span>{candidate.publish_year}</span>
                    )}
                  </div>
                </div>
                <div className="book-badge badge-local">Library</div>
              </div>
            ))}
          </>
        )}

        {/* External results (Stage 2) */}
        {hasExternalResults && (
          <>
            <div className="search-section-label">Online Results</div>
            {searchResult.external.map((candidate, idx) => (
              <div
                key={`${candidate.source}-${candidate.externalId ?? idx}`}
                className="book-item book-item-external"
              >
                {candidate.cover && (
                  <img
                    src={candidate.cover}
                    alt=""
                    className="book-cover-thumb"
                  />
                )}
                <div className="book-item-info">
                  <div className="book-title">{candidate.title}</div>
                  {candidate.author && (
                    <div className="book-author">{candidate.author}</div>
                  )}
                  <div className="book-meta">
                    {candidate.publisher && <span>{candidate.publisher}</span>}
                    {candidate.publish_year && (
                      <span>{candidate.publish_year}</span>
                    )}
                    {candidate.region_hint && (
                      <span className={`region-${candidate.region_hint}`}>
                        {candidate.region_hint}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="btn-save-edition"
                  onClick={() => handleSaveCandidate(candidate)}
                  disabled={
                    savingCandidate ===
                    (candidate.externalId ?? candidate.title)
                  }
                >
                  {savingCandidate ===
                  (candidate.externalId ?? candidate.title)
                    ? "..."
                    : "Save"}
                </button>
              </div>
            ))}
          </>
        )}

        {/* No results message */}
        {query.trim() &&
          !loading &&
          !hasLocalResults &&
          !hasExternalResults &&
          !searchingOnline && (
            <div className="no-results">No books found in your library.</div>
          )}
      </div>

      {/* Online search button */}
      {showOnlineSearchButton && (
        <button className="btn-online-search" onClick={handleOnlineSearch}>
          {searchingOnline ? "Searching..." : "Search Online"}
        </button>
      )}

      {searchingOnline && (
        <div className="loading">Searching online sources...</div>
      )}

      {/* Create new book */}
      <button className="btn-create" onClick={handleShowCreate}>
        {showCreate ? "Cancel" : "+ Create Manually"}
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
          <input
            type="text"
            placeholder="Publisher (optional)"
            value={newPublisher}
            onChange={(e) => setNewPublisher(e.target.value)}
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

      {/* ISBN Scanner */}
      {showScanner && (
        <ISBNScanner
          onISBNDetected={handleISBNDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
