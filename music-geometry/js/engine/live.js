/* What is sounding, and how brightly to show it.

   The synth reports each note as it starts; every view asks `glow(midi)` or
   `glowPc(pc)` for a value that jumps to 1 and fades to 0 over FADE ms. The
   views turn that into a brighter key or note and a ring that expands and
   fades — 3Blue1Brown's "flash" — so sound and picture arrive together
   without the views having to know about the audio at all.

   Some pictures follow the music continuously rather than note by note: a
   bar under each note filling as it is held, a conductor's hand. For those,
   `run(key, t0, spq, len)` starts a transport — `key` names what it drives
   (a staff row, the conductor), `t0` is when its music starts on the
   page's clock, `spq` the seconds per quarter note, `len` its length in
   quarters — and `pos(key, now)` reads where the music is, in quarters, or
   null once it has finished and settled. */

import { mod } from "../theory.js";

const FADE = 750;
const SETTLE = 1500;

export function createLive() {
	const hits = new Map();
	const runs = new Map();

	const level = (t, now) => {
		const g = 1 - (now - t) / FADE;
		return g > 0 ? g : 0;
	};

	return {
		hit(midi, now = performance.now()) {
			hits.set(midi, now);
		},
		glow(midi, now) {
			const t = hits.get(midi);
			return t == null ? 0 : level(t, now);
		},
		glowPc(pc, now) {
			let g = 0;
			for (const [midi, t] of hits) if (mod(midi) === mod(pc)) g = Math.max(g, level(t, now));
			return g;
		},
		run(key, t0, spq, len) {
			runs.set(key, { t0, spq, len });
		},
		/** Where `key`'s music is, in quarters (negative before it starts),
		    or null when nothing is running there. */
		pos(key, now) {
			const r = runs.get(key);
			return r ? (now - r.t0) / 1000 / r.spq : null;
		},
		/** Seconds since quarter `q` of `key`'s music sounded, or null. */
		since(key, q, now) {
			const r = runs.get(key);
			return r ? (now - r.t0) / 1000 - q * r.spq : null;
		},
		transport(key) {
			return runs.get(key) ?? null;
		},
		busy(now) {
			let any = false;
			for (const [midi, t] of hits) {
				if (level(t, now) > 0) any = true;
				else hits.delete(midi);
			}
			for (const [key, r] of runs) {
				if (now < r.t0 + r.len * r.spq * 1000 + SETTLE) any = true;
				else runs.delete(key);
			}
			return any;
		},
		clear() {
			hits.clear();
			runs.clear();
		},
	};
}
