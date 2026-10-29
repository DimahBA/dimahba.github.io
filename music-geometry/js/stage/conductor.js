/* The conductor's hand — the shape a beat pattern draws in the air.

   Every pattern follows one rule: the downbeat (beat 1) falls straight
   down, and the upbeat (the last beat) rises back to the top, ready for the
   next measure. Between them each beat is an ictus: the hand drops into it
   and bounces off, fastest at the bottom of the bounce and slowest at the
   top, like a ball. In 4 the path crosses itself: down, in toward the
   body, out, then up.

     cd.o x y s   opacity, centre, scale
     cd.pat       the pattern: a shape and each beat's length in quarters —
                  "4:1,1,1,1" for 4/4, "2:1.5,1.5" for 6/8 felt in two,
                  "3:1,1,1.5" for 7/8 grouped 2+2+3. The shapes: 1, 2, 3, 4,
                  6, and the two fives, 5a (3+2, the extra beat in) and 5b
                  (2+3, the extra beat out)
     cd.draw      how much of the pattern's path is drawn
     cd.nums      the beat numbers at each ictus
     cd.dir       a word for each beat's direction: down, in, out, up
     cd.cap cd.capo   a caption above, and its opacity

   The hand follows `live.pos("cd")`: one silent beat before the music to
   fall from the top into beat 1, and after the last beat it rises to the
   top and stays there.

   Local units: about 400 across, beat 1 at (0, 150), the top at y = −175. */

import { s, attrs, show, setText } from "../lib/dom.js";
import { C, mix } from "../palette.js";
import { clamp01 } from "../engine/ease.js";

const TOP = -175;
const FADE = 0.6;
const TRAIL = 14;

const SHAPES = {
	1: { pts: [[0, 150]], dir: ["down"] },
	2: { pts: [[0, 150], [80, 70]], dir: ["down", "up"] },
	3: { pts: [[0, 150], [160, 95], [70, 15]], dir: ["down", "out", "up"] },
	4: { pts: [[0, 150], [-150, 95], [160, 95], [70, 15]], dir: ["down", "in", "out", "up"] },
	"5a": { pts: [[0, 150], [-100, 110], [-190, 80], [160, 95], [70, 15]], dir: ["down", "in", "in", "out", "up"] },
	"5b": { pts: [[0, 150], [-150, 95], [100, 110], [190, 80], [70, 15]], dir: ["down", "in", "out", "out", "up"] },
	6: { pts: [[0, 150], [-95, 115], [-185, 80], [95, 115], [185, 80], [70, 15]], dir: ["down", "in", "in", "out", "out", "up"] },
};

export const conductorDefaults = (over = {}) => ({
	"cd.o": 0,
	"cd.x": 1300,
	"cd.y": 420,
	"cd.s": 1,
	"cd.pat": "4:1,1,1,1",
	"cd.draw": 0,
	"cd.nums": 1,
	"cd.dir": 0,
	"cd.cap": "",
	"cd.capo": 0,
	...over,
});

/** "7/8 in 3" → { shape, lens, pts, dir, total }. */
export function pattern(text) {
	const [shape, lens] = String(text).split(":");
	const sh = SHAPES[shape] ?? SHAPES[4];
	const n = sh.pts.length;
	const L = lens ? lens.split(",").map(Number) : Array(n).fill(1);
	return { ...sh, n, lens: L, total: L.reduce((a, b) => a + b, 0) };
}

const bez = (a, b, c, d, t) => {
	const u = 1 - t;
	return [
		u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
		u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
	];
};

/* A bounce: quick out of the ictus, slow over the top, quick into the next. */
const bounce = (t) => t + (0.75 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);

/** The four control points of segment i: from ictus i to the next. */
function segment(pat, i) {
	const a = pat.pts[i];
	if (i < pat.n - 1) {
		const b = pat.pts[i + 1];
		const rise = 55 + 0.3 * Math.abs(b[0] - a[0]);
		return [a, [a[0], a[1] - rise], [b[0], b[1] - rise * 0.9], b];
	}
	/* The upbeat: up to the top, then the downbeat falls straight down. */
	const b = pat.pts[0];
	const lean = pat.n === 1 ? 45 : 0;
	return [a, [a[0] + lean, TOP - 70], [b[0], TOP - 70], b];
}

/** Where the hand is `q` quarters into music `len` quarters long. */
function handAt(pat, q, len) {
	const i1 = pat.pts[0];
	const prep = pat.lens[pat.n - 1];
	if (q == null || q >= len) return { p: [i1[0], TOP], beat: -1 };
	if (q < 0) {
		if (q < -prep) return { p: [i1[0], TOP], beat: -1 };
		const t = (q + prep) / prep;
		return { p: [i1[0], TOP + (i1[1] - TOP) * t * t], beat: -1 };
	}
	const cycle = Math.floor(q / pat.total);
	let phase = q - cycle * pat.total;
	let i = 0;
	while (i < pat.n - 1 && phase >= pat.lens[i]) phase -= pat.lens[i++];
	const t = clamp01(phase / pat.lens[i]);
	const lastCycle = (cycle + 1) * pat.total >= len - 1e-6;
	if (lastCycle && i === pat.n - 1) {
		/* The music is ending: the upbeat rises and stays at the top. */
		const a = pat.pts[i];
		const e = 1 - (1 - t) ** 2;
		const p = bez(a, [a[0], TOP + 40], [i1[0], TOP], [i1[0], TOP], e);
		return { p, beat: i, phase };
	}
	return { p: bez(...segment(pat, i), bounce(t)), beat: i, phase };
}

export function create(root) {
	const g = s("g", { class: "conductor" });
	const path = s("path", { fill: "none", stroke: C.grayD, "stroke-width": 3, "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" });
	const trail = Array.from({ length: TRAIL }, () => s("line", { stroke: C.white, "stroke-linecap": "round" }));
	const hand = s("circle", { r: 11, fill: C.white });
	const cap = s("text", { class: "cd-cap", "text-anchor": "middle", y: TOP - 62 });
	const beads = Array.from({ length: 6 }, () => ({
		ring: s("circle", { fill: "none", stroke: C.white, "stroke-width": 2 }),
		dot: s("circle", { r: 18, "stroke-width": 3 }),
		num: s("text", { class: "bead-num", "text-anchor": "middle", "dominant-baseline": "central" }),
		word: s("text", { class: "cd-dir", "text-anchor": "middle", "dominant-baseline": "central" }),
	}));
	g.append(path, ...beads.flatMap((b) => [b.ring, b.dot, b.num, b.word]), ...trail, hand, cap);
	root.append(g);

	let drawnFor = "";

	return {
		render(P, live, now) {
			if (!show(g, P["cd.o"])) return false;
			attrs(g, { transform: `translate(${P["cd.x"]} ${P["cd.y"]}) scale(${P["cd.s"]})` });
			const pat = pattern(P["cd.pat"]);

			if (drawnFor !== P["cd.pat"]) {
				drawnFor = P["cd.pat"];
				const pts = [];
				for (let i = 0; i < pat.n; i++) {
					const seg = segment(pat, i);
					for (let k = 0; k <= 40; k++) pts.push(bez(...seg, k / 40));
				}
				attrs(path, { d: `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}` });
			}
			const draw = P["cd.draw"];
			if (show(path, draw > 0.001 ? 1 : 0)) attrs(path, { "stroke-dashoffset": 1 - clamp01(draw) });

			const tr = live.transport("cd");
			const q = live.pos("cd", now);
			const len = tr?.len ?? 0;
			const at = handAt(pat, q, len);

			beads.forEach((b, i) => {
				const on = i < pat.n ? P["cd.nums"] * clamp01(draw * 1.4 - i * 0.08) : 0;
				if (!show(b.dot, on)) {
					show(b.num, 0);
					show(b.ring, 0);
					show(b.word, 0);
					return;
				}
				const [x, y] = pat.pts[i];
				let gl = 0;
				if (tr && at.beat === i && q < len) gl = clamp01(1 - (at.phase * tr.spq) / FADE);
				const color = i === 0 ? C.tonic : C.white;
				attrs(b.dot, { cx: x, cy: y, fill: mix(C.bg, color, gl), stroke: color });
				show(b.num, on);
				attrs(b.num, { x, y: y + 1, fill: mix(color, C.bg, gl) });
				setText(b.num, String(i + 1));
				if (show(b.ring, on * gl * gl)) attrs(b.ring, { cx: x, cy: y, r: 18 + 26 * (1 - gl) });
				if (show(b.word, on * P["cd.dir"])) {
					const dx = x;
					const dy = y - 70;
					const d = Math.hypot(dx, dy) || 1;
					attrs(b.word, { x: x + (dx / d) * 46, y: y + (dy / d) * 46, fill: i === 0 ? C.tonic : C.grayB });
					setText(b.word, pat.dir[i] ?? "");
				}
			});

			/* The hand, and a short tail of where it just was. */
			attrs(hand, { cx: at.p[0], cy: at.p[1] });
			const step = tr ? 0.022 / tr.spq : 0;
			let prev = at.p;
			trail.forEach((line, k) => {
				if (!tr || q == null || q >= len + 0.5) {
					show(line, 0);
					return;
				}
				const p = handAt(pat, q - (k + 1) * step, len).p;
				const a = 1 - k / TRAIL;
				if (show(line, 0.85 * a)) attrs(line, { x1: prev[0], y1: prev[1], x2: p[0], y2: p[1], "stroke-width": 2 + 9 * a });
				prev = p;
			});

			if (show(cap, P["cd.capo"])) {
				attrs(cap, { fill: C.grayB });
				setText(cap, P["cd.cap"]);
			}
			return false;
		},
	};
}
