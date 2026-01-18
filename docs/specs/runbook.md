# Development Runbook

## Getting Started

```bash
npm install
npm run dev
```

---

## Phase 1: Project Setup

**Goal**: Initialize Vite + React + PWA infrastructure

**Files to create**:
- `package.json` - Dependencies and scripts
- `vite.config.js` - Vite + PWA configuration
- `index.html` - Entry HTML
- `src/main.jsx` - React entry point
- `src/App.jsx` - Root component
- `src/styles/index.css` - Global styles
- `src/styles/variables.css` - CSS variables
- `public/manifest.json` - PWA manifest

**Checklist**:
- [ ] npm install works
- [ ] npm run dev starts server
- [ ] PWA installable

---

## Phase 2: Core Components & Layout

**Goal**: Create app shell and reusable UI components

**Files to create**:
- `src/components/Layout/Header.jsx`
- `src/components/Layout/Navigation.jsx`
- `src/components/Layout/Layout.jsx`
- `src/components/UI/Button.jsx`
- `src/components/UI/Modal.jsx`
- `src/components/UI/Card.jsx`
- `src/styles/components.css`
- `src/hooks/useLocalStorage.js`
- `src/contexts/AppContext.jsx`

**Checklist**:
- [ ] App shell renders
- [ ] Navigation works
- [ ] Components are reusable

---

## Phase 3: Text Import & Parsing

**Goal**: Import text and parse into sentences

**Files to create**:
- `src/components/Import/ImportModal.jsx`
- `src/components/Import/ClipboardImport.jsx`
- `src/components/Import/FileImport.jsx`
- `src/utils/textParser.js` - Sentence splitting logic
- `src/utils/storage.js` - IndexedDB wrapper
- `src/hooks/useTexts.js` - Text management hook

**Checklist**:
- [ ] Paste text works
- [ ] File upload works (.txt)
- [ ] Sentences parsed correctly
- [ ] Data persisted to IndexedDB

---

## Phase 4: Reading Mode

**Goal**: Sentence-by-sentence reading with progress tracking

**Files to create**:
- `src/pages/ReadingPage.jsx`
- `src/components/Reading/SentenceCard.jsx`
- `src/components/Reading/ProgressBar.jsx`
- `src/components/Reading/NavigationControls.jsx`
- `src/hooks/useReadingProgress.js`
- `src/styles/reading.css`

**Checklist**:
- [ ] Display one sentence at a time
- [ ] Navigate forward/backward
- [ ] Progress saved and restored
- [ ] Keyboard shortcuts work

---

## Phase 5: Word Lookup & Vocabulary

**Goal**: Tap words for definitions, save to vocabulary

**Files to create**:
- `src/components/Reading/WordToken.jsx`
- `src/components/Vocabulary/DefinitionPopup.jsx`
- `src/components/Vocabulary/VocabularyList.jsx`
- `src/pages/VocabularyPage.jsx`
- `src/utils/tokenizer.js` - Word tokenization
- `src/hooks/useVocabulary.js`
- `src/services/dictionaryApi.js` - Dictionary API wrapper
- `src/styles/vocabulary.css`

**Checklist**:
- [ ] Click word shows popup
- [ ] Definition fetched from API
- [ ] Word saved to vocabulary
- [ ] Vocabulary list displays saved words

---

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run linter
npm run test     # Run tests
```

## Troubleshooting

### Issue: PWA not installing

Solution: Ensure manifest.json and service worker are correctly configured. Check HTTPS in production.

### Issue: IndexedDB errors

Solution: Check browser compatibility. Clear site data and retry.
