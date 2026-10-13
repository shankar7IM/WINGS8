# WINGS8 Website: Spec and Plan

Status: **DRAFT, awaiting approval**. No implementation code exists yet.

## 1. Objective

Rebuild the WINGS8 company website so it looks and reads like the client's
company deck (`W8_Presentation_202060901_V.1.0`, 15 slides) and does not look
machine-generated. It replaces the current Netlify build
(webpagetranquil-palmier-a76032.netlify.app), which the client rejected.

Success means the client opens it beside the deck and sees the same brand.

## 2. Client feedback and how we meet it

| Client feedback | Why the current site fails | What we do |
|---|---|---|
| Theme exactly like the PPT | Uses aurora orbs, cyber grid, glass cards, gradient text, neon cyan/amber/emerald, a different red (#ff1e27), Inter + JetBrains Mono | Use the deck's own tokens (section 3), flat black/white split panels, a single red accent, no effects |
| Must not look built with AI | Emoji as icons, gradient headline, glow, "Death of Menus", an invented ROI calculator, a fake chat-OS simulator, a Windows-vs-Linux benchmark with unsourced numbers | Editorial layout with numbered sections like the deck. Only claims that appear in the deck. No emoji, no gimmick widgets |
| No team names | Names five executives | Remove the team section and every personal name |
| No French / Indian | "Franco-Indian Executive Team", flag emoji, "French cybersecurity architect" | Remove all nationality and heritage descriptors, including "sovereign Indian operating system" (becomes "sovereign operating system") |
| No invest details | €500k+ ticker, bond financing CTAs, funding slide, "Bond Investment Briefing" form option | Drop deck slide 14, the €500k figure (also on slide 13), bonds, and any financing CTA |

Open question (default in bold): the deck's cover says "Launching Q4 2026 · Europe & India".
That is a market statement, not a heritage claim. **Keep it**, and it is a one-line removal if the client reads "India" as covered by the "no Indian" rule.

## 3. Design system (extracted from the deck)

Measured from the deck's rendered colors, most frequent first.

| Token | Value | Role |
|---|---|---|
| `--black` | `#000000` | Hero panels, section headings on light |
| `--ink` | `#111111` | Dark panel background (cover left half) |
| `--ink-2` | `#1e1e22` | Raised surface on dark |
| `--line-dark` | `#2a2a2e` | Hairlines and card borders on dark |
| `--red` | `#e0161c` | The only accent: the "8", eyebrow labels, rules, active states |
| `--white` | `#ffffff` | Light panels, text on dark |
| `--paper` | `#f4f4f5` | Alternate light panel |
| `--line-light` | `#e1e1e4` | Hairlines on light |
| `--mute-dark` | `#b8b8be` | Secondary text on dark |
| `--mute-light` | `#6e6e73` | Secondary text on light |

Typography: the deck uses Calibri, which is not web-safe on every device. Use **Carlito**
(metric-compatible with Calibri, free) from Google Fonts, falling back to `Calibri, Arial, sans-serif`.
- Wordmark: `WINGS` in white and `8` in red, bold, tight tracking.
- Eyebrow: small uppercase red label, wide tracking, for example `OUR MISSION`.
- Section number: two digits (`02`, `03`...) set small in the corner, as on every slide.
- Headlines: bold sentence case. Body: regular at 1.6 line height. No gradient text.

Layout language, taken from the deck:
- Split panels: dark `#111` beside white, as on the cover.
- Thin red rule or red numeral as the only decoration.
- Square or slightly rounded corners (max 4px), no glass blur, no glow, no shadows beyond a 1px hairline.
- Logo: the deck's heart-and-8 mark (`assets/slide_1_p1_i3.png`). Icons: the deck's three white line icons, used on dark panels only.

## 4. Content map (deck slide to site section, all copy from the deck)

| # | Section | Deck slide | Notes |
|---|---|---|---|
| 01 | Hero | 1 | "Your Computer. Everywhere." split dark/white with the logo |
| 02 | Mission | 2 | Three building blocks: W8 OS, W8 SaaS, 8Wares |
| 03 | W8 OS | 3 | Ultra-light, high-performance, cyber-secured, sovereign by design |
| 04 | Architecture | 4 | OpenCore stack as a drawn SVG diagram: sandboxed apps, overlays, open-source core, hardware, agentic AI layer (R&D) |
| 05 | Apps | 5 | Cloud-first / OS-agnostic / generic / universal. "Yesterday vs With W8" two-column comparison |
| 06 | W8 SaaS | 6 | Fleet, licences, backups and OTA updates, billing |
| 07 | 8Wares range | 7 | Five devices with status tags (Launch Q4 2026 / In R&D / R&D 2027) |
| 08 | At launch | 8, 9 | W8 TV, W8 USB (3-step install), Mini PC, plus R&D devices |
| 09 | Impact | 10 | Ecological, economic, social, sovereignty, security |
| 10 | Go-to-market | 12 | Distributors, B2B, B2C, B2G/B2A, marketing support |
| 11 | Roadmap | 13 | Timeline 2023 to R&D pipeline, **without the euro figure** |
| 12 | Contact | n/a | Distributor and partner enquiry form (front-end only, see 6) |

Deliberately excluded: slide 11 (team), slide 14 (funding), the investment figures on slide 13.

## 5. Requirements

Functional
- Single static page, sticky top nav with section anchors, smooth scroll, active-section highlight.
- Section 04 architecture diagram is inline SVG, themed to the tokens.
- Contact form validates client-side (name, organisation, email, region, message) and shows a confirmation state.
- Device cards show their status exactly as the deck states them.

Non-functional
- Responsive from 360px to 1920px. Dark/light panels stack cleanly on mobile.
- Accessible: semantic landmarks, visible focus, contrast of at least 4.5:1 (red `#e0161c` on white is about 4.6, on `#111` about 3.9, so red is used for large or bold text and decoration on dark, and never for small body copy on dark).
- Respects `prefers-reduced-motion`. Motion limited to subtle reveal-on-scroll.
- No framework or build step. Plain HTML, CSS and a small vanilla JS file. No three.js. Lighthouse target: Performance, Accessibility and SEO at 95 or above.
- Meta tags, Open Graph, favicon from the logo.

## 6. Boundaries

- **Always:** use only the deck's claims, keep the red as the sole accent, check each section against the deck.
- **Ask first:** adding any statistic, price, spec or claim not in the deck. Wiring the form to a real endpoint, since the client needs to supply the email or service.
- **Never:** emoji, gradients, glow, neon colors, invented numbers, personal names, nationality or heritage wording, funding or bond content.

The form is front-end only in this scope. It confirms on screen but sends nothing until the client chooses a destination, and the page will state that plainly in the handoff.

## 7. Verification

- Side-by-side check of every section against its deck slide (copy and tokens).
- Grep gate: zero hits for `John|Quentin|Loïc|Prashan|Dhina|Franco|French|Indian|🇮🇳|bond|€500|invest` and any emoji in the built files.
- Responsive pass at 360, 768, 1280 and 1920px; keyboard-only pass; Lighthouse run.

## 8. Plan (vertical slices, each ends in a working, checked page)

1. **Foundation:** tokens, Carlito, base layout, nav, footer, wordmark. Done when the empty shell matches the deck's palette and type.
2. **Hero + Mission + W8 OS** (sections 01 to 03).
3. **Architecture diagram + Apps** (04, 05). The hardest design piece, so it goes before the rest.
4. **W8 SaaS + 8Wares range + At launch** (06 to 08).
5. **Impact + Go-to-market + Roadmap** (09 to 11).
6. **Contact form + SEO/meta + motion polish** (12).
7. **Review and verify:** grep gate, responsive, accessibility, Lighthouse, code review. Then the ship step (deploy target to be chosen by the client).

Each slice is built test-first where it has logic (nav active state, form validation) and checked visually in the browser for the rest.

## 9. Revision 2 (client-side feedback: "it was basic")

Requested: animation across the page, and a 3D model of the W8 TV stick in the site.
This **overrides** two earlier constraints: "no three.js" (section 5) and "motion limited to subtle reveal-on-scroll".
Everything else stands, including the brand rules (deck palette, no gradients or glow, no invented claims, no names/heritage/funding).

Decisions
- **3D:** the stick is modelled procedurally in three.js r160 (vendored in `vendor/`, no CDN) from the deck's slide-8 photo. Carbon-weave body, gold HDMI plug, matte end cap with USB-C port and LED, side buttons, deck logo and wordmark on the top face.
- **Interaction:** slow idle sway and float, drag to rotate with inertia, arrow keys to rotate, gentle scroll-linked turn, intro swing-in.
- **Fallback:** the deck photo stays in the hero markup and shows when WebGL is unavailable, when JS fails, or in print. With `prefers-reduced-motion` the model renders still and only moves on user input.
- **Page motion (restrained, one idea per section):** staged hero entrance, section rules that draw in, staggered card reveals, architecture layers building bottom-up, timeline drawing left to right, scroll-progress bar. No parallax, no cursor effects, no looping decoration.
- **Constraint:** the page must be served over http(s). ES modules and WebGL textures do not work from `file://`.

Slices: (a) motion helpers + test, (b) stick model, (c) hero integration and fallback, (d) page animations, (e) verification: reduced-motion, mobile, Lighthouse, frame-time check, content gate.

## 10. Revision 3 (client feedback: pen drive, footer, mobile, spacing)

- **Pen drive:** the USB connector must look like the client's reference photo (silver USB-A shell, two square holes and a slot on top, blue insert with gold contacts inside the open end). The 3D scene now holds two devices that share one body: **W8 USB** (pen drive, new, default) and **W8 TV** (HDMI stick, from the deck photo). A switch under the model changes between them. The deck names both devices, so neither is dropped. Captions use the deck's own wording.
- **Footer:** brand block (logo, tagline, launch line), three link columns (Platform, 8Wares, Company), and a base bar with copyright and back-to-top. No contact details are invented; add real ones when the client supplies them.
- **Mobile:** the architecture diagram has a separate stacked version below 700px (the wide one rendered its text at 4 to 7px on a phone). One spacing rhythm on phones, full-width hero buttons, 44px tap targets.
- **Alignment:** hero copy aligns exactly to the nav logo (container-query width, no scrollbar error), panel headings share a baseline, hyphenated headings no longer split, contact intro stays in view beside the long form.
- **Verification added:** a script-based contrast check over every text element with all reveals forced visible (230 elements, 0 failures), because Lighthouse only audits what is already on screen.
