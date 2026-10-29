/* The circle of fifths — the picture every lesson on the home page plays on.

   Twelve places, C at the top, each a fifth clockwise from the last. A
   place is a note (the dot on the ring) and a key: the major key outside
   the ring, and just inside it, in italics, its relative minor. Because
   7 × 7 = 49 is one more than four octaves, the same multiplication takes
   a pitch class to its place and a place back to its pitch class.

   Everything a lesson draws lives on that ring: a key is a slice of seven
   neighbouring places (the band), a chord is the polygon through its notes,
   a scale played in order is a path from note to note, a progression is
   an arrow from root to root. Change the key and the same shapes turn.

   Geometry that moves — the band's two ends, the polygon's corners —
   follows its target on a spring, frame by frame, so a chord changing
   glides round the circle and the notes two chords share stay put. All
   the rest (which dots are lit, a note sounding, a label brightening) is a
   class or a data attribute, and css/home.css decides how it looks.

   `miniature(view)` draws the same picture small and still, for the tiles. */

import { s } from "../lib/dom.js";
import { mod, nameOf, tonicSpelling, minorTonicSpelling } from "../theory.js";

export const R = 200;
const BAND = 21;
const MAJOR_R = R + 40;
const MINOR_R = R - 42;
const TRACK = R - 76;
const SEGS = 16;
const GLIDE = 0.12;

export const place = (pc) => mod(pc * 7);

const pt = (p, r = R) => {
	const a = (p * Math.PI) / 6;
	return [r * Math.sin(a), -r * Math.cos(a)];
};
const n2 = (v) => Math.round(v * 100) / 100;
const xy = ([x, y]) => `${n2(x)} ${n2(y)}`;

/** The signed shortest way round, in places: −6 ≤ d < 6. */
const wrap = (d) => ((((d + 6) % 12) + 12) % 12) - 6;

/** A rounded slice of the ring, from place p0 clockwise to p1. */
function capsule(p0, p1, r = R, w = BAND) {
	const big = p1 - p0 > 6 ? 1 : 0;
	const o = r + w;
	const i = r - w;
	return (
		`M${xy(pt(p0, o))}A${o} ${o} 0 ${big} 1 ${xy(pt(p1, o))}` +
		`A${w} ${w} 0 0 1 ${xy(pt(p1, i))}` +
		`A${i} ${i} 0 ${big} 0 ${xy(pt(p0, i))}` +
		`A${w} ${w} 0 0 1 ${xy(pt(p0, o))}Z`
	);
}

/** Where a run of neighbouring places starts, and how far it reaches:
    it begins just after the widest gap round the circle. */
function slice(pcs) {
	const ps = [...new Set(pcs.map(place))].sort((a, b) => a - b);
	if (!ps.length) return null;
	let start = ps[0];
	let gap = ps[0] + 12 - ps.at(-1);
	for (let i = 1; i < ps.length; i++) {
		if (ps[i] - ps[i - 1] > gap) {
			gap = ps[i] - ps[i - 1];
			start = ps[i];
		}
	}
	return { from: start - 0.3, to: start + (12 - gap) + 0.3 };
}

const corners = (pcs) => [...new Set((pcs ?? []).map(place))].sort((a, b) => a - b);

/* Moves a polygon's corners to a new chord. Corners keep their order round
   the circle; of the rotations that pair old corners with new ones, the one
   that moves them least wins — so a note two chords share does not move.
   When the counts differ, corners are doubled up (a new note grows out of a
   neighbour) or merged (two settle on one note, and are tidied away once
   still). */
function retarget(cs, ts) {
	const size = Math.max(cs.length, ts.length);
	const from = (cs.length === size ? cs : Array.from({ length: size }, (_, j) => cs[Math.floor((j * cs.length) / size)]))
		.map((c) => ({ p: c.p }))
		.sort((a, b) => mod(a.p) - mod(b.p));
	const to = ts.length === size ? ts : Array.from({ length: size }, (_, j) => ts[Math.floor((j * ts.length) / size)]);
	let best = 0;
	let least = Infinity;
	for (let r = 0; r < size; r++) {
		let cost = 0;
		for (let j = 0; j < size; j++) cost += Math.abs(wrap(to[(j + r) % size] - from[j].p));
		if (cost < least - 1e-9) {
			least = cost;
			best = r;
		}
	}
	return from.map((c, j) => ({ p: c.p, to: c.p + wrap(to[(j + best) % size] - c.p) }));
}

const flags = (el, map) => {
	for (const [name, on] of Object.entries(map)) el.classList.toggle(name, Boolean(on));
};

/** Restarts a class's CSS animation. */
function retrigger(el, name) {
	el.classList.remove(name);
	void el.getBoundingClientRect();
	el.classList.add(name);
}

/** Redraws a stroke from nothing: the dash jumps back to empty without a
    transition, then the class lets it run to full. */
function redraw(el) {
	el.classList.remove("is-on");
	el.style.transition = "none";
	void el.getBoundingClientRect();
	el.style.transition = "";
	el.classList.add("is-on");
}

export function createWheel(svg, { onPick }) {
	const layer = (cls) => svg.appendChild(s("g", { class: cls }));

	const ring = s("circle", { class: "wheel__ring", r: R, pathLength: 1 });
	svg.append(ring);

	const bandEl = layer("").appendChild(s("path", { class: "band" }));
	const ghostEl = layer("").appendChild(s("path", { class: "ghost" }));
	const shapeEl = layer("").appendChild(s("polygon", { class: "shape", "data-tone": "ink" }));
	const segLayer = layer("");
	const segEls = Array.from({ length: SEGS }, () => segLayer.appendChild(s("line", { class: "seg", pathLength: 1, "data-tone": "ink" })));
	const arrowLayer = layer("");
	const arrowEl = arrowLayer.appendChild(s("path", { class: "arrow", pathLength: 1 }));
	const headEl = arrowLayer.appendChild(s("path", { class: "arrow-head" }));

	const nodeLayer = layer("nodes");
	const labelLayer = layer("labels");
	const center = svg.appendChild(s("text", { class: "wheel__center", x: 0, y: 0 }));

	const places = Array.from({ length: 12 }, (_, p) => {
		const pc = place(p);
		const [x, y] = pt(p);
		const node = s(
			"g",
			{ class: "node", transform: `translate(${xy([x, y])})`, "data-pc": pc, "data-ring": "major", style: `--i:${p}` },
			s("circle", { class: "node__hit", r: 20 }),
			s("circle", { class: "node__flash", r: 10 }),
			s("circle", { class: "node__bass", r: 16 }),
			s("circle", { class: "node__dot", r: 9 }),
		);
		const [mx, my] = pt(p, MAJOR_R);
		const [nx, ny] = pt(p, MINOR_R);
		const major = s("text", {
			class: "lab",
			x: n2(mx),
			y: n2(my),
			"data-pc": pc,
			"data-ring": "major",
			tabindex: 0,
			role: "button",
			style: `--i:${p}`,
		});
		const minor = s("text", {
			class: "lab lab--minor",
			x: n2(nx),
			y: n2(ny),
			"data-pc": mod(pc + 9),
			"data-ring": "minor",
			tabindex: 0,
			role: "button",
			style: `--i:${p}`,
		});
		nodeLayer.append(node);
		labelLayer.append(major, minor);
		return { p, pc, node, major, minor };
	});
	const byPc = [];
	for (const pl of places) byPc[pl.pc] = pl;

	/* Picking a key: a click on a dot or either label, or Enter on a
	   focused label. */
	const pickFrom = (target) => {
		const el = target.closest?.("[data-ring]");
		if (el) onPick(Number(el.dataset.pc), el.dataset.ring);
	};
	svg.addEventListener("click", (e) => pickFrom(e.target));
	svg.addEventListener("keydown", (e) => {
		if (e.key !== "Enter" && e.key !== " ") return;
		if (!e.target.closest?.("[data-ring]")) return;
		e.preventDefault();
		pickFrom(e.target);
	});

	/* ---- springs ---- */

	const band = { el: bandEl, from: 0, to: 0, aimFrom: 0, aimTo: 0, shown: false, d: "" };
	const ghost = { el: ghostEl, from: 0, to: 0, aimFrom: 0, aimTo: 0, shown: false, d: "" };
	let shape = [];
	let shapeShown = false;
	let shapePoints = "";

	function aimSlice(sl, pcs) {
		const target = pcs?.length ? slice(pcs) : null;
		if (!target) {
			sl.shown = false;
			sl.el.classList.remove("is-shown");
			return;
		}
		/* The same slice twelve places on is the same slice; aim for the copy
		   nearest where it is now, so it turns the short way round. */
		const shift = 12 * Math.round((sl.from + sl.to - target.from - target.to) / 24);
		sl.aimFrom = target.from + shift;
		sl.aimTo = target.to + shift;
		if (!sl.shown) {
			sl.from = sl.aimFrom;
			sl.to = sl.aimTo;
		}
		sl.shown = true;
		sl.el.classList.add("is-shown");
	}

	function stepSlice(sl, k) {
		sl.from += (sl.aimFrom - sl.from) * k;
		sl.to += (sl.aimTo - sl.to) * k;
		const moving = Math.abs(sl.aimFrom - sl.from) > 0.002 || Math.abs(sl.aimTo - sl.to) > 0.002;
		if (!moving) {
			sl.from = sl.aimFrom;
			sl.to = sl.aimTo;
		}
		const d = capsule(sl.from, sl.to);
		if (d !== sl.d) sl.el.setAttribute("d", (sl.d = d));
		return moving;
	}

	function aimShape(pcs) {
		const ts = corners(pcs);
		if (ts.length < 2) {
			shapeShown = false;
			shapeEl.classList.remove("is-shown");
			return;
		}
		shape = shapeShown && shape.length ? retarget(shape, ts) : ts.map((t) => ({ p: t, to: t }));
		shapeShown = true;
		shapeEl.classList.add("is-shown");
	}

	function stepShape(k) {
		let moving = false;
		for (const c of shape) {
			c.p += (c.to - c.p) * k;
			if (Math.abs(c.to - c.p) > 0.002) moving = true;
			else c.p = c.to;
		}
		if (!moving && shape.length) {
			const seen = new Set();
			shape = shape.filter((c) => {
				const key = mod(Math.round(c.to));
				if (seen.has(key)) return false;
				seen.add(key);
				c.p = c.to = key;
				return true;
			});
		}
		const points = shape.map((c) => xy(pt(c.p))).join(" ");
		if (points !== shapePoints) shapeEl.setAttribute("points", (shapePoints = points));
		return moving;
	}

	let raf = 0;
	let last = 0;
	const still = window.matchMedia("(prefers-reduced-motion: reduce)");

	function frame(now) {
		const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
		last = now;
		const k = still.matches ? 1 : 1 - Math.exp(-dt / GLIDE);
		let busy = stepSlice(band, k);
		busy = stepSlice(ghost, k) || busy;
		busy = stepShape(k) || busy;
		raf = busy ? requestAnimationFrame(frame) : 0;
	}

	function kick() {
		if (raf) return;
		last = performance.now();
		raf = requestAnimationFrame(frame);
	}

	/* ---- the rest: classes ---- */

	function drawSegs(list) {
		segEls.forEach((el, i) => {
			const sg = list[i];
			if (!sg) {
				el.classList.remove("is-on");
				el.dataset.key = "";
				return;
			}
			const [a, b, tone = "ink", dim = false] = sg;
			el.dataset.tone = tone;
			el.classList.toggle("is-dim", Boolean(dim));
			const key = `${mod(a)}-${mod(b)}`;
			if (el.dataset.key === key) return;
			el.dataset.key = key;
			const [x1, y1] = pt(place(a));
			const [x2, y2] = pt(place(b));
			el.setAttribute("x1", n2(x1));
			el.setAttribute("y1", n2(y1));
			el.setAttribute("x2", n2(x2));
			el.setAttribute("y2", n2(y2));
			redraw(el);
		});
	}

	let arrowKey = "";
	function drawArrow(arrow) {
		if (!arrow) {
			arrowKey = "";
			arrowEl.classList.remove("is-on");
			headEl.classList.remove("is-on");
			return;
		}
		const [a, b] = arrow.map(place);
		const key = `${a}-${b}`;
		if (key === arrowKey) return;
		arrowKey = key;
		let d = wrap(b - a);
		if (d === -6) d = 6;
		const dir = Math.sign(d);
		const p0 = a + dir * 0.2;
		const p1 = b - dir * 0.14;
		arrowEl.setAttribute("d", `M${xy(pt(p0, TRACK))}A${TRACK} ${TRACK} 0 0 ${dir > 0 ? 1 : 0} ${xy(pt(p1, TRACK))}`);
		/* The head points along the circle, the way the arrow travels. */
		const th = (p1 * Math.PI) / 6;
		const [tx, ty] = [dir * Math.cos(th), dir * Math.sin(th)];
		const tip = pt(p1, TRACK);
		const wing = (side) => {
			const c = Math.cos(0.5);
			const sn = Math.sin(0.5) * side;
			return [tip[0] - 11 * (tx * c - ty * sn), tip[1] - 11 * (ty * c + tx * sn)];
		};
		headEl.setAttribute("d", `M${xy(wing(1))}L${xy(tip)}L${xy(wing(-1))}`);
		redraw(arrowEl);
		redraw(headEl);
	}

	function set(view = {}) {
		const v = view ?? {};
		const lit = new Set([...(v.set ?? []), ...(v.shape ?? [])].map((n) => mod(n)));
		const key = new Set((v.band ?? []).map((n) => mod(n)));
		const alt = new Set((v.alt ?? []).map((n) => mod(n)));
		const hot = new Set((v.hot ?? []).map((n) => mod(n)));
		const tonic = v.tonic == null ? null : mod(v.tonic);
		const bass = v.bass == null ? null : mod(v.bass);
		const em = new Set((v.major ?? []).map((n) => mod(n)));
		const emMinor = new Set((v.minor ?? []).map((n) => mod(n)));

		aimSlice(band, v.band);
		aimSlice(ghost, v.ghost);
		aimShape(v.shape);
		shapeEl.dataset.tone = v.tone ?? "ink";
		drawSegs(v.segs ?? []);
		drawArrow(v.arrow);

		for (const { pc, node, major, minor } of places) {
			flags(node, {
				"is-key": key.has(pc),
				"is-set": lit.has(pc),
				"is-alt": alt.has(pc),
				"is-hot": hot.has(pc),
				"is-tonic": pc === tonic,
				"is-bass": pc === bass,
			});
			flags(major, { "is-in": key.has(pc) || lit.has(pc), "is-tonic": pc === tonic, "is-em": em.has(pc) });
			flags(minor, { "is-em": emMinor.has(mod(pc + 9)) });
		}

		if (v.center) center.textContent = v.center;
		center.classList.toggle("is-shown", Boolean(v.center));
		kick();
	}

	const sounding = new Array(12).fill(0);

	function sound(pc, on) {
		const pl = byPc[mod(pc)];
		sounding[pl.pc] = Math.max(0, sounding[pl.pc] + (on ? 1 : -1));
		pl.node.classList.toggle("is-on", sounding[pl.pc] > 0);
		if (on) retrigger(pl.node, "is-flash");
	}

	function clear() {
		sounding.fill(0);
		for (const pl of places) pl.node.classList.remove("is-on");
	}

	/* Names in the reader's naming. The bottom of the circle is where sharps
	   turn into flats, so that place carries both spellings. */
	function relabel(naming) {
		for (const { p, pc, major, minor } of places) {
			const name = nameOf(tonicSpelling(pc), naming);
			const minorName = nameOf(minorTonicSpelling(pc + 9), naming).toLowerCase();
			major.replaceChildren(name);
			minor.replaceChildren(minorName);
			if (p === 6) {
				major.append(s("tspan", { class: "lab__alt", text: ` ${nameOf({ letter: 4, acc: -1 }, naming)}` }));
				minor.append(s("tspan", { class: "lab__alt", text: ` ${nameOf({ letter: 2, acc: -1 }, naming).toLowerCase()}` }));
			}
			major.setAttribute("aria-label", `${name} major`);
			minor.setAttribute("aria-label", `${minorName} minor`);
		}
	}

	/* The first appearance: the ring is drawn, then the places come in round
	   it. Waiting a frame lets the hidden state paint first. */
	requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("is-in")));

	return { set, sound, clear, relabel };
}

/* --------------------------------------------------------------------------
   The same picture, small and still. */

export function miniature(view = {}) {
	const v = view ?? {};
	const svg = s("svg", { class: "mini", viewBox: "-232 -232 464 464", "aria-hidden": "true", focusable: "false" });
	svg.append(s("circle", { class: "mini__ring", r: R }));

	const sl = v.band?.length ? slice(v.band) : null;
	if (sl) svg.append(s("path", { class: "mini__band", d: capsule(sl.from, sl.to) }));
	const gh = v.ghost?.length ? slice(v.ghost) : null;
	if (gh) svg.append(s("path", { class: "mini__ghost", d: capsule(gh.from, gh.to) }));

	const sh = corners(v.shape);
	if (sh.length > 1) {
		svg.append(s("polygon", { class: "mini__shape", "data-tone": v.tone ?? "ink", points: sh.map((p) => xy(pt(p))).join(" ") }));
	}
	for (const [a, b, tone = "ink", dim] of v.segs ?? []) {
		const [x1, y1] = pt(place(a));
		const [x2, y2] = pt(place(b));
		svg.append(s("line", { class: `mini__seg${dim ? " is-dim" : ""}`, "data-tone": tone, x1: n2(x1), y1: n2(y1), x2: n2(x2), y2: n2(y2) }));
	}

	const lit = new Set([...(v.set ?? []), ...(v.shape ?? [])].map((n) => mod(n)));
	const alt = new Set((v.alt ?? []).map((n) => mod(n)));
	const hot = new Set((v.hot ?? []).map((n) => mod(n)));
	const tonic = v.tonic == null ? null : mod(v.tonic);
	for (let p = 0; p < 12; p++) {
		const pc = place(p);
		const [cx, cy] = pt(p);
		const role = pc === tonic ? "is-tonic" : alt.has(pc) ? "is-alt" : hot.has(pc) ? "is-hot" : lit.has(pc) ? "is-set" : "";
		svg.append(s("circle", { class: `mini__dot ${role}`, cx: n2(cx), cy: n2(cy), r: role ? (role === "is-tonic" ? 24 : 19) : 11 }));
	}
	return svg;
}
