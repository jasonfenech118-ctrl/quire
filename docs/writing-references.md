# Quire — Insert references while writing

Quire can now insert a reference directly at the current cursor position in the chapter editor.

## Workflow

1. Place the cursor where the citation belongs.
2. Select **Insert reference** in the writing toolbar.
3. Search the active thesis Research Library by:
   - author
   - article title
   - year
   - DOI
4. Select a reference.
5. Quire inserts the in-text citation using the project's current citation style.

The supported citation styles remain:

- Harvard
- APA 7th
- Vancouver

## Add a reference without leaving the editor

If the paper is not already in the Research Library, the same dialog can search Crossref using:

- DOI
- DOI URL
- article title

Choose **Add & cite** to add the scholarly metadata to the active thesis and insert the citation immediately.

## Citation provenance

Inserted references are not plain untraceable text.

Quire stores the article ID on the inline citation element:

```html
<span data-citation-article="article_...">(...)</span>
```

That lets Quire:

- regenerate the citation if the citation style changes;
- identify which library item the citation came from;
- include the reference in the bibliography;
- maintain a neutral section-level `cites` relationship.

## Removing a citation

When a citation inserted by this workflow is deleted from the manuscript and the section is saved, Quire reconciles the section's auto-created citation links.

Unused auto-citation links are removed so deleted citations do not remain as stale bibliography relationships.

## Citation style changes

Changing between Harvard, APA 7th and Vancouver updates identifiable inserted citations in the currently open section.

## Bibliography

The bibliography engine checks both:

- thesis evidence links; and
- inline citation article IDs stored in persisted section content.

This provides an additional safeguard so a visible manuscript citation remains represented in the bibliography.

## Important distinction

An inserted citation creates the relationship type `cites`.

This is intentionally different from:

- supports
- contradicts
- contextualises
- critiques
- methodological evidence

Citing a paper does not automatically claim that the paper supports the sentence. The Thesis Map therefore renders citation-only links using a neutral line style.
