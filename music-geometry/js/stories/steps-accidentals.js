/* Steps and accidentals — after musictheory.net's lesson of the same name,
   in its plain style, with the major scale lesson's marks: a half step is
   a yellow V under the notes, a whole step a blue arch over them.

     steps        a half step is the next key; E–F and B–C are half steps
                  too; a whole step has exactly one key in between
     accidentals  sharp and flat; one black key, two names; white keys with
                  other names; double sharp and double flat; the natural
     melody       a tune that rocks by a half step
     your turn    any key, with every name it can have

   A whole step is drawn as one arch, never as two half-step hops (Dimah's
   rule from the major scale lesson), and said to have one key between.

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import { shortest, LETTERS } from "../theory.js";
import { base, cam, CAM, row, kb, titleBeat, untitle, namer, writeIn, count, H, W, T, G, E } from "./kit.js";

export { namer };

const GAP = 0.6;
const RUN = 240 / GAP / 4;
const LEAD = 0.15;
const ELISE = "E5s D#5s | E5s D#5s E5s B4s D5s C5s | A4e. ||";

export const defaults = base(1, {
	...row(0, { x: 60, y: 330, s: 1, u: 28, left: 96, w: 674, bars: 0, names: 1, m: "C4w C#4w D4w D#4w E4w", rev: 0, draw: 0 }),
	...kb({ x: 790, y: 300, s: 1.05, lo: 60, hi: 77, names: 1 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "Steps and Accidentals", sub: "half steps, whole steps, sharps and flats", size: 100 }),
		score.create(layer(), { rows: 1 }),
		keyboard.create(layer(), { lo: 60, hi: 77 }),
	];
}

/* One example: notes on the staff, written in as they sound, and steps
   measured on the keyboard, each drawn as the note it reaches sounds.
   `marks` pairs each span with the note that completes it. */
function example({ m, spans = [], marks = [], gold = "", at = 0.5 }) {
	const set = { "st0.m": m, "st0.rev": count(m), "kb.spans": spans.join(" "), "kb.gold": gold };
	const time = [writeIn(0, at + LEAD, GAP, count(m))];
	spans.forEach((_, i) => {
		set[`kb.sp${i}.d`] = 1;
		time.push([`kb.sp${i}.d`, { delay: at + LEAD + marks[i] * GAP, dur: GAP * 0.8 }]);
	});
	return { set, time, sound: { at, play: (S) => S.music(0, { bpm: RUN, click: false, sus: false }) } };
}

const clear = { values: { "st0.rev": 0, ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`kb.sp${i}.d`, 0])) }, dur: 0.4 };
const unspan = Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`kb.sp${i}.d`, 0]));
const CAM_MAIN = cam(20, 170, 1560, 450);

/* --------------------------------------------------------------------------
   Every way to spell one key: each letter whose white key is within a
   whole step of it, with the accidental that reaches it. */

const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const MARK = { "-2": "bb", "-1": "b", 0: "", 1: "#", 2: "##" };

function spellings(m) {
	const out = [];
	for (let L = 0; L < 7; L++) {
		const acc = shortest(m - NATURAL[L]);
		if (Math.abs(acc) > 2) continue;
		const octave = Math.floor((m - acc) / 12) - 1;
		out.push({ name: LETTERS[L] + MARK[acc], octave, height: m - acc });
	}
	out.sort((a, b) => a.height - b.height);
	return {
		names: out.map((s) => s.name),
		m: out.map((s) => `${s.name}${s.octave}w*`).join(" "),
	};
}

const step = (id, chapter, ex, say) => {
	const e = example(ex);
	return { id, chapter, reset: clear, set: { ...unspan, ...e.set }, time: e.time, sound: e.sound, say };
};

export const beats = [
	titleBeat("Steps"),
	{
		id: "half",
		chapter: "Steps",
		...(() => {
			const e = example({ m: "C4w C#4w D4w D#4w E4w", spans: ["60-61", "61-62", "62-63", "63-64"], marks: [1, 2, 3, 4], at: 2 });
			return {
				set: { ...CAM_MAIN, ...untitle, "st0.o": 1, "st0.draw": 1, "kb.o": 1, ...e.set },
				time: [
					[CAM, { dur: 1.2 }],
					["title.o sub.o", { dur: 0.6 }],
					["st0.o", { delay: 0.4, dur: 0.01 }],
					["st0.draw", { delay: 0.4, dur: 1.2 }],
					["kb.o", { delay: 0.6, dur: 0.8 }],
					...e.time,
				],
				sound: e.sound,
			};
		})(),
		say: () => [
			"A ",
			H("half step"),
			" is the distance from one key to the very next key, black or white. Climbing key by key, every step is a half step.",
		],
	},
	step(
		"white-half",
		"Steps",
		{ m: "E4w F4w _w B4w C5w", spans: ["64-65", "71-72"], marks: [1, 4] },
		(N) => [
			`A half step is not always from white to black. ${N("E")} and ${N("F")} sit right next to each other, so ${N("E")} to ${N("F")} is a `,
			H("half step"),
			`. So is ${N("B")} to ${N("C")}.`,
		],
	),
	step(
		"whole",
		"Steps",
		{ m: "C4w D4w E4w F#4w", spans: ["60-62", "62-64", "64-66"], marks: [1, 2, 3] },
		(N) => [
			"A ",
			W("whole step"),
			` is two half steps, so there is always exactly one key in between. ${N("C")} to ${N("D")}, ${N("D")} to ${N("E")} and ${N("E")} to ${N("F#")} are whole steps.`,
		],
	),
	step(
		"sharp-flat",
		"Accidentals",
		{ m: "D4w D#4w D4w Db4w", spans: ["62-63", "62-61"], marks: [1, 3] },
		() => [
			"An ",
			E("accidental"),
			" is a sign that raises or lowers a note. A ",
			E("sharp ♯"),
			" raises a note by a half step. A ",
			E("flat ♭"),
			" lowers it by a half step.",
		],
	),
	step(
		"two-names",
		"Accidentals",
		{ m: "C4w C#4w* Db4w* D4w", spans: ["60-61", "62-61"], marks: [1, 2], gold: "61" },
		(N) => [
			`The black key between ${N("C")} and ${N("D")} has two names. It is `,
			T(N("C#")),
			`, a half step above ${N("C")}, and `,
			T(N("Db")),
			`, a half step below ${N("D")}.`,
		],
	),
	step(
		"enharmonic",
		"Accidentals",
		{ m: "E4w* Fb4w* F4w E#4w", spans: ["65-64", "64-65"], marks: [1, 3], gold: "64" },
		(N) => [
			`White keys can have other names too. ${N("E")} is also `,
			T(N("Fb")),
			`, and ${N("F")} is also ${N("E#")}. When one pitch has two names, they are called `,
			E("enharmonic"),
			" spellings.",
		],
	),
	step(
		"double",
		"Accidentals",
		{ m: "D4w* C##4w* Ebb4w*", spans: ["60-62", "64-62"], marks: [1, 2], gold: "62" },
		(N) => [
			"A ",
			E("double sharp 𝄪"),
			" raises a note by a whole step, and a ",
			E("double flat 𝄫"),
			` lowers it by a whole step. So ${N("D")} can also be written `,
			T(N("C##")),
			" or ",
			T(N("Ebb")),
			".",
		],
	),
	step(
		"natural",
		"Accidentals",
		{ m: "F#4w Fn4w Bb4w Bn4w", spans: ["66-65", "70-71"], marks: [1, 3] },
		() => ["A ", E("natural ♮"), " cancels a sharp or a flat, and the note goes back to its white key."],
	),
	{
		id: "melody",
		chapter: "Melody",
		reset: clear,
		set: { ...unspan, ...row(0, { m: ELISE, time: "3/8:3", u: 200, w: 0, bars: 1, names: 0, rev: count(ELISE) }), "kb.spans": "76-75", "kb.sp0.d": 1, "kb.gold": "" },
		time: [
			["st0.u st0.w", { dur: 0.01 }],
			["st0.rev", { delay: 0.1, dur: 1 }],
			["kb.sp0.d", { delay: 1.6, dur: 0.5 }],
		],
		sound: { at: 1.4, play: (S) => S.music(0, { bpm: 60, click: false, sus: false }) },
		say: (N) => [
			`This melody uses a sharp. Its first notes rock back and forth by a half step: ${N("E")}, `,
			G(N("D#")),
			`, ${N("E")}, `,
			G(N("D#")),
			"…",
		],
	},
	{
		id: "yours",
		chapter: "Your turn",
		interactive: true,
		reset: clear,
		set: { ...unspan, ...row(0, { m: spellings(61).m, time: "", u: 28, w: 674, bars: 0, names: 1, rev: 6 }), "kb.spans": "", "kb.gold": "61", pick: "61", interactive: 1 },
		time: [
			["st0.u st0.w", { dur: 0.01 }],
			["st0.rev", { delay: 0.1, dur: 0.8 }],
		],
		say: (N, P) => {
			const { names } = spellings(Number(P.pick) || 61);
			const list = names.map((n) => N(n));
			return ["Your turn: click any key to see every name it can have. ", T(list.join(", ")), ` — ${list.length} names for one key.`];
		},
	},
];

export function interact(data, { S }) {
	if (data.midi == null) return;
	const m = Number(data.midi);
	const sp = spellings(m);
	S.set({ pick: String(m), "st0.m": sp.m, "st0.rev": 6, "kb.gold": String(m) }, 0.01);
	S.note(m, 1.2);
	S.say();
}
