/* The staff, clefs and ledger lines — after musictheory.net's lesson of the
   same name, in its plain style.

     staff      five lines, four spaces; each one a white key
     treble     the clef names the notes; the G line; counting up from it;
                a ledger line; a melody on the treble staff
     bass       the F line, and the bass staff filled in
     grand      eleven lines; the middle one taken away; middle C between
     your turn  any key, written on the grand staff

   The keyboard runs from F2 to C6, under every beat, so each note can be
   found on it as it sounds. Every note is a whole note: this lesson is
   about where notes sit, not how long they last.

   The narration is Claude's draft. Once Dimah rewrites a beat it is hers,
   word for word. */

import * as title from "../stage/title.js";
import * as score from "../stage/score.js";
import * as keyboard from "../stage/keyboard.js";
import { base, cam, CAM, row, kb, titleBeat, untitle, namer, writeIn, count, T, E } from "./kit.js";

export { namer };

/* Note gaps: every whole note takes `GAP` seconds when it is played as a
   run of notes, rather than four beats. */
const GAP = 0.5;
const RUN = 240 / GAP / 4;
const LEAD = 0.15;

const LINES = "E4w G4w B4w D5w F5w _w F4w A4w C5w E5w";
const CLIMB = "E4w F4w G4w A4w B4w C5w D5w E5w F5w";
const FROM_G = "G4w* A4w B4w C5w D5w E5w F5w G5w A5w";
const MELODY = "E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h ||";
const BASS_FILL = "G2w A2w B2w C3w D3w E3w F3w* G3w A3w";
const LOW = "G2w B2w D3w F3w A3w";
const HIGH = "_w _w _w _w _w C4w E4w G4w B4w D5w F5w";

const keys = (...ms) => ms.join(" ");
const WIDE = { x: 211, y: 150, s: 1.3, u: 22, left: 96, w: 906 };
const GS = { x: 286, s: 0.95, u: 22, left: 96, w: 1082 };
const GS_Y = 90;
const GS_ELEVEN = GS_Y + 120 * 0.95;
const GS_SPLIT = GS_Y + 200 * 0.95;

export const defaults = base(2, {
	...row(0, { ...WIDE, m: LINES, co: 0, bars: 0, rev: 0, draw: 0 }),
	...row(1, { ...WIDE, m: "F3w*", clef: "bass", bars: 0, hl: 24 }),
	...kb({ x: 68, y: 560, s: 0.88, lo: 41, hi: 84, names: 1 }),
});

export function stage(layer) {
	return [
		title.create(layer(), { text: "The Staff", sub: "lines, spaces, clefs and ledger lines" }),
		score.create(layer(), { rows: 2 }),
		keyboard.create(layer(), { lo: 41, hi: 84 }),
	];
}

const run = (rows, opts) => (S) => S.music(rows, { bpm: RUN, click: false, sus: false, ...opts });
const CAM_KEYS = cam(0, 60, 1600, 760);
const CAM_GRAND = cam(0, 0, 1600, 800);
const fadeNotes = (r) => ({ values: { [`st${r}.rev`]: 0 }, dur: 0.4 });

export const beats = [
	titleBeat("Staff"),
	{
		id: "staff",
		chapter: "Staff",
		set: { ...cam(150, 40, 1300, 440), ...untitle, "st0.o": 1, "st0.draw": 1, "st0.rev": count(LINES) },
		time: [
			[CAM, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			["st0.o", { delay: 0.4, dur: 0.01 }],
			["st0.draw", { delay: 0.4, dur: 1.4 }],
			writeIn(0, 2.1 + LEAD, GAP, count(LINES)),
		],
		sound: { at: 2.1, play: run(0) },
		say: () => [
			"The ",
			E("staff"),
			" is where music is written. It has five lines and four spaces, and a note can sit on a line or in a space.",
		],
	},
	{
		id: "keys",
		chapter: "Staff",
		reset: fadeNotes(0),
		set: { ...CAM_KEYS, "st0.m": CLIMB, "st0.rev": count(CLIMB), "kb.o": 1, "kb.set": keys(64, 65, 67, 69, 71, 72, 74, 76, 77), "kb.dim": 1 },
		time: [
			[CAM, { dur: 1.2 }],
			["kb.o", { delay: 0.4, dur: 0.8 }],
			["kb.dim", { delay: 1, dur: 0.8 }],
			writeIn(0, 2 + LEAD, GAP, count(CLIMB)),
		],
		sound: { at: 2, play: run(0) },
		say: () => ["Every line and every space stands for one white key on the keyboard. One step up the staff is one white key up."],
	},
	{
		id: "clef",
		chapter: "Treble clef",
		set: { "st0.co": 1, "st0.names": 1 },
		time: [
			["st0.co", { dur: 1 }],
			["st0.names", { delay: 0.8, dur: 0.8 }],
		],
		sound: { at: 1.4, play: run(0) },
		say: () => [
			"A ",
			E("clef"),
			" tells you which note each line and space stands for. The two common clefs are the treble clef and the bass clef. This is the treble clef.",
		],
	},
	{
		id: "g-line",
		chapter: "Treble clef",
		reset: fadeNotes(0),
		set: { "st0.m": FROM_G, "st0.rev": 1, "st0.hlo": 1, "kb.set": keys(67), "kb.gold": keys(67) },
		time: [
			["st0.hlo", { dur: 0.8 }],
			["st0.rev", { delay: 0.5, dur: 0.3 }],
		],
		sound: { at: 0.8, play: run({ row: 0, to: 1 }, { bpm: 120 }) },
		say: (N) => [
			"The treble clef is also called the ",
			T(`${N("G")} clef`),
			". The line it curls around is ",
			T(N("G")),
			`. Any note on that line is a ${N("G")}.`,
		],
	},
	{
		id: "count-up",
		chapter: "Treble clef",
		set: { "st0.rev": 7, "kb.set": keys(67, 69, 71, 72, 74, 76, 77) },
		time: [writeIn(0, 0.4 + LEAD + GAP, GAP, 6), ["kb.set", { delay: 0.4, dur: 0.01 }]],
		sound: { at: 0.4, play: run({ row: 0, to: 7 }) },
		say: (N) => [
			`The space above ${N("G")} is ${N("A")}, and the line above ${N("A")} is ${N("B")}. Each step up is the next note.`,
			N.letters ? " After G the letters start again at A: there is no H." : "",
		],
	},
	{
		id: "ledger",
		chapter: "Treble clef",
		set: { "st0.rev": 9, "kb.set": keys(67, 69, 71, 72, 74, 76, 77, 79, 81) },
		time: [writeIn(0, 0.4 + LEAD + GAP, GAP * 1.6, 2), ["kb.set", { delay: 0.4, dur: 0.01 }]],
		sound: { at: 0.4, play: run({ row: 0, from: 6 }, { bpm: RUN / 1.6 }) },
		say: (N) => [
			`After ${N("G")}, we run out of room. A `,
			E("ledger line"),
			` is a short line that extends the staff. With a ledger line drawn, we can place the ${N("A")}.`,
		],
	},
	{
		id: "melody",
		chapter: "Treble clef",
		reset: { values: { "st0.rev": 0, "st0.hlo": 0 }, dur: 0.4 },
		set: { "st0.m": MELODY, "st0.u": 52, "st0.w": 0, "st0.bars": 1, "st0.rev": count(MELODY), "st0.hlo": 0, "st0.names": 0, "kb.set": "", "kb.gold": "", "kb.dim": 0 },
		time: [
			["st0.u st0.w", { dur: 0.01 }],
			["st0.rev", { delay: 0.2, dur: 1.4 }],
			["kb.dim st0.names", { dur: 0.6 }],
		],
		sound: { at: 1.8, play: (S) => S.music(0, { bpm: 112, click: false, sus: false }) },
		say: (N) => [
			`Here is a melody on the treble staff. Its lowest note, ${N("C")}, sits on a ledger line below the staff — ledger lines work below as well as above.`,
		],
	},
	{
		id: "f-line",
		chapter: "Bass clef",
		set: { "st0.o": 0, "st1.o": 1, "st1.hlo": 1, "st1.rev": 1, "st1.names": 1, "kb.set": keys(53), "kb.gold": keys(53), "kb.dim": 1 },
		time: [
			["st0.o", { dur: 0.5 }],
			["st1.o", { delay: 0.5, dur: 0.6 }],
			["kb.dim kb.set kb.gold", { delay: 0.5, dur: 0.6 }],
		],
		sound: { at: 1.4, play: run({ row: 1, to: 1 }, { bpm: 120 }) },
		say: (N) => [
			"The bass clef is also called the ",
			T(`${N("F")} clef`),
			". The line between its two dots is ",
			T(N("F")),
			".",
		],
	},
	{
		id: "bass-fill",
		chapter: "Bass clef",
		reset: { values: { "st1.rev": 0 }, dur: 0.4 },
		set: { "st1.m": BASS_FILL, "st1.rev": count(BASS_FILL), "st1.names": 1, "kb.set": keys(43, 45, 47, 48, 50, 52, 53, 55, 57) },
		time: [writeIn(1, LEAD, GAP, count(BASS_FILL)), ["st1.names", { dur: 0.5 }]],
		sound: { at: 0, play: run(1) },
		say: (N) => [`From ${N("F")}, the rest of the staff fills in the same way: one step, one white key.`],
	},
	{
		id: "eleven",
		chapter: "Grand staff",
		reset: { values: { "st1.rev": 0, "st1.hlo": 0, "st1.co": 0, "st1.names": 0, "st1.o": 0 }, dur: 0.4 },
		set: {
			...CAM_GRAND,
			...row(0, { ...GS, y: GS_Y, m: HIGH, co: 0, names: 0, hlo: 0, bars: 0, rev: count(HIGH), o: 1 }),
			...row(1, { ...GS, y: GS_ELEVEN, m: LOW, co: 0, names: 0, hlo: 0, rev: count(LOW), o: 1 }),
			"gs.mid": 1,
			"kb.y": 540,
			"kb.set": keys(43, 47, 50, 53, 57, 60, 64, 67, 71, 74, 77),
			"kb.gold": "",
		},
		time: [
			[`${CAM} kb.y`, { dur: 1.2 }],
			["st0.o st1.o", { dur: 0.01 }],
			["st0.rev st1.rev", { dur: 0.01 }],
			["gs.mid", { delay: 0.6, dur: 1 }],
		],
		sound: { at: 1.8, play: run([{ row: 1 }, { row: 0, with: 0 }]) },
		say: () => [
			"The ",
			E("grand staff"),
			" puts a treble staff and a bass staff together. Think of it as one staff of eleven lines, with a note on every line.",
		],
	},
	{
		id: "split",
		chapter: "Grand staff",
		set: { "gs.mid": 0, "st1.y": GS_SPLIT, "st0.co": 1, "st1.co": 1, "gs.o": 1 },
		time: [
			["gs.mid", { dur: 0.6 }],
			["st1.y", { delay: 0.6, dur: 1 }],
			["st0.co st1.co gs.o", { delay: 1.4, dur: 0.8 }],
		],
		sound: { at: 2.4, play: run([{ row: 1 }, { row: 0, with: 0 }]) },
		say: () => [
			"Take away the middle line, and it becomes two regular staffs. A treble clef goes on the top staff and a bass clef on the bottom one.",
		],
	},
	{
		id: "middle-c",
		chapter: "Grand staff",
		set: {
			"st0.m": "_w _w _w _w _w C4w* E4w G4w B4w D5w F5w",
			"st1.m": "G2w B2w D3w F3w A3w C4w*",
			"st1.rev": 6,
			"st0.names": 1,
			"st1.names": 1,
			"kb.gold": keys(60),
		},
		time: [["st0.names st1.names", { delay: 0.3, dur: 0.6 }]],
		sound: { at: 0.6, play: run([{ row: 1, to: 5 }, { row: 0, with: 0 }]) },
		say: (N) => [
			`The two staffs meet at ${N("C")}, on the line that was taken away. It is called `,
			T(`middle ${N("C")}`),
			`: the middle of the grand staff, and the ${N("C")} nearest the middle of the keyboard.`,
		],
	},
	{
		id: "yours",
		chapter: "Your turn",
		interactive: true,
		set: { interactive: 1, pick: "60", "kb.set": "", "kb.dim": 0, "st0.m": "_w _w _w _w _w C4w*", "st1.m": "_w _w _w _w _w C4w*" },
		time: [["kb.dim", { dur: 0.6 }]],
		say: (N, P) => {
			const m = Number(P.pick) || 60;
			const [name, where] = describe(m, N);
			return ["Your turn: click any key to see where it is written on the grand staff. ", T(name), `: ${where}.`];
		},
	},
];

/* --------------------------------------------------------------------------
   The reader's turn: a key, written on the grand staff. Black keys are
   spelled with sharps; the next lesson but one explains them. */

const SPELL = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const spell = (m) => `${SPELL[m % 12]}${Math.floor(m / 12) - 1}`;
const ORD = ["first", "second", "third", "fourth", "fifth"];

function describe(m, N) {
	const name = spell(m);
	const letter = "CDEFGAB".indexOf(name[0]);
	const step = (Math.floor(m / 12) - 1) * 7 + letter;
	const display = N(name.replace(/\d+$/, ""));
	if (m === 60) return [display, `on a ledger line between the two staffs: middle ${N("C")}`];
	const treble = m > 60;
	const rel = step - (treble ? 30 : 18);
	const staff = treble ? "treble staff" : "bass staff";
	let where;
	if (rel >= 0 && rel <= 8) where = rel % 2 === 0 ? `the ${ORD[rel / 2]} line of the ${staff}` : `the ${ORD[(rel - 1) / 2]} space of the ${staff}`;
	else {
		const away = rel < 0 ? -rel : rel - 8;
		const side = rel < 0 ? "below" : "above";
		const n = Math.floor(away / 2);
		if (away === 1) where = `just ${side} the ${staff}`;
		else if (away % 2 === 0) where = n === 1 ? `on a ledger line ${side} the ${staff}` : `on the ${ORD[n - 1]} ledger line ${side} the ${staff}`;
		else where = `${side} ${n === 1 ? "one ledger line" : `${n} ledger lines`}, ${side} the ${staff}`;
	}
	return [display, where];
}

export function interact(data, { S }) {
	if (data.midi == null) return;
	const m = Number(data.midi);
	const note = `_w _w _w _w _w ${spell(m)}w*`;
	const empty = "_w";
	S.set({
		pick: String(m),
		"st0.m": m >= 60 ? note : empty,
		"st1.m": m <= 60 ? note : empty,
		"kb.gold": String(m),
	}, 0.01);
	S.note(m, 1.2);
	S.say();
}
