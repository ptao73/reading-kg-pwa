# Functional Design Specification v1

Project: Reading Behavior & Knowledge Graph PWA

---

## 1. Overview（项目目标）

This project is a personal reading behavior capture system, not a reading app.

Its purpose is to:
- Record reading completion behavior with minimal friction
- Model reading as append-only behavioral events
- Generate high-quality personal knowledge artifacts for Obsidian
- Enable long-term analysis of reading habits and preferences

This is not:
- A text reader
- A study app
- A vocabulary or annotation tool
- A social or gamified product

---

## 2. Core Principles（冻结，不可修改）

1. **Behavior over Content**
   This system records what the user did, not what the book contains.

2. **Single-Threaded Reading Model**
   At any moment, the user reads at most one book.

3. **Append-Only Event Log**
   Reading events are immutable facts.
   - No UPDATE
   - No DELETE
   - Errors are corrected via compensating events

4. **System-Derived State**
   Users do not manage reading status manually.
   Current state is inferred from the event history.

5. **Minimal, Calm UX**
   The interface should feel "quiet".
   The core action is always obvious and singular.

---

## 3. Data Model Semantics（语义，而不是表结构）

### 3.1 Book（稳定实体）

A Book is a stable knowledge object.
- Books may be incomplete or duplicated
- External metadata is optional
- Books can be merged later (merged_into)
- Books do not encode reading status

### 3.2 Reading Event（行为事实）

A Reading Event represents a moment in time when the user made a decision.

Supported event types:
- `finished` — completed reading
- `ended` — consciously abandoned
- `correction` — compensates a previous event

Each event includes:
- `book_id`
- `event_type`
- `occurred_at`
- `completion` (0–100)
- `client_event_id` (idempotency)

---

## 4. Reading Behavior Model（核心逻辑）

### 4.1 Default Reading Flow

- When a book is finished or ended, the next book implicitly starts after that moment
- Reading duration is inferred from timestamps
- No explicit "start reading" action is required

### 4.2 Abandoning a Book

If the user stops reading a book:
- An `ended` event is recorded
- Completion is between 0–99
- This is a valid, first-class outcome

### 4.3 Re-reading

If a user reads the same book again:
- A new `finished` or `ended` event is recorded
- Each read is treated independently
- Historical events are preserved

---

## 5. Correction & Error Handling（必须支持）

Users can make mistakes.

### 5.1 Correction Mechanism

- No event is ever deleted
- A `correction` event references a previous event
- The corrected event is logically cancelled
- All analytics and exports must respect corrections

This enables:
- "Undo last action"
- Fixing wrong book selection
- Fixing wrong completion timing

---

## 6. Book Search & Creation Strategy

### 6.1 Design Philosophy

Book search is a convenience feature, not a source of truth.

Failure to find a book MUST NOT block:
- Manual creation
- Reading event recording

---

### 6.2 Search Priority (V1)

1. **Local Library First (Mandatory)**
   - Search user's existing books
   - Language-agnostic (Chinese-friendly)

2. **ISBN Lookup (Optional, Best-effort)**
   - External lookup may fail
   - Failure is not an error state

3. **Keyword Search (Optional)**
   - Results are hints only
   - Metadata is not authoritative

---

### 6.3 Manual Book Creation (First-Class)

- Title is required
- Author / ISBN optional
- No external validation required
- This is a normal path, not a fallback

---

### 6.4 Duplicate & Entity Resolution

- Duplicate books are expected
- `merged_into` supports post-hoc resolution
- Reading events remain attached to original IDs

---

## 7. Explicit Non-Goals（V1 范围外）

The following are explicitly OUT OF SCOPE:
- Text import (txt / epub / pdf)
- Sentence-by-sentence reading
- Word lookup or vocabulary lists
- Annotations or highlights
- Social features or sharing
- Gamification or streaks
- Full bibliographic correctness
- OCR or cover recognition

---

## 8. Success Criteria（验收标准）

This version is successful if:
- User can record Finished / Ended with one tap
- System infers reading durations automatically
- Errors can be corrected without data loss
- Obsidian export can reconstruct reading history
- The UI remains calm, minimal, and focused
