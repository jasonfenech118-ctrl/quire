# Quire PDF Reader — Step 3

Step 3 replaces the static paper mock-up with a real PDF workflow.

## What works

- Upload a PDF from the Research Library or the New menu.
- Create an article record in the active thesis project.
- Save the actual PDF locally in IndexedDB.
- Reopen locally stored PDFs after a browser reload.
- Render the document using PDF.js.
- Navigate previous/next pages.
- Jump to pages from the thumbnail rail.
- Zoom in and out.
- Fit the current page to the reader width.
- Use full-screen reading mode.
- Read basic PDF metadata such as title, author and page count when available.
- Attach a PDF to an article whose metadata exists but whose file is not on this device.

## Local storage

PDF binary files are stored in the browser's IndexedDB database:

- Database: `quire-pdfs`
- Object store: `pdfs`
- Key: Quire `articleId`

The thesis/article metadata remains in the normal Quire project store. This separation is deliberate: large PDF files should not be placed in localStorage.

## Cloud behaviour

No Quire Supabase project is required for Step 3.

When cloud accounts are eventually activated, article metadata can sync immediately through the existing cloud layer. The actual PDF binary remains local until Supabase Storage (or another file store) is configured. A later storage migration can upload those binaries without redesigning the article reader.

## Step 4 implemented

The PDF reader now includes a selectable text layer, persistent coloured highlights, attached notes, and evidence links. See `highlights-notes.md` for the current annotation workflow.
