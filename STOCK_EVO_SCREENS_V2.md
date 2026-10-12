# Stock evo — screens v2 (Quick sell, Home, Prices, Restock)

Builds on STOCK_EVO_DESIGN.md (tokens, font, logo, auth screens stay as they are).
Goal for every screen: **one main thing, one main button, plain lists, minimal colour.**

## Shared rules
- Font: Plus Jakarta Sans. Numbers tabular. Money: `R1 284,50`.
- Colours: brand `#FFC20E`, ink `#111111`, white, field `#F2F2EE`, divider `#EEEEEA`, muted `#5C5C56`, danger `#B42318`, success `#157F3D`.
- Primary button: black bg, white text, height 58–64, radius 16–18. Yellow is brand/accent, not every button.
- Lists: plain rows, 1px `#EEEEEA` divider, 16–18px vertical padding, row title 17/700, optional one muted line 14/500, `›` chevron. No cards/borders around lists.
- Side padding 28 (Quick sell 16). Touch targets ≥ 44.
- **Yellow-header layout** (Home, Profile — same as auth): screen bg = left half white / right half yellow; yellow header with `borderBottomLeftRadius: 56`; white panel below with `borderTopRightRadius: 56`.

### Bottom tab bar (all main screens)
Floating pill: left/right 14, bottom 22, height 70, white, 1px `#E6E6E1` border, radius 26, soft shadow, 5 equal tabs: **Home, Sell, Prices, Restock, Profile** (icon 22 + label 11/600).
Active tab = black rounded tile (radius 20) with yellow icon + label. Inactive = black icon/label.
Leave ~120px bottom padding on scroll content so nothing hides behind it.

---

## 1. Quick sell (Sell tab) — the most important screen
Speed first: most sales are taps, not searches.

**Header** (black, bottom radius 22): yellow logo + "Sell", buttons "Edit grid" and search/scan icon. Below: **sale tabs** row — active sale = yellow pill "Now · R48,00", parked sales = dark pills "Sale 2 · R10,00", plus dashed "+ New".

**"How many?" row**: ×1 ×2 ×3 ×5 ×10 chips (selected = yellow). Resets to ×1 after one add.
Hint text: "Tap to add · hold to keep adding the last one you sold".

**Grid** (3 columns, gap 8, tile height 82, radius 16, white, 1.5px border; scrolls):
- **Single tiles** (Egg, Milk, Chips, …): tap → add `multiplier` of that item.
- **Family tiles** (Bread, Airtime, Cold drink, Kota): subtitle "Last: Albany". Tap → bottom-sheet picker:
  - Bread → brand (Albany / Blue Ribbon / Sasko / Brown) → added.
  - Airtime → network (Vodacom / MTN / Cell C / Telkom) → amount (R5…R50) → added.
  - Cold drink → brand → size (can / 500ml / 2L) → added.
  - Last-used option shown first, highlighted (yellow-soft bg, 2px black border).
- **Hold (long-press ~450ms)** on any tile → adds the last-used variant immediately, then +1 every ~450ms until release. Show a black toast "Adding Albany bread · 5 in sale · let go to stop". Swallow the click that follows a hold.
- Badge (black circle, yellow number) on a tile = qty of that tile/family in the current sale.
- **Quick amount** tile (dashed, yellow-soft): keypad sheet → adds "Other R15".

**Edit grid mode**: tiles get dashed border, × (hide), ◀ ▶ (move). Drag-to-reorder where supported (use `react-native-draggable-flatlist` or similar). Hidden tiles listed in bottom panel as "+ Name" chips to restore. **Persist order + hidden per shop** (local DB, sync to Supabase).

**Bottom sale panel** (white, top radius 24): last 3 lines "2× Albany bread … R36,00" (+ "N more lines"), then buttons **Undo** · **Park** · **Charge R48,00** (black, yellow text, flex 1).
- Undo = remove the last add (keep a history stack per sale). No confirm dialogs.
- Park = keep this sale as a tab, start a new empty one.

**Pay sheet**: Total big; Cash / Card / EFT (Cash default); if Cash: "Customer gave" Exact / R50 / R100 / R200 → big "Change R52,00" (or "Still owes"). **Done · next customer** → save sale (local first, sync later), remove that sale tab, toast "Sale saved · R48,00 · Cash · change R52,00".

Rules: never block a sale for stock = 0 (allow negative, flag for count). Grid order should default to best sellers (by frequency) until the owner edits it.

---

## 2. Home
Yellow-header layout.
- Header (height 300): "Today" label + profile circle (black, yellow initial). Big **R1 284,50** (52/800) and "46 sales so far".
- Panel: **New sale** (black, height 64) → Sell tab.
- Then 3 plain rows:
  1. Red dot · **"5 items running low"** · muted names "Coke can, Albany bread, Polony…" › → Restock.
  2. **Stock came in** › (receive stock flow — next to build).
  3. **Count stock** › (stock count flow — next to build).
Nothing else.

## 3. Prices
White screen. Title "Prices" (30/800) + muted "Cheapest place to buy each item".
- Search input (field style, no border).
- Plain list rows: item name (17/700) + muted cheapest supplier; right side cheapest price (18/800). No price → muted "No price yet", right side "Add" in dark yellow `#8A6A00`.
- Tap a row with 2+ prices → expands to list all suppliers (cheapest black, others muted).
- Fixed button above tab bar: **Add a price** (black).

## 4. Restock
White screen. Title "Restock" + muted "Your shopping list for Thursday".
- Grouped by supplier: small muted heading (14/700).
- Row: round checkbox (30px, 2px black border; checked = yellow fill + ✓), item name (unchecked = muted), qty pill on the right ("2 trays", field bg).
- Tap the qty pill → reveals muted reason ("Out now · sells 9 a day") + − / + buttons (+ is yellow).
- Bottom fixed: "5 items" + total (24/800), button **Bought it · update stock** (black) → adds ticked qty × pack size to stock.
- Suggested qty = (average daily sales × days until next restock) − current stock, rounded up to pack size.

## 5. Profile (optional, same pattern)
Yellow header with avatar initial, name, shop. Plain rows: Edit profile, Products & prices, Edit sell grid, Suppliers, Export a report, Privacy notice. Outline "Sign out". Small red "Delete account" → inline confirm (Keep it / Delete).

## Data notes
- Product: id, name, price, category, stock, `family` + `variant` fields (e.g. family "bread", variant "albany"), pack name + units per pack for restock.
- Sale: lines (product, qty, price), payment method, cash given, created_at; stored locally first.
- Per-shop settings: grid order, hidden tiles, last-used variant per family.
