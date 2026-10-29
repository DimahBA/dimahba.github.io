/* The keyboard — a plain piano for the lessons after the major scale,
   with any range, that lights each key as it sounds.

   The major scale lesson's piano (piano.js) is built around that scale's
   pattern; this one knows nothing about scales. It shows keys, names them,
   and marks what a story points at:

     kb.o x y s     opacity; where the lowest white key's left edge sits; scale
     kb.lo kb.hi    the range, as MIDI numbers (discrete)
     kb.names       the white keys' names
     kb.set kb.dim  a set of keys, "64 65 67"; with dim, every other key greys,
                    so what stays lit is exactly the keys in play
     kb.gold        keys marked in gold: a note a clef names, middle C
     kb.spans       steps to measure, "64-65 60-62": a half step is a yellow V,
                    a whole step a blue arch, between beads above the keys —
                    the major scale lesson's marks
     kb.sp0.d …     how much of each span is drawn
     kb.spl         the spans' H and W labels

   In an interactive beat the keys are buttons: the story reads `data-midi`. */

import { s, attrs, show, setText } from "../lib/dom.js";
import { C, mix, stepColor } from "../palette.js";
import { mod, isBlack, LETTERS, SOLFEGE } from "../theory.js";
import { clamp01 } from "../engine/ease.js";

const KW = 64;
const KH = 250;
const BW = 38;
const BH = 155;
const RAIL = -34;
const SPANS = 6;
const WHITE = [0, 2, 4, 5, 7, 9, 11];

/** A key's centre, in white-key widths from C4's left edge. */
function center(midi) {
	const sv = midi - 60;
	const pc = mod(sv, 12);
	const octave = Math.floor(sv / 12) * 7 * KW;
	const w = WHITE.indexOf(pc);
	return octave + (w >= 0 ? w * KW + KW / 2 : WHITE.indexOf(pc + 1) * KW);
}

const list = (v) =>
	String(v ?? "")
		.split(/\s+/)
		.filter(Boolean)
		.map(Number);

export const keyboardDefaults = (over = {}) => ({
	"kb.o": 0,
	"kb.x": 100,
	"kb.y": 600,
	"kb.s": 1,
	"kb.lo": 60,
	"kb.hi": 72,
	"kb.names": 1,
	"kb.set": "",
	"kb.dim": 0,
	"kb.gold": "",
	"kb.spans": "",
	...Object.fromEntries(Array.from({ length: SPANS }, (_, i) => [`kb.sp${i}.d`, 0])),
	"kb.spl": 0,
	...over,
});

const pt = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;

export function create(root, { lo = 36, hi = 96 } = {}) {
	const g = s("g", { class: "keyboard" });
	const whites = s("g");
	const blacks = s("g");
	const marks = s("g");
	g.append(whites, blacks, marks);
	root.append(g);

	const keys = [];
	for (let m = lo; m <= hi; m++) {
		const black = isBlack(m);
		const key = {
			m,
			black,
			rect: s("rect", { class: "key", rx: black ? 4 : 6, "data-midi": m }),
			name: black ? null : s("text", { class: "key-name", "text-anchor": "middle" }),
		};
		(black ? blacks : whites).append(key.rect, ...(key.name ? [key.name] : []));
		keys.push(key);
	}

	const spans = Array.from({ length: SPANS }, () => ({
		v: s("polyline", { fill: "none", stroke: C.half, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }),
		arch: s("path", { fill: "none", stroke: C.whole, "stroke-width": 4, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }),
		label: s("text", { class: "step-label", "text-anchor": "middle" }),
		beads: [0, 1].map(() => s("circle", { r: 12, "stroke-width": 3 })),
	}));
	for (const sp of spans) marks.append(sp.v, sp.arch, sp.label, ...sp.beads);

	function render(P, live, now) {
		if (!show(g, P["kb.o"])) return false;
		const kLo = Math.round(P["kb.lo"]);
		const kHi = Math.round(P["kb.hi"]);
		const ps = P["kb.s"];
		const px = P["kb.x"] - ps * (center(isBlack(kLo) ? kLo - 1 : kLo) - KW / 2);
		const py = P["kb.y"];
		const X = (m) => px + ps * center(m);

		const set = new Set(list(P["kb.set"]));
		const gold = new Set(list(P["kb.gold"]));
		const dim = P["kb.dim"];
		const interactive = P.interactive > 0.5;
		const L = P.naming === "letters" ? LETTERS : SOLFEGE;

		for (const k of keys) {
			const on = k.m >= kLo && k.m <= kHi;
			if (!show(k.rect, on ? 1 : 0)) {
				if (k.name) show(k.name, 0);
				continue;
			}
			const lit = set.size === 0 || set.has(k.m);
			let fill = k.black ? C.grayE : lit ? mix(C.grayA, C.white, dim) : mix(C.grayA, C.gray, dim);
			if (gold.has(k.m)) fill = mix(fill, C.tonic, k.black ? 0.75 : 0.55);
			fill = mix(fill, C.blueB, live.glow(k.m, now));
			const w = k.black ? BW : KW - 3;
			attrs(k.rect, {
				x: X(k.m) - (ps * w) / 2,
				y: py,
				width: ps * w,
				height: ps * (k.black ? BH : KH),
				fill,
				stroke: k.black ? (lit && dim > 0.5 ? C.gray : C.grayD) : C.bg,
				"stroke-width": 2,
				"pointer-events": interactive ? "all" : "none",
			});
			if (k.name && show(k.name, P["kb.names"] * (lit ? 1 : 1 - dim * 0.75))) {
				attrs(k.name, {
					x: X(k.m),
					y: py + ps * (KH - 22),
					fill: gold.has(k.m) ? C.tonicInk : C.grayE,
					"font-size": 22 * Math.min(1, ps * 1.1),
				});
				setText(k.name, L[WHITE.indexOf(mod(k.m))]);
			}
		}

		/* Spans: a V for a half step below the rail, an arch for a whole step
		   above it, as in the major scale lesson. */
		const pairs = String(P["kb.spans"] ?? "")
			.split(/\s+/)
			.filter(Boolean)
			.map((t) => t.split("-").map(Number));
		const railY = py + ps * RAIL;
		spans.forEach((sp, i) => {
			const pair = pairs[i];
			const d = pair ? clamp01(P[`kb.sp${i}.d`]) : 0;
			if (!pair || d < 0.001) {
				show(sp.v, 0);
				show(sp.arch, 0);
				show(sp.label, 0);
				sp.beads.forEach((b) => show(b, 0));
				return;
			}
			const [a, b] = pair;
			const size = Math.abs(b - a);
			const xa = X(a);
			const xb = X(b);
			const mid = (xa + xb) / 2;
			const half = size === 1;
			if (show(sp.v, half ? 1 : 0)) {
				attrs(sp.v, { points: `${pt(xa, railY)} ${pt(mid, railY + ps * 46)} ${pt(xb, railY)}`, "stroke-dashoffset": 1 - d });
			}
			if (show(sp.arch, half ? 0 : 1)) {
				const h = 0.3 * Math.abs(xb - xa) + ps * 14;
				attrs(sp.arch, {
					d: `M${pt(xa, railY)}Q${pt(mid, railY - 2 * h)} ${pt(xb, railY)}`,
					stroke: stepColor(size),
					"stroke-dashoffset": 1 - d,
				});
			}
			if (show(sp.label, P["kb.spl"] * clamp01((d - 0.5) * 2))) {
				const h = half ? 0 : 0.3 * Math.abs(xb - xa) + ps * 14;
				attrs(sp.label, { x: mid, y: railY - h - ps * 26, fill: stepColor(size) });
				setText(sp.label, half ? "H" : size === 2 ? "W" : String(size));
			}
			[a, b].forEach((m, k) => {
				const bead = sp.beads[k];
				const op = k === 0 ? 1 : clamp01(d * 3 - 2);
				if (!show(bead, op)) return;
				const gl = live.glow(m, now);
				const color = k === 0 ? C.white : stepColor(size);
				attrs(bead, { cx: X(m), cy: railY, r: 12 * Math.min(1, ps * 1.1), fill: mix(C.bg, color, gl), stroke: color });
			});
		});

		return false;
	}

	return { render };
}
