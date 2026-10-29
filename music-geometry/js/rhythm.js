/* Rhythm, as plain numbers — the music the lessons write, parsed.

   Time is counted in quarter notes: a whole note is 4, an eighth 0.5, a
   dotted quarter 1.5. A line of music is a string, one token per note,
   rest or bar line, so a story can say what it shows in one line:

     "E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h |"

   A note is a pitch — letter, accidental, octave — and a duration letter:
   w h q e s for whole, half, quarter, eighth, sixteenth. Then, optionally,
   "." a dot, "~" a tie to the next note, "*" drawn in gold, and "@label"
   for a word written under it (underscores become spaces). Accidentals are
   # b ## bb, and n for a natural sign. A rest is "r" and a duration ("rq",
   "rh."); a spacer, "_" and a duration, takes up time and draws nothing. "|"
   is a bar line.

   A meter is a time signature, with its grouping when it needs one: "4/4",
   "6/8", "7/8:2+2+3", "5/4:3+2". Its `groups` are the beats a listener
   feels and a conductor beats, in quarter notes (6/8 is [1.5, 1.5]); its
   `beats` are what the click plays — the same, except in a slow meter like
   5/4, where every quarter is clicked and the grouping only accents. */

import { LETTERS } from "./theory.js";

const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const DUR = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
const ACC = { "": 0, "#": 1, "##": 2, b: -1, bb: -2, n: 0 };
const NOTE = /^([A-G])(##|bb|#|b|n)?(-?\d)([whqes])(\.?)(~?)(\*?)$/;
const REST = /^([r_])([whqes])(\.?)$/;

const cache = new Map();

/** A line of music → its items, bar lines and length, all in quarters. */
export function parse(text = "") {
	if (cache.has(text)) return cache.get(text);
	const items = [];
	const bars = [];
	let t = 0;
	let final = false;

	for (const raw of text.trim().split(/\s+/)) {
		if (!raw) continue;
		if (raw === "|" || raw === "||") {
			bars.push(t);
			final = raw === "||";
			continue;
		}
		const [token, label] = raw.split("@");
		const lab = label ? label.replace(/_/g, " ") : "";
		let m = NOTE.exec(token);
		if (m) {
			const [, L, acc = "", oct, d, dot, tie, gold] = m;
			const letter = LETTERS.indexOf(L);
			const a = ACC[acc];
			const octave = Number(oct);
			const base = DUR[d];
			const dur = dot ? base * 1.5 : base;
			items.push({
				kind: "note",
				t,
				d: dur,
				base,
				dot: Boolean(dot),
				tie: Boolean(tie),
				gold: Boolean(gold),
				label: lab,
				letter,
				acc: a,
				natural: acc === "n",
				octave,
				midi: 12 * (octave + 1) + NATURAL[letter] + a,
				step: octave * 7 + letter,
				flags: base >= 1 ? 0 : Math.round(Math.log2(1 / base)),
			});
			t += dur;
			continue;
		}
		m = REST.exec(token);
		if (m) {
			const [, kind, d, dot] = m;
			const base = DUR[d];
			const dur = dot ? base * 1.5 : base;
			items.push({ kind: kind === "r" ? "rest" : "space", t, d: dur, base, dot: Boolean(dot), label: lab, flags: 0 });
			t += dur;
			continue;
		}
		throw new Error(`Can't read "${raw}" in "${text}"`);
	}

	/* A tie carries the sound on: the note it reaches is not struck again. */
	items.forEach((it, i) => {
		const prev = items[i - 1];
		it.held = Boolean(prev?.kind === "note" && prev.tie && it.kind === "note" && prev.midi === it.midi);
	});

	const out = { items, bars, total: t, final };
	cache.set(text, out);
	return out;
}

/** A time signature, read: "6/8" → compound, two dotted-quarter beats. */
export function meter(sig = "") {
	const [ts, grouping] = (sig || "4/4").split(":");
	const [top, bottom] = ts.split("/").map(Number);
	const unit = 4 / bottom;
	const compound = !grouping && top > 3 && top % 3 === 0;
	let groups;
	if (grouping) groups = grouping.split("+").map((g) => Number(g) * unit);
	else if (compound) groups = Array(top / 3).fill(3 * unit);
	else groups = Array(top).fill(unit);
	const beats = grouping && bottom <= 4 ? Array(top).fill(unit) : groups;
	const sub = compound || grouping ? unit : unit / 2;
	return { sig: ts, top, bottom, unit, bar: top * unit, groups, beats, sub, compound, odd: Boolean(grouping) };
}

/** Where each measure starts: at 0, and after every bar line but a last
    one. Without bar lines, every `bar` quarters. */
export function measures(music, m) {
	if (music.bars.length) return [0, ...music.bars.filter((b) => b > 1e-6 && b < music.total - 1e-6)];
	const starts = [0];
	for (let t = m.bar; t < music.total - 1e-6; t += m.bar) starts.push(t);
	return starts;
}

/** The clicks: every beat, the first of each measure loudest, the start of
    each group a little louder than the beats inside it. `pulse` (quarters)
    clicks a steadier grid instead — six eighths in a slow 6/8.
    Each entry: { t, level, n (its count in the measure), g (in its group) }. */
export function pulses(music, m, pulse = 0) {
	const out = [];
	const starts = measures(music, m);
	starts.forEach((b, k) => {
		const end = starts[k + 1] ?? Math.max(music.total, b + 1e-6);
		const beats = pulse ? Array(Math.max(1, Math.round(m.bar / pulse))).fill(pulse) : m.beats;
		const groupStarts = new Set();
		let acc = 0;
		for (const g of m.groups) {
			groupStarts.add(Math.round(acc * 1000));
			acc += g;
		}
		let t = 0;
		let n = 0;
		let g = 0;
		for (const len of beats) {
			if (b + t >= end - 1e-6) break;
			const key = Math.round(t * 1000);
			if (groupStarts.has(key)) g = 0;
			n++;
			g++;
			out.push({ t: b + t, level: t === 0 ? 2 : groupStarts.has(key) && m.groups.length !== beats.length ? 1.5 : 1, n, g });
			t += len;
		}
	});
	return out;
}

/** Which notes sound, when, and for how long: a tied note is one sound
    as long as the whole chain. */
export function sounds(music) {
	const out = [];
	music.items.forEach((it, i) => {
		if (it.kind !== "note" || it.held) return;
		let d = it.d;
		for (let j = i; music.items[j]?.tie && music.items[j + 1]?.held; j++) d += music.items[j + 1].d;
		out.push({ t: it.t, d, midi: it.midi, i });
	});
	return out;
}

/** Beam groups: runs of flagged notes inside one beat group of a measure,
    unbroken by a rest. Single flagged notes keep their flags. */
export function beams(music, m) {
	const starts = measures(music, m);
	const groupOf = (t) => {
		let k = 0;
		while (k + 1 < starts.length && starts[k + 1] <= t + 1e-6) k++;
		let acc = starts[k];
		let gi = 0;
		for (const g of m.groups) {
			if (t < acc + g - 1e-6) return `${k}:${gi}`;
			acc += g;
			gi++;
		}
		return `${k}:${gi}`;
	};
	const out = [];
	let run = [];
	let key = null;
	const flush = () => {
		if (run.length > 1) out.push(run);
		run = [];
	};
	music.items.forEach((it, i) => {
		if (it.kind !== "note" || it.flags < 1) {
			flush();
			key = null;
			return;
		}
		const k = groupOf(it.t);
		if (k !== key) flush();
		key = k;
		run.push(i);
	});
	flush();
	return out;
}
