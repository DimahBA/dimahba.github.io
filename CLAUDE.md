# Buttercup Café — dimahba.github.io

Dimah's portfolio: a hand-built static site, styled as a pixel-art café.
No framework, no bundler, no `package.json`, no build step. Plain HTML, CSS
and ES modules served straight off GitHub Pages from `main`.

<!-- Maintainer note: HTML comments are stripped before this file enters
     context, so notes like this cost nothing. Keep the file under ~200 lines
     and keep it stable — it is part of the cached prompt prefix. -->

## Running it

- Preview with the `site` launch config (`.claude/launch.json`) — a
  `python3 -m http.server` on the repo root. Use the preview tools, never
  `bash` a server.
- The server caches aggressively. If HTML looks stale, hard-reload
  (`location.reload(true)`) or re-navigate before concluding a change failed.
- There is nothing to build, lint or test. Verification is: load the page,
  read the console, read the DOM, screenshot.
- Never commit or push unless asked.

## Layout

- `index.html` — the whole home page (hero, café, project board, contact).
- `project.html` — an empty template. `js/case-study.js` fills it from
  `js/data/projects.js`, keyed by `?id=<slug>`.
- `project-ar-pathfinding.html` — the one case study that is not a paper
  sheet: its own full-bleed markup, `css/case-scroll.css`, `js/case-scroll.js`.
- `project-details-*.html` — legacy redirect stubs. Leave them; printed links
  point at them.
- `js/data/` — all content (projects, Q&A, sprites). `js/modules/` — one
  behaviour each. `js/lib/` — tiny helpers (`$`, `$$`, `h`, typewriter).
- `.ds-sync/`, `.ds-pkg/`, `ds-bundle/` are generated and gitignored. Don't
  edit or read them for ground truth.

## Conventions that are not obvious

- **Tabs, not spaces**, in HTML, CSS and JS. Double quotes in JS.
- **CSS owns every pose; JS owns only state.** Scripts toggle a class
  (`is-in`, `data-loading`) or write a custom property (`--progress`), and the
  stylesheet decides what that looks like. Don't animate from JS.
- **Two token tiers** in `css/base.css`: a raw palette (`--sage`, `--butter`,
  `--tan-deep`) and semantic names on top (`--bg-page`, `--accent`,
  `--stitch-color`). Components reference the semantic tier only. Spacing is a
  4px rhythm (`--sp-*`), type is the `--fs-*` scale. Never hardcode a hex or a
  pixel value that a token already covers.
- **The site works without JavaScript.** `index.html` stamps `.js` on
  `<html>` before first paint so entrance states only apply when something can
  trigger them; `project.html` carries a `<noscript>` fallback and drops
  `data-loading` once rendered. Keep both intact when adding features.
- **Every image in `js/data/projects.js` carries real pixel `w`/`h`** — not
  display sizes. They reserve the box before decode (no reflow mid-scroll) and
  give the lightbox an exact aspect ratio. Read them off the file; never guess.
- **Query params are whitelisted by own-property check**
  (`Object.hasOwn(projects, id)`), because `?id=__proto__` otherwise resolves
  to a truthy non-project. Keep that shape if you touch the router.
- **Comments explain why, in prose, usually at the top of a file.** Match that
  density and voice — don't add `// increment i` noise, don't strip the
  existing rationale.
- Adding a page means updating `sitemap.xml`, the page's `<link rel=canonical>`
  and its `og:url` / `theme-color`.

## Art direction

The look is flat, drawn and still — a picture-book café, not a UI kit.

- No glow, no neon, no LED shine, no drop-shadow halos, no black outlines.
  Depth comes from the paper/stitch treatment and warm inks (`--ink`,
  `--ink-soft`, `--ink-faint`), never from luminosity.
- **The project cards are one deck.** Per-project ornaments (a foil frame, an
  award seal, a theme colour) may sit *on* a card; they never change its box —
  same size, same padding, same radius, same alignment as every sibling.
- **The paw trail is small, faint and sparse**, and switches off over anything
  clickable. If a change makes it busier, it's wrong.
- Motion is short and eased, respects `prefers-reduced-motion`, and never
  loops in the reader's peripheral vision.

## Case-study writing

The prose in `js/data/projects.js` is Dimah's own, word for word. Don't
rewrite it to sound smoother.

When drafting or restructuring one:

- Short sections, one idea at a time. No wall-of-text paragraphs.
- Argue every design choice back to a finding — what the study, the survey or
  the failure actually showed — rather than asserting it was better.
- Keep hedges honest: 12 survey responses is 12 survey responses.

## Working style

- Say what you changed and what you verified. If you only loaded the page and
  didn't check the console, say that.
- Prefer editing the existing file over adding a parallel one. This codebase is
  small enough that a second stylesheet or a second helper is a smell.
- When a change is visible, verify it in the preview and show a screenshot
  rather than asking Dimah to check.
