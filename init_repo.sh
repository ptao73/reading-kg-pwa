#!/bin/bash

# Reading KG PWA - Project Initialization Script
# Documentation-first project setup

set -e

echo "=== Initializing Reading KG PWA ==="

# Initialize git repository
echo ">>> Initializing Git repository..."
git init

# Create documentation structure
echo ">>> Creating documentation structure..."
mkdir -p docs/{prompts,specs,architecture}

# Create CLAUDE_AUTORUN.md
echo ">>> Creating CLAUDE_AUTORUN.md..."
cat > CLAUDE_AUTORUN.md << 'EOF'
# Claude Auto-Run Configuration

This file is automatically read by Claude when starting a session.

## Project Context

**Project Name**: Reading KG PWA
**Type**: Progressive Web App
**Purpose**: A reading application with knowledge graph features

## Required Reading

Before starting any task, read the following documents in order:

1. `docs/specs/mega_project_brief.md` - Overall project vision and goals
2. `docs/specs/FDS_v1.md` - Functional Design Specification
3. `docs/specs/runbook.md` - Development procedures and workflows
4. `docs/architecture/review_gates_v1.md` - Quality gates and review checkpoints

## Claude System Prompt

See `docs/prompts/claude_system.md` for specialized instructions.

## Development Workflow

1. Review specs before implementing
2. Follow review gates for quality assurance
3. Document decisions in appropriate spec files
4. Update runbook with new procedures as needed
EOF

# Create claude_system.md
echo ">>> Creating docs/prompts/claude_system.md..."
cat > docs/prompts/claude_system.md << 'EOF'
# Claude System Prompt for Reading KG PWA

## Role

You are a senior full-stack developer working on the Reading KG PWA project.

## Core Responsibilities

1. Follow the Functional Design Specification (FDS_v1.md)
2. Adhere to review gates defined in review_gates_v1.md
3. Apply QA standards from the parent Claude_Rules directory
4. Document architectural decisions

## Tech Stack

- Frontend: React 18 + Vite
- PWA: vite-plugin-pwa with Workbox
- State: TBD (see specs)
- Backend: TBD (see specs)

## Coding Standards

- Follow QA_Standard.md from Claude_Rules
- Write clean, maintainable code
- Include meaningful comments for complex logic
- No hardcoded secrets or API keys
EOF

# Create mega_project_brief.md
echo ">>> Creating docs/specs/mega_project_brief.md..."
cat > docs/specs/mega_project_brief.md << 'EOF'
# Reading KG PWA - Project Brief

## Vision

A Progressive Web App that enhances reading comprehension through knowledge graph visualization and spaced repetition.

## Goals

1. **Offline-first**: Full functionality without internet
2. **Knowledge Graph**: Visual connections between concepts
3. **Spaced Repetition**: Intelligent review scheduling
4. **Cross-platform**: Works on mobile and desktop

## Target Users

- Language learners
- Students
- Lifelong learners

## Key Features

- [ ] Text import and parsing
- [ ] Sentence-by-sentence reading mode
- [ ] Word lookup and definitions
- [ ] Knowledge graph visualization
- [ ] Spaced repetition review system
- [ ] Progress tracking

## Success Metrics

- TBD

## Timeline

- TBD
EOF

# Create runbook.md
echo ">>> Creating docs/specs/runbook.md..."
cat > docs/specs/runbook.md << 'EOF'
# Development Runbook

## Getting Started

```bash
npm install
npm run dev
```

## Development Workflow

### 1. Before Starting a Feature

- [ ] Read the relevant section in FDS_v1.md
- [ ] Check review_gates_v1.md for quality requirements
- [ ] Create a feature branch

### 2. During Development

- [ ] Follow coding standards
- [ ] Write tests for new functionality
- [ ] Document complex logic

### 3. Before Merging

- [ ] Run all tests
- [ ] Build passes without errors
- [ ] Self-review against QA_Standard.md

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run linter
npm run test     # Run tests
```

## Troubleshooting

### Issue: [Common Issue 1]

Solution: TBD

### Issue: [Common Issue 2]

Solution: TBD
EOF

# Create FDS_v1.md
echo ">>> Creating docs/specs/FDS_v1.md..."
cat > docs/specs/FDS_v1.md << 'EOF'
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
EOF

# Create review_gates_v1.md
echo ">>> Creating docs/architecture/review_gates_v1.md..."
cat > docs/architecture/review_gates_v1.md << 'EOF'
# Review Gates v1

Quality checkpoints for the Reading KG PWA project.

## Gate 0: Pre-Development

- [ ] Requirements understood
- [ ] Approach documented
- [ ] Dependencies identified

## Gate 1: Code Complete

- [ ] Feature implemented per FDS
- [ ] Code follows standards
- [ ] No hardcoded secrets
- [ ] Error handling in place

## Gate 2: Testing

- [ ] Unit tests written
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases covered

## Gate 3: Documentation

- [ ] Code comments added
- [ ] README updated if needed
- [ ] API documentation current

## Gate 4: Performance

- [ ] No performance regressions
- [ ] Bundle size acceptable
- [ ] Lighthouse score maintained

## Gate 5: Pre-Merge

- [ ] All gates passed
- [ ] PR reviewed
- [ ] Conflicts resolved
- [ ] CI/CD green

## QA Audit Table

After each feature, complete this audit:

| Dimension | Status | Notes |
|-----------|--------|-------|
| Functionality | ✅/❌ | |
| Security | ✅/❌ | |
| Robustness | ✅/❌ | |
| Documentation | ✅/❌ | |
| Performance | ✅/❌ | |
EOF

# Create .gitignore
echo ">>> Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# PWA generated files
dev-dist/
EOF

echo ""
echo "=== Project initialized successfully! ==="
echo ""
echo "Structure created:"
echo "  reading-kg-pwa/"
echo "  ├── CLAUDE_AUTORUN.md"
echo "  ├── init_repo.sh"
echo "  └── docs/"
echo "      ├── prompts/"
echo "      │   └── claude_system.md"
echo "      ├── specs/"
echo "      │   ├── mega_project_brief.md"
echo "      │   ├── runbook.md"
echo "      │   └── FDS_v1.md"
echo "      └── architecture/"
echo "          └── review_gates_v1.md"
echo ""
echo "Next: Review and customize the spec documents."
echo ""
