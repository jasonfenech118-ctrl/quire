# Quire OCR for scanned PDFs — Step 17

Step 17 makes image-only and scanned research papers usable inside the same Quire reading and evidence workflow as normal text PDFs.

## What happens when a scanned PDF is opened

Quire first tries the normal PDF.js text extraction path.

If no usable text is found, the reader shows the OCR panel and explains that the paper needs optical character recognition before grounded Copilot can use it.

OCR can also be opened manually from the article-reader toolbar.

## OCR controls

The reader supports:

- **OCR current page**
- **OCR document**
- **Skip pages that already contain text** (enabled by default)
- **Cancel** while OCR is running
- English OCR
- Maltese OCR
- combined English + Maltese OCR

The progress indicator shows the current PDF page and overall document progress.

## Local-first processing

Quire loads Tesseract.js only when OCR is actually requested.

PDF pages are rendered to temporary browser canvases and recognised in the browser. OCR text and page coordinates are then stored in Quire's local IndexedDB text index.

The recognition engine and language data are downloaded on first use and may be cached by the browser.

## Selectable OCR text

OCR is not stored as a detached transcript.

Each recognised word is saved with a normalised rectangle:

```js
{
  text: "education",
  rect: {
    x: 0.18,
    y: 0.42,
    w: 0.09,
    h: 0.018
  }
}
```

When the scanned PDF page is rendered again, Quire places transparent selectable OCR text over the page image using those coordinates.

That means scanned papers can use the same features as ordinary PDFs:

- text selection
- coloured highlights
- research notes
- exact page anchors
- claim-level Copilot citations
- evidence-to-writing links

## Preserving native PDF text

OCR does not automatically replace good embedded PDF text.

With **Skip pages that already contain text** enabled, Quire OCRs only pages whose existing text layer is empty or effectively unusable.

If an OCR page already exists and the normal PDF text extractor later runs again, Quire preserves the OCR page where it contains more useful text.

## Text-index completeness

The reader now checks whether a text index covers every page in the PDF before treating it as complete.

This prevents a one-page OCR run from accidentally making Copilot believe the whole paper has been indexed.

## Replacing the PDF

When the underlying PDF is replaced, the old text index is removed. Quire then rebuilds the text layer for the new file so OCR coordinates cannot be incorrectly reused against a different document.

## Limitations

OCR quality depends on the quality of the scan.

Poor resolution, skewed pages, handwriting, complex tables and multi-column layouts can reduce recognition accuracy. Researchers should verify important quotations and evidence against the visible source page.

OCR is intended to make scanned evidence searchable and traceable; it is not a substitute for checking the original publication.
