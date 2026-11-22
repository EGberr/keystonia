# Keystonia — design spec

**Who:** a curious visitor who has never bought tokenized property, and a recruiter opening the live demo from a CV.
**Reference picked by the owner:** a cinematic, photographic travel page (inset frame, giant title over a real photo).
**Mood:** daylight · editorial · precise.
**Signature:** the tokenization sequence. A real façade is pinned to the scroll, cut into a grid, the tiles lift off
in 3D and flip into €50 tokens, and one of them lands in a wallet with its rent. Every property then opens as a 360°
visit made of real photographs.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#f2f0eb` | paper |
| `--surface` / `-2` / `-3` | `#ffffff` / `#e9e6df` / `#dcd8cf` | cards, panels |
| `--text` | `#0f0f0d` | ink, primary buttons |
| `--text-2` | ink at 68% | body |
| `--muted` | `#77736a` | labels, meta |
| `--border` / `-strong` | ink at 10% / 20% | hairlines |
| `--accent` | `#ff5b1f` | tokens only: the token face, CTA arrows, live dots, progress |
| `--positive` / `--negative` | `#1f8a5b` / `#d2452b` | ledger, P&L |

Glass: `.glass` (white 62%, blur 20px) for the nav over paper; `.glass-dark` (white 14%, blur 16px) over photographs.
Grain at 3.5%. Selection in accent at 25%.

## Type

- **Display:** Clash Display 500/600 (Fontshare). Hero wordmark 18.6vw (16.4vw on phones), tracking −.055em;
  H1 `clamp(46px, 7vw, 104px)`; section titles `clamp(40px, 6vw, 96px)`, line-height .92, tracking −.04em.
- **Text:** General Sans 400/500, 15–17px, line-height 1.55.
- **Labels and figures:** JetBrains Mono, 10.5px uppercase +.18em for labels; tabular numbers for money.

## Motion (GSAP + ScrollTrigger + SplitText, Lenis)

- Preloader once per session: counter 000 → 100 (1.5s), then the ink panel wipes up (`expo.inOut`, 1s).
- Hero: photo settles from scale 1.25 (2.2s), wordmark letters rise from 110% (stagger 45ms), headline lines rise,
  copy and token card fade up. On scroll the photo drifts 14% and the wordmark lifts and fades.
- Tokenization: pinned for 320% of the viewport, scrubbed: tilt → grid lines → tiles lift (random z ±220, rotate)
  → flip to token faces (stagger from edges) → all but one recede → the chosen token comes forward → wallet card.
- Sections: masked word reveals on every heading, staggered lists, count-ups, pinned horizontal collection rail,
  sticky stacking "how it works" cards, pointer-following city photo, ledger marquee, parallax closing image,
  magnetic primary buttons, curtain page transitions.
- `prefers-reduced-motion`: no smoothing, no pinning, everything in its final state.

## 360° visits

Four rooms or places per property, each a real equirectangular photograph (Poly Haven, CC0) on an inverted sphere.
1K preview first, 4K after. Room change: crossfade over 1.1s while the field of view pushes from 56° back to 70°.
Drag with inertia, slow auto-rotation after 2.5s idle, auto-advance every 9s with a progress bar, fullscreen.
