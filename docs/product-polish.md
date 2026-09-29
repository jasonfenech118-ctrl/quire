# Quire Final Product Polish — Step 23

Step 23 removes the remaining prototype-shell behaviour and makes Quire feel like a finished local-first research application.

## Global thesis search

The top search field now searches the active project across:

- articles and bibliographic metadata;
- chapters;
- sections and manuscript text;
- highlights;
- research notes;
- themes;
- objectives;
- supervisor feedback.

Results are ranked by relevance.

Keyboard navigation is supported:

- Up / Down to move through results;
- Enter to open;
- Escape to close.

Article results open the PDF reader.

Chapter and section results open the exact writing location.

Objective and theme results open the exact Thesis Map node.

Supervisor feedback opens the Supervision workspace and, where possible, the affected section.

## Live dashboard recent work

The old sample Recent Work cards have been removed.

Dashboard activity is now generated from real project records including:

- recently edited sections;
- recently added/updated articles;
- research notes;
- supervisor feedback.

## Live Research Library

The final hard-coded example papers and example counts have been removed.

Research Library now provides real filters for:

- All;
- Unread;
- Highlighted;
- Linked to thesis.

Theme collections are generated from the active project's real themes and article/evidence relationships.

Sorting supports:

- recently updated;
- author A–Z;
- year, newest first.

PDF state is shown as:

- PDF on this device;
- Cloud PDF — downloads on open;
- Attach PDF.

## Structured backup and restore

Account & cloud now includes a portable structured-data backup.

The JSON backup contains the Quire workspace data model, including:

- projects;
- Study Setup;
- objectives;
- chapters and sections;
- articles and reference metadata;
- highlights and notes;
- themes;
- evidence links;
- milestones and progress history;
- review rounds;
- supervisor feedback;
- section versions.

PDF binaries are intentionally not embedded in the JSON backup.

Imported backups are validated and manuscript HTML is sanitised before replacement.

## Diagnostics

Quire includes a browser diagnostics panel that checks:

- localStorage;
- IndexedDB availability;
- PDF.js;
- secure-browser context;
- service-worker support;
- Supabase configuration;
- cloud sign-in;
- browser storage quota where available;
- active project consistency;
- orphaned section relationships.

## Offline / installable shell

The repository now includes:

- `manifest.webmanifest`;
- Quire application icon;
- `service-worker.js`.

The application shell and trusted static dependencies can be cached for offline use.

Quire does not intercept live Supabase or Crossref requests.

PDFs already cached in IndexedDB remain local-first.

## Accessibility

Product polish includes:

- skip-to-content link;
- visible keyboard focus;
- modal dialog semantics;
- modal focus trapping;
- focus restoration after dialogs close;
- ARIA live announcements for important UI feedback;
- reduced-motion support;
- meaningful search labels.

## Mobile navigation

The left navigation becomes an off-canvas drawer on smaller screens.

A mobile menu button opens it and choosing a workspace closes it.

## Keyboard shortcuts

- Ctrl/Command + K — global thesis search
- Ctrl/Command + S — save current work
- Ctrl/Command + / — shortcuts panel
- Escape — close active dialog/search
- Up/Down/Enter — navigate search results

## Product state after Step 23

The main user-facing prototype content has been replaced with real project-backed data.

Quire remains local-first and can operate without the external Supabase project, while the cloud-ready code remains available for later activation.
