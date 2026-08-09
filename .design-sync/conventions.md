# Buttercup Café — a CSS design system

**Read this before the generated sections below — they are auto-written for a React
component library and do not describe this design system.** Buttercup Café ships **no
React components**. `_ds_bundle.js` is an empty bundle: `window.ButtercupCafe` has no
exports, there is nothing to import, and there is no provider to wrap anything in.
Ignore the "Loading" and "Components" sections' React instructions. Build with plain
HTML elements plus the classes and custom properties below.

## Setup

One stylesheet, nothing else:

```html
<link rel="stylesheet" href="_ds/<folder>/styles.css" />
```

It `@import`s, in order: the brand webfonts (Baloo 2, Space Grotesk, from Google
Fonts), the token + reset + page-chrome layer, then the component layer.

**Do not put `class="js"` on `<html>`.** The live site adds it to gate entrance
animations: under `.js`, `.bubble`, `.chibi` and `.saypanel` start at `opacity: 0` and
stay invisible until scripts add `.is-in`. A static design has no such script, so with
`js` present those elements never appear at all. Omit it and everything renders.

## The idiom

BEM-ish class names for structure, `var(…)` on a token from the list below for every value. **There are no
utility classes** — no `p-4`, no `text-lg`, no `bg-cream`. Reach for a component class
when one fits; for your own layout glue, write a plain class and fill it with the
tokens below. Never hard-code a hex, a radius, or a spacing value that has a token.

## Class vocabulary

| Family | Classes |
|---|---|
| Page frame | `.wrap`, `.wrap--narrow`, `.section`, `.section-head`, `.stack`, `.divider`, `.visually-hidden`, `.skip-link` |
| Type | `.display`, `.eyebrow`, `.lede` |
| Chrome | `.nav` + `__inner __brand __avatar __links __link`, `.footer` + `__top __links __meta __sign` |
| Surfaces | `.paper` (the sheet primitive), `.stitch` (dashed-thread border), `.plaque` |
| Card | `.card` + `__title __desc __plaque __more` |
| Card themes | `.t-moss`, `.t-peach`, `.t-butter` — one class swaps fill, chip colour and `--accent` together |
| Actions | `.btn`, `.chip-link`, `.chip`, `.chips` (the `<ul>` wrapper) |
| Speech | `.bubble`, `.caret`, `.saypanel` + `__who __line __next __ghost`, `.chibi` |
| Q&A jar | `.jar` + `__art __cavity __slips __slot __shine`, `.note` + `__q __text __sheet __caption __pull __quad`, `.slip`, `.qa-note`, `.qa__list` |

A project card is the four-class composition the site actually uses — surface,
stitching and theme are separate concerns you stack:

```html
<a class="card paper stitch t-moss" href="#">…</a>
```

## Tokens

All defined on `:root` in `tokens/10-base.css`. Read that file — it is short, commented,
and authoritative.

- **Palette (raw)** — `--sage --cream --paper --paper-warm --butter --butter-deep --peach --peach-deep --tan --tan-deep --moss --moss-deep --slate`
- **Ink** — `--ink --ink-soft --ink-faint`
- **Semantic** — `--bg-page --bg-desk --stitch-color --accent` (prefer these over raw palette names)
- **Type** — `--ff-body --ff-display --fw-body`, sizes `--fs-100` → `--fs-800`, `--lh-tight --lh-snug --lh --measure`
- **Spacing** (4px rhythm) — `--sp-1 --sp-2 --sp-3 --sp-4 --sp-5 --sp-6 --sp-8 --sp-10 --sp-12 --sp-16 --sp-20`, plus `--gutter --section-y --wrap`
- **Radii** — `--r-sm --r-md --r-lg --r-pill --r-card`
- **Shadow** — `--sh-contact --sh-ambient`, composed as `--shadow-paper --shadow-lift --shadow-sunk`
- **Motion** — `--dur-fast --dur --dur-slow --ease-out --ease-spring`
- **Stitch** — `--stitch-inset --stitch-w --stitch-color`

## Custom properties you set per instance

These are inputs, not tokens — the CSS reads them off the element, and nothing defines
them for you:

| Property | Set on | Effect |
|---|---|---|
| `--flow` | any `.stack` | gap between its children (default `--sp-4`) |
| `--z` | `.card` | stacking order in a fanned pile (default `1`) |
| `--tail-x` | `.bubble` | horizontal position of the tail (default `2rem`) |
| `--chibi-bg` | `.chibi` | portrait backdrop (default `--paper-warm`) |
| `--in-delay` | animated elements | entrance stagger (default `0ms`) |

Two more, `--quad-w` and `--quad-h`, are read by `.note` / `.note__quad` but are
**not** shipped — they live in the site's homepage layer, which is outside this design
system. Set both yourself if you use `.note__quad`, or it will have no size.

## A worked example

Library classes for the components, DS tokens for your own glue:

```html
<section class="section">
  <div class="wrap">
    <p class="eyebrow">Selected work</p>
    <h2 class="section-head">Recent projects</h2>
    <div class="project-row">
      <a class="card paper stitch t-peach" href="#">
        <span class="plaque card__plaque">Best Poster — IEEE ISMAR 2025</span>
        <h3 class="card__title">Adaptive AR Pathfinding</h3>
        <ul class="chips">
          <li class="chip">Research</li>
          <li class="chip">HCI</li>
        </ul>
        <p class="card__desc">A Quest 3 system that lays a walking path across your own floor.</p>
        <span class="card__more">read the case study →</span>
      </a>
    </div>
  </div>
</section>

<style>
  /* Your own layout glue — plain class, DS tokens for every value. */
  .project-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-6);
  }
</style>
```
