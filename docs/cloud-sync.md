# Quire cloud accounts and persistence

Quire is **local-first**. The browser store remains the working copy, and Supabase provides authentication plus cloud backup/synchronisation.

## What Step 2 adds

- Email/password sign-up and sign-in.
- Persistent Supabase sessions.
- Automatic cloud push after local Quire data changes.
- Cloud pull when a returning user signs in.
- First-login migration: if the cloud account has no thesis projects, the current local project is uploaded.
- Manual **Sync now** and **Reload from cloud** controls.
- Row-level security (RLS) in `supabase/schema.sql`.
- Project ownership through `thesis_projects.user_id`.

## Connect a Supabase project

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase/schema.sql`.
3. Open Quire and select the cloud/account button.
4. Paste the project URL and the **anon / publishable key**.
5. Create an account or sign in.

The anon/publishable key is intended for client applications when RLS is configured. **Never paste a service-role key into Quire.**

## Sync behaviour

Quire uses an upsert-based synchronisation pass. Local edits are written immediately to the browser store and queued for cloud sync when a user is signed in.

On sign-in:
- if the cloud account has no projects, Quire uploads the local workspace;
- if cloud projects already exist, Quire loads them into the local workspace.

Deletion propagation and conflict-resolution UI are not part of this initial sync layer yet. Those can be added once real editing of articles, notes and sections is enabled.

## Security model

Every project row has a Supabase Auth `user_id`. RLS policies permit access only where `auth.uid()` owns the parent thesis project. Child tables use ownership checks through their `project_id` (or through their parent article/thread for join tables).

This prevents one signed-in user from selecting or changing another user's thesis records through the public client key.
