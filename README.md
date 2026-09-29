# Quire

**Quire** is a thesis workspace designed to help postgraduate researchers move from reading to thinking to writing without losing the connection between ideas and evidence.

## Current prototype

Quire currently includes:

- Thesis dashboard and project overview
- Adaptive study setup for qualitative, quantitative, mixed-methods and systematic review/meta-analysis projects
- Word-count targets, deadlines, milestones and pace-based completion estimates
- Research library
- Real PDF reading workspace
- Persistent highlights, notes and thesis evidence links
- DOI / scholarly metadata import
- Quire Copilot prototype
- Thesis map
- Chapter planner and editor
- Brainstorm board
- Writing and evidence review

The AI buttons are still prototypes. The PDF reader, annotations and scholarly metadata workflow are functional locally; no external AI model is connected yet.

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

## Run locally

1. Clone the repository.
2. Open `index.html` in a modern browser.

For reliable authentication redirects and later PDF features, serving the app over HTTPS or a local development server is preferable to opening it through a `file://` URL.

## Next build stage

1. AI summarisation grounded in uploaded papers
2. Page-level citations for AI answers
3. Reference-manager integration

© Quire prototype.
