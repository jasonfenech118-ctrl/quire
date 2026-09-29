# Quire reference-manager interoperability — Step 8

Step 8 lets a thesis library move between Quire and established citation managers without requiring a vendor-specific account.

## Supported formats

Quire currently supports:

- BibTeX (`.bib`)
- RIS (`.ris`)

These formats can be exported by tools such as Zotero, Mendeley and EndNote.

## Import workflow

From **Research Library → References**, choose a `.bib` or `.ris` file.

Quire:

1. detects the file format;
2. parses the references locally in the browser;
3. previews the references before import;
4. checks the active thesis for duplicates;
5. imports all references in one batch transaction.

### Duplicate detection

Quire checks:

1. DOI, case-insensitively;
2. normalised article title when no DOI match exists.

When a match already exists, Quire updates the bibliographic metadata rather than creating a duplicate.

Importing metadata never removes:

- an attached local PDF;
- reading status;
- highlights;
- research notes;
- themes;
- evidence links;
- Copilot history.

## Imported bibliographic fields

Where available, Quire preserves:

- title
- authors
- journal / container title
- publication year
- DOI
- abstract
- source URL
- publisher
- volume
- issue
- page range
- ISSN / ISBN
- keywords
- original BibTeX citation key
- reference type
- import source and timestamp

Additional fields live in the article's `citationData` object so the core article model remains stable.

## Export workflow

Quire can export the complete active-thesis research library as:

### BibTeX

Useful for Zotero, LaTeX/BibLaTeX workflows and many reference managers.

Quire generates stable citation keys where an imported key is not already available.

### RIS

Useful for Zotero, Mendeley, EndNote and other reference-management systems.

## What does not leave Quire

BibTeX and RIS are bibliographic exchange formats. They do not contain Quire-specific research work such as:

- PDF binaries
- Quire highlights
- attached research notes
- theme/objective/chapter evidence links
- Copilot conversations
- claim-level PDF anchors

Those remain part of the Quire project.

## Local-first behaviour

Import parsing and export generation happen entirely in the browser and do not require Supabase.

A future direct Zotero sync could be added through a secure server-side connector, but Step 8 intentionally starts with portable standards rather than storing third-party account credentials in the browser.

## Large imports

Reference imports use a single batch update in the Quire project store. This avoids repeatedly redrawing the full Research Library when importing a large bibliography.
