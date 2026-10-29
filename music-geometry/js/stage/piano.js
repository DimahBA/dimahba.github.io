/* The piano — two octaves, C4 to B5, so a major scale can start on any of
   the twelve keys, black or white, and still fit.

   A rail runs just above the keys, and every note of the scale is a bead on
   it, over the centre of its key. Between beads, each step is marked the
   way the staff marks it: a whole step as a blue arch above, a half step as
   a yellow V below, and the row of W's and H's over them spells the recipe.
   The two keys of each half step are tinted yellow, so the half steps can
   be found on the keyboard itself, not only above it.

   The scale is a rigid pattern at s = rot + (0 2 4 5 7 9 11 12), where s is
   semitones above C4. Starting somewhere else only changes `rot`; every
   bead, step and tint follows from it.

   With `dimOut`, keys outside the scale go grey, so what remains lit is
   exactly the set of keys the scale needs. In the last beat the keys are
   buttons (their `data-s` is read by main.js). */

import { s, attrs, show, setText } from "../lib/dom.js";
import { C, stepColor, mix } from "../palette.js";
import { mod, isBlack, majorScale, namesInKey, nameOf, MAJOR, MAJOR_STEPS } from "../theory.js";
import { clamp01 } from "../engine/ease.js";

const KW = 64;
const KH = 250;
const BW = 38;
const BH = 155;
const RAIL = -34;
const KEYS = 24;
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

/** A key's centre in piano units, for any integer s (octaves repeat). */
function keyCenter(sv) {
	const pc = mod(sv, 12);
	const octave = Math.floor(sv / 12) * 7 * KW;
	const w = WHITE_PCS.indexOf(pc);
	return octave + (w >= 0 ? w * KW + KW / 2 : WHITE_PCS.indexOf(pc + 1) * KW);
}

const pt = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;

export function create(root) {
	const g = s("g", { class: "piano" });

	const keys = Array.from({ length: KEYS }, (_, sv) => {
		const black = isBlack(sv);
		return {
			sv,
			black,
			rect: s("rect", { class: "key", rx: black ? 4 : 6, "data-s": sv }),
			name: s("text", { class: black ? "key-name key-name--black" : "key-name", "text-anchor": "middle" }),
		};
	});

	const steps = MAJOR_STEPS.map((size) => ({
		size,
		path:
			size === 1
				? s("polyline", { fill: "none", stroke: C.half, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" })
				: s("path", { fill: "none", stroke: C.whole, "stroke-width": 4, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }),
		label: s("text", { class: "step-label", "text-anchor": "middle", fill: stepColor(size), text: size === 1 ? "H" : "W" }),
	}));

	const beads = MAJOR.map((_, j) => ({
		pulse: s("circle", { fill: "none", stroke: C.white, "stroke-width": 2 }),
		dot: s("circle", { r: 14, "stroke-width": 3 }),
		num: s("text", { class: "bead-num", "text-anchor": "middle", "dominant-baseline": "central", text: j === 7 ? "1" : String(j + 1) }),
	}));

	/* The demonstration's tempting mistake: from Mi, the next white key is
	   only a half step away. */
	const wrong = {
		path: s("polyline", { fill: "none", stroke: C.breaks, "stroke-width": 3, "stroke-dasharray": "6 5", "stroke-linejoin": "round" }),
		label: s("text", { class: "anno anno--small", "text-anchor": "middle", fill: C.breaks }),
	};

	g.append(
		...keys.filter((k) => !k.black).flatMap((k) => [k.rect, k.name]),
		...keys.filter((k) => k.black).flatMap((k) => [k.rect, k.name]),
		wrong.path,
		wrong.label,
		...steps.flatMap((st) => [st.path, st.label]),
		...beads.flatMap((b) => [b.pulse, b.dot, b.num]),
	);
	root.append(g);

	function render(P, live, now) {
		const o = P["piano.o"];
		if (!show(g, o)) return false;

		const px = P["piano.x"];
		const py = P["piano.y"];
		const ps = P["piano.s"];
		const X = (sv) => px + ps * keyCenter(sv);
		const railY = py + ps * RAIL;
		const labelY = railY - ps * (0.3 * KW + 14) - 22;

		const rot = Math.round(P["pat.rot"]);
		const tonic = mod(rot, 12);
		const S = MAJOR.map((off) => rot + off);
		const inScale = new Set(S);
		const halfKeys = new Set();
		MAJOR_STEPS.forEach((size, j) => {
			if (size === 1) halfKeys.add(S[j]).add(S[j + 1]);
		});
		const names = namesInKey(tonic);
		const spelled = new Map(majorScale(tonic).map((n) => [n.midi - 60, n]));

		const dimOut = P.dimOut;
		const tint = P.halfTint * P["pat.o"];
		const interactive = P.interactive > 0.5;

		for (const k of keys) {
			const vis = k.sv <= 12 ? 1 : P["piano.ext"];
			if (!show(k.rect, vis)) {
				show(k.name, 0);
				continue;
			}
			const lit = inScale.has(k.sv) && P["pat.o"] > 0.5;
			let fill = k.black
				? lit
					? mix(C.grayE, C.grayD, dimOut)
					: C.grayE
				: lit
					? mix(C.grayA, C.white, dimOut)
					: mix(C.grayA, C.gray, dimOut);
			if (halfKeys.has(k.sv)) fill = mix(fill, C.half, (k.black ? 0.65 : 0.45) * tint);
			fill = mix(fill, C.blueB, live.glow(60 + k.sv, now));

			const w = k.black ? BW : KW - 3;
			attrs(k.rect, {
				x: X(k.sv) - (ps * w) / 2,
				y: py,
				width: ps * w,
				height: ps * (k.black ? BH : KH),
				fill,
				stroke: k.black ? (lit ? mix(C.grayD, C.white, dimOut) : C.grayD) : C.bg,
				"stroke-width": 2,
				"pointer-events": interactive ? "all" : "none",
			});

			/* Names: every white key in the first beats; once only the scale
			   is lit, just the keys it needs — black keys included. */
			const nameAlpha = lit ? 1 : k.black ? 0 : 1 - dimOut * 0.75;
			if (show(k.name, vis * P["names.o"] * nameAlpha)) {
				const n = spelled.get(k.sv) ?? names[mod(k.sv)];
				attrs(k.name, {
					x: X(k.sv),
					y: py + ps * (k.black ? BH - 16 : KH - 22),
					fill: k.black ? C.white : lit && mod(k.sv) === tonic ? C.tonicInk : C.grayE,
				});
				setText(k.name, nameOf(n, P.naming));
			}
		}

		const at = S.map((sv) => [X(sv), railY]);
		const pOn = P["pat.o"];

		steps.forEach((st, j) => {
			const d = P[`step${j}.d`];
			const [a, b] = [at[j], at[j + 1]];
			const mid = (a[0] + b[0]) / 2;
			if (show(st.path, d > 0.001 ? pOn : 0)) {
				if (st.size === 1) {
					attrs(st.path, { points: `${pt(a)} ${pt([mid, railY + ps * 46])} ${pt(b)}`, "stroke-dashoffset": 1 - d });
				} else {
					const h = ps * (0.3 * (b[0] - a[0]) / ps + 14);
					attrs(st.path, { d: `M${pt(a)}Q${pt([mid, railY - 2 * h])} ${pt(b)}`, "stroke-dashoffset": 1 - d });
				}
			}
			if (show(st.label, pOn * P["steps.l"] * clamp01((d - 0.5) * 2))) attrs(st.label, { x: mid, y: labelY });
		});

		if (show(wrong.path, P["wrong.o"] * pOn)) {
			const a = at[5];
			const b = [X(S[5] + 1), railY];
			attrs(wrong.path, { points: `${pt(a)} ${pt([(a[0] + b[0]) / 2, railY + ps * 46])} ${pt(b)}` });
			show(wrong.label, P["wrong.o"] * pOn);
			attrs(wrong.label, { x: b[0] + ps * 10, y: py + ps * (KH + 34) });
			setText(wrong.label, `${nameOf(names[mod(S[5] + 1)], P.naming)} would be only a half step`);
		} else {
			show(wrong.label, 0);
		}

		beads.forEach((b, j) => {
			const alpha = P[`bead${j}.o`] * pOn;
			if (!show(b.dot, alpha)) {
				show(b.num, 0);
				show(b.pulse, 0);
				return;
			}
			const [x, y] = at[j];
			const gl = live.glow(60 + S[j], now);
			const color = j === 0 || j === 7 ? C.tonic : C.white;
			attrs(b.dot, { cx: x, cy: y, fill: mix(C.bg, color, gl), stroke: color });
			if (show(b.num, alpha * P["deg.o"])) attrs(b.num, { x, y: y + 1, fill: mix(color, C.bg, gl) });
			if (show(b.pulse, alpha * gl * gl)) attrs(b.pulse, { cx: x, cy: y, r: 14 + 26 * (1 - gl) });
		});

		return false;
	}

	return { render };
}
