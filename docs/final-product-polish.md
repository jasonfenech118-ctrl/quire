# Quire Final Product Polish — Step 23

Step 23 removes the remaining prototype shell behaviour and makes Quire operate more like a finished local-first application.

## Global thesis search

The top search field now searches the active project across:

- research papers and metadata
- chapters
- thesis sections and manuscript text
- highlights
- research notes
- themes
- objectives
- supervisor feedback

Results are ranked by title and content matches.

Keyboard controls:

- Up / Down moves through results
- Enter opens the selected result
- Escape closes search
- Ctrl/Command + K focuses global search

Paper results open the Article Reader.

Section and chapter results open the exact writing destination.

Theme and objective results open and focus the exact Thesis Map node.

Supervisor-feedback results open the affected workflow.

## Real Dashboard activity

The former example Recent Work cards have been removed.

Dashboard activity is generated from actual:

- recently edited thesis sections
- recently added or updated articles
- research notes
- supervisor feedback

The Dashboard research counts also remain scoped to the active thesis.

## Real Research Library

The remaining sample article cards and static filter counts have been removed.

Library filters now operate on real records:

- All
- Unread
- Highlighted
- Linked to thesis

Theme collections are generated from the project's actual themes and article/evidence relationships.

Sorting supports:

- Recently updated
- Author A–Z
- Year, newest first

The library distinguishes between:

- PDF available on this device
- PDF available from private cloud storage
- reference with no PDF attached

## Structured workspace backup

Account & cloud settings now include a portable JSON backup.

The backup contains structured Quire records including:

- projects
- Study Setup
- objectives
- chapters and sections
- manuscript text
- article metadata
- notes and highlights
- themes and evidence links
- milestones and progress snapshots
- review rounds
- supervisor feedback
- section versions
- AI conversation records

PDF binary files are intentionally not embedded in the JSON backup.

When restoring a backup, Quire validates the expected workspace shape and sanitises persisted manuscript/version HTML before replacing the current structured state.

## Browser diagnostics

Quire can run a local diagnostics check for:

- localStorage
- IndexedDB
- PDF.js availability
- secure browser context
- service-worker support
- Supabase configuration
- cloud sign-in state
- browser storage estimate
- active-project consistency
- broken section/chapter relationships

## Offline/PWA shell

Quire now includes:

- `manifest.webmanifest`
- Quire SVG application icon
- `service-worker.js`

When Quire is served over HTTPS or localhost, the application shell can be cached for offline use.

The service worker deliberately does not intercept Supabase or Crossref requests.

Local-first project data and local PDF files continue to use browser storage.

## Accessibility

Step 23 adds:

- skip-to-content navigation
- visible keyboard focus states
- modal dialog roles
- modal keyboard focus trapping
- focus return after closing dialogs
- reduced-motion support
- accessible live region for status messages
- improved mobile navigation
- keyboard-shortcuts reference panel

## Keyboard shortcuts

- Ctrl/Command + K — global search
- Ctrl/Command + S — save current work
- Ctrl/Command + / — shortcuts panel
- Escape — close current dialog/search

## Mobile navigation

On smaller screens the left application rail becomes an off-canvas navigation drawer rather than compressing the main workspace.

## Validation

Step 23 finished with:

- syntax validation across all application JavaScript modules
- no duplicate HTML IDs
- no remaining example Research Library cards
- no remaining static Research Library counts
- live Dashboard Recent Work
- live theme collections
- PWA manifest/service-worker files present

Step 23 focuses on product reliability and consistency rather than adding another independent source of thesis data.
