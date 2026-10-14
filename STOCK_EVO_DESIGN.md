# Stock evo — design spec

Offline-first spaza shop app. Expo (React Native) + Supabase. Brand colour: **yellow**.

## Tokens

```ts
// theme.ts
export const colors = {
  brand: '#FFC20E',        // yellow — auth header, accents, + buttons, active nav
  brandSoft: '#FFF3CC',    // selected payment option, focus ring
  ink: '#111111',          // text, primary buttons, sidebar/header on POS
  surface: '#FFFFFF',
  field: '#F2F2EE',        // input background, segmented control track
  page: '#F4F4F1',         // POS screen background
  line: '#E6E6E1',         // card borders, dividers
  muted: '#66665F',        // secondary text, placeholders
  danger: '#B42318',       // low-stock badge
  success: '#157F3D',      // synced dot
  disabled: '#ECECE7',
};

export const radius = { sm: 12, md: 16, lg: 20, panel: 56, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 28 };
```

**Font:** Plus Jakarta Sans (`@expo-google-fonts/plus-jakarta-sans`), weights 400/500/600/700/800.
Numbers use tabular figures. Currency format: `R1 284,50` (space thousands, comma decimals).

| Style | Size / weight |
|---|---|
| Brand wordmark | 30 / 800, letter-spacing −0.8 |
| Screen title | 22–32 / 800 |
| Total (big money) | 26–30 / 800 |
| Button | 16 / 700 |
| Body | 15–16 / 500–600 |
| Caption / badge | 11–13 / 600 |

Minimum touch target 44px. Buttons 58px tall, radius 16.

## Logo
Outline box (isometric cube with tape strip). Use as SVG (`react-native-svg`):
```
viewBox="0 0 100 100" stroke="#111" strokeWidth=7 fill="none"
M50 7 L91 23 L91 75 L50 92 L9 75 L9 23 Z
M9 23 L50 39 L91 23
M50 39 L50 92
M30 15 L71 31 L71 45
```

## Auth screens (3)
Shared layout:
- Screen background = left half white, right half yellow (so the curves show through).
- **Header**: yellow, 290px tall (230 on Create account), `borderBottomLeftRadius: 56`. Centered logo (84px) + "stock evo" wordmark.
- **Panel**: white, fills the rest, `borderTopRightRadius: 56`, padding 44/28.
- Segmented pill: "Sign in" | "Create account" — active = black bg, white text.
- Inputs: no borders, `field` background, radius 16, height 58, **placeholder is the label** (set `accessibilityLabel` too).
- Primary button: black bg, white text.

1. **Sign in** — +27 prefix + "Phone number" → "Send me a code" → Verify. Link "Use email instead" swaps to Email + Password → "Sign in".
2. **Create account** — Your name, Shop name, +27 Phone number, checkbox "I agree to the privacy notice" (button disabled until ticked) → Verify.
3. **Verify** — "Enter your code", "Sent to +27 71 ••• 5678 · Change", 6 digit boxes (auto-advance, paste, SMS autofill via `textContentType="oneTimeCode"` / `autoComplete="sms-otp"`), "Verify", "Resend code in 0:45".

Auth: Supabase phone OTP (`signInWithOtp({ phone })` → `verifyOtp`), email+password as fallback.

## POS — New sale (phone)
- **Header**: black, bottom radius 24. Yellow bars logo, "New sale", shop name + green "Synced" dot, barcode scan button, dark search field.
- **Category chips** (horizontal scroll): All, Bread, Kotas, Drinks, Snacks, Groceries — each with count pill (yellow when active).
- **Product grid**: 2 columns, gap 12. Card = white, radius 18, border `line`:
  - tinted image area 92px (photo later) with stock badge top-left: black "14 in stock", red "3 left" (<10), grey "Out"; kotas show "Makes 6" (from ingredients).
  - name (14/700), price (16/800), round **+** button (yellow). In cart → black button showing "× 2" in yellow. Out of stock → disabled.
- **Cart bar** (floating, bottom 28): black, radius 20 — "3 items in sale / R81,00" + yellow "View sale →".
- **Sale sheet** (bottom sheet): lines with − / qty / + (yellow), VAT (15%, included), Total, payment segmented Cash / Card / EFT, black "Charge R81,00" with yellow text. On charge → save sale (local SQLite first, sync to Supabase), toast "Sale saved".

## POS — New sale (tablet/desktop, optional)
Black 88px sidebar (yellow logo, icon nav, active = yellow tile) · product grid (`minmax(210px,1fr)`) · white right panel "Current sale" with the same sheet contents.

## Data notes
- Product: id, name, description, price, category, stock (or `makes` for made-to-order items computed from ingredient stock).
- Low stock threshold: < 10 (make configurable per product later).
- Prices are VAT-inclusive; VAT shown = total × 15/115.
