// Assembles the synthetic package the design-sync converter builds from.
//
// This repo is a hand-written static site: no package.json, no bundler, no
// React. The converter's package shape needs a directory with a named
// package.json, a JS entry, and its stylesheets contained inside it — so we
// generate one from the real css/ files on every run. Nothing here is
// hand-maintained; edit css/*.css and re-run.
//
// Layout produced (both gitignored):
//   .ds-pkg/                       PKG_DIR — what --entry walks up to
//     package.json
//     entry.mjs                    no exports → empty-bodied _ds_bundle.js
//     css/components.css           → cfg.cssEntry → _ds_bundle.css
//   .ds-sync/node_modules/buttercup-cafe-tokens/
//     css/00-fonts.css             remote @import → [FONT_REMOTE]
//     css/10-base.css              → tokens/ (the :root tier + reset + chrome)
//
// The base/components split matches how the site loads them: base.css is the
// foundation every page pulls in, components.css is the reusable vocabulary.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG_DIR = join(REPO, '.ds-pkg');
const TOKENS_PKG = join(REPO, '.ds-sync', 'node_modules', 'buttercup-cafe-tokens');

// Verbatim from the <link> in index.html — the same families, weights, and
// display strategy the live site requests.
const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..800&family=Space+Grotesk:wght@400..700&display=swap';

const VERSION = '1.0.0';

// ── .ds-pkg: the component/utility layer ────────────────────────────────────
rmSync(PKG_DIR, { recursive: true, force: true });
mkdirSync(join(PKG_DIR, 'css'), { recursive: true });

writeFileSync(
  join(PKG_DIR, 'package.json'),
  JSON.stringify({ name: 'buttercup-cafe', version: VERSION, private: true, type: 'module' }, null, 2) + '\n',
);

// No exports: this design system is CSS, not React components. The converter
// reads zero PascalCase exports here and takes its tokens-only path, emitting
// an empty-bodied _ds_bundle.js. The class vocabulary is what ships.
writeFileSync(
  join(PKG_DIR, 'entry.mjs'),
  '// Buttercup Café is a CSS design system — no JS exports by design.\nexport {};\n',
);

cpSync(join(REPO, 'css', 'components.css'), join(PKG_DIR, 'css', 'components.css'));

// ── tokens package: the foundation layer ────────────────────────────────────
rmSync(TOKENS_PKG, { recursive: true, force: true });
mkdirSync(join(TOKENS_PKG, 'css'), { recursive: true });

writeFileSync(
  join(TOKENS_PKG, 'package.json'),
  JSON.stringify({ name: 'buttercup-cafe-tokens', version: VERSION, private: true }, null, 2) + '\n',
);

// Sorted first so its @import leads the styles.css closure — CSS requires
// @import to precede every other rule in the stylesheet that carries it,
// which is why this lives alone in its own file rather than atop base.css.
writeFileSync(
  join(TOKENS_PKG, 'css', '00-fonts.css'),
  `@import url("${GOOGLE_FONTS}");\n`,
);

// `.divider` paints ../static/background.svg, a 3 MB plaid the converter
// doesn't ship (it copies fonts, not images) and that is far too large to
// inline as a data: URI. Point it at the same asset on the live site so the
// divider paints in rendered designs instead of showing a blank band.
const ASSET_BASE = 'https://dimahba.github.io';
const baseCss = readFileSync(join(REPO, 'css', 'base.css'), 'utf8')
  .replace(/url\((["']?)\.\.\/static\//g, `url($1${ASSET_BASE}/static/`);
writeFileSync(join(TOKENS_PKG, 'css', '10-base.css'), baseCss);

console.error(`✓ .ds-pkg + buttercup-cafe-tokens@${VERSION} assembled from css/`);
