# Quire Grounded Copilot — Step 6

Step 6 replaces the article-reader demo responses with a source-grounded analysis pipeline built from the actual uploaded PDF.

## How grounding works

1. PDF.js extracts text from every page of the open PDF.
2. Quire stores the page-level text locally in IndexedDB.
3. The paper is split into retrieval passages while preserving page numbers.
4. A Copilot request searches those passages for the most relevant evidence.
5. Only the retrieved passages are used for the response.
6. Source-page buttons let the researcher jump directly back to the PDF.

This means the article itself is the source of truth for the reader Copilot.

## Local grounded mode

No AI account or backend is required.

In local mode Quire provides an extractive grounded analysis for:

- article overview
- methods
- key findings
- critical-appraisal starting points
- free-text questions about the paper

Local mode deliberately avoids pretending to be a generative model. It retrieves and organises source text, shows page references, and flags when it cannot support an answer from the extracted paper.

## Optional generative AI

A secure HTTPS server endpoint can be configured from the Copilot settings.

Quire does **not** accept a secret model/API key in the browser. Provider credentials belong on the server.

When an endpoint is configured, Quire sends a small grounded context package:

```json
{
  "mode": "summary | methods | findings | critique | question",
  "question": "optional user question",
  "article": {
    "id": "article_id",
    "title": "Article title",
    "authors": "Authors",
    "journal": "Journal",
    "year": 2026,
    "doi": "10.xxxx/..."
  },
  "study": {
    "...": "current Quire study setup"
  },
  "contexts": [
    {"page": 3, "text": "retrieved passage"},
    {"page": 7, "text": "retrieved passage"}
  ],
  "instruction": "Answer only from the supplied article contexts..."
}
```

The Step 7 endpoint contract now uses **claim-level context IDs**. See `claim-level-citations.md` for schema version 2. The endpoint returns `claims[]`, and each claim names the supplied `context_ids` that directly support it.

If the configured endpoint fails, Quire falls back to local grounded mode.

## Local text index

PDF binary storage remains in IndexedDB database `quire-pdfs`.

Step 6 upgrades that database and adds:

- object store: `text-index`
- key: `articleId`
- value: page-numbered extracted text

The text index is regenerated when a PDF is replaced.

## Conversation persistence

Article Copilot messages now use the existing Quire data model:

- `aiThreads`
- `aiMessages`

Assistant messages retain their page-source references.

The cloud schema already contains matching tables, so these conversations are ready for later Supabase persistence.

## Safety and academic-use principle

Grounding reduces hallucination risk but does not make automated analysis infallible.

Quire therefore:
- keeps the original paper one click away;
- shows source pages;
- tells the model to say when evidence is insufficient;
- labels local extractive mode clearly;
- treats critical appraisal as a starting point rather than an authoritative methodological judgment.

## Step 7 implemented

Copilot now links individual claims to exact retrieved passages and can visually focus those passages in the PDF. See `claim-level-citations.md`.
