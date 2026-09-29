# Quire Cloud Backend Activation Readiness — Step 22

Step 22 completes the remaining application code needed for a real Supabase-backed Quire workspace.

Actual activation still requires a Supabase project, project URL and public anon/publishable key.

## What is now ready

Quire already had:

- Supabase email/password authentication
- row-level-security-ready project tables
- local-first structured data sync
- multi-project cloud persistence
- manual push and pull controls

Step 22 adds secure PDF storage.

## Private PDF bucket

The Supabase schema now creates a private Storage bucket:

`quire-pdfs`

PDF object paths use:

```
<user-id>/<project-id>/<article-id>.pdf
```

The browser never uses a service-role key.

## Storage security

Storage policies allow SELECT, INSERT, UPDATE and DELETE only when the first folder in the object path matches the authenticated user's ID.

The bucket remains private.

## Upload behaviour

When cloud sync runs, Quire checks local IndexedDB for attached PDFs.

A local PDF is uploaded when:

- it has never been uploaded; or
- the local file is newer than the last recorded cloud upload.

After upload, the article record stores:

- cloud storage path
- upload timestamp
- cloud PDF size
- cloud-PDF availability flag

The article metadata is then synced to the relational database.

## Cross-device download

When a paper is opened on a device that does not have the PDF locally:

1. Quire checks the article's private cloud storage path.
2. If the researcher is signed in, Quire downloads the PDF from the private bucket.
3. The PDF is saved into the device's local IndexedDB cache.
4. The normal PDF reader opens it.
5. Future opens on that device use the local copy.

The Research Library distinguishes:

- PDF on this device
- Cloud PDF — downloads on open
- PDF not attached

## Local-first behaviour

A PDF remains usable locally even if cloud access is unavailable.

Cloud storage extends the local workflow rather than replacing it.

## Activation checklist

When a Supabase project is available:

1. Open the Supabase SQL Editor.
2. Run the latest `supabase/schema.sql`.
3. In Quire, open **Account & cloud**.
4. Enter the project URL.
5. Enter only the public anon/publishable key.
6. Create or sign into a Quire account.
7. Use **Save to cloud**.
8. Confirm that the private `quire-pdfs` bucket contains paths under the signed-in user ID.
9. Open the same account on a second device and verify that an article PDF downloads on first open.

Never place the service-role key in Quire browser code.

## Current project status

The repository is code-ready for Step 22.

The external Supabase project itself has not been created or connected yet, so Step 22 should be treated as:

**Code complete — external activation pending.**
