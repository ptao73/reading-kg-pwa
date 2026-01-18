#!/usr/bin/env python3
"""
Reading KG - Supabase Sync Script

This script syncs offline reading events from a local JSON file to Supabase.
Useful for bulk imports or manual data synchronization.
"""

import os
import json
import uuid
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def create_book(user_id: str, title: str, author: str = None, isbn: str = None) -> dict:
    """Create a new book record."""
    book = {
        "user_id": user_id,
        "title": title,
        "author": author,
        "isbn": isbn,
        "merged_into": None,
    }
    result = supabase.table("books").insert(book).execute()
    return result.data[0] if result.data else None


def find_or_create_book(user_id: str, title: str, author: str = None) -> dict:
    """Find an existing book or create a new one."""
    # Search for existing book
    query = supabase.table("books").select("*").eq("user_id", user_id).eq("title", title)
    if author:
        query = query.eq("author", author)
    result = query.execute()

    if result.data:
        return result.data[0]

    # Create new book
    return create_book(user_id, title, author)


def create_reading_event(
    user_id: str,
    book_id: str,
    event_type: str,
    completion: int,
    occurred_at: str = None
) -> dict:
    """Create a new reading event."""
    event = {
        "user_id": user_id,
        "book_id": book_id,
        "event_type": event_type,
        "occurred_at": occurred_at or datetime.utcnow().isoformat(),
        "completion": completion,
        "target_event_id": None,
        "client_event_id": str(uuid.uuid4()),
    }
    result = supabase.table("reading_events").insert(event).execute()
    return result.data[0] if result.data else None


def sync_from_json(filepath: str, user_id: str) -> dict:
    """
    Sync reading events from a JSON file.

    Expected JSON format:
    [
        {
            "title": "Book Title",
            "author": "Author Name",  // optional
            "event_type": "finished" | "ended",
            "completion": 100,  // 0-100
            "occurred_at": "2024-01-15T10:30:00Z"  // optional
        }
    ]
    """
    with open(filepath, "r", encoding="utf-8") as f:
        events = json.load(f)

    stats = {"books_created": 0, "events_created": 0, "errors": []}

    for i, event_data in enumerate(events):
        try:
            title = event_data.get("title")
            if not title:
                stats["errors"].append(f"Event {i}: Missing title")
                continue

            author = event_data.get("author")
            event_type = event_data.get("event_type", "finished")
            completion = event_data.get("completion", 100 if event_type == "finished" else 50)
            occurred_at = event_data.get("occurred_at")

            # Find or create book
            book = find_or_create_book(user_id, title, author)
            if not book:
                stats["errors"].append(f"Event {i}: Failed to create book '{title}'")
                continue

            # Check if this is a new book
            if book.get("_new"):
                stats["books_created"] += 1

            # Create reading event
            event = create_reading_event(
                user_id=user_id,
                book_id=book["id"],
                event_type=event_type,
                completion=completion,
                occurred_at=occurred_at,
            )

            if event:
                stats["events_created"] += 1
                print(f"Created event for '{title}' ({event_type}, {completion}%)")
            else:
                stats["errors"].append(f"Event {i}: Failed to create event for '{title}'")

        except Exception as e:
            stats["errors"].append(f"Event {i}: {str(e)}")

    return stats


def get_user_stats(user_id: str) -> dict:
    """Get reading statistics for a user."""
    books = supabase.table("books").select("*").eq("user_id", user_id).is_("merged_into", "null").execute()
    events = supabase.table("valid_reading_events").select("*").eq("user_id", user_id).execute()

    finished = [e for e in events.data if e["event_type"] == "finished"]
    ended = [e for e in events.data if e["event_type"] == "ended"]

    return {
        "total_books": len(books.data),
        "total_events": len(events.data),
        "finished": len(finished),
        "ended": len(ended),
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python sync.py <command> <args>")
        print("Commands:")
        print("  sync <user_id> <json_file>  - Sync events from JSON file")
        print("  stats <user_id>             - Show user statistics")
        sys.exit(1)

    command = sys.argv[1]

    if command == "sync":
        if len(sys.argv) < 4:
            print("Usage: python sync.py sync <user_id> <json_file>")
            sys.exit(1)
        user_id = sys.argv[2]
        json_file = sys.argv[3]
        stats = sync_from_json(json_file, user_id)
        print(f"\nSync complete:")
        print(f"  Books created: {stats['books_created']}")
        print(f"  Events created: {stats['events_created']}")
        if stats["errors"]:
            print(f"  Errors: {len(stats['errors'])}")
            for error in stats["errors"]:
                print(f"    - {error}")

    elif command == "stats":
        if len(sys.argv) < 3:
            print("Usage: python sync.py stats <user_id>")
            sys.exit(1)
        user_id = sys.argv[2]
        stats = get_user_stats(user_id)
        print(f"Statistics for user {user_id}:")
        print(f"  Total books: {stats['total_books']}")
        print(f"  Total events: {stats['total_events']}")
        print(f"  Finished: {stats['finished']}")
        print(f"  Ended: {stats['ended']}")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
