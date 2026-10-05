# Supabase setup

The app uses the team Supabase project **`xznsufgiglnwbohkenec`**
(`https://xznsufgiglnwbohkenec.supabase.co`). The Supabase config and migrations live in
`supabase/` at the repo root. Supabase's GitHub integration watches that folder on `main`.

## 1. Get the setup onto your branch

```bash
git fetch
git merge origin/main
```

## 2. Add your keys

Copy `.env.example` to `.env` **in the folder you run `npx expo start` from** (the repo root on
`frontend`; `dma-project/` on branches that still use the old layout):

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Fill in the two values Khumo shares with you privately, then restart Expo with a clean cache:

```bash
npx expo start -c
```

- `.env` is gitignored. Never commit it, and never paste keys into code.
- Only the **publishable** key goes in the app. The `service_role` / secret key must never be in
  this repo or in the app: anything in the app can be read by anyone who installs it.
- Expo only exposes variables that start with `EXPO_PUBLIC_` to app code.
- Use the shared client in `src/lib/supabase.ts` instead of calling `createClient` again.

## 3. Link the Supabase CLI (only if you change the database)

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) running. Run these
from the repo root:

```bash
npx supabase login                                     # opens the browser to sign in
npx supabase link --project-ref xznsufgiglnwbohkenec   # asks for the database password; get it from Khumo
```

## Rule: database changes only go in as migrations

Don't create or change tables in the Supabase dashboard. Changes made only there aren't in git,
so nobody else gets them, and the next migration can overwrite them.

1. Start the local database (`npx supabase start`) and make your change there, either in local
   Studio at http://localhost:54323 or in SQL.
2. Turn the change into a migration file:
   ```bash
   npx supabase db diff -f add_products_table
   ```
   (Or write the SQL yourself in a file created by `npx supabase migration new <name>`.)
3. Check the generated file in `supabase/migrations/`, commit it, and open a PR into `main`.
4. When it's merged into `main`, the GitHub integration applies it to the live database.
