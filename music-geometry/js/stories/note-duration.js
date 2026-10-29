/* Note duration, in nine beats — after musictheory.net's lesson of the same
   name, in its plain style, with every length heard against a click.

     listen    a melody, with a timing bar under each note and a click on
               every beat
     lengths   the whole note; half notes; quarter notes — each a new row
               under the last, so notes that fill the same time line up
     flags     eighth notes with flags, then beamed; sixteenth notes
     chart     all five rows, to play again

   The rows are one measure each, drawn to the same scale of time. Their
   melodies run on from one to the next, so playing the chart top to bottom
   is one tune that speeds up: Do — | Mi Sol | Do Sol Mi Sol | …

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import { base, cam, CAM, row, kb, titleBeat, untitle, namer, E } from "./kit.js";

export { namer };

const BPM = 80;
const ROW_Y = [140, 300, 460, 620, 780];
const INTRO = 5;

const MUSIC = [
	"C4w |",
	"E4h G4h |",
	"C5q G4q E4q G4q |",
	"C4e D4e E4e F4e G4e F4e E4e D4e |",
	"C4s D4s E4s F4s G4s F4s E4s D4s C4s D4s E4s F4s G4s A4s B4s C5s |",
];

const rowAt = (r, y) => row(r, { x: 60, y, s: 0.9, u: 160, left: 96, m: r === INTRO ? "C4q C4q G4q G4q | A4q A4q G4h |" : MUSIC[r], box: 1 });
const camFor = (k) => cam(10, 40, 1360, 330 + 160 * k);
const kbFor = (k) => kb({ y: 130 + 80 * k });
const shown = (k) => row(k, { o: 1, count: 1 });
const counted = (k) => row(k, { count: 0 });

export const defaults = base(6, {
	...Object.assign({}, ...MUSIC.map((_, r) => rowAt(r, ROW_Y[r]))),
	...rowAt(INTRO, ROW_Y[0]),
	...row(INTRO, { u: 80 }),
	...kb({ x: 860, y: 130, s: 0.85, lo: 60, hi: 72 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "Note Duration", sub: "how long each note lasts" }),
		score.create(layer(), { rows: 6 }),
		keyboard.create(layer(), { lo: 60, hi: 72 }),
	];
}

const play = (rows, opts) => (S) => S.music(rows, { bpm: BPM, ...opts });

export const beats = [
	titleBeat("Listen"),
	{
		id: "listen",
		chapter: "Listen",
		set: { ...camFor(0), ...untitle, ...row(INTRO, { o: 1, count: 1 }), "kb.o": 1 },
		time: [
			[CAM, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			[`st${INTRO}.o`, { delay: 0.4, dur: 0.8 }],
			["kb.o", { delay: 0.7, dur: 0.8 }],
		],
		sound: { at: 1.6, play: play(INTRO, { bpm: 96 }) },
		say: () => [
			"How long a note lasts is called its ",
			E("duration"),
			". The shape of the note tells you its duration. The bar under each note shows how long it lasts, and the clicks keep a steady beat.",
		],
	},
	{
		id: "whole",
		chapter: "Lengths",
		set: { ...row(INTRO, { o: 0, count: 0 }), ...shown(0) },
		time: [
			[`st${INTRO}.o`, { dur: 0.5 }],
			["st0.o", { delay: 0.5, dur: 0.6 }],
		],
		sound: { at: 1.2, play: play(0) },
		say: () => ["The ", E("whole note"), " has the longest duration. Here it lasts for four clicks."],
	},
	{
		id: "half",
		chapter: "Lengths",
		set: { ...camFor(1), ...kbFor(1), ...counted(0), ...shown(1) },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st1.o", { delay: 0.6, dur: 0.6 }],
		],
		sound: { at: 1.3, play: play([0, 1]) },
		say: () => [
			"A ",
			E("half note"),
			" lasts half as long as a whole note. Two half notes take up the same time as one whole note.",
		],
	},
	{
		id: "quarter",
		chapter: "Lengths",
		set: { ...camFor(2), ...kbFor(2), ...counted(1), ...shown(2) },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st2.o", { delay: 0.6, dur: 0.6 }],
		],
		sound: { at: 1.3, play: play(2) },
		say: () => [
			"A ",
			E("quarter note"),
			" is a quarter of a whole note: one click. Four quarter notes fill a whole note, and two fill a half note.",
		],
	},
	{
		id: "eighth",
		chapter: "Flags",
		set: { ...camFor(3), ...kbFor(3), ...counted(2), ...shown(3), ...row(3, { beam: 0 }), ...row(4, { beam: 0 }) },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st3.o", { delay: 0.6, dur: 0.6 }],
		],
		sound: { at: 1.3, play: play(3) },
		say: () => [
			"Notes shorter than a quarter note have flags, and each flag halves the duration. An ",
			E("eighth note"),
			" has one flag, so two eighth notes fill one quarter note.",
		],
	},
	{
		id: "beam",
		chapter: "Flags",
		set: { ...row(3, { beam: 1 }) },
		time: [["st3.beam", { dur: 1 }]],
		sound: { at: 1.2, play: play(3) },
		say: () => ["Eighth notes in a group are usually joined by a ", E("beam"), " instead. A beam counts the same as a flag."],
	},
	{
		id: "sixteenth",
		chapter: "Flags",
		set: { ...camFor(4), ...kbFor(4), ...counted(3), ...shown(4), ...row(4, { beam: 1 }) },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st4.o", { delay: 0.6, dur: 0.6 }],
			["st4.beam", { delay: 2, dur: 1 }],
		],
		sound: { at: 3.2, play: play(4) },
		say: () => [
			"A ",
			E("sixteenth note"),
			" has two flags, or two beams, halving the duration again. Two sixteenths fill an eighth, and four fill a quarter.",
		],
	},
	{
		id: "chart",
		chapter: "Chart",
		interactive: true,
		set: { interactive: 1 },
		time: [["interactive", { dur: 0.01 }]],
		sound: { at: 0.4, play: play([0, 1, 2, 3, 4]) },
		extras: [{ label: () => "Play every row", play: play([0, 1, 2, 3, 4]) }],
		say: () => [
			"Here are all five, from longest to shortest. Each row fills one measure. Notes with three or more flags exist too, but they are rarely used. Click a row to hear it.",
		],
	},
];

/** Clicking a row plays it. */
export function interact(data, { S }) {
	if (data.row != null) S.music(Number(data.row), { bpm: BPM });
}
