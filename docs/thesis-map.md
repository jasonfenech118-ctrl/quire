# Quire Live Thesis Map — Step 18

Step 18 replaces the static Thesis Map prototype with a graph generated from the active project's real research data.

## Purpose

The map is intended to answer a practical thesis question:

> How does this piece of evidence contribute to the argument I am building?

It therefore visualises the chain from the research question to the writing itself.

## Live graph structure

The main map is organised as five stages:

1. **Research question**
2. **Objectives**
3. **Themes**
4. **Evidence / articles**
5. **Writing — chapters and sections**

The nodes are created from the canonical Quire project store. No example papers, objective counts or chapter-source counts are hard-coded into the map.

## Relationship sources

Quire draws connections from the relationship records that already exist in the project.

### Research question → objectives

This is a structural relationship: all objectives belong to the active research question/project.

### Objective → theme

A line is drawn when an evidence link explicitly contains both an objective and theme.

Quire can also display a **derived** objective/theme relationship when both entities are connected to the same source article. Derived lines are visually different from explicit evidence relationships.

### Theme → article

Connections come from:

- `articleThemes`
- evidence links containing both a theme and article/highlight

### Article → chapter / section

These are based on actual `evidenceLinks`.

If a link points to a thesis section, the map connects the article directly to that section. Chapter-level links connect to the chapter node.

### Chapter → section

These are structural links generated from the chapter/section hierarchy.

## Relationship types

Evidence lines retain their relationship type:

- supports
- contradicts
- contextualises
- critiques
- methodological evidence

The toolbar can filter the map to one of these evidence relationships.

Structural and derived relationships are intentionally distinguished from researcher-created evidence links.

## Node inspector

Selecting a node opens the map inspector.

Depending on the node, it shows:

- connection count
- evidence-link count
- directly connected entities
- relationship type
- whether a relationship was derived
- article metadata
- chapter or section word/status information

Actions can open:

- the exact article in the PDF reader
- a chapter in the writing workspace
- a section in the writing workspace
- Study Setup for the research question/objectives

## Add connection

The Thesis Map now has its own evidence-connection editor.

A researcher can connect:

- an article
- optionally an exact PDF highlight
- an objective
- a theme
- a chapter
- a section
- a relationship type
- an optional rationale

The saved record uses Quire's existing `evidenceLinks` model, so the map is not maintaining a second, disconnected graph.

The same connection is therefore available to other Quire workflows such as evidence-to-writing and future progress analytics.

## Gap view

The **Gaps** mode highlights entities that currently have weak or missing research connections.

Examples include:

- objectives with no linked source evidence
- themes with no connected papers
- articles that are not yet used in an evidence relationship
- chapters with no evidence links
- sections with no linked evidence

The gap list is a structural prompt, not a judgement that the research is inadequate.

## Live statistics

The map header derives current counts for:

- objectives
- themes
- evidence-backed papers
- sections with evidence
- evidence links
- structural gaps

These values update from the project store rather than prototype counters.

## Performance

The map marks itself dirty when other workspaces change project data.

It does not redraw continuously while the researcher is typing in another view. The graph is rebuilt when the Thesis Map is opened or when relevant data changes while the map is visible.

Window resizing redraws only the SVG relationship lines.

## Navigation

The chapter editor now exposes project-safe navigation helpers so the Thesis Map can open the exact chapter or section selected in the graph.

## Interpretation principle

A line means that Quire has a stored relationship or a clearly identified structural/derived relationship.

It does not imply that:

- the evidence is high quality;
- the relationship is scientifically correct;
- two studies agree;
- a theme is sufficiently developed.

The map is a traceability and thinking tool. The researcher remains responsible for interpretation.
