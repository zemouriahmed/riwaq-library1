# Smart Library — Phase 1 (Foundation)

Private, cloud-based personal digital library. React 19 + TypeScript + Vite + Tailwind, backed by Supabase (Postgres, Auth, Storage). Arabic (RTL, default) and French (LTR).

Phase 1 delivers: project scaffold, database migrations with Row Level Security, authentication, bilingual RTL/LTR layout, dashboard, library views, shelves and settings. Upload, readers, offline mode, admin UI and Capacitor builds come in later phases.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the migrations** in order (SQL Editor, or `supabase db push` with the CLI):
   - `supabase/migrations/20261103000001_schema.sql`
   - `supabase/migrations/20261103000002_functions_triggers.sql`
   - `supabase/migrations/20261103000003_rls_and_storage.sql`

   This creates all tables, the `private-books` (private) and `avatars` buckets, RLS and Storage policies, plans and quotas.
3. **Auth settings** (Dashboard → Authentication):
   - Enable Email provider. Keep "Confirm email" on for email verification.
   - URL Configuration: set Site URL to your app URL and add `http://localhost:5173/**` and your production URL to Redirect URLs (needed for verification and password-reset links).
4. **Environment variables**: copy `.env.example` to `.env` and fill in:

   | Variable | Where to find it |
   |---|---|
   | `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Project Settings → API → `anon` public key |

   The `service_role` key must never be placed in the frontend or in any `VITE_` variable.
5. `npm install` then `npm run dev` (open http://localhost:5173).
6. Without valid credentials the app shows a configuration screen and performs no backend calls.

## Hosting on GitHub Pages

The frontend is static, so GitHub Pages can host it; Supabase stays the backend.

1. Create a GitHub repository and push this project to the `main` branch.
2. Repository → Settings → **Pages** → Source: **GitHub Actions**.
3. Repository → Settings → Secrets and variables → Actions → add two secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is public by design; never add the service_role key).
4. Push to `main` (or run the workflow manually in the Actions tab). The site is published at `https://<user>.github.io/<repository>/`.
5. In Supabase → Authentication → URL Configuration, set the Site URL to that address and add `https://<user>.github.io/<repository>/**` to Redirect URLs, otherwise verification and password-reset links will not work.

Notes: the workflow sets the base path from the repository name and copies `index.html` to `404.html` so page refreshes on routes like `/library` work. A custom domain needs `VITE_BASE=/` in the workflow.

### Making a user an administrator
There is no UI to grant admin rights (by design). In the SQL editor: `update public.profiles set is_admin = true where id = '<user uuid>';`

## What is enforced where

- **RLS on every table**; users only touch rows where `user_id = auth.uid()`.
- **Column-level grants**: users cannot change `plan_id`, `is_admin`, `file_path`, `file_size` or `user_id`.
- **Composite foreign keys** (`(book_id, user_id)`, `(shelf_id, user_id)`…) make cross-user references impossible even for a crafted request.
- **Quotas in the database** (trigger on `books` and `shelves`): the real file size is read from Storage, not trusted from the client; storage, book count and per-hour rate limits are checked. Plans live in the `plans` table, editable by admins.
- **Storage**: `private-books` is private, paths are `{user_id}/books/{book_id}/…`, policies match the first folder to `auth.uid()`. Files are only reachable through short-lived signed URLs.
- Administrators have no policy on books, notes, bookmarks, progress or storage objects, only aggregate statistics.

## Known limits of Phase 1

- "Add book" is disabled until Phase 2 (upload, metadata extraction, covers).
- Library cards support the favourite toggle only; open, edit, move-to-shelf, offline and delete arrive with Phases 2–4.
- Orphan uploads (file uploaded but the book row rejected and client closed before cleanup) are counted against quota; a cleanup Edge Function is planned for Phase 5.
- `capacitor.config.ts` is prepared but Capacitor is not installed yet.

## Project layout

```
src/{components,pages,services,hooks,contexts,types,lib,i18n,offline,styles}
supabase/migrations
public/{manifest.webmanifest,icons}
```
