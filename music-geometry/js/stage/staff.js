/* The staff — the scale as written music.

   A treble staff with eight whole notes, the way a scale appears in any
   theory book, measured the way those books measure it: an arch over each
   whole step, a V under each half step, and a row of W's and H's above
   that spells the recipe in step with the piano's.

   The staff shows the major scale of `staff.tonic`. When the key changes,
   each note glides to its new line or space (a spring, so it works whether
   the key was changed by the story or by a click) and its sharp or flat
   fades in beside it. With `staff.accHi` the accidentals turn green: the
   notes the new key had to change.

   In the last beat each note is a button: clicking one plays it (main.js
   reads `data-midi`).

   Local units: line spacing 20, the top line at y = 0, the staff 990
   wide. The group is placed by staff.x / staff.y / staff.s. */

import { s, attrs, show, setText } from "../lib/dom.js";
import { C, stepColor, mix } from "../palette.js";
import { majorScale, nameOf, accidental, MAJOR_STEPS } from "../theory.js";
import { clamp01 } from "../engine/ease.js";

const yOf = (step) => 80 - (step - 30) * 10;
const X = (i) => 170 + i * 110;
const WIDTH = 990;
const NAME_Y = 172;
const LABEL_Y = -64;

/* A whole note: an ellipse with a tilted elliptical hole (even-odd fill). */
const HEAD =
	"M-13 0a13 9 0 1 0 26 0a13 9 0 1 0-26 0Z" +
	"M-3.73-5.32a6.5 4.1 55 1 0 7.46 10.64a6.5 4.1 55 1 0-7.46-10.64Z";

/* Stroke-drawing, Manim's Create: with pathLength 1 and a dash of 1, the
   offset runs from 1 (nothing drawn) to 0 (all of it). */
function drawn(el, progress, opacity = 1) {
	const on = show(el, progress > 0.001 ? opacity : 0);
	if (on) attrs(el, { "stroke-dashoffset": 1 - clamp01(progress) });
	return on;
}

export function create(root) {
	const g = s("g", { class: "staff" });

	const lines = [0, 1, 2, 3, 4].map((k) =>
		s("line", {
			x1: 0,
			x2: WIDTH,
			y1: k * 20,
			y2: k * 20,
			stroke: C.grayB,
			"stroke-width": 2,
			pathLength: 1,
			"stroke-dasharray": "1 1",
		}),
	);
	const clef = s("text", { class: "clef", x: 14, y: 86, fill: C.white, text: "𝄞" });

	const steps = MAJOR_STEPS.map((size) => ({
		size,
		mark:
			size === 1
				? s("polyline", { fill: "none", stroke: C.half, "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" })
				: s("path", { fill: "none", stroke: C.whole, "stroke-width": 3.5, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }),
		label: s("text", { class: "step-label", "text-anchor": "middle", fill: stepColor(size), text: size === 1 ? "H" : "W" }),
	}));

	const notes = Array.from({ length: 8 }, () => {
		const ledgers = [0, 1].map(() => s("line", { stroke: C.grayB, "stroke-width": 2 }));
		const head = s("path", { d: HEAD, "fill-rule": "evenodd" });
		const ring = s("circle", { fill: "none", stroke: C.white, "stroke-width": 2 });
		const hit = s("ellipse", { class: "note-hit", rx: 30, ry: 24, fill: "transparent" });
		const acc = s("text", { class: "accidental", "text-anchor": "middle" });
		const name = s("text", { class: "note-name", "text-anchor": "middle" });
		return { ledgers, head, ring, hit, acc, name, group: s("g", {}, ...ledgers, ring, head, hit) };
	});

	g.append(
		...lines,
		clef,
		...steps.flatMap((st) => [st.mark, st.label]),
		...notes.flatMap((n) => [n.group, n.acc, n.name]),
	);
	root.append(g);

	/* Springs: displayed staff steps and accidental opacities. */
	const shownStep = new Array(8).fill(null);
	const shownAcc = new Array(8).fill(0);
	const glyph = new Array(8).fill("");

	function render(P, live, now, dt) {
		const o = P["staff.o"];
		if (!show(g, o)) {
			shownStep.fill(null);
			return false;
		}
		attrs(g, { transform: `translate(${P["staff.x"]} ${P["staff.y"]}) scale(${P["staff.s"]})` });

		const scale = majorScale(P["staff.tonic"]);
		const k = 1 - Math.exp(-dt / 0.13);
		let busy = false;

		const draw = P["staff.draw"];
		lines.forEach((line, i) => drawn(line, draw * 1.3 - i * 0.075));
		show(clef, clamp01((draw - 0.45) / 0.55));

		/* Where each note sits: a spring toward its line or space, except
		   while it is hidden, when it simply goes there. */
		const ys = scale.map((n, i) => {
			const hidden = P[`note${i}.o`] < 0.02;
			if (hidden || shownStep[i] == null) shownStep[i] = n.step;
			else {
				shownStep[i] += (n.step - shownStep[i]) * k;
				if (Math.abs(n.step - shownStep[i]) > 0.002) busy = true;
				else shownStep[i] = n.step;
			}
			return yOf(shownStep[i]);
		});

		const interactive = P.interactive > 0.5;

		scale.forEach((n, i) => {
			const el = notes[i];
			const vis = P[`note${i}.o`];
			if (!show(el.group, vis)) {
				show(el.name, 0);
				show(el.acc, 0);
				return;
			}
			const x = X(i);
			const y = ys[i];
			const tonic = n.degree === 1;
			attrs(el.group, { transform: `translate(${x} ${y})` });
			attrs(el.head, { fill: tonic ? C.tonic : C.white });
			attrs(el.hit, { "data-midi": n.midi, "pointer-events": interactive ? "all" : "none" });

			const step = Math.round(shownStep[i]);
			const needed = [];
			for (let l = 28; l >= step; l -= 2) needed.push(yOf(l) - y);
			for (let l = 40; l <= step; l += 2) needed.push(yOf(l) - y);
			el.ledgers.forEach((line, j) => {
				if (show(line, j < needed.length ? 1 : 0)) {
					attrs(line, { x1: -21, x2: 21, y1: needed[j], y2: needed[j] });
				}
			});

			const gl = live.glow(n.midi, now);
			if (show(el.ring, gl * gl)) attrs(el.ring, { r: 16 + 26 * (1 - gl) });

			if (n.acc !== 0) glyph[i] = accidental(n.acc);
			const want = n.acc !== 0 ? 1 : 0;
			shownAcc[i] += (want - shownAcc[i]) * (vis < 0.05 ? 1 : k);
			if (Math.abs(want - shownAcc[i]) > 0.01) busy = true;
			if (show(el.acc, shownAcc[i] * vis)) {
				attrs(el.acc, { x: x - 34, y: y + 11, fill: mix(C.white, C.fits, P["staff.accHi"]) });
				setText(el.acc, glyph[i]);
			}

			if (show(el.name, vis)) {
				attrs(el.name, { x, y: NAME_Y, fill: tonic ? C.tonic : C.grayB });
				setText(el.name, nameOf(n, P.naming));
			}
		});

		/* The steps: an arch over a whole step, a V under a half step. The
		   labels share one row, clear of the highest arch, so they read
		   left to right as the recipe. */
		const labelRow = Math.min(LABEL_Y, Math.min(...ys) - 62);
		steps.forEach((st, i) => {
			const d = P[`step${i}.d`];
			const alpha = Math.min(P[`note${i}.o`], P[`note${i + 1}.o`]);
			const x1 = X(i) + 8;
			const x2 = X(i + 1) - 8;
			const [y1, y2] = [ys[i], ys[i + 1]];
			if (st.size === 1) {
				if (drawn(st.mark, d, alpha)) {
					const low = Math.max(y1, y2) + 46;
					attrs(st.mark, { points: `${x1},${y1 + 16} ${(x1 + x2) / 2},${low} ${x2},${y2 + 16}` });
				}
			} else if (drawn(st.mark, d, alpha)) {
				const a = y1 - 18;
				const b = y2 - 18;
				const top = Math.min(a, b) - 26;
				attrs(st.mark, { d: `M${x1} ${a}C${x1 + 16} ${top} ${x2 - 16} ${top} ${x2} ${b}` });
			}
			if (show(st.label, alpha * P["steps.l"] * clamp01((d - 0.5) * 2))) {
				attrs(st.label, { x: (x1 + x2) / 2, y: labelRow });
			}
		});

		return busy;
	}

	return { render };
}
