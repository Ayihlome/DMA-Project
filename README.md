# StockEvo

A point-of-sale and stock app for spaza shops and kota stands. The owner rings up sales at the
counter, and the app takes the stock off by itself: a Kota Special takes a quarter loaf, chips,
polony and cheese out of the ingredient counts. It tells the owner what is running low, what to
buy on shopping day and from which supplier, and what each item actually earns.

Built with Expo (React Native) for Android, iOS and the web, with Supabase for accounts and backup.

## What it does

- **Sell**: a tile grid for the counter, with a cash calculator. A sale is never refused because
  the app's stock count says zero; stock goes negative instead and is flagged for a recount.
- **Menu**: food the shop makes, each with a recipe. Every sale deducts its ingredients.
- **Stock came in**: record a delivery or a shopping trip, by the pack or loose. What was paid
  updates the item's cost.
- **Count stock**: set what is on the shelf. If an ingredient ran lower than the recipes explain,
  the app offers to correct the recipe amounts.
- **Restock**: a shopping list for the owner's shopping day, grouped by the cheapest supplier.
- **Profit** (Profile → Profit): what the shop kept over the last 7 days, and per item.

## Run it

You need Node.js 20 or newer and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add the Supabase keys. Copy the example file and fill in the two values from the team's
   Supabase project (Project Settings → API):

   ```bash
   cp .env.example .env        # PowerShell: Copy-Item .env.example .env
   ```

   Without a `.env` the app stops at start-up with "Missing Supabase config".

3. Start it:

   ```bash
   npm run web                 # in a browser — the quickest way to try it
   npx expo start              # then scan the QR code with Expo Go, or press a / i
   ```

4. Create an account in the app and verify your email. On the setup screen, tick what the shop
   sells, or choose **Explore with sample data** to look around a ready-made shop.

## Where the data lives

`EXPO_PUBLIC_STORE` in `.env` picks the storage:

| Value             | Where                                        | Used for                      |
| ----------------- | -------------------------------------------- | ----------------------------- |
| `local` (default) | AsyncStorage, backed up to Supabase          | Web, and quick phone testing  |
| `sqlite`          | An encrypted SQLite database, synced to Supabase | Phone builds              |

The SQLite store is encrypted with SQLCipher, which Expo Go does not include. To try it in Expo
Go anyway, also set `EXPO_PUBLIC_ALLOW_PLAIN_DB=1` (development only, unencrypted). Without it,
nothing is saved. A development build (`npx expo run:android`) has encryption built in.

## Scripts

| Command                  | What it does                                                       |
| ------------------------ | ------------------------------------------------------------------ |
| `npm run web`            | Run in the browser                                                 |
| `npm run build:web`      | Build the web app into `dist/`                                     |
| `npm run typecheck`      | TypeScript check                                                   |
| `npm run lint`           | ESLint                                                             |
| `npm run check:contract` | Fails if the shop data shape changed without the SQLite side       |

## Project layout

```
src/app/          screens by route (expo-router)
src/screens/      the screens themselves, one folder per area
src/data/         shop state and the business rules (actions.ts, inventory.ts)
src/backend/      the SQLite store: repositories, use cases, sync queue
src/lib/          Supabase client, backup, telemetry
supabase/         database migrations and the Makro price sync function
```

Database changes and how to apply them are in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Team

- Khumo: screens, privacy (POPIA), telemetry, backup
- Ayihlome Mafanya: integration, suppliers and price sync
- Olwethu Tshabangu: SQLite backend
- Saii: tab screen design
