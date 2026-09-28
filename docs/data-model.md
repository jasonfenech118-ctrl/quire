# Quire Data Model v1

Step 1 establishes the canonical project model used by Quire.

## Principle

Everything belongs to a **thesis project**. Articles, notes, chapters, deadlines, AI conversations and progress never live globally.

## Core relationships

```
Thesis Project
├── Study Setup
├── Objectives
├── Chapters
│   └── Sections
├── Articles
│   ├── Highlights
│   └── Notes
├── Themes
├── Evidence Links
├── Milestones
├── Progress Snapshots
└── AI Threads
    └── AI Messages
```

Evidence Links are the bridge between the research library and the written thesis. A source, highlight or note can be linked to a theme, objective and thesis section with a relationship such as **supports**, **contradicts**, **contextualises**, **critiques**, or **method**.

## Client-side implementation

`data-model.js` provides `window.QuireStore`.

Current public methods:

- `getState()`
- `getActiveProject()`
- `getActiveProjectId()`
- `createProject(input)`
- `setActiveProject(projectId)`
- `getStudySetupData(projectId)`
- `saveStudySetupData(data, projectId)`
- `getLatestProgress(projectId)`
- `saveProgressSnapshot(progress, projectId)`
- `getProjectBundle(projectId)`

The store is saved under `localStorage["quire:v1"]`.

On first load it migrates the previous prototype keys `quireStudySetup` and `quireProjectProgress` into the v1 project model.

## Database implementation

`supabase/schema.sql` contains the matching PostgreSQL/Supabase schema.

It defines:

- `thesis_projects`
- `study_setups`
- `objectives`
- `chapters`
- `sections`
- `articles`
- `highlights`
- `notes`
- `themes`
- `article_themes`
- `evidence_links`
- `milestones`
- `progress_snapshots`
- `ai_threads`
- `ai_messages`

The SQL is committed as the target cloud schema but is **not connected to the app yet**. Authentication, RLS policies and live persistence belong to Step 2.

## Progress history

Progress is snapshot-based rather than a single mutable number. That lets Quire later calculate:

- writing velocity
- article-review velocity
- milestone completion over time
- changes in estimated completion date
- whether the project is accelerating or slowing

## Why this comes before PDF and AI

A highlight needs to know which article and project it belongs to. An AI answer needs to know which paper, thesis section and project it used. A citation needs a stable article record. Building these relationships first prevents later features from becoming disconnected data silos.
