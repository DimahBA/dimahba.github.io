/* The score — lines of real notation for the lessons after the major
   scale: notes of every length, rests, dots, ties, beams, bar lines, clefs
   and time signatures, on as many rows as a story asks for.

   Each row is a staff with a line of music (js/rhythm.js) on it, drawn from
   its own parameters, all prefixed `st0.`, `st1.` …:

     o x y s      opacity; where the top line's left end sits; scale
     draw         how much of the five lines is drawn (Manim's Create)
     w            the staff's length; 0 fits it to the music
     m            the music, as a string — discrete, a new string redraws
     clef co      "treble" | "bass" | ""; the clef's opacity
     time to      a meter, "6/8" or "7/8:2+2+3"; its numbers' opacity
     tsTop tsBot  the colours of the time signature's two numbers
     left         where the music starts, after the clef and time signature
     u            the width of one quarter note. Time is drawn to scale, so a
                  half note takes twice the room of a quarter, and notes that
                  sound together line up from row to row
     even         0: spaced by time; 1: every item the same width (u), for
                  charts, where things sit side by side rather than in time
     rev          how many items show, left to right — a fraction fades the
                  next one in, and a ledger line arrives just before its note
     bars         the bar lines' opacity
     beam         0: eighth notes keep their flags; 1: joined by beams
     names        note names under the staff (or an item's own @label)
     box          timing bars: under each note, a bar as long as the note
                  lasts, filling while it sounds; under a rest, a hollow one
     count        the beats, numbered under the timing bars; each lights as
                  its click sounds. `pulse` (quarters) numbers a finer grid,
                  and with `cg` the numbers restart in every group: 1 2 1 2 1 2 3
     grp          a bracket over each beat, marked with how many
                  subdivisions it holds: 2 in simple meter, 3 in compound
     hl hlo       a staff step to light in gold — the line a clef names — and
                  how strongly

   `gs.o` joins rows 0 and 1 into a grand staff (a brace and a line down
   the left), and `gs.mid` draws the eleventh line between them.

   While a row plays, `live.pos("st0")` says where its music is: each note
   flashes as it sounds, and its timing bar fills.

   Local units: staff space 20, the top line at y = 0. */

import { s, attrs, show, setText } from "../lib/dom.js";
import { C, mix } from "../palette.js";
import { parse, meter, pulses, beams, measures } from "../rhythm.js";
import { nameOf, accidental } from "../theory.js";
import { clamp01 } from "../engine/ease.js";

const PAD = 22;
const BOX_Y = 122;
const NAME_Y = 160;
const GRP_Y = -46;
const STEM = 70;
const FADE = 0.75;

/* Note heads, as paths: a tilted oval, solid for a quarter and shorter;
   with a narrow hole for a half note; wider, with a tilted hole, whole. */
const oval = (rx, ry, deg) => {
	const a = (deg * Math.PI) / 180;
	const x = (rx * Math.cos(a)).toFixed(2);
	const y = (rx * Math.sin(a)).toFixed(2);
	return `M${-x} ${-y}A${rx} ${ry} ${deg} 1 0 ${x} ${y}A${rx} ${ry} ${deg} 1 0 ${-x} ${-y}Z`;
};
const HEAD = {
	solid: oval(11, 8, -20),
	half: oval(11, 8, -20) + oval(7.4, 3.3, -32),
	whole: "M-13 0a13 9 0 1 0 26 0a13 9 0 1 0-26 0ZM-3.73-5.32a6.5 4.1 55 1 0 7.46 10.64a6.5 4.1 55 1 0-7.46-10.64Z",
};
const STEM_X = 10.3;
const REST = { 1: "𝄽", 0.5: "𝄾", 0.25: "𝄿" };

/** A flag on a stem whose tip is at (x, y), curling away from it. */
function flagPath(x, y, k, up) {
	const v = up ? 1 : -1;
	const y0 = y + v * k * 13;
	const Y = (d) => (y0 + v * d).toFixed(2);
	return `M${x} ${Y(0)}C${x + 1} ${Y(14)} ${x + 20} ${Y(18)} ${x + 16} ${Y(44)}C${x + 19} ${Y(26)} ${x + 6} ${Y(22)} ${x} ${Y(20)}Z`;
}

/** A slanted beam from (x1, y1) to (x2, y2), `t` thick toward the notes. */
function beamPath(x1, y1, x2, y2, t) {
	return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}L${x2.toFixed(2)} ${(y2 + t).toFixed(2)}L${x1.toFixed(2)} ${(y1 + t).toFixed(2)}Z`;
}

/** Parameters for row `r`, with a story's overrides. */
export function rowDefaults(r, over = {}) {
	const p = `st${r}.`;
	return {
		[`${p}o`]: 0,
		[`${p}x`]: 100,
		[`${p}y`]: 300,
		[`${p}s`]: 1,
		[`${p}draw`]: 1,
	[`${p}w`]: 0,
		[`${p}m`]: "",
		[`${p}clef`]: "treble",
		[`${p}co`]: 1,
		[`${p}time`]: "",
		[`${p}to`]: 0,
		[`${p}tsTop`]: C.white,
		[`${p}tsBot`]: C.white,
		[`${p}left`]: 96,
		[`${p}u`]: 60,
		[`${p}even`]: 0,
		[`${p}rev`]: 99,
		[`${p}bars`]: 1,
		[`${p}beam`]: 1,
		[`${p}names`]: 0,
		[`${p}box`]: 0,
		[`${p}count`]: 0,
		[`${p}pulse`]: 0,
		[`${p}cg`]: 0,
		[`${p}grp`]: 0,
		[`${p}hl`]: 32,
		[`${p}hlo`]: 0,
		...over,
	};
}

export const grandDefaults = { "gs.o": 0, "gs.mid": 0 };

function createRow(root, r) {
	const p = `st${r}.`;
	const g = s("g", { class: "row" });
	const lines = [0, 1, 2, 3, 4].map((k) =>
		s("line", { x1: 0, y1: k * 20, y2: k * 20, stroke: C.grayB, "stroke-width": 2, pathLength: 1, "stroke-dasharray": "1 1" }),
	);
	const hl = s("line", { stroke: C.tonic, "stroke-width": 5, "stroke-linecap": "round" });
	const clef = s("text", { class: "clef clef--score", fill: C.white });
	const tsTop = s("text", { class: "ts", "text-anchor": "middle" });
	const tsBot = s("text", { class: "ts", "text-anchor": "middle" });
	const content = s("g");
	const hit = s("rect", { class: "row-hit", fill: "transparent", "data-row": r });
	g.append(...lines, hl, clef, tsTop, tsBot, content, hit);
	root.append(g);

	let built = null;

	/* Everything that depends on the music string and the meter is made
	   once per change; every frame only moves and fades it. */
	function build(key, P) {
		const music = parse(P[`${p}m`]);
		const m = meter(P[`${p}time`]);
		const pulse = Number(P[`${p}pulse`]) || 0;
		content.replaceChildren();
		const add = (el) => (content.append(el), el);

		const groups = beams(music, m);
		const inBeam = new Map();
		groups.forEach((grp, gi) => grp.forEach((i) => inBeam.set(i, gi)));

		const boxes = s("g");
		const under = s("g");
		content.append(boxes, under);

		const items = music.items.map((it, i) => {
			const el = { it, i, beam: inBeam.get(i) ?? -1 };
			if (it.kind === "note") {
				el.ledgers = [0, 1, 2, 3].map(() => add(s("line", { stroke: C.grayB, "stroke-width": 2.2 })));
				el.ring = add(s("circle", { fill: "none", stroke: C.white, "stroke-width": 2 }));
				el.head = add(s("path", { d: it.base >= 4 ? HEAD.whole : it.base >= 2 ? HEAD.half : HEAD.solid, "fill-rule": "evenodd" }));
				if (it.base < 4) el.stem = add(s("line", { stroke: C.white, "stroke-width": 2.6 }));
				el.flags = Array.from({ length: it.flags }, () => add(s("path", { fill: C.white })));
				if (it.dot) el.dot = add(s("circle", { r: 3.6, fill: C.white }));
				if (it.acc !== 0 || it.natural) el.acc = add(s("text", { class: "accidental accidental--score", "text-anchor": "middle", fill: C.white, text: it.natural ? "♮" : accidental(it.acc) }));
				if (it.tie) el.tie = add(s("path", { fill: C.white }));
			} else if (it.kind === "rest") {
				if (it.base >= 2) el.rest = add(s("rect", { width: 26, height: 10, fill: C.white }));
				else el.rest = add(s("text", { class: "rest", "text-anchor": "middle", fill: C.white, text: REST[it.base] ?? "𝄿" }));
				if (it.dot) el.dot = add(s("circle", { r: 3.6, fill: C.white }));
			}
			if (it.kind !== "space") {
				el.box = boxes.appendChild(s("rect", { height: 12, rx: 6, fill: "none", "stroke-width": 2 }));
				if (it.kind === "note") {
					el.fill = boxes.appendChild(s("rect", { height: 12, rx: 6 }));
					if (it.dot) el.split = boxes.appendChild(s("line", { stroke: C.bg, "stroke-width": 2.5 }));
				} else {
					attrs(el.box, { "stroke-dasharray": "5 5" });
				}
			}
			if (it.kind === "note" || it.label) el.name = under.appendChild(s("text", { class: it.label ? "item-label" : "note-name", "text-anchor": "middle" }));
			return el;
		});

		const beamEls = groups.map((grp) => ({
			grp,
			main: add(s("path", { fill: C.white })),
			extra: grp.slice(0, -1).map(() => add(s("path", { fill: C.white }))),
			stub: add(s("path", { fill: C.white })),
		}));

		const starts = measures(music, m);
		const barTimes = music.bars.filter((b) => b > 1e-6);
		const barEls = barTimes.map((b) => ({
			t: b,
			n: music.items.filter((it) => it.t < b - 1e-6).length,
			line: add(s("line", { stroke: C.grayB, "stroke-width": 2 })),
			thick: music.final && b >= music.total - 1e-6 ? add(s("rect", { width: 7, height: 80, y: 0, fill: C.grayB })) : null,
		}));

		const counts = pulses(music, m, pulse).map((q) => ({ ...q, text: under.appendChild(s("text", { class: "count", "text-anchor": "middle", text: "" })) }));

		const brackets = [];
		starts.forEach((b, k) => {
			const end = starts[k + 1] ?? music.total;
			let t = b;
			for (const len of m.groups) {
				if (t >= end - 1e-6) break;
				brackets.push({
					t,
					len,
					path: add(s("path", { fill: "none", stroke: C.grayB, "stroke-width": 2.5, "stroke-linejoin": "round" })),
					label: add(s("text", { class: "grp-label", "text-anchor": "middle", fill: C.grayB, text: String(Math.round(len / m.sub)) })),
				});
				t += len;
			}
		});

		built = { key, music, m, items, beamEls, barEls, counts, brackets };
	}

	function render(P, live, now, naming) {
		if (!show(g, P[`${p}o`])) return false;
		attrs(g, { transform: `translate(${P[`${p}x`]} ${P[`${p}y`]}) scale(${P[`${p}s`]})` });

		const key = `${P[`${p}m`]}|${P[`${p}time`]}|${P[`${p}pulse`]}`;
		if (built?.key !== key) build(key, P);
		const { music, m, items, beamEls, barEls, counts, brackets } = built;

		const clefName = P[`${p}clef`];
		const bottom = clefName === "bass" ? 18 : 30;
		const middle = bottom + 4;
		const yOf = (step) => 80 - (step - bottom) * 10;

		const L = P[`${p}left`];
		const u = P[`${p}u`];
		const ev = clamp01(P[`${p}even`]);
		const n = items.length;
		/* Where time t falls: by the clock, or by item count, or between. */
		const idx = (t) => {
			for (let k = 0; k < n; k++) {
				const it = items[k].it;
				if (t < it.t + it.d - 1e-9) return k + Math.max(0, (t - it.t) / it.d);
			}
			return n;
		};
		const X = (t) => L + (1 - ev) * t * u + (ev > 0 ? ev * idx(t) * u : 0);
		const pad = (1 - ev) * PAD + ev * (u / 2);
		const width = P[`${p}w`] || X(music.total) + (music.final ? 14 : 18);

		const draw = P[`${p}draw`];
		lines.forEach((line, k) => {
			const d = clamp01(draw * 1.3 - k * 0.075);
			if (show(line, d > 0.001 ? 1 : 0)) attrs(line, { x2: width, "stroke-dashoffset": 1 - d });
		});
		if (show(hl, P[`${p}hlo`])) {
			const y = yOf(Number(P[`${p}hl`]));
			attrs(hl, { x1: 0, x2: width, y1: y, y2: y });
		}

		const co = P[`${p}co`] * clamp01((draw - 0.45) / 0.55);
		if (show(clef, clefName ? co : 0)) {
			attrs(clef, { x: 12, y: clefName === "bass" ? 72 : 60 });
			setText(clef, clefName === "bass" ? "𝄢" : "𝄞");
		}
		const to = P[`${p}time`] ? P[`${p}to`] : 0;
		if (show(tsTop, to)) {
			attrs(tsTop, { x: 108, y: 39, fill: P[`${p}tsTop`] });
			setText(tsTop, String(m.top));
		}
		if (show(tsBot, to)) {
			attrs(tsBot, { x: 108, y: 79, fill: P[`${p}tsBot`] });
			setText(tsBot, String(m.bottom));
		}

		const rev = P[`${p}rev`];
		const ops = items.map((_, i) => clamp01((rev - i) * 2.5));
		const pos = live.pos(`st${r}`, now);
		const tr = live.transport(`st${r}`);

		/* Heads, and the direction each stem goes: alone, by where the note
		   sits; in a beam, by where the whole group sits. */
		const geo = items.map((el) => {
			const { it } = el;
			const x = X(it.t) + pad;
			if (it.kind !== "note") return { x, y: 40 };
			return { x, y: yOf(it.step), up: it.step < middle };
		});
		for (const b of beamEls) {
			const lean = b.grp.reduce((sum, i) => sum + items[i].it.step - middle, 0);
			for (const i of b.grp) geo[i].up = lean < 0;
		}
		const tipOf = (i) => {
			const { y, up } = geo[i];
			return up ? Math.min(y - STEM, 40) : Math.max(y + STEM, 40);
		};

		/* Beams: through the first and last stems, gently sloped, then moved
		   off the notes until every stem is long enough. */
		const beamAt = new Map();
		const beamOp = clamp01(P[`${p}beam`]);
		for (const b of beamEls) {
			const first = b.grp[0];
			const last = b.grp.at(-1);
			const up = geo[first].up;
			const sx = (i) => geo[i].x + (up ? STEM_X : -STEM_X);
			const x1 = sx(first);
			const x2 = sx(last);
			let slope = (tipOf(last) - tipOf(first)) / Math.max(1, x2 - x1);
			slope = Math.max(-0.14, Math.min(0.14, slope * 0.5));
			let y1 = tipOf(first);
			for (const i of b.grp) {
				const at = y1 + slope * (sx(i) - x1);
				const need = up ? geo[i].y - 60 : geo[i].y + 60;
				if (up && at > need) y1 -= at - need;
				if (!up && at < need) y1 += need - at;
			}
			const yAt = (x) => y1 + slope * (x - x1);
			for (const i of b.grp) beamAt.set(i, yAt(sx(i)));
			const op = Math.min(...b.grp.map((i) => ops[i])) * beamOp;
			const t = up ? 9 : -9;
			if (show(b.main, op)) attrs(b.main, { d: beamPath(x1, yAt(x1), x2, yAt(x2), t) });
			/* A second beam joins neighbouring sixteenths; a lone one gets
			   a short stub toward its neighbour. */
			const off = up ? 14 : -14;
			b.extra.forEach((el, k) => {
				const a = b.grp[k];
				const c = b.grp[k + 1];
				const both = items[a].it.flags >= 2 && items[c].it.flags >= 2;
				if (show(el, both ? op : 0)) {
					attrs(el, { d: beamPath(sx(a), yAt(sx(a)) + off, sx(c), yAt(sx(c)) + off, t) });
				}
			});
			const short = (k) => k >= 0 && k < b.grp.length && items[b.grp[k]].it.flags >= 2;
			const lone = b.grp.findIndex((_, k) => short(k) && !short(k - 1) && !short(k + 1));
			if (show(b.stub, lone >= 0 ? op : 0)) {
				const i = b.grp[lone];
				const dir = lone === 0 ? 1 : -1;
				const xa = sx(i);
				const xb = xa + dir * 16;
				attrs(b.stub, { d: beamPath(Math.min(xa, xb), yAt(Math.min(xa, xb)) + off, Math.max(xa, xb), yAt(Math.max(xa, xb)) + off, t) });
			}
		}

		const nameAlpha = P[`${p}names`];
		const boxAlpha = P[`${p}box`];

		items.forEach((el, i) => {
			const { it } = el;
			const op = ops[i];
			const { x, y, up } = geo[i];
			const start = X(it.t);
			const end = X(it.t + it.d);

			let glow = 0;
			if (tr && it.kind === "note" && !it.held) {
				const since = live.since(`st${r}`, it.t, now);
				if (since != null && since >= 0 && since < FADE) glow = 1 - since / FADE;
			}

			if (it.kind === "note") {
				const base = it.gold ? C.tonic : C.white;
				const ink = mix(base, C.blueB, glow);
				if (show(el.head, op)) attrs(el.head, { transform: `translate(${x} ${y})`, fill: ink });
				if (show(el.ring, op * glow * glow)) attrs(el.ring, { cx: x, cy: y, r: 16 + 26 * (1 - glow) });

				const need = [];
				for (let l = bottom - 2; l >= it.step; l -= 2) need.push(yOf(l));
				for (let l = bottom + 10; l <= it.step; l += 2) need.push(yOf(l));
				const lop = clamp01((rev - i + 0.6) * 2.5);
				const half = it.base >= 4 ? 22 : 19;
				el.ledgers.forEach((line, k) => {
					if (show(line, k < need.length ? lop : 0)) attrs(line, { x1: x - half, x2: x + half, y1: need[k], y2: need[k] });
				});

				if (el.stem) {
					const sx = x + (up ? STEM_X : -STEM_X);
					const own = tipOf(i);
					const tip = beamAt.has(i) ? own + (beamAt.get(i) - own) * beamOp : own;
					if (show(el.stem, op)) attrs(el.stem, { x1: sx, x2: sx, y1: y + (up ? -3.7 : 3.7), y2: tip, stroke: ink });
					const flagOp = el.beam >= 0 ? op * (1 - beamOp) : op;
					el.flags.forEach((f, k) => {
						if (show(f, flagOp)) attrs(f, { d: flagPath(sx, own, k, up), fill: ink });
					});
				}
				if (el.dot && show(el.dot, op)) {
					const onLine = (it.step - bottom) % 2 === 0;
					attrs(el.dot, { cx: x + (it.base >= 4 ? 24 : 20), cy: onLine ? y - 10 : y, fill: ink });
				}
				if (el.acc && show(el.acc, op)) attrs(el.acc, { x: x - (it.acc === -2 ? 42 : 32), y: y + 10 });
				if (el.tie) {
					const nx = items[i + 1];
					const tieOp = nx ? Math.min(op, ops[i + 1]) : 0;
					if (show(el.tie, tieOp)) {
						const x2 = geo[i + 1].x - 10;
						const x1 = x + 10;
						const below = it.base >= 4 ? it.step < middle : up;
						const yy = y + (below ? 13 : -13);
						const d = below ? 14 : -14;
						const mx = (x1 + x2) / 2;
						attrs(el.tie, { d: `M${x1} ${yy}Q${mx} ${yy + d} ${x2} ${yy}Q${mx} ${yy + d * 0.62} ${x1} ${yy}Z` });
					}
				}
			} else if (it.kind === "rest") {
				if (show(el.rest, op)) {
					if (it.base >= 2) attrs(el.rest, { x: x - 13, y: it.base >= 4 ? 20 : 30 });
					else attrs(el.rest, { x, y: it.base === 1 ? 80 : it.base === 0.5 ? 75 : 84 });
				}
				if (el.dot && show(el.dot, op)) attrs(el.dot, { cx: x + 20, cy: 30 });
			}

			if (el.box) {
				const a = op * boxAlpha;
				const x1 = start + 3 - (it.held ? 6 : 0);
				const w = Math.max(4, end - start - 6 + (it.held ? 6 : 0));
				if (show(el.box, a)) attrs(el.box, { x: x1, y: BOX_Y, width: w, stroke: it.kind === "note" ? C.gray : C.grayD });
				if (el.fill) {
					let f = 1;
					if (pos != null) f = clamp01((pos - it.t) / it.d);
					if (show(el.fill, a * (f > 0.001 ? 1 : 0))) {
						attrs(el.fill, { x: x1, y: BOX_Y, width: Math.max(0.1, w * f), fill: mix(it.gold ? C.tonic : C.grayA, C.blueB, glow) });
					}
					if (el.split && show(el.split, a)) {
						const xs = X(it.t + it.base);
						attrs(el.split, { x1: xs, x2: xs, y1: BOX_Y - 1, y2: BOX_Y + 13 });
					}
				}
			}

			if (el.name) {
				if (show(el.name, op * nameAlpha)) {
					attrs(el.name, { x, y: NAME_Y, fill: it.gold ? C.tonic : C.grayB });
					setText(el.name, it.label || nameOf(it, naming));
				}
			}
		});

		const barsOp = P[`${p}bars`];
		for (const b of barEls) {
			const op = clamp01((rev - b.n + 1) * 2.5) * barsOp;
			const x = X(b.t) + (b.thick ? -2 : 0);
			if (show(b.line, op)) attrs(b.line, { x1: b.thick ? x - 9 : x, x2: b.thick ? x - 9 : x, y1: 0, y2: 80 });
			if (b.thick && show(b.thick, op)) attrs(b.thick, { x: x - 3 });
		}

		/* Counts: under each beat, its number in the measure; the first one
		   gold, the downbeat. Each lights as its click sounds. */
		const countOp = P[`${p}count`] * (1 - ev);
		const cg = P[`${p}cg`] > 0.5;
		const cy = BOX_Y + 46 + nameAlpha * 34;
		for (const c of counts) {
			if (!show(c.text, countOp)) continue;
			let gl = 0;
			if (tr) {
				const since = live.since(`st${r}`, c.t, now);
				if (since != null && since >= 0 && since < FADE) gl = 1 - since / FADE;
			}
			const label = cg ? c.g : c.n;
			const base = label === 1 ? C.tonic : C.gray;
			attrs(c.text, { x: X(c.t) + pad, y: cy, fill: mix(base, C.white, gl), "font-size": 26 + 8 * gl });
			setText(c.text, String(label));
		}

		const grpOp = P[`${p}grp`] * (1 - ev);
		for (const b of brackets) {
			if (!show(b.path, grpOp)) {
				show(b.label, 0);
				continue;
			}
			const x1 = X(b.t) + 6;
			const x2 = X(b.t + b.len) - 6;
			attrs(b.path, { d: `M${x1} ${GRP_Y + 9}V${GRP_Y}H${x2}V${GRP_Y + 9}` });
			show(b.label, grpOp);
			attrs(b.label, { x: (x1 + x2) / 2, y: GRP_Y - 10 });
		}

		attrs(hit, { x: -10, y: -70, width: width + 20, height: 260, "pointer-events": P.interactive > 0.5 ? "all" : "none" });
		lastWidth = width;
		return false;
	}

	let lastWidth = 0;
	return { render, width: () => lastWidth };
}

/** `rows` staff rows, and the grand staff's brace and middle line. */
export function create(root, { rows = 1 } = {}) {
	const g = s("g", { class: "score" });
	root.append(g);
	const brace = s("path", { fill: "none", stroke: C.white, "stroke-width": 4, "stroke-linecap": "round" });
	const spine = s("line", { stroke: C.grayB, "stroke-width": 2 });
	const mid = s("line", { stroke: C.grayB, "stroke-width": 2, pathLength: 1, "stroke-dasharray": "1 1" });
	g.append(brace, spine, mid);
	const list = Array.from({ length: rows }, (_, r) => createRow(g, r));

	return {
		render(P, live, now) {
			let busy = false;
			for (const row of list) busy = row.render(P, live, now, P.naming) || busy;

			const gso = P["gs.o"] ?? 0;
			const gsm = P["gs.mid"] ?? 0;
			if (rows > 1 && (gso > 0.001 || gsm > 0.001)) {
				const s0 = P["st0.s"];
				const s1 = P["st1.s"];
				const x = P["st0.x"];
				const top = P["st0.y"];
				const bot = P["st1.y"] + 80 * s1;
				const midY = (top + 80 * s0 + P["st1.y"]) / 2;
				if (show(spine, gso)) attrs(spine, { x1: x, x2: x, y1: top, y2: bot });
				if (show(brace, gso)) {
					const bx = x - 16 * s0;
					const m = (top + bot) / 2;
					const h = bot - top;
					attrs(brace, {
						d: `M${bx} ${top}C${bx - 14} ${top + h * 0.06} ${bx - 2} ${m - h * 0.16} ${bx - 14} ${m}C${bx - 2} ${m + h * 0.16} ${bx - 14} ${bot - h * 0.06} ${bx} ${bot}`,
					});
				}
				if (show(mid, gsm > 0.001 ? 1 : 0)) {
					attrs(mid, { x1: x, x2: x + list[0].width() * s0, y1: midY, y2: midY, "stroke-width": 2 * s0, "stroke-dashoffset": 1 - clamp01(gsm) });
				}
			} else {
				show(brace, 0);
				show(spine, 0);
				show(mid, 0);
			}
			return busy;
		},
	};
}
