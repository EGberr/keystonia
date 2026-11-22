# Keystonia — design spec

**Who:** a curious, well-off visitor who has never bought tokenized property, and a recruiter skimming a portfolio.
**Mood:** nocturnal · architectural · expensive.
**Signature:** a real-time 3D building made of its own shares. As you scroll, it comes apart into
thousands of blocks, one block lights up in brass and becomes "yours". Every property then gets a
cinematic 3D walkthrough, built procedurally from its layout (rooms, courtyard, vineyard rows).

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0b0a09` | page, canvas clear colour, fog (no seams between WebGL and DOM) |
| `--surface` / `-2` / `-3` | `#131210` / `#1a1815` / `#23201c` | cards, panels |
| `--text` | `#ece6da` (bone) | headlines, primary |
| `--text-2` | `rgba(236,230,218,.72)` | body |
| `--muted` | `#8d867a` | labels, meta |
| `--border` / `-strong` | bone at 8% / 16% | hairlines |
| `--accent` | `#c9a26b` (brass) | one share lit, progress, dots, italic accents — max 3 element types |
| `--accent-ink` | `#e9dcc0` (champagne) | primary pill (inverse on dark), links |
| `--positive` / `--negative` | `#86c29d` / `#e2775d` | ledger only |

Selection `rgba(201,162,107,.3)`. Grain: SVG fractal noise, 0.06 opacity, fixed, `pointer-events:none`.
Dark only: the WebGL scenes, photos and type are tuned for one exposure.

## Type

- **Display:** Bodoni Moda 400/500, italic for accent words. H1 `clamp(48px, 8.4vw, 132px)`, line-height .9, tracking −.035em. Section titles `clamp(36px, 5.4vw, 84px)`, line-height .95.
- **Text:** Manrope 400/500/600. Body 15–17px, line-height 1.55, tracking −.01em.
- **Labels:** JetBrains Mono 500, 10.5–11.5px, uppercase, tracking +.18em, 55% opacity. Formats: `[ 01 ]`, `— Collection`, coordinates `31.6295° N`.
- Scale contrast: H1 ≈ 7× body.

## Home — structure and copy

1. **Floating nav** (glass pill, 12px from top, blur 18px, bone 6% fill, 1px bone 10% border): wordmark `Keystonia` in Bodoni with a brass `✦`; links Collection · Exchange · Portfolio · Votes · Ledger; language switch; wallet pill.
   Demo notice moves to a single mono line at the very top (still visible on every page).
2. **Hero, pinned for 260vh.** Full-bleed canvas: the share tower at dusk, warm key light from the low left,
   cool rim from behind, black fog from 14 → 46 units, contact shadow, bloom (threshold .85) on lit windows,
   vignette .55, film grain.
   - Bottom-left stack: label `[ Fractional property · settled on-chain ]` → H1
     **"Own the address."** / *"Not the mortgage."* (second line italic, bone 55%) → sub (max 34rem):
     "A riad in the Medina, a loft in Camden, vines above the Sado. Each one divided into shares from €50, each share paid rent every month."
     → CTAs: solid champagne pill **Enter the collection ↗**, glass pill **Watch a walkthrough**.
   - Bottom-right: three stats (Bodoni numerals 300, mono labels): tokenized value · paid out in rent · average net yield.
   - Scroll beats (right column, crossfading): `01` **One building.** → `02` **Twenty thousand shares.** "Each a token. Each a legal claim on the rent." → `03` **One of them is yours.** As the beats advance the tower separates (0 → 1), rotates 35°, and one block rises and turns brass.
   - Entrance: nav → label → H1 lines (masked rise from 110%, 0.9s, stagger .12s, `cubic-bezier(.16,1,.3,1)`) → sub → CTAs → stats, done by 1.6s. Canvas fades in from black over 1.2s.
3. **The collection** — `[ 02 ]` title "Twenty-four addresses." Horizontal rail of tall cinematic cards (4:5, photo, bottom gradient, Bodoni name, mono city + yield). Drag/scroll-snap.
4. **Walk in before you buy** — split: live 3D walkthrough preview (riad courtyard) on the left at 16:10, chapter list on the right with mono timestamps; CTA "Open the full visit".
5. **Four cities** — editorial index rows: giant Bodoni city name, coordinates, number of assets, value; hovering a row reveals that city's photo in a floating frame that follows the pointer.
6. **The ledger** — marquee of live on-chain events in mono, plus the four rules enforced by contract ("Enforced by code, not by promise.").
7. **Closing** — "The keys are on-chain." / CTA, then footer.

## Walkthroughs

Procedural scene per category (and Marrakech hospitality = riad):
apartment enfilade (salon, dining, bedroom; tall windows, mouldings, herringbone oak), riad (zellige courtyard, arcades, fountain, orange trees, roof terrace), hotel (lobby, corridor, suite), student studio (corridor + room), retail/office (glass front, open plan), vineyard/olive estate (terrain, instanced rows, farmhouse at sunset).
Camera follows a Catmull-Rom path through 4 chapters (auto-play, 6s each, ease in/out), pointer drag adds ±25° look offset, chapter list is clickable. Lighting: warm practicals (point lights + emissive shades), daylight through windows, ACES tone mapping, bloom .6, vignette.
Reduced motion: no auto-play, jumps between chapters.
