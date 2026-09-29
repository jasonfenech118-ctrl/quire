# Quire claim-level citations — Step 7

Step 7 upgrades the reader Copilot from page-level source lists to **claim-level, exact-passage citations**.

## What changed

Every supported Copilot statement now carries its own citation marker.

Instead of:

```
Answer paragraph...

Sources: p. 3, p. 7, p. 11
```

Quire now models:

```
Claim A  [1] p. 3
Claim B  [2] p. 7
Claim C  [3] p. 11
```

Each marker is attached only to the passage used to support that particular claim.

## Exact passage anchors

The PDF text index now stores both text and source geometry for each extracted text segment.

For each page Quire keeps:

- page number
- extracted page text
- ordered text segments
- normalised PDF-page rectangles for those segments

Retrieval passages inherit those rectangles. Because coordinates are normalised rather than stored as screen pixels, Quire can focus the same evidence after zoom changes.

Old Step 6 text indexes are automatically rebuilt into the new anchored format when a paper is reopened.

## Citation interaction

Selecting a claim citation:

1. identifies the exact retrieved context for that claim;
2. displays the supporting excerpt in the Copilot panel;
3. opens the correct PDF page;
4. visually focuses the source passage on the page.

This focus is temporary and does not create a permanent user highlight.

## Local grounded mode

Local mode remains deliberately extractive.

A local Copilot claim is derived from a retrieved source statement and is assigned one exact passage citation. Quire does not convert source retrieval into an unsupported synthetic conclusion.

## Generative AI contract v2

A connected AI endpoint receives contexts with stable IDs:

```json
{
  "schema_version": 2,
  "mode": "summary",
  "question": "",
  "article": {
    "id": "article_...",
    "title": "Example paper"
  },
  "contexts": [
    {
      "context_id": "p4c2",
      "page": 4,
      "text": "The retrieved source passage..."
    }
  ],
  "instruction": "Use only the supplied article contexts..."
}
```

The endpoint should return:

```json
{
  "title": "Grounded summary",
  "intro": "Brief orientation text.",
  "claims": [
    {
      "text": "A claim supported by the supplied paper.",
      "context_ids": ["p4c2"]
    },
    {
      "text": "A second claim.",
      "context_ids": ["p7c1", "p8c1"]
    }
  ]
}
```

Quire resolves the returned `context_ids` against the contexts it originally sent. The endpoint cannot manufacture a client-side citation simply by returning an arbitrary page number.

If a generated claim has no valid context ID, Quire displays it as **uncited** and warns the researcher not to rely on it.

## Conversation history

The human-readable Copilot response is stored in `ai_messages.content`.

Its exact source evidence is stored in `ai_messages.sourceRefs`, including:

- context ID
- page
- excerpt
- normalised passage rectangles

That means future conversation/history views can reconstruct the evidence behind an earlier answer.

## Academic-use principle

A citation marker means:

> This is the passage Quire used to support this claim.

It does **not** mean:

> This interpretation is unquestionably correct.

The user can always jump back to the original article and inspect the wording in context.
