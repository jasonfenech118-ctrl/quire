# Quire

**Quire** is a thesis workspace designed to help postgraduate researchers move from reading to thinking to writing without losing the connection between ideas and evidence.

## Current prototype

Quire currently includes:

- Thesis dashboard and project overview
- Adaptive study setup for qualitative, quantitative, mixed-methods and systematic review/meta-analysis projects
- Word-count targets, deadlines, milestones and pace-based completion estimates
- Research library
- Real PDF reading workspace
- Browser OCR for scanned/image-only PDFs
- Persistent highlights, notes and thesis evidence links
- DOI / scholarly metadata import
- BibTeX / RIS reference-manager import and export
- Grounded article Copilot with real PDF text retrieval
- Thesis map
- Chapter planner and editor
- Brainstorm board
- Writing and evidence review

The article Copilot now works in a local grounded-analysis mode using text extracted from the real PDF. An optional secure server endpoint can provide generative AI synthesis; no provider secret is stored in the browser.

## Step 1 — Data model ✅

Quire has a canonical project-centric data model in `data-model.js`, with a matching PostgreSQL/Supabase schema in `supabase/schema.sql`.

The model covers thesis projects, study setup, objectives, chapters, sections, articles, highlights, notes, themes, evidence links, milestones, progress history and AI conversations.

See `docs/data-model.md`.

## Step 2 — Accounts & cloud persistence ✅ code complete

Quire now has a local-first Supabase account and synchronisation layer in `cloud.js`.

It includes:

- Email/password sign-up and sign-in
- Persistent sessions
- Automatic cloud sync after local changes
- First-sign-in migration of the local thesis into an empty cloud account
- Manual **Save to cloud** and **Reload from cloud**
- Row-level security policies so users can access only their own thesis projects
- Local operation when cloud access is unavailable

### Activate the cloud backend

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Open Quire and choose **Account & cloud**.
4. Enter the Supabase project URL and the **anon / publishable key**.
5. Create an account or sign in.

Never put a Supabase service-role key in the browser.

See `docs/cloud-sync.md`.

## Step 3 — Real PDF upload & rendering ✅

Quire now has a real PDF workflow using PDF.js and IndexedDB:

- Upload actual PDF research papers
- Persist PDF files locally on the device
- Render genuine PDF pages inside Quire
- Page thumbnails and navigation
- Zoom, fit-width and full-screen reading
- Basic PDF metadata extraction
- Attach/replace a PDF for an existing article

This step does **not** require Supabase. PDF binaries remain local until a Quire cloud storage project is configured.

See `docs/pdf-reader.md`.

## Step 4 — Persistent PDF highlights & notes ✅

Quire's PDF reader now supports selectable text, persistent coloured highlights, attached research notes, a Highlights sidebar, and evidence links to themes, objectives and chapters.

Annotations remember the exact source page and normalised PDF location so they can be restored after reopening or zooming the paper.

See `docs/highlights-notes.md`.

## Step 5 — Article metadata / DOI import ✅

Quire can now retrieve bibliographic details from Crossref using a DOI, DOI URL, or article-title search.

The metadata preview includes title, authors, journal, year, DOI, abstract and a reference preview. DOI duplicates update the existing library record instead of creating a second article, and metadata can be applied directly to an already imported PDF.

See `docs/article-metadata.md`.

## Step 6 — Grounded article Copilot ✅

Quire now extracts the actual uploaded PDF page-by-page and indexes the text locally. Summary, Methods, Findings, Critique and article questions retrieve supporting passages from that paper and expose clickable source pages.

Without a backend, Quire uses a local extractive grounded mode. A secure HTTPS AI endpoint can optionally be connected for generative synthesis; Quire sends only retrieved article passages and never asks users to place a provider secret key in browser code.

See `docs/grounded-copilot.md`.

## Step 7 — Claim-level exact-passage citations ✅

Copilot responses now attach citations to individual claims rather than showing a general list of source pages. Selecting a citation opens the supporting page and visually focuses the exact retrieved passage.

The PDF text index now preserves source geometry, and the secure AI endpoint contract uses stable context IDs so generated claims can only receive citations that map back to passages Quire actually supplied.

See `docs/claim-level-citations.md`.

## Step 8 — Reference-manager interoperability ✅

The active thesis library can now import BibTeX and RIS files and export the complete bibliography back to either format. This provides a portable workflow with Zotero, Mendeley, EndNote and other tools that support these standards.

Quire detects duplicates by DOI or normalised title, merges bibliographic metadata without disturbing PDFs or research annotations, and processes large imports in a single project-store update.

See `docs/reference-manager.md`.

## Phase 2 — Thesis workflow

- Step 9 — Multi-project research workspace ✅
- Step 10 — Persistent chapter & section editor ✅
- Step 11 — Evidence-to-writing workflow ✅
- Step 12 — Academic citations & bibliography ✅
- Step 13 — Suggestion-based writing review ✅
- Step 14 — Claim/evidence checking ✅
- Step 15 — Multi-paper synthesis workspace ✅
- Step 16 — Adaptive methodology workspace ✅
- Step 17 — OCR for scanned PDFs ✅

### Step 17 — OCR for scanned PDFs

Quire now detects papers with no usable text layer and can run browser-based OCR on the current page or the whole document. OCR text is stored with page coordinates and rendered back as a selectable overlay, so scanned papers can use highlights, notes, grounded Copilot and exact-passage citations.

See `docs/ocr.md`.

## Run locally

1. Clone the repository.
2. Open `index.html` in a modern browser.

For reliable authentication redirects and later PDF features, serving the app over HTTPS or a local development server is preferable to opening it through a `file://` URL.

## Build roadmap

The original eight foundation steps and Phase 2 Steps 9–17 are implemented. The next planned step is **Step 18 — Live Thesis Map**, using the real project graph rather than static prototype content.

© Quire prototype.
