# Functional Design Specification v1

## 1. Overview

This document describes the functional requirements for Reading KG PWA.

## 2. User Stories

### 2.1 Text Import

**As a** user
**I want to** import text content
**So that** I can read and study it

**Acceptance Criteria:**
- [ ] Support paste from clipboard
- [ ] Support file upload (.txt, .epub)
- [ ] Validate and parse text correctly

### 2.2 Reading Mode

**As a** user
**I want to** read text sentence by sentence
**So that** I can focus on comprehension

**Acceptance Criteria:**
- [ ] Display one sentence at a time
- [ ] Navigate forward/backward
- [ ] Track reading progress

### 2.3 Word Lookup

**As a** user
**I want to** tap on words for definitions
**So that** I can learn new vocabulary

**Acceptance Criteria:**
- [ ] Click/tap to select word
- [ ] Show definition popup
- [ ] Save to vocabulary list

## 3. Technical Requirements

### 3.1 PWA Requirements

- Service worker for offline support
- App manifest for installation
- Responsive design

### 3.2 Data Storage

- IndexedDB for local data
- Optional cloud sync

### 3.3 Performance

- First contentful paint < 2s
- Time to interactive < 3s

## 4. UI/UX Specifications

TBD - Add wireframes and design mockups

## 6. Book Search & Creation Strategy

### 6.1 Design Principle

Book search is a **convenience feature**, not a source of truth.

Failure to find a book via external data sources MUST NOT block
manual book creation or reading event recording.

The system prioritizes:
- User flow continuity
- Data correctness over metadata completeness
- Personal reading behavior over bibliographic perfection

This system is NOT intended to be a public or authoritative book database.

---

### 6.2 Search Priority Order (V1)

Book lookup MUST follow the priority order below:

#### (1) Local Library First (Mandatory)
- Search MUST first query the user's existing `books` table.
- This includes:
  - Previously imported books
  - Manually created books
  - Books read or abandoned in the past

Rationale:
- Highest accuracy for re-reads
- Fully language-agnostic (Chinese-friendly)
- No dependency on external services

Local matches MUST always be displayed before any external results.

---

#### (2) ISBN Lookup (Optional, Best-effort)
If user input matches ISBN format (ISBN-10 or ISBN-13):

- The system MAY attempt external lookup (e.g. Google Books, Open Library).
- External lookup is **best-effort only**.
- External lookup failure MUST NOT interrupt the user flow.

If external lookup fails:
- The UI MUST offer immediate manual creation.

---

#### (3) Keyword Search (Optional, Non-blocking)
For non-ISBN input (title / author keywords):

- External keyword search MAY be attempted.
- Results are considered **assistive hints only**.
- Metadata from keyword search is NOT authoritative.

The system MUST NOT assume correctness of:
- Titles
- Authors
- Editions
- Translations

---

### 6.3 Manual Book Creation (Mandatory Fallback)

At any time, the user MUST be able to manually create a book record.

Manual creation MUST require:
- `title` (required)

Manual creation MAY include:
- `author`
- `isbn`

Manual creation MUST NOT require:
- External validation
- Successful search result
- Network connectivity

Manual creation is a **first-class path**, not an error state.

---

### 6.4 Duplicate & Entity Resolution Policy

Due to inconsistencies in external data sources (especially for Chinese books):

- Duplicate book entries are expected and acceptable.
- The system MUST support post-hoc entity resolution via:
  - `merged_into` field on `books`.

Rules:
- `merged_into` indicates a non-canonical duplicate book.
- Reading events MUST remain attached to their original book_id.
- During analytics and export:
  - Books MUST be resolved to their ultimate master entity.

Duplicate detection is NOT required in V1.
Manual merging is sufficient.

---

### 6.5 Internationalization & Language Assumptions

The system MUST NOT assume:
- English-only titles
- Latin alphabets
- Stable romanization

Chinese book titles, authors, and publishers are first-class citizens.

Search UX MUST:
- Prefer exact local matches
- Avoid aggressive normalization
- Avoid forced translation or transliteration

---

### 6.6 Non-Goals (Explicit)

The following are explicitly OUT OF SCOPE for V1:
- Full Chinese bibliographic coverage
- ISBN correctness enforcement
- Official integration with regional book platforms (e.g. Douban)
- OCR-based cover recognition

These MAY be explored in future versions but MUST NOT block V1 delivery.