# Quire Thesis Export — Step 21

Step 21 turns the active Quire project into a clean thesis document assembled from the real manuscript structure.

## Export workspace

The **Thesis Export** workspace builds a live document preview from:

- active project metadata;
- persisted chapters;
- persisted sections;
- section manuscript content;
- current citation style;
- cited references from the Quire library.

The export view does not maintain a separate manuscript copy.

## Export settings

The researcher can set:

- candidate / author name;
- submission date;
- citation style;
- whole-thesis or single-chapter scope;
- whether to include the abstract;
- whether to include a contents page;
- whether to include the bibliography;
- whether chapters should begin on a new page.

The author/export preferences are stored locally per project.

The abstract is stored back into the canonical project record.

## Document structure

The generated preview can contain:

1. title page
2. abstract
3. contents page
4. chapter headings
5. section headings
6. manuscript text
7. references

Editor-only controls and data attributes are stripped from the exported manuscript.

Inline citations remain as ordinary visible citation text.

## Word export

Quire downloads a Word-compatible `.doc` document using academic page and heading styles.

This keeps the export local and dependency-free.

It is intentionally described as Word-compatible rather than as a native `.docx` package.

Researchers can apply a university's final template, page-numbering rules and other submission-specific formatting after opening the file in Word.

## PDF export

The PDF workflow uses the browser print engine.

Quire activates a dedicated A4 print layout and the researcher chooses **Save as PDF** in the browser's print dialog.

Print layout includes:

- A4 page size
- academic margins
- title-page separation
- chapter page breaks
- readable serif manuscript typography
- bibliography hanging indents

## Export readiness

Quire checks for obvious structural issues such as:

- missing candidate name;
- missing institution;
- missing degree/programme;
- empty abstract when abstract export is enabled;
- exported chapters without sections;
- cited library records missing core author/year metadata.

These are export-readiness prompts, not a declaration that the thesis is academically or institutionally submission-ready.

## Bibliography

The bibliography is generated from Quire's citation engine and the selected citation style.

References inserted directly while writing are detected through their linked article IDs as well as through evidence relationships.

## Scope

A single chapter can be exported for review without changing the thesis itself.

Whole-thesis export remains the default.
