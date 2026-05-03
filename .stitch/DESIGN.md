# Dodonaut Design System

> **Stitch project:** `projects/6872268476468051177`
> **Design system asset:** `assets/12197535545214000775`
> **Source of truth.** All Stitch generations must consult this file.

## Vibe

Editorial fintech meets Indian craft. Confident, warm, deliberate.
**NOT a generic AI startup.** Strictly avoid: purple, indigo, violet, cyan, teal, aqua, magenta, lavender, the purple-to-cyan gradient, the indigo-to-pink gradient, neon glows, holographic effects, and any "AI shimmer" aesthetic.

## Color Tokens

| Role | Hex | Notes |
|---|---|---|
| `background` | `#FAFAF7` | warm paper-white, never pure `#FFFFFF` |
| `surface` | `#FFFFFF` | cards layered above background |
| `foreground` | `#0A0A0A` | near-black, not pure black |
| `muted-foreground` | `#57534E` | stone-600 |
| `border` | `#E7E5E4` | stone-200, used aggressively |
| `subtle-border` | `#F5F5F4` | stone-100, hairline dividers |
| `primary` | `#B45309` | **deep amber** — primary CTAs + key data only |
| `primary-hover` | `#92400E` | amber-800 |
| `primary-foreground` | `#FFFFFF` | text on primary |
| `success` | `#15803D` | forest green, positive deltas only |
| `destructive` | `#B91C1C` | clay red |

## Typography

| Role | Family | Weight | Tracking |
|---|---|---|---|
| Headline | Plus Jakarta Sans | 600 / 700 | -0.02em |
| Body | Inter | 400 / 500 | normal |
| Mono | JetBrains Mono | 400 | normal |

| Scale | Size | Use |
|---|---|---|
| `display` | 48–64px | hero headlines |
| `h1` | 32–40px | page titles |
| `h2` | 24–28px | section titles |
| `body` | 14–16px | prose |
| `caption` | 12–13px uppercase tracking-widest | section labels |

**Numbers as identity**: any monetary value, wallet address, tx signature, or count uses JetBrains Mono. Big metrics use display-size mono with amber color.

## Shape

- Default radius: **8px** (subtle, not playful)
- Card radius: 12px
- Inputs / badges: 6px
- Borders: 1px, used aggressively (replaces shadows)
- Shadows: minimal — only for floating overlays. NO colored shadows.

## Layout

- Section padding: 96–128px desktop
- Content max-width: 1200px (or 720px for prose)
- Grid gutter: 24px
- Card padding: 24–32px

## Iconography

- Lucide icons, 1.5px stroke, monochrome ink
- No gradient icons, no colored fills, no isometric illustrations
- Status dots: 6px filled circles in semantic color

## Voice

Direct. Specific. Confident. Drop "USDG", "Solana", "Dodo Payments", "x402" casually.
**Never**: exclamation marks, "AI-powered" adjectives, emoji.

## What we are NOT

- Not Stripe (warmer)
- Not Linear (more editorial)
- Not a Web3 dashboard (no neon, no glassmorphism, no glow)
- Not a generic AI product (zero purple/cyan/gradients)
- Not playful (no rounded-full, no pastels, no emoji)

---

## Screens

| Screen | Stitch ID | Status |
|---|---|---|
| Marketing landing | _pending_ | _to generate_ |
| Sign-up | _pending_ | _to generate_ |
| Onboarding — connect wallet | _pending_ | _to generate_ |
| Dashboard | _pending_ | _to generate_ |
| Wrap product modal | _pending_ | _to generate_ |
| Calls / settlements feed | _pending_ | _to generate_ |
