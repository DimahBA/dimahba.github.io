# design-sync notes — Buttercup Café

Repo-specific gotchas for future syncs. Read this first.

## What this repo is

A hand-written static site — no `package.json`, no bundler, no React, no Storybook.
The design system is **CSS only**: tokens + a BEM-ish class vocabulary. The converter's
`package` shape is used in its **tokens-only** mode (`[ZERO_MATCH] … treating as
tokens-only DS`), which is a supported path, not a failure.

Consequence: **zero components, zero preview cards.** The claude.ai/design DS pane will
show no visual cards for this project — that is expected and correct. What the design
agent actually consumes is `styles.css` (the full token + component CSS closure) and
the README conventions header.

## The synthetic package

The converter needs a directory with a named `package.json` and its stylesheets
contained inside it. `.design-sync/build-pkg.mjs` generates one from the real `css/`
files on every run — **always run it before the converter**:

```sh
node .design-sync/build-pkg.mjs
```

It writes two gitignored trees:

- `.ds-pkg/` — `PKG_DIR`. Holds `entry.mjs` (deliberately exports nothing, so the
  converter takes the tokens-only path) and `css/components.css` → `cfg.cssEntry` →
  `_ds_bundle.css`.
- `.ds-sync/node_modules/buttercup-cafe-tokens/` — `cfg.tokensPkg`. Holds
  `css/00-fonts.css` and `css/10-base.css` → `tokens/`.

Nothing in either tree is hand-maintained. Edit `css/*.css` and re-run.

## Scope decision (2026-08-09)

Synced: `css/base.css` (tokens + reset + chrome) and `css/components.css` (the reusable
vocabulary). **Deliberately excluded:** `css/home.css` (bespoke homepage furniture —
hero, jar, DS console, shelf, deck, LED) and `css/project.css` (case-study page
layout). Revisit only if the user asks; excluding them keeps the agent from reaching
for one-off decorations.

## Fonts

Baloo 2 + Space Grotesk are loaded by a remote `@import` to Google Fonts, injected as
`tokens/00-fonts.css` by `build-pkg.mjs` — mirroring the `<link>` the live site uses.
Validate reports `[FONT_REMOTE]`, which is informational and expected. The file exists
separately (rather than being prepended to `10-base.css`) because CSS requires
`@import` to precede every other rule in its stylesheet, and it is named `00-` so it
sorts first into the `styles.css` closure.

If the user ever wants fonts shipped locally instead: download the woff2s, write an
`@font-face` CSS, and point `cfg.extraFonts` at it.

## The `.divider` asset

`.divider` paints `../static/background.svg` — a **3 MB** plaid. The converter copies
fonts but not images, and 3 MB is far too large to inline as a data: URI, so
`build-pkg.mjs` rewrites the `url()` to the live copy at
`https://dimahba.github.io/static/background.svg`. Verified reachable (HTTP 200).

Two consequences to watch: the divider silently stops painting if that path ever moves
or GitHub Pages goes down, and every rendered design pulls 3 MB. **Optimising that SVG
is the single highest-value fix available** — it would also speed up the live site.

## Known render warns

- `[RENDER_SKIPPED]` — always. There are zero preview cards to render, so the headless
  check has nothing to do and playwright is not installed. Not a real warn; do not
  chase it, and do not install 200 MB of chromium to render nothing.
- `[FONT_REMOTE]` — see Fonts above. Expected.
- `tokens: N defined, M referenced (2 missing, below threshold)` — see below.

Visual verification is done instead by `.design-sync/closure-check.html`, which loads
**only** `styles.css` (exactly what a rendered design receives) against markup lifted
verbatim from `index.html`:

```sh
cp .design-sync/closure-check.html ds-bundle/.check.html
node .ds-sync/storybook/http-serve.mjs ./ds-bundle
```

## Fixed during the 2026-08-09 sync

`css/components.css` referenced `--sh-hi` four times (`.btn`, `.btn:hover`,
`.chip-link`, `.chip-link:hover`) but that token was defined nowhere in the repo. With
no `var()` fallback, each whole `box-shadow` declaration was invalid at computed-value
time, so both components computed to `box-shadow: none` — on the **live site**, not
just in the DS, including the hover lift. Almost certainly leftovers from the refactor
that base.css records ("No inner highlights: they read as a glow rather than as
paper"). Removed the dead references with the user's agreement; confirmed via computed
styles that `.btn` went from `none` to `rgba(88,70,52,.18) 0 1px 2px`.

## Re-sync risks

- **`.note__quad` is knowingly incomplete.** It reads `--quad-w` / `--quad-h`, which
  are defined only in the excluded `home.css`. Documented in the conventions header as
  a caller responsibility. If `home.css` is ever brought into scope, delete that
  caveat from `.design-sync/conventions.md`.
- **The asset URL is hard-coded** in `build-pkg.mjs` (`ASSET_BASE`). If the site moves
  off `dimahba.github.io`, the divider breaks silently — nothing validates it.
- **Class-vocabulary drift.** The conventions header enumerates real class and token
  names. Renaming anything in `css/*.css` makes the header lie, and nothing in the
  build catches it. Re-run the validation pass in the base skill's "Author the
  conventions header" step on every sync; the extraction one-liners used to build the
  tables are worth re-deriving from `ds-bundle/_ds_bundle.css` and
  `ds-bundle/tokens/10-base.css`.
- **`--sh-hi` could come back.** If someone re-adds an inner-highlight token, revisit
  the four `box-shadow` declarations above.
- **Version is pinned to `1.0.0`** in `build-pkg.mjs`. The repo has no real version, so
  the README always says 1.0.0. Harmless, but do not read it as meaningful.
