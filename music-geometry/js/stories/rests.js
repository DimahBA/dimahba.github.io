/* Rests — after musictheory.net's lesson "Rest Duration", in its plain
   style. A rest is silence that lasts as long as a note would; every
   example is a melody with a click on each beat, so the silence is counted,
   not skipped.

     listen     a melody with rests in it
     quarter    four quarter notes; the second becomes a quarter rest
     others     the whole rest, hanging from the fourth line; the half rest,
                sitting on the middle line; eighth and sixteenth rests, with
                flags like their notes
     your turn  a chart of every note beside its rest, and a melody for
                each rest to hear

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import { base, cam, CAM, row, kb, titleBeat, untitle, namer, count, swap, E, T } from "./kit.js";

export { namer };

const BPM = 96;
const INTRO = "C4q C4q G4q G4q | A4q A4q G4q rq | F4q F4q E4q E4q | D4q D4q C4q rq ||";
const FOUR = "E4q D4q C4q D4q ||";
const GAP = "E4q rq C4q D4q ||";

/* A melody for each rest, all on the same tune. */
const EX = {
	whole: { m: "E4q D4q C4q D4q | rw | E4q E4q E4h | rw ||", u: 48, hl: 36, label: "Whole rest" },
	half: { m: "E4q D4q C4q D4q | E4q E4q E4h | D4q D4q rh | E4q G4q G4h ||", u: 48, hl: 34, label: "Half rest" },
	quarter: { m: "E4q rq C4q rq | E4q E4q E4q rq | D4q rq D4q rq | E4q G4q G4q rq ||", u: 48, hl: 34, label: "Quarter rest" },
	eighth: { m: "C4e re E4e G4e re E4e C4q | D4e re F4e A4e re F4e D4q ||", u: 88, hl: 34, label: "Eighth rest" },
	sixteenth: { m: "C4s E4s rs G4s C4s E4s rs G4s D4s F4s rs A4s G4q ||", u: 150, hl: 34, label: "Sixteenth rest" },
};

const CHART = "C4w@whole rw _w C4h@half rh _h C4q@quarter rq _q C4e@eighth re _e C4s@sixteenth rs";

const ROW = { x: 60, y: 190, s: 0.95, left: 150, time: "4/4", box: 1, count: 1 };
const ex = (r, key) => row(r, { m: EX[key].m, u: EX[key].u, hl: EX[key].hl, rev: count(EX[key].m) });

export const defaults = base(3, {
	...row(0, { ...ROW, m: INTRO, u: 48 }),
	...row(1, { ...ROW, m: GAP, u: 160 }),
	...row(2, { x: 60, y: 150, s: 0.95, left: 96, u: 66, even: 1, m: CHART, names: 1, bars: 0 }),
	...kb({ x: 1120, y: 200, s: 0.75, lo: 60, hi: 72 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "Rests", sub: "silence that is counted" }),
		score.create(layer(), { rows: 3 }),
		keyboard.create(layer(), { lo: 60, hi: 72 }),
	];
}

const play = (r) => (S) => S.music(r, { bpm: BPM });
const CAM_MAIN = cam(20, 100, 1560, 330);
const swapIn = { values: { "st0.rev": 0, "st0.hlo": 0 }, dur: 0.4 };
const writeNew = [["st0.rev", { delay: 0.1, dur: 1.2 }]];

export const beats = [
	titleBeat("Listen"),
	{
		id: "listen",
		chapter: "Listen",
		set: { ...CAM_MAIN, ...untitle, "st0.o": 1, "st0.to": 1, "kb.o": 1 },
		time: [
			[CAM, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			["st0.o st0.to", { delay: 0.4, dur: 0.8 }],
			["kb.o", { delay: 0.7, dur: 0.8 }],
		],
		sound: { at: 1.6, play: play(0) },
		say: () => [
			"A ",
			E("rest"),
			" is a moment of silence in a measure. Every kind of note has a rest that lasts just as long. Listen for the two silent beats.",
		],
	},
	{
		id: "four",
		chapter: "Quarter rest",
		reset: swapIn,
		set: { "st0.m": FOUR, "st0.u": 160, "st0.rev": count(FOUR) },
		time: [["st0.u", { dur: 0.01 }], ...writeNew],
		sound: { at: 1.4, play: play(0) },
		say: () => ["Here is a measure of 4/4 filled with quarter notes. Every beat has a note, and all four of them sound."],
	},
	{
		id: "quarter",
		chapter: "Quarter rest",
		set: { "st0.o": 0, "st1.o": 1, "st1.to": 1 },
		time: [["st0.o st1.o st1.to", { dur: 0.8 }]],
		sound: { at: 1, play: play(1) },
		say: () => [
			"Now the second note is replaced by a ",
			E("quarter rest"),
			". The click keeps going, but beat 2 is silent.",
		],
	},
	{
		id: "whole",
		chapter: "Other rests",
		reset: swapIn,
		set: { "st1.o": 0, "st0.o": 1, ...ex(0, "whole"), "st0.hlo": 1 },
		time: [["st1.o", { dur: 0.4 }], ["st0.o st0.u", { dur: 0.01 }], ...writeNew, ["st0.hlo", { delay: 1.2, dur: 0.6 }]],
		sound: { at: 2, play: play(0) },
		say: () => [
			"A ",
			E("whole rest"),
			" lasts as long as a whole note: here, a whole measure. It is a small box that ",
			T("hangs down from the fourth line"),
			".",
		],
	},
	{
		id: "half",
		chapter: "Other rests",
		reset: swapIn,
		set: { ...ex(0, "half"), "st0.hlo": 1 },
		time: [...writeNew, ["st0.hlo", { delay: 1.2, dur: 0.6 }]],
		sound: { at: 2, play: play(0) },
		say: () => [
			"A ",
			E("half rest"),
			" lasts as long as a half note. It is the same box turned over: it ",
			T("sits on the middle line"),
			".",
		],
	},
	{
		id: "eighth",
		chapter: "Other rests",
		reset: swapIn,
		set: { ...ex(0, "eighth"), "st0.hlo": 0 },
		time: writeNew,
		sound: { at: 1.6, play: play(0) },
		say: () => [
			"Like notes, rests can have flags. With one flag, an ",
			E("eighth rest"),
			" lasts as long as an eighth note.",
		],
	},
	{
		id: "sixteenth",
		chapter: "Other rests",
		reset: swapIn,
		set: { ...ex(0, "sixteenth"), "st0.hlo": 0 },
		time: writeNew,
		sound: { at: 1.6, play: (S) => S.music(0, { bpm: 72 }) },
		say: () => [
			"With two flags, a ",
			E("sixteenth rest"),
			" lasts as long as a sixteenth note. Rests with three or more flags exist too, but they are rare.",
		],
	},
	{
		id: "chart",
		chapter: "Your turn",
		reset: swapIn,
		set: { ...cam(20, 40, 1560, 600), "st2.o": 1, "st0.y": 400, ...ex(0, "quarter"), "st0.hlo": 0, pick: "quarter" },
		time: [
			[CAM, { dur: 1 }],
			["st0.y", { dur: 0.01 }],
			["st2.o", { delay: 0.2, dur: 0.8 }],
			...writeNew,
		],
		extras: Object.entries(EX).map(([key, e]) => ({
			label: () => e.label,
			on: (P) => P.pick === key,
			play: (S) => swap(S, swapIn.values, { ...ex(0, key), pick: key, "st0.hlo": 0 }, (S2) => S2.music(0, { bpm: key === "sixteenth" ? 72 : BPM })),
		})),
		say: (N, P) => [
			"Each note, and the rest that lasts just as long. Pick a rest to hear it in a melody: ",
			T(EX[P.pick]?.label.toLowerCase() ?? "quarter rest"),
			".",
		],
	},
];
