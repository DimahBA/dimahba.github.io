/* Simple and compound meter — after musictheory.net's lesson of the same
   name, in its plain style, with a conductor's hand beating every example.

     simple     duple, triple, quadruple: how many beats; simple: each beat
                splits into two — 2/4, 3/4, 4/4
     compound   six eighths grouped two ways; 6/8 is compound duple, its
                beat a dotted quarter; 9/8; 12/8
     the pulse  a conductor beats what is felt: 6/8 in two, a fast 3/4 in one
     your turn  every meter in the lesson, to hear and watch again

   Brackets over the staff mark each beat with how many eighth notes it
   holds, and soft ticks between the clicks let the split be heard.

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import * as conductor from "../stage/conductor.js";
import { base, cam, CAM, row, kb, cd, titleBeat, untitle, namer, count, swap, E, T } from "./kit.js";

export { namer };

const EX = {
	"2/4": { m: "C4e E4e G4e C5e | G4q E4q | F4e A4e G4e F4e | E4q C4q ||", time: "2/4", bpm: 100, u: 72, cd: "2:1,1", name: "simple duple", how: "two beats, each split in two; beaten down, up" },
	"3/4": { m: "C4e D4e E4e F4e G4q | A4e G4e F4e E4e D4q | E4e F4e G4e A4e B4q | C5h. ||", time: "3/4", bpm: 100, u: 54, cd: "3:1,1,1", name: "simple triple", how: "three beats, each split in two; beaten down, out, up" },
	"4/4": { m: "C4e D4e E4e F4e G4q G4q | A4e G4e F4e E4e D4h | E4e D4e C4h. ||", time: "4/4", bpm: 100, u: 56, cd: "4:1,1,1,1", name: "simple quadruple", how: "four beats, each split in two; beaten down, in, out, up" },
	"6/8": { m: "C4q. C4q. | C4q D4e E4q. | E4q D4e E4q F4e | G4h. ||", time: "6/8", bpm: 108, u: 54, cd: "2:1.5,1.5", name: "compound duple", how: "two dotted-quarter beats, each split in three; beaten in two" },
	"9/8": { m: "C4e E4e G4e D4e F4e A4e E4e G4e B4e | C5q. G4q. C4q. ||", time: "9/8", bpm: 120, u: 52, cd: "3:1.5,1.5,1.5", name: "compound triple", how: "three dotted-quarter beats, each split in three; beaten in three" },
	"12/8": { m: "C4e D4e E4e E4e F4e G4e G4e A4e B4e C5e G4e E4e | C5q. G4q. E4q. C4q. ||", time: "12/8", bpm: 120, u: 56, cd: "4:1.5,1.5,1.5,1.5", name: "compound quadruple", how: "four dotted-quarter beats, each split in three; beaten in four" },
	"3/4 fast": { m: "C4q E4q G4q | G4h E4q | F4q A4q C5q | C5h A4q | G4q E4q C4q | D4h G4q | C4h. ||", time: "3/4", bpm: 216, u: 34, cd: "1:3", grp: 0, name: "simple triple, felt in one", how: "so fast that each measure is one beat; beaten in one: down, up" },
};

const SIX = "C4e E4e G4e C5e G4e E4e | D4e F4e A4e B4e G4e D4e ||";

const show = (key, r = 0) => {
	const e = EX[key];
	return row(r, { m: e.m, time: e.time, u: e.u, grp: e.grp ?? 1, rev: count(e.m) });
};

export const defaults = base(2, {
	...row(0, { x: 40, y: 170, s: 0.95, left: 160, count: 1 }),
	...show("2/4"),
	"st0.grp": 0,
	...row(1, { x: 40, y: 420, s: 0.95, left: 160, count: 1, grp: 1, m: SIX, time: "3/4", u: 90 }),
	...kb({ x: 270, y: 450, s: 0.75, lo: 60, hi: 72 }),
	...cd({ x: 1270, y: 420, s: 0.92 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "Simple and Compound Meter", sub: "beats that split in two, and beats that split in three", size: 92 }),
		score.create(layer(), { rows: 2 }),
		keyboard.create(layer(), { lo: 60, hi: 72 }),
		conductor.create(layer()),
	];
}

const play = (key) => (S) => S.music(0, { bpm: EX[key].bpm, sub: true });
const CAM_MAIN = cam(0, 70, 1600, 620);
const CAM_TWO = cam(0, 70, 1600, 820);
const fadeOut = { values: { "st0.rev": 0, "st0.to": 0, "cd.draw": 0 }, dur: 0.4 };
const writeNew = [
	["st0.rev", { delay: 0.1, dur: 1.2 }],
	["st0.to", { delay: 0.1, dur: 0.5 }],
	["cd.draw", { delay: 0.3, dur: 1.2 }],
];

/** A beat that puts example `key` on stage and plays it. */
const example = (id, chapter, key, say, extra = {}) => ({
	id,
	chapter,
	reset: fadeOut,
	set: { ...show(key), "st0.to": 1, "cd.pat": EX[key].cd, "cd.draw": 1, ...extra.set },
	time: [...writeNew, ...(extra.time ?? [])],
	sound: { at: 1.6, play: play(key) },
	say,
});

export const beats = [
	titleBeat("Simple"),
	{
		id: "duple",
		chapter: "Simple",
		set: { ...CAM_MAIN, ...untitle, "st0.o": 1, "st0.to": 1, "kb.o": 1, "cd.o": 1, "cd.pat": EX["2/4"].cd, "cd.draw": 1 },
		time: [
			[CAM, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			["st0.o st0.to", { delay: 0.4, dur: 0.8 }],
			["kb.o cd.o", { delay: 0.7, dur: 0.8 }],
			["cd.draw", { delay: 0.9, dur: 1.2 }],
		],
		sound: { at: 2.2, play: play("2/4") },
		say: () => [
			"Every time signature belongs to a meter. ",
			E("Duple"),
			", ",
			E("triple"),
			" and ",
			E("quadruple"),
			" say how many beats are in each measure: two, three or four. 2/4 has two beats, so it is duple.",
		],
	},
	{
		id: "simple",
		chapter: "Simple",
		set: { "st0.grp": 1 },
		time: [["st0.grp", { dur: 0.8 }]],
		sound: { at: 1, play: play("2/4") },
		say: () => [
			E("Simple"),
			" means each beat splits into two notes. So 2/4 is ",
			T("simple duple"),
			". 2/2 and 2/8 are simple duple too.",
		],
	},
	example("triple", "Simple", "3/4", () => [
		"3/4 is ",
		T("simple triple"),
		": three beats, each split into two. 3/2 and 3/8 are simple triple too.",
	]),
	example("quadruple", "Simple", "4/4", () => [
		"4/4 is ",
		T("simple quadruple"),
		": four beats, each split into two. In simple meter, the top number is always 2, 3 or 4.",
	]),
	{
		id: "two-ways",
		chapter: "Compound",
		reset: fadeOut,
		set: {
			...CAM_TWO,
			...row(0, { m: SIX, time: "6/8", u: 90, grp: 1, count: 0, rev: count(SIX) }),
			"st0.to": 1,
			"st1.o": 1,
			"st1.to": 1,
			"kb.y": 640,
			"cd.pat": EX["6/8"].cd,
			"cd.draw": 1,
		},
		time: [[`${CAM} kb.y`, { dur: 1 }], ...writeNew, ["st1.o st1.to", { delay: 0.6, dur: 0.8 }]],
		sound: {
			at: 1.8,
			play: (S) =>
				S.music(
					[
						{ row: 0, cd: EX["6/8"].cd },
						{ row: 1, cd: EX["3/4"].cd },
					],
					{ bpm: 100, sub: true },
				),
		},
		say: () => [
			"In ",
			E("compound"),
			" meter, each beat splits into three instead. Six eighth notes can be grouped two ways: two groups of three, or three groups of two.",
		],
	},
	{
		id: "six-eight",
		chapter: "Compound",
		reset: fadeOut,
		set: { ...CAM_MAIN, ...show("6/8"), "st0.to": 1, "st0.count": 1, "st1.o": 0, "kb.y": 450, "cd.pat": EX["6/8"].cd, "cd.draw": 1 },
		time: [["st1.o", { dur: 0.4 }], [`${CAM} kb.y`, { dur: 1 }], ...writeNew],
		sound: { at: 1.6, play: play("6/8") },
		say: () => [
			"Three groups of two is already 3/4. So 6/8 groups its eighth notes in threes: two beats, each split into three. That makes it ",
			T("compound duple"),
			".",
		],
	},
	{
		id: "dotted-beat",
		chapter: "Compound",
		set: { "st0.box": 1 },
		time: [["st0.box", { dur: 0.8 }]],
		sound: { at: 1, play: play("6/8") },
		say: () => [
			"Each beat in 6/8 is a dotted quarter note. Every compound meter has a dotted note as its beat. Any time signature with a 6 on top is compound duple; 6/8 and 6/4 are the most common.",
		],
	},
	example(
		"nine",
		"Compound",
		"9/8",
		() => [
			"9/8 is ",
			T("compound triple"),
			": three dotted-quarter beats, each made of three eighth notes. Any time signature with a 9 on top is compound triple.",
		],
		{ set: { "st0.box": 0 }, time: [["st0.box", { dur: 0.4 }]] },
	),
	example("twelve", "Compound", "12/8", () => [
		"12/8 is ",
		T("compound quadruple"),
		": four dotted-quarter beats. Any time signature with a 12 on top is compound quadruple; 12/8 and 12/16 are the most common.",
	]),
	example("pulse", "The pulse", "3/4 fast", () => [
		"A conductor beats the pulse you feel, not every note: 6/8 in two, 9/8 in three, 12/8 in four. A very fast 3/4, like a waltz, is conducted ",
		T("in one"),
		": a single down-up bounce per measure.",
	]),
	{
		id: "yours",
		chapter: "Your turn",
		set: { pick: "3/4 fast" },
		time: [["pick", { dur: 0.01 }]],
		extras: Object.keys(EX).map((key) => ({
			label: () => key,
			on: (P) => P.pick === key,
			play: (S) => swap(S, fadeOut.values, { ...show(key), pick: key, "st0.to": 1, "cd.pat": EX[key].cd, "cd.draw": 1 }, play(key)),
		})),
		say: (N, P) => {
			const e = EX[P.pick] ?? EX["3/4 fast"];
			return ["Pick a meter to hear it and watch it conducted. ", T(`${P.pick || "3/4 fast"}: ${e.name}`), ` — ${e.how}.`];
		},
	},
];
