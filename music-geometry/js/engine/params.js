/* The parameter store — the whole stage is drawn from this one object.

   `P` holds plain values: numbers (opacities, positions, draw progress, morph
   amounts), hex colours, and a few discrete values (a key, a set of notes in
   focus). `animate(target, rules)` starts a tween from each current value to
   its target; `tick(now)` advances them; `finish()` jumps every running
   tween to its end, which is what "skip ahead" means.

   Numbers and colours interpolate. Anything else switches at the moment its
   tween would have started, so a discrete change can still be scheduled
   after a delay, in step with the rest of a beat.

   Timing comes from `rules`: a list of [test, rule] pairs, first match wins.
   A test is a space-separated list of keys, or a RegExp whose first capture
   group is a number — `delay` may then be a function of it, which is how a
   row of notes is staggered. */

import { smooth, lerp, clamp01 } from "./ease.js";
import { mix } from "../palette.js";

const HEX = /^#[0-9a-f]{6}$/i;

function kindOf(from, to) {
	if (typeof from === "number" && typeof to === "number") return "number";
	if (HEX.test(from) && HEX.test(to)) return "color";
	return "discrete";
}

function match(key, rules) {
	for (const [test, rule] of rules) {
		if (typeof test === "string") {
			if (test.split(" ").includes(key)) return { rule, index: 0 };
		} else {
			const m = key.match(test);
			if (m) return { rule, index: m[1] != null ? Number(m[1]) : 0 };
		}
	}
	return { rule: {}, index: 0 };
}

export function createParams(initial) {
	const P = { ...initial };
	let tracks = [];

	function animate(target, rules = [], base = {}, now = performance.now()) {
		for (const [key, to] of Object.entries(target)) {
			tracks = tracks.filter((t) => t.key !== key);
			const from = P[key];
			if (from === to) continue;

			const { rule, index } = match(key, rules);
			const r = { ...base, ...rule };
			const delay = typeof r.delay === "function" ? r.delay(index) : (r.delay ?? 0);
			const kind = kindOf(from, to);
			/* A discrete value due now changes now, so whatever reads it next
			   (the narration, the sound) already sees the new one. */
			if (kind === "discrete" && delay <= 0) {
				P[key] = to;
				continue;
			}
			tracks.push({
				key,
				from,
				to,
				t0: now + delay * 1000,
				d: Math.max(1, (r.dur ?? 1) * 1000),
				ease: r.ease ?? smooth,
				kind,
			});
		}
	}

	/** Advances every tween. Returns whether anything is still pending. */
	function tick(now) {
		if (!tracks.length) return false;
		tracks = tracks.filter((tr) => {
			if (now < tr.t0) return true;
			const t = clamp01((now - tr.t0) / tr.d);
			if (tr.kind === "number") P[tr.key] = lerp(tr.from, tr.to, tr.ease(t));
			else if (tr.kind === "color") P[tr.key] = mix(tr.from, tr.to, tr.ease(t));
			else P[tr.key] = tr.to;
			return tr.kind !== "discrete" && t < 1;
		});
		return true;
	}

	function finish() {
		for (const tr of tracks) P[tr.key] = tr.to;
		tracks = [];
	}

	/** Sets a value outright, cancelling any tween on it. */
	function set(key, value) {
		tracks = tracks.filter((t) => t.key !== key);
		P[key] = value;
	}

	return { P, animate, tick, finish, set, busy: () => tracks.length > 0 };
}
