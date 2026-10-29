/* The keyboard under the circle — four octaves, C2 to C6, drawn flat.

   It shows two things. The notes in play are marked with a small dot on
   every key that carries them, in every octave, so the pattern a scale or
   chord makes on the keys can be read at a glance; and a note sounding
   lights its key while it rings. Both are classes; css/home.css colours
   them.

   It is also an instrument. Pressing a key plays it, and dragging across
   the keys plays each one the pointer reaches — the pointer is captured on
   the first press, so a glissando survives slipping off the keyboard and
   back. Black keys sit where they do on a real piano, a little off centre
   between their white neighbours. */

import { s } from "../lib/dom.js";
import { isBlack, mod, nameOf } from "../theory.js";

export const LOW = 36;
export const HIGH = 84;

const WK = 24;
const WH = 96;
const BW = 14.5;
const BH = 60;
const UNDER = 16;
const NUDGE = { 1: -2, 3: 2, 6: -2.5, 8: 0, 10: 2.5 };

/** A key with square shoulders and rounded front corners. */
function key(x, w, h, r) {
	return `M${x} 0H${x + w}V${h - r}Q${x + w} ${h} ${x + w - r} ${h}H${x + r}Q${x} ${h} ${x} ${h - r}Z`;
}

export function createKeys(svg, { onPress }) {
	const keys = new Map();
	let col = 0;
	for (let m = LOW; m <= HIGH; m++) {
		if (!isBlack(m)) keys.set(m, { m, black: false, x: col++ * WK });
	}
	for (let m = LOW; m <= HIGH; m++) {
		if (isBlack(m)) keys.set(m, { m, black: true, x: keys.get(m - 1).x + WK + NUDGE[mod(m)] - BW / 2 });
	}

	svg.setAttribute("viewBox", `0 0 ${col * WK} ${WH + UNDER}`);
	const whites = s("g");
	const blacks = s("g");
	const marks = s("g");

	for (const k of keys.values()) {
		const cx = k.black ? k.x + BW / 2 : k.x + WK / 2;
		k.el = s("path", {
			class: k.black ? "pk pk--black" : "pk",
			d: k.black ? key(k.x, BW, BH, 2.5) : key(k.x + 1, WK - 2, WH, 4),
			"data-midi": k.m,
		});
		k.dot = s("circle", { class: k.black ? "pk-dot pk-dot--black" : "pk-dot", cx, cy: k.black ? BH - 9 : WH - 12, r: k.black ? 2.7 : 3.3 });
		(k.black ? blacks : whites).append(k.el, k.dot);
		if (!k.black && mod(k.m) === 0) {
			k.label = s("text", { class: "pk-label", x: cx, y: WH + 13 });
			marks.append(k.label);
		}
	}
	svg.append(whites, blacks, marks);

	/* ---- playing ---- */

	let held = null;
	const keyAt = (e) => {
		const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-midi]");
		return el && svg.contains(el) ? Number(el.dataset.midi) : null;
	};

	svg.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		const m = keyAt(e);
		if (m == null) return;
		e.preventDefault();
		held = m;
		svg.setPointerCapture(e.pointerId);
		onPress(m);
	});
	svg.addEventListener("pointermove", (e) => {
		if (held == null) return;
		const m = keyAt(e);
		if (m != null && m !== held) {
			held = m;
			onPress(m);
		}
	});
	const release = () => {
		held = null;
	};
	svg.addEventListener("pointerup", release);
	svg.addEventListener("pointercancel", release);

	/* ---- showing ---- */

	function set(view = {}) {
		const v = view ?? {};
		const inPlay = [...(v.set ?? []), ...(v.shape ?? [])];
		const lit = new Set((inPlay.length ? inPlay : (v.band ?? [])).map((n) => mod(n)));
		const alt = new Set((v.alt ?? []).map((n) => mod(n)));
		const hot = new Set((v.hot ?? []).map((n) => mod(n)));
		const tonic = v.tonic == null ? null : mod(v.tonic);
		for (const k of keys.values()) {
			const pc = mod(k.m);
			const cl = k.dot.classList;
			cl.toggle("is-set", lit.has(pc) || alt.has(pc) || hot.has(pc) || pc === tonic);
			cl.toggle("is-tonic", pc === tonic);
			cl.toggle("is-alt", alt.has(pc) && pc !== tonic);
			cl.toggle("is-hot", hot.has(pc) && pc !== tonic);
		}
	}

	const sounding = new Map();

	function sound(m, on) {
		const k = keys.get(m);
		if (!k) return;
		const n = Math.max(0, (sounding.get(m) ?? 0) + (on ? 1 : -1));
		sounding.set(m, n);
		k.el.classList.toggle("is-on", n > 0);
	}

	function clear() {
		sounding.clear();
		for (const k of keys.values()) k.el.classList.remove("is-on");
	}

	function relabel(naming) {
		for (const k of keys.values()) {
			if (k.label) k.label.textContent = `${nameOf({ letter: 0, acc: 0 }, naming)}${Math.floor(k.m / 12) - 1}`;
		}
	}

	return { set, sound, clear, relabel };
}
