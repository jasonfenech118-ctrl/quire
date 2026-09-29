# Quire scholarly metadata — Step 5

Step 5 adds bibliographic metadata lookup and DOI import to the Research Library.

## Supported input

Quire accepts:

- a DOI such as `10.1234/example.2026.001`
- a DOI URL such as `https://doi.org/10.1234/example.2026.001`
- an article title or bibliographic search phrase

## Metadata source

Quire uses the public Crossref REST API.

For DOI lookups, Quire requests the exact Crossref work record. For title/bibliographic searches, it requests a short ranked list of matching works.

The user should still verify final reference details against the published article before submission.

## Imported fields

Where available, Quire stores:

- title
- authors
- journal / container title
- publication year
- DOI
- abstract
- publisher
- volume
- issue
- page range
- article number
- ISSN
- publication dates
- reference count
- Crossref citation count
- source URL
- metadata source and fetch time

The additional bibliographic fields are stored in the article's `citationData` object, so later citation/export features can use them without changing the basic article model.

## Duplicate handling

Within the active thesis project, DOI comparison is case-insensitive.

If a DOI already exists, **Add to research library** updates the existing record instead of creating a second copy.

## PDF integration

A metadata-only article can exist in the library without a PDF. Quire shows that the PDF still needs to be attached.

When a PDF is already open in the reader, **Find metadata → Apply to open PDF** updates that article's title, authors, journal, year, DOI and citation data while keeping:

- the local PDF
- highlights
- notes
- evidence links
- reading state

This is useful when a PDF filename or embedded metadata is poor.

## Offline behaviour

Existing metadata remains available offline because it is stored in the normal Quire project data model.

A new Crossref lookup requires an internet connection.

## Next build stage

Step 6 is grounded AI summarisation: extract the actual text from an uploaded paper and let Quire Copilot summarise, critique and answer questions from that paper rather than from demo content.
