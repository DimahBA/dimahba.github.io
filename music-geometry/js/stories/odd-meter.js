/* Odd meter — after musictheory.net's lesson of the same name, in its plain
   style, with a conductor's hand beating every example.

     fives      5/8 as 2 + 3, then 3 + 2
     sevens     7/8 as 2 + 2 + 3, then 2 + 3 + 2
     eights     8/8 as 3 + 3 + 2, beside 4/4's 2 + 2 + 2 + 2
     longer     10/8 and 11/8
     felt in 5  5/4, beaten as a 4-pattern with one beat doubled on the
                side of the longer group: 3 + 2 doubles "in", 2 + 3 "out"
     your turn  every one of them, to hear and watch again

   Brackets over the staff mark each beat 2 or 3; the eighth notes are
   counted under it, starting again in each group (1 2 1 2 3), and soft
   ticks fill in between the beat clicks. The conductor beats the felt
   beats, so the long ones take longer.

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import * as conductor from "../stage/conductor.js";
import { base, cam, CAM, row, kb, cd, titleBeat, untitle, namer, count, swap, E, T } from "./kit.js";

export { namer };

const EX = {
	"5/8 2+3": { m: "C4e E4e G4e E4e C4e | D4e F4e A4e F4e D4e | E4e G4e C5e B4e G4e | C5q C4q. ||", time: "5/8:2+3", cd: "2:1,1.5", say: "one simple beat, then one compound" },
	"5/8 3+2": { m: "C4e E4e G4e C5e G4e | A4e F4e D4e F4e A4e | G4e E4e C4e E4e G4e | C5q. C4q ||", time: "5/8:3+2", cd: "2:1.5,1", say: "one compound beat, then one simple" },
	"7/8 2+2+3": { m: "C4e G4e C4e G4e C4e E4e G4e | D4e A4e D4e A4e D4e F4e A4e | E4e B4e E4e B4e E4e G4e B4e | C5q G4q C4q. ||", time: "7/8:2+2+3", cd: "3:1,1,1.5", say: "two simple beats, then one compound" },
	"7/8 2+3+2": { m: "C4e G4e C4e E4e G4e C5e G4e | D4e A4e D4e F4e A4e D5e A4e | E4e B4e E4e G4e B4e E5e B4e | C5q G4q. C4q ||", time: "7/8:2+3+2", cd: "3:1,1.5,1", say: "the compound beat between two simple ones" },
	"8/8": { m: "C4e E4e G4e C4e E4e G4e C5e G4e | A4e F4e D4e A4e F4e D4e B4e G4e | C5q. G4q. C4q ||", time: "8/8:3+3+2", cd: "3:1.5,1.5,1", say: "two compound beats, then one simple" },
	"10/8": { m: "C4e E4e G4e D4e F4e A4e E4e G4e F4e A4e | C5q. G4q. E4q C4q ||", time: "10/8:3+3+2+2", cd: "4:1.5,1.5,1,1", say: "two compound beats, then two simple" },
	"11/8": { m: "C4e E4e G4e D4e F4e A4e E4e G4e B4e C5e G4e | C5q. G4q. E4q. C4q ||", time: "11/8:3+3+3+2", cd: "4:1.5,1.5,1.5,1", say: "three compound beats, then one simple" },
	"5/4 3+2": { m: "C4q E4q G4q C5q G4q | A4q F4q D4q G4q B4q | C5h. C4h ||", time: "5/4:3+2", cd: "5a:1,1,1,1,1", bpm: 150, pulse: 0, say: "five beats felt as 3 + 2: down, in, in, out, up" },
	"5/4 2+3": { m: "C4q G4q C4q E4q G4q | D4q A4q D4q F4q A4q | C4h C5h. ||", time: "5/4:2+3", cd: "5b:1,1,1,1,1", bpm: 150, pulse: 0, say: "five beats felt as 2 + 3: down, in, out, out, up" },
};

const FOUR = "C4e E4e G4e C4e E4e G4e C5e G4e | A4e F4e D4e A4e F4e D4e B4e G4e | C5q G4q E4q C4q ||";
const BPM = 132;

const show = (key, r = 0) => {
	const e = EX[key];
	const eighths = e.pulse ?? 0.5;
	return row(r, { m: e.m, time: e.time, u: eighths ? 64 : 44, pulse: eighths, cg: eighths ? 1 : 0, rev: count(e.m) });
};

export const defaults = base(2, {
	...row(0, { x: 40, y: 170, s: 0.95, left: 170, count: 1, grp: 1 }),
	...show("5/8 2+3"),
	...row(1, { x: 40, y: 420, s: 0.95, left: 170, count: 1, grp: 1, m: FOUR, time: "4/4", u: 64, pulse: 0.5, cg: 1 }),
	...kb({ x: 270, y: 450, s: 0.75, lo: 60, hi: 76 }),
	...cd({ x: 1280, y: 420, s: 0.92 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "Odd Meter", sub: "beats of two and three, mixed" }),
		score.create(layer(), { rows: 2 }),
		keyboard.create(layer(), { lo: 60, hi: 76 }),
		conductor.create(layer()),
	];
}

const play = (key) => (S) => S.music(0, { bpm: EX[key].bpm ?? BPM, pulse: 0, sub: true });
const CAM_MAIN = cam(0, 70, 1600, 620);
const CAM_TWO = cam(0, 70, 1600, 820);
const fadeOut = { values: { "st0.rev": 0, "st0.to": 0, "cd.draw": 0 }, dur: 0.4 };
const writeNew = [
	["st0.rev", { delay: 0.1, dur: 1.2 }],
	["st0.to", { delay: 0.1, dur: 0.5 }],
	["cd.draw", { delay: 0.3, dur: 1.2 }],
];

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
	titleBeat("Fives"),
	{
		id: "five",
		chapter: "Fives",
		set: { ...CAM_MAIN, ...untitle, "st0.o": 1, "st0.to": 1, "kb.o": 1, "cd.o": 1, "cd.pat": EX["5/8 2+3"].cd, "cd.draw": 1 },
		time: [
			[CAM, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			["st0.o st0.to", { delay: 0.4, dur: 0.8 }],
			["kb.o cd.o", { delay: 0.7, dur: 0.8 }],
			["cd.draw", { delay: 0.9, dur: 1.2 }],
		],
		sound: { at: 2.2, play: play("5/8 2+3") },
		say: () => [
			"An ",
			E("odd meter"),
			" mixes simple and compound beats. 5/8 has one simple beat and one compound beat: ",
			T("2 + 3"),
			". It is conducted in two, with the second beat longer.",
		],
	},
	example("five-swap", "Fives", "5/8 3+2", () => [
		"The order of the beats does not matter. With the compound beat first, ",
		T("3 + 2"),
		", it is still 5/8 — now the first beat is the long one.",
	]),
	example("seven", "Sevens", "7/8 2+2+3", () => [
		"7/8 has two simple beats and one compound beat, usually grouped ",
		T("2 + 2 + 3"),
		". It is conducted in three, with one longer beat.",
	]),
	example("seven-mid", "Sevens", "7/8 2+3+2", () => [
		"Again, the order does not matter. The compound beat can even sit between the two simple ones: ",
		T("2 + 3 + 2"),
		".",
	]),
	example("eight", "Eights", "8/8", () => ["8/8 has two compound beats and one simple beat: ", T("3 + 3 + 2"), "."]),
	{
		id: "not-four",
		chapter: "Eights",
		set: { ...CAM_TWO, "st0.count": 0, "st1.o": 1, "st1.to": 1, "kb.y": 640 },
		time: [
			[`${CAM} kb.y`, { dur: 1 }],
			["st0.count", { dur: 0.4 }],
			["st1.o st1.to", { delay: 0.5, dur: 0.8 }],
		],
		sound: {
			at: 1.6,
			play: (S) =>
				S.music(
					[
						{ row: 0, cd: EX["8/8"].cd },
						{ row: 1, cd: "4:1,1,1,1" },
					],
					{ bpm: BPM, pulse: 0, sub: true },
				),
		},
		say: () => [
			"8/8 is easy to confuse with 4/4, since both hold eight eighth notes. But 4/4 groups them into four simple beats, ",
			T("2 + 2 + 2 + 2"),
			", while 8/8 makes three uneven ones.",
		],
	},
	example(
		"ten",
		"Longer",
		"10/8",
		() => ["10/8 has two compound beats and two simple beats: ", T("3 + 3 + 2 + 2"), ". It is conducted in four."],
		{ set: { ...CAM_MAIN, "st0.count": 1, "st1.o": 0, "kb.y": 450 }, time: [["st1.o", { dur: 0.4 }], [`${CAM} kb.y`, { dur: 1 }]] },
	),
	example("eleven", "Longer", "11/8", () => ["11/8 has three compound beats and one simple beat: ", T("3 + 3 + 3 + 2"), "."]),
	example("five-four", "Felt in 5", "5/4 3+2", () => [
		"5/4 is slow enough to feel all five beats, so the conductor uses a 4-pattern with one beat doubled. Grouped ",
		T("3 + 2"),
		", the longer group comes first, so the extra beat goes in: down, in, in, out, up.",
	], { set: { "cd.dir": 1 }, time: [["cd.dir", { delay: 1.2, dur: 0.5 }]] }),
	example("five-four-b", "Felt in 5", "5/4 2+3", () => [
		"Grouped ",
		T("2 + 3"),
		", the longer group comes second, so the extra beat goes out: down, in, out, out, up.",
	]),
	{
		id: "yours",
		chapter: "Your turn",
		set: { pick: "5/4 2+3", "cd.dir": 0 },
		time: [["cd.dir", { dur: 0.5 }]],
		extras: Object.keys(EX).map((key) => ({
			label: () => key.replace(" ", " · "),
			on: (P) => P.pick === key,
			play: (S) => swap(S, fadeOut.values, { ...show(key), pick: key, "st0.to": 1, "cd.pat": EX[key].cd, "cd.draw": 1 }, play(key)),
		})),
		say: (N, P) => {
			const key = P.pick || "5/4 2+3";
			return ["Pick a meter to hear it and watch it conducted. ", T(key.split(" ")[0]), `: ${EX[key]?.say ?? ""}.`];
		},
	},
];
