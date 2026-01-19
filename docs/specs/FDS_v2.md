# Functional Design Specification v2

Project: Reading System (Behavior + Reader + Library)

---

## 1. Overview（项目定位）

V2 is a personal reading system that integrates:
- Reading behavior tracking
- Full-text reading (imported content)
- Book discovery and edition selection
- Motivation via streaks and check-ins

This system is designed for personal use, with a strong focus on Chinese-language books, and must support multiple editions of the same work.

V2 is not a social product and does not aim to replace commercial ebook platforms.

---

## 2. Scope & Non-Goals（范围与明确不做）

### 2.1 In Scope（V2 必须完成）

- Full text import (txt / epub / pdf)
- Reader UI
- Book query (multi-edition, region-aware)
- Data import from existing tools
- Streak / check-in / motivation system
- OCR / photo-based book recognition
- Bibliographic metadata enrichment

---

### 2.2 Out of Scope（明确不做）

- Social features (sharing, ranking, followers)
- DRM-protected ebook decryption
- Team or collaborative libraries
- AI-generated content understanding or summaries
- Commercial recommendations or ads

---

## 3. Core Domain Model（核心域模型）

V2 consists of three domains, which MUST remain logically separated.

### 3.1 Book Domain（书目域）

A Book represents a concrete edition the user owns or reads.
- `title`
- `author`
- `publisher`
- `publish_year`
- `language`
- `region_hint` (HK/TW / CN / EN_OTHER)
- `isbn10` / `isbn13`
- `cover` (optional)
- `merged_into` (optional, for later consolidation)

Each saved book corresponds to one selected edition.

---

### 3.2 Reading Behavior Domain（行为域，继承 V1）

- Append-only `reading_events`
- `event_type`: finished / ended / correction
- `occurred_at`
- `completion` (0–100)
- Single-thread reading assumption remains valid
- No UPDATE / DELETE of events

---

### 3.3 Reading Content Domain（内容域）

A book may have 0..N content resources:
- TXT
- EPUB
- PDF
- OCR-generated text

Each resource has:
- `type`
- `raw file`
- `parsed structure` (chapters / pages / segments)
- `reading progress pointer`

---

## 4. Content Import & Parsing（正文导入）

### 4.1 Supported Formats

- TXT (encoding auto-detection)
- EPUB (chapter extraction)
- PDF (text-layer extraction)

### 4.2 OCR Fallback

- If PDF has no text layer → OCR
- OCR may also be used for camera-captured pages

OCR in V2 is primarily intended for:
1) ISBN / cover text recognition for book identification
2) Text extraction fallback for PDFs without text layers

OCR is NOT intended to replace native TXT/EPUB reading.

### 4.3 Storage

- Raw files + parsed structures must be persistable
- Offline reading MUST be supported (IndexedDB + Service Worker)

---

## 5. Reader UI（阅读器）

### 5.1 Core Capabilities

- Render TXT / EPUB / PDF
- Page/segment navigation
- Font size, theme (light/dark)
- Resume from last position

### 5.2 Progress Tracking

- Track per-resource progress
- "Continue Reading" must jump to last position

### 5.3 Annotation (V2 Minimal)

- Highlight
- Bookmark
- Optional short note

Annotations belong to Content Domain, not Behavior Domain.

---

## 6. Book Query（图书查询，强制实现）

## 6.0 Find vs Search (Two-stage Book Lookup) — MUST

### Definitions
- **Find (Library Lookup)**: Search within the user's local library only.
- **Search (External Discovery)**: Query external bibliographic sources to discover books/editions.

These are two different user intents and MUST be implemented as a two-stage flow.

### Stage 1 — Find (Local-first, Mandatory)
When the user types into the book lookup input:
1) The system MUST query the local library (`books` table) immediately.
2) Local matches MUST be shown first and clearly labeled as "In Your Library".
3) If at least one strong local match exists, the UI SHOULD NOT auto-trigger external search.

### Stage 2 — Search (External, User-triggered or Best-effort)
External search MUST occur only when:
- No local results found, OR
- The user explicitly taps "Search online" / "Search external".

External results MUST be displayed in a separate section:
- "Online Results" / "External Candidates"

The user may:
- Select an edition and "Save to Library"
- Or view details (optional)
- Or create manually (always available)

### Rationale
This prevents accidental duplicate books and aligns with user intent:
"Check my library first; if not found, then search externally."

### 6.1 Purpose

Book Query MUST support:
- Discovering books quickly
- Selecting the exact edition the user owns
- Validating OCR / ISBN results

---

### 6.2 Query Modes

- ISBN search (ISBN-10 / ISBN-13)
- Title / Author keyword search (Chinese-friendly)
- OCR-assisted search (optional but recommended)

---

### 6.3 Edition Preference & Ranking（冻结规则）

Search results MUST be ranked in the following order:
1. Hong Kong / Taiwan editions (HK / TW)
2. Mainland China editions (CN)
3. English or other language editions (EN / OTHER)

Rules:
- All editions MAY be shown.
- Ranking affects order, not visibility.
- User MUST be able to select a specific edition to save.
- If only CN editions exist, they may be shown and saved.
- EN / OTHER editions are primarily recommended when no Chinese editions are found.

---

### 6.4 Multi-source Strategy

- Local library MUST be queried first
- At least TWO external bibliographic sources MUST be queried
- External search is best-effort and non-blocking

---

### 6.5 Result Presentation

Each candidate MUST show:
- `title`
- `author`
- `publisher`
- `publish_year`
- `language`
- `region_hint`
- `ISBN` (if available)

Actions:
- "Save this edition" → create local book record
- "Create manually" → always available

Local library matches MUST always be displayed before any external results
and clearly labeled as "In Your Library".
---

## 7. Data Import（外部数据导入）

### 7.1 Supported Imports

- Existing book management exports (e.g. Book Amigo)
- Import via adapter pattern

### 7.2 Data Safety

- Imported records MUST NOT overwrite existing data
- Duplicates allowed
- Merging handled via `merged_into`

---

## 8. Streak / Check-in / Motivation

### 8.1 Check-in Definition

A day counts as "read" if:
- Reader usage ≥ X minutes, OR
- A `reading_event` occurs
X MUST be a configurable value with a sensible default (e.g. 10–15 minutes).

### 8.2 Streak Rules

- Calculate current streak
- Calculate longest streak
- No manual backfill (no补签)

### 8.3 UX

- Display streak quietly
- No gamified ranking or pressure language

---

## 9. Storage & Sync

- Local: IndexedDB (content, progress, annotations)
- Cloud: Supabase (books, reading_events, metadata)
- Obsidian export supported (Markdown, structured)

---

## 10. Acceptance Criteria（V2 完成判定）

V2 is complete when:
1. User can import txt / epub / pdf and read them
2. Reading progress persists and resumes correctly
3. Book query returns multiple editions and respects HK/TW → CN → EN ranking
4. User can select and save a specific edition
5. OCR can recognize ISBN or text and assist book creation
6. Streak calculation works correctly
7. V1 behavior model remains intact and unbroken
8. Chinese-language book search works with real-world titles
   (Traditional and Simplified Chinese).
---

## 11. Final Instruction to Code

If uncertain, choose correctness and clarity over feature expansion.
If a feature risks polluting the behavior model, stop and ask.
