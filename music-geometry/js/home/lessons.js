/* The curriculum, as sound and pictures.

   Every tile on the home page plays a short demonstration on the circle of
   fifths and the keyboard together. `build(k, naming)` writes it in the key
   `k` (a pitch class: the lesson's own default, or the key the reader
   picked on the circle) and returns a list of steps.

   A step lasts `dur` seconds. It strikes notes (`play`, each entry
   `{ dt, notes, hold, vel }`, dt seconds into the step), changes the
   picture (`view`, merged over the steps before it, so a step only says
   what changes), and may change the readout under the circle: a `title`,
   a `sub`, and one sentence, `say`.

   The view, all in pitch classes:
     band    a key or a scale: a slice of neighbouring places on the circle
     ghost   another slice, dashed — the key we left, or one we borrow from
     tonic   home, in gold
     set     the notes in play, lit
     alt     notes from outside the key, in green — as in the lesson, a note
             the key had to change
     hot     tension, in red: a tritone, a dominant's restless notes
     shape   a chord, the polygon through its notes, in `tone`
     bass    the lowest note, ringed
     segs    lines from note to note: [a, b, tone, dim]
     arrow   [from, to]: a root moving round the circle
     center  a few characters in the middle — a key signature
     major / minor   key labels to brighten on each ring

   Tones: "ink" (white), "tonic" (gold, home), "away" (purple, the
   subdominant), "hot" (red, the dominant), "whole" and "half" (blue and
   yellow, the lesson's colours for steps).

   The words are Claude's draft. Once Dimah rewrites a line it is hers,
   word for word. */

import {
	mod,
	nameOf,
	above,
	spell,
	tonicSpelling,
	minorTonicSpelling,
	namesInKey,
	majorScale,
	keySignature,
} from "../theory.js";
import { parse, meter as readMeter, pulses, sounds } from "../rhythm.js";

const SCALE = {
	major: "1 2 3 4 5 6 7",
	natural: "1 2 b3 4 5 b6 b7",
	harmonic: "1 2 b3 4 5 b6 7",
	melodic: "1 2 b3 4 5 6 7",
};

const CHORD = {
	"": "1 3 5",
	m: "1 b3 5",
	"°": "1 b3 b5",
	"+": "1 3 #5",
	maj7: "1 3 5 7",
	7: "1 3 5 b7",
	m7: "1 b3 5 b7",
	ø7: "1 b3 b5 b7",
	"°7": "1 b3 b5 bb7",
};

/* A chord's symbol, read off the distances from its root. */
const QUALITY = {
	"4 7": "",
	"3 7": "m",
	"3 6": "°",
	"4 8": "+",
	"4 7 11": "maj7",
	"4 7 10": "7",
	"3 7 10": "m7",
	"3 6 10": "ø7",
	"3 6 9": "°7",
};

/* --------------------------------------------------------------------------
   Helpers */

/** The first MIDI note at or above `lo` with pitch class `pc`. */
const near = (pc, lo) => lo + mod(pc - lo);
const pcsOf = (notes) => notes.map((n) => n.pc);

function words(naming) {
	const nm = (n) => nameOf(n, naming);
	return {
		nm,
		list: (notes) => notes.map(nm).join(" "),
		symbol: (tones) => nm(tones[0]) + (QUALITY[tones.slice(1).map((t) => mod(t.pc - tones[0].pc)).join(" ")] ?? ""),
	};
}

const strike = (notes, hold = 0.9, vel = 0.62, dt = 0) => ({ dt, notes: [notes].flat(), hold, vel });

/** Each note on its own, climbing, then all of them together. */
function arpThenBlock(midis, { gap = 0.15, hold = 1.15, bass = null } = {}) {
	const at = midis.length * gap + 0.12;
	return [
		...midis.map((m, i) => strike(m, 0.45, 0.82, i * gap)),
		strike(bass == null ? midis : [bass, ...midis], hold, 0.55, at),
	];
}

/** A melody, one step per note; `each(i)` is that step's view. */
function run(midis, gap, each = () => ({})) {
	return midis.map((m, i) => ({
		dur: gap,
		play: [strike(m, i === midis.length - 1 ? 0.9 : 0.5, 0.85)],
		view: each(i),
	}));
}

/** The first `n` lines of a path through `pcs`, coloured by `toneOf(j)`. */
const trail = (pcs, n, toneOf = () => "ink") =>
	Array.from({ length: n }, (_, j) => [pcs[j], pcs[j + 1], toneOf(j + 1)]);

/** A scale as MIDI notes from `base`, with the octave on top. */
const line = (notes, base) => [...notes.map((n) => base + n.semis), base + 12];

/* Chords are voiced the way a pianist plays them: the root alone in the
   bass, and the chord close together around middle C, each voice moving as
   little as it can from the chord before. `hands()` remembers the last
   voicing, so a progression is led rather than jumped. */
const BASS = 40;

function closeVoicings(pcs) {
	const out = [];
	for (let lo = 52; lo <= 64; lo++) {
		if (!pcs.includes(mod(lo))) continue;
		const rest = pcs.filter((p) => p !== mod(lo)).map((p) => lo + mod(p - lo));
		out.push([lo, ...rest].sort((a, b) => a - b));
	}
	return out;
}

const reach = (a, b) => a.reduce((sum, m) => sum + Math.min(...b.map((n) => Math.abs(m - n))), 0);
const motion = (a, b) => reach(a, b) + reach(b, a);

function hands() {
	let last = null;
	return (pcs) => {
		const upper = last
			? closeVoicings(pcs).reduce((best, v) => (motion(v, last) < motion(best, last) ? v : best))
			: pcs.map((p) => near(p, 55)).sort((a, b) => a - b);
		last = upper;
		return [near(pcs[0], BASS), ...upper];
	};
}

const triadOf = (sc, d) => [sc[d % 7], sc[(d + 2) % 7], sc[(d + 4) % 7]];
const seventhOf = (sc, d) => [...triadOf(sc, d), sc[(d + 6) % 7]];

function sigWords(sig, list, notes) {
	if (!sig.count) return "no sharps or flats";
	const accs = sig.letters.map((l) => notes.find((n) => n.letter === l));
	return `${sig.count} ${sig.sign > 0 ? "sharp" : "flat"}${sig.count > 1 ? "s" : ""}: ${list(accs)}`;
}

const sigMark = (sig) => (sig.count ? `${sig.count}${sig.sign > 0 ? "♯" : "♭"}` : "0");

/** A progression: each chord a step, voiced by `hands`, with an arrow
    from the last root to this one. */
function progression(chords, band, k, { hand = hands(), dur = 1.15, last = 1.9 } = {}) {
	let prev = null;
	return chords.map((c, i) => {
		const pcs = pcsOf(c.tones);
		const end = i === chords.length - 1;
		const step = {
			dur: end ? last : dur,
			play: [strike(hand(pcs), end ? last - 0.2 : dur * 0.9, 0.55)],
			view: {
				band,
				tonic: k,
				set: pcs,
				shape: pcs,
				tone: c.tone ?? "ink",
				bass: pcs[0],
				arrow: prev == null || prev === pcs[0] ? null : [prev, pcs[0]],
				alt: band ? pcs.filter((p) => !band.includes(p)) : [],
				hot: [],
				segs: [],
				...c.view,
			},
			title: c.title,
			sub: c.sub ?? "",
			say: c.say,
		};
		prev = pcs[0];
		return step;
	});
}

/* --------------------------------------------------------------------------
   I — Sound */

const notes = {
	id: "notes",
	key: 0,
	glyph: 12,
	build(k, naming) {
		const { nm } = words(naming);
		const names = namesInKey(k);
		const home = tonicSpelling(k);
		const r = 60 + k;
		const steps = [];
		for (let i = 0; i <= 12; i++) {
			steps.push({
				dur: i === 12 ? 0.6 : 0.24,
				play: [strike(r + i, 0.5, 0.8)],
				view: {
					tonic: k,
					set: Array.from({ length: i + 1 }, (_, j) => mod(k + j)),
					segs: Array.from({ length: i }, (_, j) => [mod(k + j), mod(k + j + 1), "ink"]),
				},
				sub: nm(names[mod(k + i)]),
			});
		}
		Object.assign(steps[0], {
			title: "Twelve notes",
			say: `Every key from ${nm(home)} up to the next ${nm(home)}, black and white: twelve notes. Each sits seven places round the circle from the one before, so the climb draws a star.`,
		});
		steps.push({
			dur: 2.1,
			play: [strike([r, r + 12], 1.8, 0.7)],
			title: "The octave",
			sub: `${nm(home)} and ${nm(home)}`,
			say: `The thirteenth key is ${nm(home)} again, an octave higher: the same note at twice the frequency. That's why there are only twelve.`,
		});
		return steps;
	},
};

const steps = {
	id: "steps",
	key: 0,
	glyph: 16,
	build(k, naming) {
		const { nm } = words(naming);
		const names = namesInKey(k);
		const n = (pc) => nm(names[mod(pc)]);
		const home = tonicSpelling(k);
		const r = 60 + k;
		const pair = (up) => [strike(r, 0.4, 0.85), strike(r + up, 0.4, 0.85, 0.36), strike([r, r + up], 0.8, 0.6, 0.8)];

		const out = [
			{
				dur: 1.75,
				play: pair(1),
				view: { tonic: k, set: [k, mod(k + 1)], segs: [[k, k + 1, "half"]] },
				title: "Half step",
				sub: `${n(k)} → ${n(k + 1)}`,
				say: `A half step is the very next key, black or white. On the circle it's a long reach: five places round.`,
			},
			{
				dur: 1.75,
				play: pair(2),
				view: { set: [k, mod(k + 2)], segs: [[k, k + 2, "whole"]] },
				title: "Whole step",
				sub: `${n(k)} → ${n(k + 2)}`,
				say: `A whole step skips a key. On the circle it's a short hop: two places clockwise.`,
			},
		];

		const wt = Array.from({ length: 7 }, (_, i) => r + 2 * i);
		const wtPcs = wt.map((n) => mod(n));
		const tones = run(wt, 0.22, (i) => ({ set: wtPcs.slice(0, i + 1), segs: trail(wtPcs, i, () => "whole") }));
		Object.assign(tones[0], {
			title: "Whole-tone scale",
			sub: "six whole steps",
			say: `Six whole steps in a row climb a full octave, and draw a hexagon.`,
		});
		tones.at(-1).dur = 0.8;

		const maj = line(spell(home, SCALE.major), r);
		const majPcs = maj.map((n) => mod(n));
		const scale = run(maj, 0.28, (i) => ({
			set: majPcs.slice(0, i + 1),
			segs: trail(majPcs, i, (j) => (maj[j] - maj[j - 1] === 1 ? "half" : "whole")),
		}));
		Object.assign(scale[0], {
			title: `${nm(home)} major scale`,
			sub: "W W H W W W H",
			say: `The major scale mixes the two: whole, whole, half, whole, whole, whole, half — short hops and long reaches.`,
		});
		scale.at(-1).dur = 1.3;

		return [...out, ...tones, ...scale];
	},
};

/* Intervals in the order the circle measures them: one place, two, … six. */
const INTERVALS = [
	[1, 4, 7, "Perfect fifth", "One place round: the perfect fifth, the steadiest sound after the octave."],
	[2, 1, 2, "Major second", "Two places: a major second — a whole step."],
	[3, 5, 9, "Major sixth", "Three: a major sixth."],
	[4, 2, 4, "Major third", "Four: a major third, the sound of a major chord."],
	[5, 6, 11, "Major seventh", "Five: a major seventh, bright and close to clashing."],
	[6, 3, 6, "Tritone", "Six, straight across: the tritone, the most restless interval of all."],
];

const intervals = {
	id: "intervals",
	key: 0,
	glyph: 5,
	build(k, naming) {
		const { nm } = words(naming);
		const home = tonicSpelling(k);
		const r = 60 + k;
		const pair = (up) => [strike(r, 0.4, 0.85), strike(r + up, 0.4, 0.85, 0.3), strike([r, r + up], 0.75, 0.6, 0.66)];
		const fan = (upto, dim) =>
			INTERVALS.slice(0, upto + 1).map(([d, , semis], j) => [k, k + semis, d === 6 ? "hot" : "ink", dim || j < upto]);

		const out = INTERVALS.map(([d, letters, semis, name, say], i) => ({
			dur: 1.45,
			play: pair(semis),
			view: { tonic: k, set: [k, ...INTERVALS.slice(0, i + 1).map((iv) => mod(k + iv[2]))], segs: fan(i, false) },
			title: name,
			sub: `${nm(home)}–${nm(above(home, letters, semis))} · ${d} place${d > 1 ? "s" : ""}`,
			say: i === 0 ? `Measure from ${nm(home)} round the circle. ${say}` : say,
		}));
		out.push({
			dur: 2.3,
			play: pair(5),
			view: { set: [k, mod(k + 5)], segs: [...fan(5, true), [k, k + 5, "ink", false]] },
			title: "Perfect fourth",
			sub: `${nm(home)}–${nm(above(home, 3, 5))} · one place back`,
			say: "Count the other way and you get their inversions: the fourth, the minor seventh, the minor third, the minor sixth and the minor second.",
		});
		return out;
	},
};

const harmonics = {
	id: "harmonics",
	key: 0,
	glyph: 7,
	build(k, naming) {
		const { nm } = words(naming);
		const home = tonicSpelling(k);
		const f = near(k, 36);
		const PARTIALS = [0, 12, 19, 24, 28, 31, 34, 36];
		const name = { 0: home, 7: above(home, 4, 7), 4: above(home, 2, 4), 10: above(home, 6, 10) };
		const seen = [];
		const out = PARTIALS.map((p, i) => {
			const pc = mod(k + p);
			if (!seen.includes(pc)) seen.push(pc);
			return {
				dur: 0.5,
				play: [strike(f + p, 2.4 - i * 0.14, 1 - i * 0.07)],
				view: { tonic: k, set: [...seen], segs: seen.slice(1).map((q) => [k, q, "ink"]) },
				title: `Harmonic ${i + 1}`,
				sub: nm(name[mod(p)]),
			};
		});
		out[0].say = `Play one low ${nm(home)}. Above it, quieter, ring its harmonics: the octave, then ${nm(name[7])} — the fifth, the first new note — then ${nm(name[4])}, then ${nm(name[10])}.`;
		out.push({
			dur: 2.8,
			play: [strike(PARTIALS.map((p) => f + p), 2.5, 0.3)],
			view: { shape: [k, k + 4, k + 7, k + 10].map((n) => mod(n)), segs: [] },
			title: `${nm(home)}7`,
			sub: "harmonics 4 to 7",
			say: "Stacked up, the first harmonics spell a major chord with a seventh on top. The fifth and the major third are built into the sound of a single note.",
		});
		return out;
	},
};

/* --------------------------------------------------------------------------
   II — Scales & keys */

const majorScaleLesson = {
	id: "major-scale",
	key: 0,
	glyph: 7,
	build(k, naming) {
		const { nm, list } = words(naming);
		const home = tonicSpelling(k);
		const scale = spell(home, SCALE.major);
		const r = 60 + k;
		const mm = line(scale, r);
		const mp = mm.map((n) => mod(n));
		const out = run(mm, 0.3, (i) => ({
			band: pcsOf(scale),
			tonic: k,
			set: mp.slice(0, i + 1),
			segs: trail(mp, i, (j) => (mm[j] - mm[j - 1] === 1 ? "half" : "whole")),
		}));
		Object.assign(out[0], {
			title: `${nm(home)} major`,
			sub: list(scale),
			say: `Whole, whole, half, whole, whole, whole, half. On the circle those seven notes sit side by side, ${nm(scale[3])} to ${nm(scale[6])}: a major key is a slice of seven fifths.`,
		});
		out.at(-1).dur = 0.5;
		/* Home: the tonic chord in gold, over the path faded back. */
		out.push({
			dur: 1.9,
			play: [strike([r - 12, r, r + 4, r + 7], 1.7, 0.55)],
			view: {
				shape: [k, k + 4, k + 7].map((n) => mod(n)),
				tone: "tonic",
				segs: trail(mp, 7, (j) => (mm[j] - mm[j - 1] === 1 ? "half" : "whole")).map((sg) => [...sg, true]),
			},
		});
		return out;
	},
};

const keySignatures = {
	id: "key-signatures",
	key: 0,
	glyph: 3,
	build(k, naming) {
		const { nm, list } = words(naming);
		const home = new Set(pcsOf(spell(tonicSpelling(k), SCALE.major)));
		return [0, 1, 2, 3, -1, -2, -3].map((j) => {
			const K = mod(k + 7 * j);
			const notes = majorScale(K).slice(0, 7);
			const sig = keySignature(notes);
			const pcs = pcsOf(notes);
			const changed = j > 0 ? mod(K - 1) : j < 0 ? mod(K + 5) : null;
			const r = near(K, 55);
			const triad = [r - 12, r, r + 4, r + 7];
			const say =
				j === 0
					? `${nm(tonicSpelling(K))} major: ${sigWords(sig, list, notes)}.`
					: j === 1
						? `Step one place clockwise and one note is raised a half step: ${nm(notes.find((n) => n.pc === changed))}. Every step clockwise raises one more.`
						: j === -1
							? "Step the other way and one note is lowered instead — one more for every place."
							: undefined;
			return {
				dur: 1.45,
				play: changed == null ? [strike(triad, 1.2, 0.55)] : [strike(near(changed, 60), 0.35, 0.85), strike(triad, 1.05, 0.55, 0.32)],
				view: { band: pcs, tonic: K, set: pcs, alt: pcs.filter((p) => !home.has(p)), center: sigMark(sig) },
				title: `${nm(tonicSpelling(K))} major`,
				sub: sigWords(sig, list, notes),
				say,
			};
		});
	},
};

const circle = {
	id: "circle",
	key: 0,
	glyph: 12,
	build(k, naming) {
		const { nm } = words(naming);
		const seen = [];
		const out = [];
		for (let j = 0; j <= 12; j++) {
			const K = mod(k + 7 * j);
			if (j < 12) seen.push(K);
			const sig = keySignature(majorScale(K));
			const b = near(K, 48);
			out.push({
				dur: j === 12 ? 2.6 : 0.44,
				play: j === 12 ? [strike([b, b + 7, b + 12, b + 16], 2.3, 0.55)] : [strike([b, b + 7], 0.6, 0.7)],
				view: {
					tonic: K,
					set: [...seen],
					segs: Array.from({ length: j }, (_, i) => [mod(k + 7 * i), mod(k + 7 * (i + 1)), "ink"]),
					center: sigMark(sig),
				},
				title: `${nm(tonicSpelling(K))} major`,
				sub: sigWords(sig, (ns) => ns.map(nm).join(" "), majorScale(K)),
			});
		}
		const [a, b, c] = [0, 1, 2].map((j) => nm(tonicSpelling(k + 7 * j)));
		out[0].say = `Climb a fifth, then another, and another: ${a}, ${b}, ${c}… Twelve fifths visit every key once and come home.`;
		out[12].say = "Clockwise, each key has one more sharp; counter-clockwise, one more flat. Neighbours share six of their seven notes.";
		return out;
	},
};

const minor = {
	id: "minor",
	key: 9,
	glyph: 0,
	build(k, naming) {
		const { nm, list } = words(naming);
		const root = minorTonicSpelling(k);
		const rel = above(root, 2, 3);
		const r = near(k, 57);
		const nat = spell(root, SCALE.natural);
		const har = spell(root, SCALE.harmonic);
		const mel = spell(root, SCALE.melodic);
		const band = pcsOf(nat);
		const part = (notes, view, text) => {
			const out = run(line(notes, r), 0.24);
			Object.assign(out[0], { view, ...text });
			out.at(-1).dur = 0.85;
			return out;
		};
		return [
			...part(
				nat,
				{ band, tonic: k, set: band, alt: [], minor: [k], major: [rel.pc] },
				{
					title: `${nm(root)} minor`,
					sub: list(nat),
					say: `${nm(root)} minor uses the same seven notes as ${nm(rel)} major; it just calls ${nm(root)} home. It's ${nm(rel)}'s relative minor, and shares its place on the circle.`,
				},
			),
			...part(
				har,
				{ set: pcsOf(har), alt: [har[6].pc] },
				{
					title: "Harmonic minor",
					sub: list(har),
					say: `Harmonic minor raises the seventh, ${nm(nat[6])} to ${nm(har[6])}: a half step below home, it pulls hard back to ${nm(root)}.`,
				},
			),
			...part(
				mel,
				{ set: pcsOf(mel), alt: [mel[5].pc, mel[6].pc] },
				{
					title: "Melodic minor",
					sub: list(mel),
					say: "Melodic minor raises the sixth as well, to smooth the climb. Coming down, players usually fall back to the natural minor.",
				},
			),
		];
	},
};

const MODES = [
	["Lydian", "1 2 3 #4 5 6 7"],
	["Ionian", SCALE.major],
	["Mixolydian", "1 2 3 4 5 6 b7"],
	["Dorian", "1 2 b3 4 5 6 b7"],
	["Aeolian", SCALE.natural],
	["Phrygian", "1 b2 b3 4 5 b6 b7"],
	["Locrian", "1 b2 b3 4 b5 b6 b7"],
];

const modes = {
	id: "modes",
	key: 0,
	glyph: 27,
	build(k, naming) {
		const { nm, list } = words(naming);
		const home = tonicSpelling(k);
		const major = new Set(pcsOf(spell(home, SCALE.major)));
		const r = 60 + k;
		return MODES.flatMap(([mode, formula], i) => {
			const notes = spell(home, formula);
			const pcs = pcsOf(notes);
			const out = run(line(notes, r), 0.14);
			out.at(-1).dur = 0.62;
			Object.assign(out[0], {
				view: { band: pcs, tonic: k, set: pcs, alt: pcs.filter((p) => !major.has(p)) },
				title: `${nm(home)} ${mode}${mode === "Ionian" ? " · major" : mode === "Aeolian" ? " · minor" : ""}`,
				sub: list(notes),
			});
			if (i === 0) {
				out[0].say = `Keep ${nm(home)} as home and slide the slice counter-clockwise, one place at a time. Each step lowers one note and the mode darkens — from Lydian, the brightest, to Locrian, the darkest.`;
			}
			return out;
		});
	},
};

const pentatonic = {
	id: "pentatonic",
	key: 0,
	glyph: 5,
	build(k, naming) {
		const { nm, list } = words(naming);
		const home = tonicSpelling(k);
		const rel = above(home, 5, 9);
		const maj = spell(home, "1 2 3 5 6");
		const min = spell(rel, "1 b3 4 5 b7");
		const blues = spell(rel, "1 b3 4 b5 5 b7");
		const band = pcsOf(maj);
		const a = line(maj, 60 + k);
		const b = line(min, near(rel.pc, 57));
		const star = (mm) => (i) => ({ segs: trail(mm.map((n) => mod(n)), i) });

		const first = run(a, 0.24, star(a));
		Object.assign(first[0].view, { band, tonic: k, set: band, alt: [] });
		Object.assign(first[0], {
			title: `${nm(home)} major pentatonic`,
			sub: list(maj),
			say: "Five fifths in a row — five neighbours on the circle — make the pentatonic scale. With no half steps, nothing clashes.",
		});
		first.at(-1).dur = 0.75;

		const second = run(b, 0.24, star(b));
		Object.assign(second[0].view, { tonic: rel.pc });
		Object.assign(second[0], {
			title: `${nm(rel)} minor pentatonic`,
			sub: list(min),
			say: `Start the same five notes on ${nm(rel)} and they make the minor pentatonic.`,
		});
		second.at(-1).dur = 0.75;

		const third = run(line(blues, near(rel.pc, 57)), 0.22);
		third[0].view = { set: pcsOf(blues), alt: [blues[3].pc], segs: trail(b.map((n) => mod(n)), 5).map((sg) => [...sg, true]) };
		Object.assign(third[0], {
			title: `${nm(rel)} blues scale`,
			sub: list(blues),
			say: `Slip one note between ${nm(blues[2])} and ${nm(blues[4])} — the blue note, ${nm(blues[3])} — and it's the blues scale.`,
		});
		third.at(-1).dur = 1.1;

		return [...first, ...second, ...third];
	},
};

/* --------------------------------------------------------------------------
   III — Chords */

const TRIADS = [
	["", "major", "A major triad: a root, its fifth one place clockwise, and its major third four places round. Three notes, one triangle."],
	["m", "minor", "Minor moves the third the other way: three places counter-clockwise. The same triangle, mirrored."],
	["°", "diminished", "Diminished stacks two minor thirds: tight and tense."],
	["+", "augmented", "Augmented stacks two major thirds: a perfect equilateral triangle, so any of its notes could be the root."],
];

const triads = {
	id: "triads",
	key: 0,
	glyph: 0,
	build(k, naming) {
		const { nm, list } = words(naming);
		const root = tonicSpelling(k);
		const r = near(k, 55);
		return TRIADS.map(([q, quality, say]) => {
			const tones = spell(root, CHORD[q]);
			const pcs = pcsOf(tones);
			return {
				dur: 2.15,
				play: arpThenBlock(tones.map((t) => r + t.semis), { bass: r - 12 }),
				view: { tonic: k, set: pcs, shape: pcs, tone: "ink" },
				title: `${nm(root)} ${quality}`,
				sub: list(tones),
				say,
			};
		});
	},
};

const SEVENTHS = [
	["maj7", "major seventh", "Stack one more third on a major triad: the major seventh chord, soft and open."],
	["7", "dominant seventh", "Lower that seventh a half step: the dominant seventh, the chord that most wants to move."],
	["m7", "minor seventh", "Minor triad, minor seventh: the minor seventh chord."],
	["ø7", "half-diminished", "Flatten its fifth: half-diminished."],
	["°7", "diminished seventh", "Flatten the seventh once more: fully diminished — four minor thirds, a perfect square."],
];

const sevenths = {
	id: "sevenths",
	key: 0,
	glyph: 1,
	build(k, naming) {
		const { nm, list } = words(naming);
		const root = tonicSpelling(k);
		const r = near(k, 55);
		return SEVENTHS.map(([q, quality, say]) => {
			const tones = spell(root, CHORD[q]);
			const pcs = pcsOf(tones);
			return {
				dur: 2.1,
				play: arpThenBlock(tones.map((t) => r + t.semis), { gap: 0.13, bass: r - 12 }),
				view: { tonic: k, set: pcs, shape: pcs, tone: q === "7" ? "hot" : "ink" },
				title: `${nm(root)}${q}`,
				sub: `${quality} · ${list(tones)}`,
				say,
			};
		});
	},
};

const inversions = {
	id: "inversions",
	key: 0,
	glyph: 1,
	build(k, naming) {
		const { nm, list } = words(naming);
		const tones = spell(tonicSpelling(k), CHORD[""]);
		const pcs = pcsOf(tones);
		const r = near(k, 55);
		const VOICINGS = [
			[r, r + 4, r + 7],
			[r + 4, r + 7, r + 12],
			[r + 7, r + 12, r + 16],
		];
		const NAMES = ["Root position", "First inversion", "Second inversion"];
		const SAY = [
			`Rearrange ${list(tones)} so a different note is lowest. On the circle nothing moves — it's still the same three notes — only the bass, ringed, changes.`,
			`${nm(tones[1])} in the bass: first inversion, lighter and less settled.`,
			`${nm(tones[2])} in the bass: second inversion, which wants to move on.`,
		];
		return VOICINGS.map((v, i) => ({
			dur: 2.15,
			play: arpThenBlock(v, { bass: v[0] - 12 }),
			view: { tonic: k, set: pcs, shape: pcs, tone: "ink", bass: mod(v[0]) },
			title: NAMES[i],
			sub: `${nm(tones[i])} in the bass`,
			say: SAY[i],
		}));
	},
};

const NUMERALS = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

const diatonic = {
	id: "diatonic",
	key: 0,
	glyph: 5,
	build(k, naming) {
		const { list, symbol } = words(naming);
		const sc = spell(tonicSpelling(k), SCALE.major);
		const band = pcsOf(sc);
		const chords = [0, 1, 2, 3, 4, 5, 6, 0].map((d, i) => {
			const tones = triadOf(sc, d);
			return {
				tones,
				tone: d === 0 ? "tonic" : "ink",
				title: `${NUMERALS[d]} · ${symbol(tones)}`,
				sub: list(tones),
				view: { arrow: null, major: [k, k + 5, k + 7].map((n) => mod(n)), minor: [k + 2, k + 9, k + 4].map((n) => mod(n)) },
				say:
					i === 0
						? "Build a triad on every note of the scale. The three major chords — IV, I and V — sit side by side on the circle, their relative minors ii, vi and iii just beyond them. Only vii°, diminished, stands apart."
						: undefined,
			};
		});
		return progression(chords, band, k, { dur: 0.95, last: 1.8 });
	},
};

const EXTENSIONS = [
	["", "1 3 5", [0, 19, 24, 28]],
	["maj7", "1 3 5 7", [0, 19, 23, 28]],
	["maj9", "1 3 5 7 9", [0, 16, 23, 26, 31]],
	["maj13♯11", "1 3 5 7 9 #11 13", [0, 16, 23, 26, 30, 33]],
];

const extensions = {
	id: "extensions",
	key: 0,
	glyph: 3,
	build(k, naming) {
		const { nm, list } = words(naming);
		const root = tonicSpelling(k);
		const b = near(k, 36);
		/* Every line is written up front, so name the notes from the full stack. */
		const full = spell(root, EXTENSIONS.at(-1)[1]);
		return EXTENSIONS.map(([q, formula, voicing], i) => {
			const tones = spell(root, formula);
			const pcs = pcsOf(tones);
			const say = [
				`Keep stacking thirds above ${nm(root)}. Each new note lands alternately four places forward and three back round the circle, so the shape keeps growing.`,
				`Add ${nm(full[3])}, the seventh: ${nm(root)}maj7.`,
				`Add ${nm(full[4])}, the ninth: ${nm(root)}maj9.`,
				`Add ${nm(full[5])} and ${nm(full[6])}: seven notes, a full slice of the circle — all of ${nm(root)} Lydian, sounding at once.`,
			][i];
			return {
				dur: 2.3,
				play: voicing.map((v, j) => strike(b + v, 2 - j * 0.07, j ? 0.5 : 0.7, j * 0.07)),
				view: { tonic: k, set: pcs, shape: pcs, tone: "ink", band: i === 3 ? pcs : null },
				title: `${nm(root)}${q}`,
				sub: list(tones),
				say,
			};
		});
	},
};

/* --------------------------------------------------------------------------
   IV — Harmony */

const functions = {
	id: "function",
	key: 0,
	glyph: 2,
	build(k, naming) {
		const { nm, symbol } = words(naming);
		const sc = spell(tonicSpelling(k), SCALE.major);
		const band = pcsOf(sc);
		const tritone = { hot: [sc[6].pc, sc[3].pc] };
		const I = triadOf(sc, 0);
		const V7 = seventhOf(sc, 4);
		const chords = [
			{ tones: I, tone: "tonic", title: "I · tonic", say: "I is home: the tonic." },
			{ tones: triadOf(sc, 3), tone: "away", title: "IV · subdominant", say: "IV leans away from home: the subdominant." },
			{
				tones: V7,
				tone: "hot",
				view: tritone,
				title: "V7 · dominant",
				say: `V7 holds the most tension: its ${nm(sc[6])} wants to rise to ${nm(sc[0])}, its ${nm(sc[3])} to fall to ${nm(sc[2])}.`,
			},
			{ tones: I, tone: "tonic", title: "I · home", say: "V → I, one place counter-clockwise: the authentic cadence, the strongest way home." },
			{ tones: V7, tone: "hot", view: tritone, title: "V7 · dominant", say: "Play V7 again…" },
			{ tones: triadOf(sc, 5), tone: "tonic", title: "vi · deceptive", say: "…and land on vi instead. The ear expected home: a deceptive cadence." },
		].map((c) => ({ ...c, sub: symbol(c.tones) }));
		return progression(chords, band, k, { dur: 1.25, last: 2.1 });
	},
};

const voiceLeading = {
	id: "voice-leading",
	key: 0,
	glyph: 1,
	build(k, naming) {
		const { list, symbol } = words(naming);
		const sc = spell(tonicSpelling(k), SCALE.major);
		let last = null;
		const chords = [0, 5, 3, 1, 4, 0].map((d, i) => {
			const tones = triadOf(sc, d);
			const keep = last ? tones.filter((t) => last.includes(t.pc)) : [];
			last = pcsOf(tones);
			return {
				tones,
				tone: d === 0 ? "tonic" : "ink",
				title: symbol(tones),
				sub: keep.length ? `keeps ${list(keep)}` : list(tones),
				view: { arrow: null },
				say:
					i === 0
						? "Keep the notes two chords share, and move the others by the smallest step you can. Watch the circle: the shared notes stay put while the rest slide."
						: undefined,
			};
		});
		return progression(chords, pcsOf(sc), k, { dur: 1.15, last: 2 });
	},
};

const circleProgression = {
	id: "circle-progression",
	key: 0,
	glyph: 4,
	build(k, naming) {
		const { symbol } = words(naming);
		const sc = spell(tonicSpelling(k), SCALE.major);
		const NUM = { 2: "iii7", 5: "vi7", 1: "ii7", 4: "V7", 0: "Imaj7" };
		const chords = [2, 5, 1, 4, 0].map((d, i) => {
			const tones = seventhOf(sc, d);
			return {
				tones,
				tone: d === 0 ? "tonic" : d === 4 ? "hot" : "ink",
				title: `${NUM[d]} · ${symbol(tones)}`,
				say: [
					"Roots that fall a fifth — one place counter-clockwise — make the strongest motion in harmony. Walk home from iii: iii, vi, ii, V, I.",
					undefined,
					"The last three, ii–V–I, are the backbone of jazz.",
				][i],
			};
		});
		return progression(chords, pcsOf(sc), k, { dur: 1.15, last: 2.2 });
	},
};

const secondaryDominants = {
	id: "secondary-dominants",
	key: 0,
	glyph: 3,
	build(k, naming) {
		const { nm, symbol } = words(naming);
		const sc = spell(tonicSpelling(k), SCALE.major);
		const dom = (d) => spell(sc[d], CHORD[7]);
		const chords = [
			{ tones: triadOf(sc, 0), tone: "tonic", title: "I", say: `Start at home, on ${nm(sc[0])}.` },
			{
				tones: dom(2),
				tone: "hot",
				title: "V7 of vi",
				say: `${nm(sc[2])}7 is the V7 of ${nm(sc[5])}m: it brings in ${nm(dom(2)[1])}, from outside the key, to point there.`,
			},
			{ tones: dom(5), tone: "hot", title: "V7 of ii", say: "Chain them, and each borrows one note — the roots fall round the circle, one place at a time…" },
			{ tones: dom(1), tone: "hot", title: "V7 of V" },
			{ tones: dom(4), tone: "hot", title: "V7" },
			{ tones: triadOf(sc, 0), tone: "tonic", title: "I", say: "…all the way home." },
		].map((c) => ({ ...c, sub: symbol(c.tones) }));
		return progression(chords, pcsOf(sc), k, { dur: 1.1, last: 2.1 });
	},
};

const modulation = {
	id: "modulation",
	key: 0,
	glyph: 4,
	build(k, naming) {
		const { nm, symbol } = words(naming);
		const C = spell(tonicSpelling(k), SCALE.major);
		const G = spell(tonicSpelling(k + 7), SCALE.major);
		const from = pcsOf(C);
		const to = pcsOf(G);
		const chords = [
			{ tones: triadOf(C, 0), tone: "tonic", title: `I in ${nm(C[0])}`, say: "To change key, pass through a chord both keys share." },
			{ tones: triadOf(C, 3), title: `IV in ${nm(C[0])}` },
			{
				tones: triadOf(C, 5),
				title: `vi in ${nm(C[0])} = ii in ${nm(G[0])}`,
				view: { ghost: to },
				say: `${nm(C[5])}m belongs to ${nm(C[0])} major and ${nm(G[0])} major alike: the pivot.`,
			},
			{
				tones: spell(G[4], CHORD[7]),
				tone: "hot",
				title: `V7 in ${nm(G[0])}`,
				view: { band: to, ghost: from, alt: [G[6].pc] },
				say: `${nm(G[4])}7 brings in ${nm(G[6])}, and the slice slides one place clockwise…`,
			},
			{ tones: triadOf(G, 0), tone: "tonic", title: `I in ${nm(G[0])}`, view: { band: to, ghost: from, tonic: G[0].pc, alt: [] }, say: `…and ${nm(G[0])} is home now.` },
		].map((c) => ({ ...c, sub: symbol(c.tones) }));
		return progression(chords, from, k, { dur: 1.2, last: 2.2 });
	},
};

const borrowed = {
	id: "borrowed",
	key: 0,
	glyph: 4,
	build(k, naming) {
		const { nm, symbol } = words(naming);
		const home = tonicSpelling(k);
		const sc = spell(home, SCALE.major);
		const ghost = pcsOf(spell(home, SCALE.natural));
		const iv = spell(sc[3], CHORD.m);
		const chords = [
			{
				tones: triadOf(sc, 0),
				tone: "tonic",
				title: "I",
				view: { ghost },
				say: `${nm(home)} minor shares ${nm(home)}'s home but sits three places counter-clockwise: the dashed slice. Its chords can be borrowed.`,
			},
			{ tones: triadOf(sc, 3), title: "IV" },
			{ tones: iv, title: "iv · borrowed", say: `${nm(sc[3])} → ${nm(sc[3])}m: one note darkens, ${nm(sc[5])} to ${nm(iv[1])}.` },
			{ tones: triadOf(sc, 0), tone: "tonic", title: "I" },
			{
				tones: spell(above(home, 5, 8), CHORD[""]),
				title: "♭VI · borrowed",
				say: "♭VI and ♭VII come from the minor too — and climb back home, bright.",
			},
			{ tones: spell(above(home, 6, 10), CHORD[""]), title: "♭VII · borrowed" },
			{ tones: triadOf(sc, 0), tone: "tonic", title: "I" },
		].map((c) => ({ ...c, sub: symbol(c.tones) }));
		return progression(chords, pcsOf(sc), k, { dur: 1.05, last: 2.1 });
	},
};

const tritoneSub = {
	id: "tritone-sub",
	key: 0,
	glyph: 4,
	build(k, naming) {
		const { nm, symbol } = words(naming);
		const home = tonicSpelling(k);
		const sc = spell(home, SCALE.major);
		const sub = spell(above(home, 1, 1), CHORD[7]);
		const [ti, fa] = [sc[6].pc, sc[3].pc];
		const tense = { hot: [ti, fa], segs: [[ti, fa, "hot"]] };
		const ii = seventhOf(sc, 1);
		const I = seventhOf(sc, 0);
		const chords = [
			{ tones: ii, title: "ii7", say: "First, the usual ii–V–I." },
			{
				tones: seventhOf(sc, 4),
				tone: "hot",
				title: "V7",
				view: tense,
				say: `${nm(sc[4])}7 holds a tritone, ${nm(sc[6])} and ${nm(sc[3])} — straight across the circle — and that tension is what drives it home.`,
			},
			{ tones: I, tone: "tonic", title: "Imaj7" },
			{ tones: ii, title: "ii7", say: "Now swap the V7 for the chord directly opposite it…" },
			{
				tones: sub,
				tone: "hot",
				title: "♭II7 · tritone sub",
				view: { ...tense, major: [sc[4].pc, sub[0].pc] },
				say: `${nm(sub[0])}7 holds the same tritone (${nm(sub[3])} sounds as ${nm(sc[6])}), so it leads home just as well — and the bass slides down by half steps: ${nm(sc[1])}, ${nm(sub[0])}, ${nm(sc[0])}.`,
			},
			{ tones: I, tone: "tonic", title: "Imaj7" },
		].map((c) => ({ ...c, sub: symbol(c.tones) }));
		return progression(chords, pcsOf(sc), k, { dur: 1.2, last: 2.3 });
	},
};

/* --------------------------------------------------------------------------
   Basics, and rhythm & meter — the chapters before the circle.

   These are about where notes are written and how long they last, so
   their demonstrations are melodies in time, written the way the lessons
   write them ("E4q. D4e D4h |", js/rhythm.js), played with the metronome: a
   tick on every beat, the first of each measure loudest. Each note lights
   on the circle as it sounds; a key picked on the circle moves the tune. */

/** A melody as steps, one per note or rest, moved up `k` semitones (or
    down, past a fifth), with the clicks that fall inside each step. Held
    tones, so a long note is heard for all of its length. */
function inTime(text, k, { bpm = 96, time = "4/4", clicks = true } = {}) {
	const music = parse(text);
	const spq = 60 / bpm;
	const shift = k > 6 ? k - 12 : k;
	const holds = new Map(sounds(music).map((s) => [s.i, s.d]));
	const steps = [];
	music.items.forEach((it, i) => {
		if (it.held) {
			steps.at(-1).dur += it.d * spq;
			return;
		}
		const play = [];
		if (it.kind === "note") play.push({ dt: 0, notes: [it.midi + shift], hold: holds.get(i) * spq - 0.04, vel: 0.8, sus: true });
		steps.push({ t: it.t, dur: it.d * spq, play, view: it.kind === "note" ? { tonic: k, set: [mod(it.midi + shift)] } : { tonic: k, set: [] } });
	});
	if (clicks) {
		for (const q of pulses(music, readMeter(time))) {
			const st = steps.findLast((s) => s.t <= q.t + 1e-6);
			st?.play.push({ dt: (q.t - st.t) * spq, notes: [], tick: q.level });
		}
	}
	return steps;
}

/** Labels a run of steps: its first step names it. */
const titled = (steps, title, sub, say) => (Object.assign(steps[0], { title, sub, say }), steps);

const staffBasics = {
	id: "staff",
	key: 0,
	glyph: 8,
	build(_, naming) {
		const { nm } = words(naming);
		const white = namesInKey(0);
		const lines = [64, 67, 71, 74, 77];
		const spaces = [65, 69, 72, 76];
		const each = (ms) => (i) => ({ tonic: null, set: ms.slice(0, i + 1).map((m) => mod(m)) });
		const name = (ms) => ms.map((m) => nm(white[mod(m)])).join(" ");
		return [
			...titled(run(lines, 0.42, each(lines)), "Lines", name(lines), "The five lines of the treble staff, bottom to top. Every line and every space stands for one white key."),
			...titled(run(spaces, 0.42, each(spaces)), "Spaces", name(spaces), "Then the four spaces between them. Each step up the staff is the next white key up."),
		];
	},
};

const durationBasics = {
	id: "note-duration",
	key: 0,
	glyph: 30,
	build(k) {
		return [
			...titled(inTime("C4w |", k, { bpm: 88 }), "Whole note", "four beats", "A note's shape says how long it lasts. Count the clicks: a whole note lasts four beats."),
			...titled(inTime("E4h G4h |", k, { bpm: 88 }), "Half notes", "two beats each", "A half note lasts half as long: two beats."),
			...titled(inTime("C5q G4q E4q G4q |", k, { bpm: 88 }), "Quarter notes", "one beat each", "A quarter note lasts one beat."),
			...titled(inTime("C4e D4e E4e F4e G4e F4e E4e D4e |", k, { bpm: 88 }), "Eighth notes", "half a beat", "An eighth note has a flag, and lasts half a beat."),
			...titled(inTime("C4s D4s E4s F4s G4s F4s E4s D4s C4s D4s E4s F4s G4s A4s B4s C5s |", k, { bpm: 88 }), "Sixteenth notes", "a quarter of a beat", "A sixteenth note has two flags: four to a beat."),
		];
	},
};

const timeBasics = {
	id: "time-signatures",
	key: 0,
	glyph: 12,
	build(k) {
		return [
			...titled(inTime("C4q C4q G4q G4q | A4q A4q G4h |", k), "4/4", "four beats in a measure", "Bar lines divide music into measures. In 4/4, each measure holds four quarter-note beats."),
			...titled(inTime("C4q E4q G4q | C5h B4q | A4q F4q D4q | C4h. |", k, { bpm: 108, time: "3/4" }), "3/4", "three beats in a measure", "In 3/4, each measure holds three. Listen for the loud click on beat 1."),
		];
	},
};

const restBasics = {
	id: "rests",
	key: 0,
	glyph: 6,
	build(k) {
		return titled(
			inTime("E4q D4q C4q D4q | E4q E4q E4q rq | D4q D4q D4q rq | E4q G4q G4q rq |", k),
			"Rests",
			"silence, counted",
			"A rest is silence that lasts as long as a note. The clicks go on through it.",
		);
	},
};

const dotBasics = {
	id: "dots-ties",
	key: 0,
	glyph: 2,
	build(k) {
		return [
			...titled(inTime("C4q C4q D4q E4q | E4q. D4e D4h |", k, { bpm: 88 }), "Dotted quarter", "a beat and a half", "A dot adds half a note's value: a dotted quarter lasts a beat and a half."),
			...titled(inTime("C4q D4q E4q F4q~ | F4q E4q D4q C4q |", k, { bpm: 88 }), "Tie", "two notes, one sound", "A tie joins two notes of the same pitch into one, held across the bar line."),
		];
	},
};

const SIX = "C4e E4e G4e C5e G4e E4e | D4e F4e A4e B4e G4e D4e |";

const meterBasics = {
	id: "meter",
	key: 0,
	glyph: 3,
	build(k) {
		return [
			...titled(inTime(SIX, k, { bpm: 92, time: "6/8" }), "6/8", "two beats of three", "In compound meter each beat splits in three: 6/8 is two beats of three eighth notes."),
			...titled(inTime(SIX, k, { bpm: 92, time: "3/4" }), "3/4", "three beats of two", "The same six eighth notes in 3/4 make three beats of two: simple meter."),
		];
	},
};

const oddBasics = {
	id: "odd-meter",
	key: 0,
	glyph: 3,
	build(k) {
		return [
			...titled(
				inTime("C4e G4e C4e G4e C4e E4e G4e | D4e A4e D4e A4e D4e F4e A4e | C5q G4q C4q. |", k, { bpm: 132, time: "7/8:2+2+3" }),
				"7/8",
				"2 + 2 + 3",
				"An odd meter mixes beats of two and three: 7/8 is two short beats and a long one.",
			),
		];
	},
};

export const lessons = [
	staffBasics,
	durationBasics,
	timeBasics,
	restBasics,
	dotBasics,
	meterBasics,
	oddBasics,
	notes,
	steps,
	intervals,
	harmonics,
	majorScaleLesson,
	keySignatures,
	circle,
	minor,
	modes,
	pentatonic,
	triads,
	sevenths,
	inversions,
	diatonic,
	extensions,
	functions,
	voiceLeading,
	circleProgression,
	secondaryDominants,
	modulation,
	borrowed,
	tritoneSub,
];

/* --------------------------------------------------------------------------
   A key on its own — what clicking the circle plays when no lesson is
   chosen: the scale, quickly, then its home chord. */

export function keyDemo(k, ring, naming) {
	const { nm, list } = words(naming);
	const isMinor = ring === "minor";
	const root = isMinor ? minorTonicSpelling(k) : tonicSpelling(k);
	const rel = isMinor ? above(root, 2, 3) : above(root, 5, 9);
	const notes = spell(root, isMinor ? SCALE.natural : SCALE.major);
	const pcs = pcsOf(notes);
	const r = isMinor ? near(k, 57) : 60 + k;
	const chord = isMinor ? [k, k + 3, k + 7] : [k, k + 4, k + 7];
	const out = run(line(notes, r), 0.12);
	Object.assign(out[0], {
		view: { band: pcs, tonic: k, set: pcs, minor: isMinor ? [k] : [rel.pc], major: isMinor ? [rel.pc] : [k] },
		title: `${nm(root)} ${isMinor ? "minor" : "major"}`,
		sub: list(notes),
		say: isMinor
			? `${nm(root)} minor: the same seven notes as ${nm(rel)} major, with ${nm(root)} as home.`
			: `${nm(root)} major — ${sigWords(keySignature(majorScale(k)), list, majorScale(k))}. Its relative minor is ${nm(rel)} minor.`,
	});
	out.at(-1).dur = 0.35;
	out.push({
		dur: 1.8,
		play: [strike([r - 12, ...chord.map((pc) => near(pc, r))], 1.6, 0.55)],
		view: { shape: chord.map((n) => mod(n)), tone: "tonic" },
	});
	return out;
}
