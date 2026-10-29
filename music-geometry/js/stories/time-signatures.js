/* Measures and time signatures — after musictheory.net's lesson of the same
   name, in its plain style, with a conductor's hand beating every example.

     measures   bar lines; the time signature's top number, then its bottom
     conducting 4/4 beaten down, in, out, up; the downbeat falls and the
                upbeat rises
     more       3/4; 6/8, slow, beaten in six; 3/2
     your turn  any of the four, to hear and watch again

   Every example is a melody on the staff, heard on the keyboard, with a
   click on each beat and the beat's number lighting under the staff.

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import * as conductor from "../stage/conductor.js";
import { C } from "../palette.js";
import { base, cam, CAM, row, kb, cd, titleBeat, untitle, namer, count, swap, E, T } from "./kit.js";

export { namer };

/* The four examples: a melody, its meter, how fast, and the pattern the
   hand beats. */
const EX = {
	"4/4": { m: "C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h ||", time: "4/4", bpm: 96, u: 48, pulse: 0, cd: "4:1,1,1,1" },
	"3/4": { m: "C4q E4q G4q | C5h B4q | A4q F4q D4q | C4h. ||", time: "3/4", bpm: 104, u: 60, pulse: 0, cd: "3:1,1,1" },
	"6/8": { m: "C4q. C4q. | C4q D4e E4q. | E4q D4e E4q F4e | G4h. ||", time: "6/8", bpm: 60, u: 64, pulse: 0.5, cd: "6:0.5,0.5,0.5,0.5,0.5,0.5" },
	"3/2": { m: "E4h G4h C5h | B4h A4h G4h | F4h D4h E4h | C4w. ||", time: "3/2", bpm: 132, u: 30, pulse: 0, cd: "3:2,2,2" },
};

const show = (sig) => {
	const e = EX[sig];
	return row(0, { m: e.m, time: e.time, u: e.u, pulse: e.pulse, rev: count(e.m) });
};

export const defaults = base(1, {
	...row(0, { x: 40, y: 200, s: 0.95, left: 96, box: 0 }),
	...show("4/4"),
	...kb({ x: 270, y: 480, s: 0.8, lo: 60, hi: 72 }),
	...cd({ x: 1260, y: 420, s: 0.95 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "Measures and Time Signatures", sub: "how beats are grouped and counted", size: 88 }),
		score.create(layer(), { rows: 1 }),
		keyboard.create(layer(), { lo: 60, hi: 72 }),
		conductor.create(layer()),
	];
}

const play = (sig) => (S) => S.music(0, { bpm: EX[sig].bpm });
const CAM_MAIN = cam(0, 80, 1600, 660);

/* Moving to another example: the notes, the time signature and the hand's
   path fade, then the new ones are written in. */
const fadeOut = { values: { "st0.rev": 0, "st0.to": 0, "cd.draw": 0 }, dur: 0.4 };
const writeNew = [
	["st0.rev", { delay: 0.1, dur: 1.2 }],
	["st0.to", { delay: 0.1, dur: 0.5 }],
	["cd.draw", { delay: 0.3, dur: 1.2 }],
];

export const beats = [
	titleBeat("Measures"),
	{
		id: "bars",
		chapter: "Measures",
		set: { ...CAM_MAIN, ...untitle, "st0.o": 1, "st0.bars": 1, "kb.o": 1 },
		time: [
			[CAM, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			["st0.o", { delay: 0.5, dur: 0.6 }],
			["kb.o", { delay: 0.8, dur: 0.8 }],
			["st0.bars", { delay: 1.6, dur: 0.6 }],
		],
		sound: { at: 2.4, play: play("4/4") },
		say: () => [
			"Vertical lines called ",
			E("bar lines"),
			" divide the staff into ",
			E("measures"),
			". This melody is four measures long.",
		],
	},
	{
		id: "top",
		chapter: "Measures",
		set: { "st0.to": 1, "st0.left": 150, "st0.tsTop": C.tonic, "st0.count": 1 },
		time: [
			["st0.left", { dur: 0.9 }],
			["st0.to", { delay: 0.6, dur: 0.6 }],
			["st0.tsTop", { delay: 1.2, dur: 0.5 }],
			["st0.count", { delay: 1.4, dur: 0.6 }],
		],
		sound: { at: 2.2, play: play("4/4") },
		say: () => [
			"A ",
			E("time signature"),
			" says how many beats are in each measure. The ",
			T("top number"),
			" is the count: in 4/4 there are four beats in every measure.",
		],
	},
	{
		id: "bottom",
		chapter: "Measures",
		set: { "st0.tsTop": C.white, "st0.tsBot": C.tonic, "st0.box": 1 },
		time: [
			["st0.tsTop st0.tsBot", { dur: 0.5 }],
			["st0.box", { delay: 0.6, dur: 0.6 }],
		],
		sound: { at: 1.4, play: play("4/4") },
		say: () => [
			"The ",
			T("bottom number"),
			" says which note gets one beat. A 4 stands for the quarter note, so each quarter note lasts one click.",
		],
	},
	{
		id: "conduct",
		chapter: "Conducting",
		set: { "st0.tsBot": C.white, "st0.box": 0, "cd.o": 1, "cd.draw": 1, "cd.dir": 1 },
		time: [
			["st0.tsBot st0.box", { dur: 0.5 }],
			["cd.o", { dur: 0.3 }],
			["cd.draw", { delay: 0.2, dur: 1.6 }],
			["cd.dir", { delay: 1.4, dur: 0.6 }],
		],
		sound: { at: 2, play: play("4/4") },
		say: () => [
			"A conductor shows the beats with one hand. In 4/4, the hand goes down, in, out, then up — so the shape crosses over itself.",
		],
	},
	{
		id: "downbeat",
		chapter: "Conducting",
		set: { "cd.dir": 0 },
		time: [["cd.dir", { dur: 0.5 }]],
		sound: { at: 0.6, play: play("4/4") },
		say: () => [
			"Every pattern shares one rule. Beat 1, the ",
			T("downbeat"),
			", always falls straight down. The last beat, the ",
			E("upbeat"),
			", always rises back to the top, ready for the next measure.",
		],
	},
	{
		id: "three",
		chapter: "More",
		reset: fadeOut,
		set: { ...show("3/4"), "st0.to": 1, "cd.pat": EX["3/4"].cd, "cd.draw": 1, "cd.dir": 1 },
		time: [...writeNew, ["cd.dir", { delay: 1.2, dur: 0.5 }]],
		sound: { at: 1.6, play: play("3/4") },
		say: () => ["3/4 has three beats in each measure, and the quarter note gets one beat. The hand goes down, out, up."],
	},
	{
		id: "six",
		chapter: "More",
		reset: fadeOut,
		set: { ...show("6/8"), "st0.to": 1, "cd.pat": EX["6/8"].cd, "cd.draw": 1 },
		time: writeNew,
		sound: { at: 1.6, play: play("6/8") },
		say: () => [
			"6/8 holds six eighth notes in each measure. Played slowly, the conductor beats every one of them: down, in, in, out, out, up.",
		],
	},
	{
		id: "half",
		chapter: "More",
		reset: fadeOut,
		set: { ...show("3/2"), "st0.to": 1, "cd.pat": EX["3/2"].cd, "cd.draw": 1, "cd.dir": 0 },
		time: writeNew,
		sound: { at: 1.6, play: play("3/2") },
		say: () => ["3/2 holds three half notes in each measure. That's three beats, and the half note gets one beat."],
	},
	{
		id: "yours",
		chapter: "Your turn",
		set: { pick: "3/2" },
		time: [["pick", { dur: 0.01 }]],
		extras: Object.keys(EX).map((sig) => ({
			label: () => sig,
			on: (P) => P.pick === sig,
			play: (S) =>
				swap(
					S,
					fadeOut.values,
					{ ...show(sig), pick: sig, "st0.to": 1, "cd.pat": EX[sig].cd, "cd.draw": 1 },
					play(sig),
				),
		})),
		say: (N, P) => {
			const what = {
				"4/4": "four quarter-note beats, beaten down, in, out, up",
				"3/4": "three quarter-note beats, beaten down, out, up",
				"6/8": "six eighth notes, beaten one by one when slow",
				"3/2": "three half-note beats, beaten down, out, up",
			}[P.pick];
			return ["Pick a time signature to hear it and watch it conducted. ", T(P.pick || "3/2"), `: ${what ?? ""}.`];
		},
	},
];
