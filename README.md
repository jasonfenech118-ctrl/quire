# Quire

**Quire** is a thesis workspace designed to help postgraduate researchers move from reading to thinking to writing without losing the connection between ideas and evidence.

## Current prototype

Quire currently includes:

- Simplified five-destination navigation: Home, Research, Ideas, Thesis and Progress
- Word-style thesis ribbon with References, Evidence, Review and AI Assist
- Evidence-aware claim, opposing-evidence and interpretation checks

- Thesis dashboard and project overview
- Adaptive study setup for qualitative, quantitative, mixed-methods and systematic review/meta-analysis projects
- Live word-count, evidence, milestone and history-based progress intelligence
- Research library
- Real PDF reading workspace
- Browser OCR for scanned/image-only PDFs
- Persistent highlights, notes and thesis evidence links
- DOI / scholarly metadata import
- BibTeX / RIS reference-manager import and export
- Grounded article Copilot with real PDF text retrieval
- Live thesis relationship map
- Chapter planner and editor with writing-time reference insertion
- Supervisor review, feedback and section version history
- Structured Word-compatible and print/PDF thesis export
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
- Step 18 — Live Thesis Map ✅
- Step 19 — Progress Intelligence ✅
- Step 20 — Supervisor & Revision Workflow ✅
- Step 21 — Thesis Export ✅
- Step 22 — Real Cloud Backend — code complete; activation deliberately deferred
- Step 23 — Final Product Polish ✅
- Step 24 — Guided Project Launch ✅
- Step 25 — Data Integrity & Migration Hardening ✅
- Step 26 — Literature Search & Screening Workflow ✅
- Step 27 — Critical Appraisal & Quality Assessment ✅
- Step 28 — Research Data & Analysis Workspace ✅
- Step 29 — Submission Readiness & Integrity ✅
- Step 30 — Unified Writing Workspace & Academic Ribbon 🟡 existing foundation under reconciliation

**Frontend-first rule:** Quire is currently being developed and refined locally. Do not activate or modify the external Supabase backend until the frontend workflow is reviewed and approved. Step 22 means the integration code exists; it does not mean a Supabase project is currently connected.

**Continuity rule:** Before starting a new numbered step, reconcile the repository against `docs/PROJECT_MASTER.md` and `docs/CONTINUE_HERE.md`. Do not mark a step complete merely because a file exists; confirm that its UI is wired, its core interactions work, and its documentation matches the implementation.

### Step 17 — OCR for scanned PDFs

Quire now detects papers with no usable text layer and can run browser-based OCR on the current page or the whole document. OCR text is stored with page coordinates and rendered back as a selectable overlay, so scanned papers can use highlights, notes, grounded Copilot and exact-passage citations.

See `docs/ocr.md`.

### Step 18 — Live Thesis Map

The Thesis Map is now generated from the active project's real research graph. It traces the research question through objectives, themes, articles/evidence, chapters and sections; supports relationship filtering; provides clickable node inspection and navigation; and highlights structural gaps.

The map also includes a connection editor that writes directly into Quire's existing evidence-link model.

See `docs/thesis-map.md`.

### Writing-time reference insertion

The chapter editor can now search the active Research Library and insert a correctly formatted citation at the current cursor position. If the source is missing, DOI/title lookup can add and cite it directly without leaving the writing workflow.

Inserted citations retain their source article ID and use a neutral `cites` relationship rather than being mislabelled as supporting evidence.

See `docs/writing-references.md`.

### Step 19 — Progress Intelligence

Prototype progress counters and manually entered writing pace have been replaced with metrics derived from the active project's real sections, article statuses, evidence links, chapter states and milestones.

Quire records one derived snapshot per project per day, learns writing velocity from dated history, shows a transparent weighted progress breakdown and only produces a completion forecast once enough real history exists.

See `docs/progress-intelligence.md`.

### Step 20 — Supervisor & Revision Workflow

Quire now supports supervisor review rounds, structured revision feedback and section-level version history. Creating a review round snapshots the submitted draft, feedback stays separate from manuscript content, and restoring an older version automatically preserves the current draft first.

See `docs/supervision-revisions.md`.

### Step 21 — Thesis Export

Quire can now assemble the active thesis from its real chapters, sections and cited references into a clean document preview. It supports whole-thesis or chapter export, Word-compatible `.doc` download and an A4 print layout for Save as PDF.

See `docs/thesis-export.md`.

### Step 22 — Real Cloud Backend Activation

The repository now includes private Supabase Storage support for research PDFs. Local PDFs can be uploaded to a private per-user path and automatically downloaded to another signed-in device when the paper is opened.

The code and SQL policies are complete, but the external Supabase project still needs to be created and configured.

See `docs/cloud-activation.md`.

### Step 23 — Final Product Polish

Quire now includes real cross-project search, live dashboard activity, a fully data-driven Research Library, structured backup/restore, browser diagnostics, keyboard shortcuts, accessibility improvements, mobile navigation and an installable/offline application shell.

See `docs/product-polish.md`.

### Step 24 — Guided Project Launch

New theses now start through a five-step launch wizard covering project identity, research question/objectives, study design, targets/deadlines and an initial chapter scaffold. The Thesis Overview then shows a live readiness checklist.

See `docs/guided-launch.md`.

### Step 25 — Data Integrity & Migration Hardening

Quire now version-controls its local data shape, migrates older workspaces forward, audits relationships across the research graph and safely repairs supported inconsistencies. Automatic migration/repair attempts to preserve a local recovery copy first, and backup restore plus cloud push now pass through the integrity layer.

See `docs/data-integrity.md`.

### Step 26 — Literature Search & Screening

Quire now supports reproducible PICO/PCC/SPIDER/custom search planning, Boolean query construction, database search-run logging and two-stage title/abstract + full-text screening with live flow counts.

See `docs/search-screening.md`.

### Step 27 — Critical Appraisal & Quality Assessment

Quire now records structured methodological appraisal for individual papers, preserves domain-level reasoning and narrative limitations/applicability, and avoids collapsing study quality into a simplistic numerical score.

See `docs/critical-appraisal.md`.

### Step 28 — Research Data & Analysis Workspace

Quire now stores de-identified analytic structures, results, findings and memos that adapt to the selected study design and can be linked directly to objectives and writing sections.

See `docs/data-analysis.md`.

### Step 27 — Submission Readiness & Integrity

Quire now centralises concrete structural and integrity checks across writing, evidence, citations, screening, appraisal, analysis, supervision, deadlines and export metadata. Institution-specific requirements can be added as a separate user-controlled checklist.

See `docs/submission-readiness.md`.

## Run locally

1. Clone the repository.
2. Open `index.html` in a modern browser.

For reliable authentication redirects and later PDF features, serving the app over HTTPS or a local development server is preferable to opening it through a `file://` URL.

## Build roadmap

Steps 1–29 have implementation in the repository. Step 22 is code-complete but external Supabase activation is deliberately deferred while Quire remains frontend-first. Step 30 already has a writing-ribbon/evidence-discovery foundation in the codebase and is currently being reconciled and refined rather than rebuilt from scratch.

Before continuing beyond Step 30, review `docs/PROJECT_MASTER.md` and `docs/CONTINUE_HERE.md` so unfinished work is not skipped.

© Quire prototype.
