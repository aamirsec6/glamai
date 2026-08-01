# Qimma — Landing Page

Cinematic marketing site for **Qimma**, the AI growth platform for local
businesses. Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 ·
React Three Fiber · GSAP ScrollTrigger · Lenis.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Where the 3D lives

| Scene | File | What it does |
| --- | --- | --- |
| Hero — growth nucleus | `components/hero/HeroCanvas.tsx` | Full-bleed R3F scene: fresnel-shaded nucleus, six orbiting agent nodes tethered by pulsing bezier filaments, instanced shard field (abstract pins/stars/bars), particle shell, pointer-parallax camera rig, bloom (desktop only). |
| How-it-works — scroll morph | `components/sections/HowItWorksCanvas.tsx` | Pinned chapter driven by a shared progress ref scrubbed by ScrollTrigger. Four stages morph in sequence: **Connect** (channel filaments draw in) → **Activate** (agents light up one by one) → **Measure** (gauge arcs sweep open) → **Grow** (ranking bars climb, map pins rise). Camera dollies + orbits with progress. |

### Performance notes

- Both canvases set `frameloop="never"` when off-screen (IntersectionObserver / ScrollTrigger `onToggle`).
- Shards and particles are instanced/buffered; no textures or HDRs — all materials are procedural.
- Mobile gets reduced node/particle counts, capped DPR, and no post-processing.
- `prefers-reduced-motion` swaps both scenes for static CSS renders and disables Lenis, pinning, and reveals.

## Structure

```
app/
  layout.tsx            fonts (Syne + Instrument Sans), metadata
  globals.css           design tokens (CSS variables), grain, utilities
  page.tsx              section composition
  sign-up/              stub demo-booking route (primary CTA target)
  how-it-works/         redirects to /#how-it-works
components/
  SmoothScroll.tsx      Lenis ⇄ GSAP ticker bridge
  Reveal.tsx            scroll-reveal primitive (opacity + y, stagger)
  SiteNav.tsx           transparent→blur sticky nav + mobile drawer
  SiteFooter.tsx
  hero/                 Hero.tsx (copy band + load choreography), HeroCanvas.tsx
  sections/             ProblemPromise · AgentRoster · HowItWorks(+Canvas) ·
                        FeatureStories · CaseStudies · Verticals · Pricing ·
                        FAQ · FinalCTA
lib/
  content.ts            agents, steps, FAQs, nav links
  hooks.ts              usePrefersReducedMotion, useIsMobile
```

## Design tokens

Defined in `app/globals.css` as CSS variables: `--bg #07080A`, `--fg`,
`--muted`, `--accent #2DD6C8` (cyan-teal), `--accent-2 #7FF0D3`, `--line`
(white @ 9%), plus easing and spacing tokens. Fonts load via `next/font`
(Syne for display, Instrument Sans for body) — no system-UI defaults.

## Notes

- Case-study numbers are from the brief; the disclaimer under them marks
  results as account-specific.
- `/sign-up` is a stub — wire it to your scheduling/CRM form.
