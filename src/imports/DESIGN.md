---
name: Sisonke Stock Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daf0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d9e3f9'
  on-surface: '#121c2c'
  on-surface-variant: '#3e4948'
  inverse-surface: '#273141'
  inverse-on-surface: '#ebf1ff'
  outline: '#6e7978'
  outline-variant: '#bdc9c8'
  surface-tint: '#006a68'
  primary: '#006766'
  on-primary: '#ffffff'
  primary-container: '#0a8280'
  on-primary-container: '#f3fffe'
  inverse-primary: '#77d6d3'
  secondary: '#0a6c44'
  on-secondary: '#ffffff'
  secondary-container: '#9ff5c1'
  on-secondary-container: '#167249'
  tertiary: '#994200'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf5503'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#94f2f0'
  primary-fixed-dim: '#77d6d3'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#00504e'
  secondary-fixed: '#9ff5c1'
  secondary-fixed-dim: '#83d8a6'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#005231'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68f'
  on-tertiary-fixed: '#331100'
  on-tertiary-fixed-variant: '#773200'
  background: '#f9f9ff'
  on-background: '#121c2c'
  surface-variant: '#d9e3f9'
  bg-base: '#FAF9F6'
  bg-surface: '#FFFFFF'
  text-primary: '#2D3748'
  text-secondary: '#718096'
  border-default: '#E2E8F0'
  border-disabled: '#CBD5E0'
  accent-pressed: '#2C7A7B'
  accent-tint: '#E6FFFA'
  success-tint: '#F0FFF4'
  warning-tint: '#FFFAF0'
  error-default: '#C53030'
  error-tint: '#FFF5F5'
typography:
  display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 22px
  body-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
  label:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  caption-medium:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored specifically for South African informal convenience retailers—including spaza shops, tuck shops, and kota vendors. It prioritizes clarity, extreme readability in bright outdoor sunlight, and seamless, one-handed handheld ergonomics over decorative embellishment. 

### Design Philosophy
The system operates under a functional, minimalist, whitespace-first philosophy. Color is treated strictly as an operational signal—never as passive decoration. Because shopkeepers navigate stressful restocking environments, fluctuating connectivity, and mixed levels of digital literacy, the UI removes ambient visual noise:
- **Decision-Support Over Automation**: Retailers retain total agency. Recommendations present plain-language rationale without cryptic operational terms.
- **Utilitarian Clarity**: High-contrast, solid signaling ensures that low-stock alerts, budget thresholds, and offline sync statuses remain unmistakably legible at an arm's reach under harsh light.
- **Quiet Utility**: Tactile feedback is conveyed via robust tap footprints and purposeful tonal shifts rather than complex skeuomorphic effects or gratuitous multi-layered drop shadows.

## Colors

Color is deployed with deliberate discipline. The palette relies on soft neutral bases to preserve battery life and minimize glare, reserving rich chromatic values exclusively for states, priority indicators, and clear calls to action.

### Color Roles & Semantics
- **Background (`bg-base` / `#FAF9F6`)**: Soft Alabaster foundation across the app. Dulls glare compared to raw white while sustaining high typographic contrast.
- **Surface (`bg-surface` / `#FFFFFF`)**: Crisp White for structured cards, sheets, tables, and modal dialogs.
- **Primary Text (`text-primary` / `#2D3748`)**: Dark Charcoal for all core body copy, inputs, and headings to maintain strict WCAG AAA compliance against white surfaces.
- **Secondary Text (`text-secondary` / `#718096`)**: Muted Slate for captions, timestamps, and secondary contextual guidance. Never dropped below 4.5:1 contrast against surface containers.
- **Brand Accent (`#319795`)**: Deep Teal anchors primary CTAs, active bottom navigation tabs, and links. Interacting with active elements triggers `accent-pressed` (`#2C7A7B`), while selected filter chips use `accent-tint` (`#E6FFFA`).
- **Urgent Priority Signaling**:
  - **Critical Alert / Error (`error-default` / `#C53030`)**: Used with solid fill and white text for depleted stock and offline sync failures.
  - **Low Stock / Warning (`warning-default` / `#DD6B20`)**: Burnt Orange with solid fill for items nearing stock depletion.
  - **Success / Best Value (`secondary_color_hex` / `#2F855A`)**: Forest Green solid fills for the verified cheapest supplier and successfully committed restock logs.
  - **Safe Stock Rule**: Healthy stock levels deliberately receive no visual chip or badge in general lists. Omitting safe badges eliminates unnecessary visual weight, letting urgent alerts command attention instantly.

## Typography

Typography relies entirely on **Inter** (backed by system sans-serif defaults) to guarantee fast local rendering and clear legibility at compact dimensions. 

### Typographic Hierarchy
- **Display & Headings**: Structured with a compact 1.2× line height to conserve vertical space on mobile viewports. Numerical figures in KPI summary modules leverage `h1` bold weights for immediate scanning.
- **Body Text**: Tuned to a relaxed 1.4× line height (`22px` on `16px` font) to maximize scanning comfort.
- **Labels & Badges**: Set in `14px` Medium or Bold, ensuring that status tags such as "Low" and "Critical" remain readable even in peripheral vision.
- **Affordance Rule**: Interactive text elements never depend on typography alone to denote actionability. Interactive links and inline actions always pair text with color shifts or complementary iconography.

## Layout & Spacing

The layout system is built on a modular 4px base scale: `4px` (`space-2xs`), `8px` (`space-xs`), `12px` (`space-sm`), `16px` (`space-md`), `24px` (`space-lg`), and `32px` (`space-xl`).

### Layout Geometry & Fluidity
- **Phone Screens (Mobile-First Canvas)**:
  - Outer screen edge margin: `16px`.
  - Stacked card rhythm: `12px` vertical gap.
  - Internal card padding: `16px`.
  - Primary touch zones are concentrated at the bottom edge to enable effortless single-hand thumb navigation.
- **Laptop & Desktop Canvas (>=1024px)**:
  - Outer canvas margin: `32px` with a persistent `72px` (collapsed) or `240px` (expanded) left-hand vertical navigation sidebar.
  - Multi-panel distribution: Replaces single-column vertical stacks with dual-pane ergonomic layouts (e.g., 65% product catalogue / 35% cart order review; 30% master directory / 70% comparative details).
  - Floating actions from mobile (such as "+ Record Sale") migrate to the top-right header area on desktop as anchored primary action buttons.

## Elevation & Depth

This system intentionally departs from heavy drop shadows and translucent glassmorphism in favor of a clean, flat architecture using **low-contrast outlines**. 

### Boundary Definitions
- **Flat Elevation Default**: Container division relies on a crisp `1px` solid border (`border-default` / `#E2E8F0`) set over the white surface (`bg-surface`). No shadows are applied to standard cards, tables, or navigation frames.
- **Floating Exceptions**: Shadow elevation is restricted exclusively to elements that float dynamically above scrolling content:
  - **Floating Action Button (Mobile FAB)**: `box-shadow: 0 2px 8px rgba(45, 55, 72, 0.12)`.
  - **Sticky Sale-Total Footer Bar**: `box-shadow: 0 -2px 8px rgba(45, 55, 72, 0.12)`.
- **Dashed Outlines**: Reserved strictly for actionable placeholder containers where users enter new data (e.g., "+ Add supplier price"). Informational, summary, or preview panels never feature dashed strokes.
- **Focus Rings**: Desktop navigation and keyboard focus events display a distinct `2px` solid Deep Teal outline (`#319795`) with a `2px` offset.

## Shapes

The geometric silhouette across the interface employs a deliberate dual-radius hierarchy:

- **Interactive Controls (8px / `rounded-sm`)**: Action buttons, text input fields, selection chips, and status badges use an `8px` corner radius. This keeps actionable controls visually crisp and distinct from content enclosures.
- **Containers & Surfaces (12px / `rounded-lg`)**: Structural cards, sliding sheets, persistent panels, and modal containers use a `12px` corner radius.
- **Full Pills (`9999px`)**: Used exclusively for the persistent status pill (indicating live offline/online connectivity) and numeric quantity steppers.

## Components

### Buttons & Interactive Controls
- **Primary Buttons**: Sized to a strict `48px` minimum height (`space-md` horizontal padding), rendered in Deep Teal (`accent-default`) with white bold text, `8px` corner radius. Active/pressed state shifts to `#2C7A7B`. Disabled state renders with `#CBD5E0` background, no fill change on tap.
- **Secondary Buttons**: Transparent fill with a `1px` solid `border-default` (`#E2E8F0`), primary dark charcoal text, minimum `48px` height.
- **Touch Target Enclosure**: Every primary control provides at least a `48x48px` hit region, regardless of interior icon size.

### Badges & Status Indicators
- **High-Contrast Critical & Low Badges**:
  - Critical: Solid `#C53030` fill with white text (`label-bold`), accompanied by a clear textual label (e.g., "Critical (0 left)") and an icon. Never use color alone.
  - Low Stock: Solid `#DD6B20` fill with white text (`label-bold`), paired with an alert glyph and text (e.g., "Low (3 left)").
  - Best Value: Solid `#2F855A` fill with white text for the "Cheapest" supplier badge.
- **Passive Tints**: Pale backgrounds (`error-tint`, `warning-tint`, `success-tint`) are restricted to non-critical alert bars and selected filter pills.

### Chips & Filters
- **Filter Chips**: `36px` height (`48px` tap target), `8px` radius. Neutral state features a white surface and `1px` `border-default`. Selected state uses `accent-tint` (`#E6FFFA`) with a solid `1px` Deep Teal border and teal label text.

### Input Fields & Steppers
- **Text & Numeric Inputs**: `48px` height, `bg-surface` fill, `1px` `border-default` stroke, `12px` horizontal padding. Active focus triggers a `2px` teal stroke. Invalid states show an inline error message beneath the input with an `#C53030` border.
- **Quantity Steppers**: Segmented module with large `48x48px` increment and decrement buttons flanking a clear bold numeric quantity label.

### Cards & Placeholders
- **Item & KPI Cards**: Standard `bg-surface` card, `12px` radius, `1px` solid `border-default` padding of `16px`.
- **Add-Item Placeholder Cards**: `bg-base` fill with a `2px` dashed `#CBD5E0` border and centered `48px` icon and text label.

### Sync & Offline Status Indicator
- Non-modal, persistent pill placed at the top of the viewport. Features a distinct solid status dot alongside plain language (e.g., "● Offline — 3 pending" or "✓ Synced just now"), ensuring background synchronization never interrupts the shopkeeper's active workflow.