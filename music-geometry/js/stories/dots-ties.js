/* Dots and ties — after musictheory.net's lesson of the same name, in its
   plain style. Every claim is shown as two rows drawn to the same scale of
   time, one under the other, so a dotted note and the notes it equals line
   up exactly, and are heard one after the other against the same click.

     listen    a melody with a dotted note in it
     dots      a dot adds half: the dotted quarter = quarter + eighth =
               three eighths; the dotted half = half + quarter
     ties      the same note twice; tied into one; written as one note
     your turn dotted half, quarter and eighth, each beside its ties

   The timing bar under a dotted note is split where the dot's half begins.

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import { base, cam, CAM, row, kb, titleBeat, untitle, namer, count, swap, E, T } from "./kit.js";

export { namer };

const BPM = 88;
const ODE = "E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h ||";
const DOTTED = "E4q. D4e D4h ||";
const TIED = "E4q~ E4e D4e D4h ||";
const EIGHTHS = "E4e~ E4e~ E4e D4e D4h ||";
const HALF_DOT = "C4h E4q | G4h. | F4h D4q | C4h. ||";
const HALF_TIE = "C4h E4q | G4h~ G4q | F4h D4q | C4h~ C4q ||";
const TWICE = "C4q D4q E4q F4q | F4q E4q D4q C4q ||";
const TIE = "C4q D4q E4q F4q~ | F4q E4q D4q C4q ||";
const MERGED = "C4q D4q E4q F4h E4q D4q C4q ||";

const EX = {
	half: { label: "Dotted half", dot: HALF_DOT, tie: HALF_TIE, time: "3/4", u: 56 },
	quarter: { label: "Dotted quarter", dot: "E4q. D4e D4h | C4q. D4e E4h ||", tie: "E4q~ E4e D4e D4h | C4q~ C4e D4e E4h ||", time: "4/4", u: 80 },
	eighth: { label: "Dotted eighth", dot: "C4e. D4s E4e. F4s G4h | E4e. F4s G4e. A4s C5h ||", tie: "C4e~ C4s D4s E4e~ E4s F4s G4h | E4e~ E4s F4s G4e~ G4s A4s C5h ||", time: "4/4", u: 120 },
};

const ROW = { x: 50, s: 0.95, left: 150, time: "4/4", box: 1 };
const Y = [140, 330, 520];

export const defaults = base(3, {
	...row(0, { ...ROW, y: Y[0], m: ODE, u: 50, count: 1 }),
	...row(1, { ...ROW, y: Y[1], m: TIED, u: 200 }),
	...row(2, { ...ROW, y: Y[2], m: EIGHTHS, u: 200, count: 1 }),
	...kb({ x: 1140, y: 120, s: 0.72, lo: 60, hi: 72 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "Dots and Ties", sub: "two ways to make a note last longer" }),
		score.create(layer(), { rows: 3 }),
		keyboard.create(layer(), { lo: 60, hi: 72 }),
	];
}

const play = (rows, bpm = BPM) => (S) => S.music(rows, { bpm });
const CAM_ONE = cam(20, 50, 1560, 470);
const CAM_TWO = cam(20, 50, 1560, 660);
const CAM_THREE = cam(20, 50, 1560, 850);
const fade0 = { values: { "st0.rev": 0 }, dur: 0.4 };
const write = (r) => [`st${r}.rev`, { delay: 0.1, dur: 1 }];

export const beats = [
	titleBeat("Listen"),
	{
		id: "listen",
		chapter: "Listen",
		set: { ...CAM_ONE, "kb.y": 120, ...untitle, "st0.o": 1, "st0.to": 1, "kb.o": 1 },
		time: [
			[`${CAM} kb.y`, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			["st0.o st0.to", { delay: 0.4, dur: 0.8 }],
			["kb.o", { delay: 0.7, dur: 0.8 }],
		],
		sound: { at: 1.6, play: play(0) },
		say: () => [
			E("Dots"),
			" and ",
			E("ties"),
			" both make a note last longer. Listen to the last measure: one note is held a little longer than a beat.",
		],
	},
	{
		id: "dot",
		chapter: "Dots",
		reset: fade0,
		set: { "st0.m": DOTTED, "st0.u": 200, "st0.rev": count(DOTTED) },
		time: [["st0.u", { dur: 0.01 }], write(0)],
		sound: { at: 1.4, play: play(0) },
		say: () => [
			"Here is that measure. The dot after the first note makes it longer by half. Its timing bar is split where the extra half begins.",
		],
	},
	{
		id: "plus-eighth",
		chapter: "Dots",
		set: { ...CAM_TWO, "kb.y": 215, "st0.count": 0, "st1.o": 1, "st1.to": 1, "st1.count": 1 },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st0.count", { dur: 0.4 }],
			["st1.o st1.to st1.count", { delay: 0.5, dur: 0.8 }],
		],
		sound: { at: 1.6, play: play([0, 1]) },
		say: () => [
			"Half of a quarter note is an eighth note. So a ",
			T("dotted quarter note"),
			" lasts a quarter note plus an eighth note, tied together.",
		],
	},
	{
		id: "three-eighths",
		chapter: "Dots",
		set: { ...CAM_THREE, "kb.y": 310, "st1.count": 0, "st2.o": 1, "st2.to": 1 },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st1.count", { dur: 0.4 }],
			["st2.o st2.to", { delay: 0.5, dur: 0.8 }],
		],
		sound: { at: 1.6, play: play([0, 2]) },
		say: () => ["A dotted quarter note also lasts as long as three eighth notes."],
	},
	{
		id: "dotted-half",
		chapter: "Dots",
		reset: { values: { "st0.rev": 0, "st1.rev": 0, "st2.o": 0 }, dur: 0.4 },
		set: {
			...CAM_TWO, "kb.y": 215,
			"st2.o": 0,
			...row(0, { m: HALF_DOT, time: "3/4", u: 56, rev: count(HALF_DOT), count: 0 }),
			...row(1, { m: HALF_TIE, time: "3/4", u: 56, rev: count(HALF_TIE), count: 1 }),
		},
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st0.u st1.u", { dur: 0.01 }],
			write(0),
			write(1),
		],
		sound: { at: 1.6, play: play([0, 1], 108) },
		say: () => [
			"A dot works on any note. A ",
			T("dotted half note"),
			" lasts a half note plus a quarter note: three beats, a whole measure of 3/4.",
		],
	},
	{
		id: "twice",
		chapter: "Ties",
		reset: { values: { "st0.rev": 0, "st1.o": 0 }, dur: 0.4 },
		set: { ...CAM_ONE, "kb.y": 120, ...row(0, { m: TWICE, time: "", to: 0, left: 96, u: 70, rev: count(TWICE), count: 1 }), "st1.o": 0 },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st0.u st0.left st0.to", { dur: 0.01 }],
			write(0),
		],
		sound: { at: 1.6, play: play(0) },
		say: (N) => [`In this melody, ${N("F")} is played twice: at the end of the first measure, and again at the start of the second.`],
	},
	{
		id: "tie",
		chapter: "Ties",
		set: { ...row(1, { y: Y[0], m: TIE, time: "", left: 96, u: 70, rev: count(TIE), count: 1 }), "st0.o": 0, "st1.o": 1 },
		time: [
			["st1.y st1.left st1.u st1.count", { dur: 0.01 }],
			["st0.o st1.o", { dur: 0.8 }],
		],
		sound: { at: 1.2, play: play(1) },
		say: (N) => [
			"A ",
			E("tie"),
			` joins two notes of the same pitch into one. Now ${N("F")} is played once and held across the bar line: its two timing bars become one.`,
		],
	},
	{
		id: "merged",
		chapter: "Ties",
		set: { ...row(2, { y: Y[0], m: MERGED, time: "", left: 96, u: 70, rev: count(MERGED), count: 1 }), "st1.o": 0, "st2.o": 1 },
		time: [
			["st2.y st2.left st2.u st2.count", { dur: 0.01 }],
			["st1.o st2.o", { dur: 0.8 }],
		],
		sound: { at: 1.2, play: play(2) },
		say: () => ["If the bar line were not there, the two tied notes could be written as a single half note instead."],
	},
	{
		id: "yours",
		chapter: "Your turn",
		reset: { values: { "st2.o": 0 }, dur: 0.4 },
		set: {
			...CAM_TWO, "kb.y": 215,
			"st2.o": 0,
			pick: "quarter",
			...row(0, { o: 1, y: Y[0], m: EX.quarter.dot, time: "4/4", to: 1, left: 150, u: 80, rev: count(EX.quarter.dot), count: 0 }),
			...row(1, { o: 1, y: Y[1], m: EX.quarter.tie, time: "4/4", to: 1, left: 150, u: 80, rev: count(EX.quarter.tie), count: 1 }),
		},
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st0.y st0.left st0.u st1.y st1.left st1.u", { dur: 0.01 }],
			["st0.o st1.o", { delay: 0.2, dur: 0.8 }],
		],
		extras: Object.entries(EX).map(([key, e]) => ({
			label: () => e.label,
			on: (P) => P.pick === key,
			play: (S) =>
				swap(
					S,
					{ "st0.rev": 0, "st1.rev": 0 },
					{
						pick: key,
						...row(0, { m: e.dot, time: e.time, u: e.u, rev: count(e.dot) }),
						...row(1, { m: e.tie, time: e.time, u: e.u, rev: count(e.tie) }),
					},
					play([0, 1], key === "half" ? 108 : BPM),
				),
		})),
		say: (N, P) => [
			"Pick a dotted note to hear it, then the tied notes it equals: ",
			T(EX[P.pick]?.label.toLowerCase() ?? "dotted quarter"),
			".",
		],
	},
];
