# Quire highlights and notes — Step 4

Step 4 turns the real PDF reader into a research annotation workspace.

## What works

- A selectable text layer is rendered over each PDF page.
- Selecting text opens a compact annotation toolbar.
- Highlights can be saved in yellow, green, blue or rose.
- Each highlight stores:
  - article ID
  - page number
  - selected text
  - colour
  - category
  - normalised PDF-page coordinates
- Saved highlights are redrawn in the correct place when the page is reopened or zoomed.
- A research note can be attached to a highlight.
- Highlights can be categorised as:
  - key finding
  - methodology
  - limitation
  - definition / concept
  - potential quote
  - contradictory evidence
  - idea / interpretation
- A highlight/note can be linked to:
  - a thesis theme
  - a research objective
  - a chapter
  - an evidence relationship such as supports, contradicts, contextualises, critiques or method
- The reader's **Highlights** tab lists annotations for the current article and lets the user jump back to the source page.
- Highlight and note counts update in the Research Library and dashboard.

## Persistence

Annotation records are stored in the Quire project data model, not inside the PDF file itself.

The original PDF remains unchanged. This is important because it preserves the source document while Quire maintains a separate research layer above it.

The location of a highlight is stored as normalised rectangles rather than screen pixels, so the highlight can be redrawn after zoom changes.

## Data model

Step 4 uses the existing:

- `highlights`
- `notes`
- `themes`
- `objectives`
- `evidence_links`

A chapter link has also been added to evidence links so evidence can be connected directly to a chapter before individual thesis sections are fully defined.

## Cloud readiness

The browser implementation works without Supabase.

The future Supabase schema and cloud mapper have also been updated so highlight, note and chapter-evidence relationships are ready for cloud persistence when a dedicated Quire backend is created.

## Next build stage

Step 5 should add **article metadata / DOI import** so Quire can populate bibliographic details from a DOI or article URL instead of relying only on PDF metadata or filenames.
