/* The story: the major scale in seven beats.

     listen    the scale, heard and written on a staff
     steps     the same notes on a piano; half steps (a V) and whole steps
               (an arch); the recipe W W H W W W H
     any note  the recipe walked from Sol, landing on a black key; then the
               reader clicks any key and gets its major scale

   Each beat sets some parameters (see js/engine/params.js); its full target
   is every earlier beat's settings merged with its own, so any beat can be
   reached from any other by tweening to its target. `time` shapes only the
   forward transition. A beat with `reset` first fades those parameters to
   the given values, then plays its own transition — how the demonstration
   clears Do major's marks before walking the recipe again from Sol.
   `sound.play` runs `sound.at` seconds into the beat's own transition.
   `say(N, P)` is the narration; `N` names the notes in the reader's
   naming (solfège or letters), and `P` is the stage, for the key in play.

   The stage is drawn by four components (`stage`), and the last beat's
   clicks come back here (`interact`): a piano key builds its scale, a note
   on the staff plays.

   The narration is Claude's draft, except beat 4, which is Dimah's
   sentence. Once Dimah rewrites a beat it is hers word for word. */

import { majorScale, keySignature, nameOf, tonicSpelling, mod } from "../theory.js";
import * as title from "../stage/title.js";
import * as formula from "../stage/formula.js";
import * as staff from "../stage/staff.js";
import * as piano from "../stage/piano.js";

const GAP = 0.34;
const WALK = 0.75;

/** The major scale on `tonic`, climbing, each note heard and lit. */
const scale = (S, tonic = 0, opts) =>
	S.seq(
		majorScale(tonic).map((n) => n.midi),
		opts,
	);

const each = (prefix, n, suffix, value) =>
	Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i}${suffix}`, typeof value === "function" ? value(i) : value]));

const W = (t) => ({ t, k: "whole" });
const H = (t) => ({ t, k: "half" });
const T = (t) => ({ t, k: "tonic" });
const G = (t) => ({ t, k: "fits" });
const E = (t) => ({ t, k: "em" });

/* The camera: the part of the 1600×900 world that must be on screen. The
   stage fits it as large as it can (the viewBox, with "meet"), so a tighter
   frame means bigger notation, and moving it is a Manim camera move. */
const cam = (x, y, w, h) => ({ "cam.x": x, "cam.y": y, "cam.w": w, "cam.h": h });
const CAM = "cam.x cam.y cam.w cam.h";
const CAM_TITLE = cam(0, 140, 1600, 620);
const CAM_STAFF = cam(100, 200, 1400, 470);
const CAM_MAIN = cam(15, 175, 1580, 620);

/* Places the components come back to. After the first beat the staff and
   the piano sit side by side, so each note can be read across from its
   key. One octave leaves them room to be large; the two octaves the
   demonstration needs (a scale from Sol climbs past Do) take some of the
   staff's width. */
const STAFF_CENTER = { "staff.x": 305, "staff.y": 360, "staff.s": 1 };
const STAFF_LEFT = { "staff.x": 40, "staff.y": 380, "staff.s": 0.86 };
const STAFF_LEFT_NARROW = { "staff.x": 30, "staff.y": 400, "staff.s": 0.73 };
const PIANO_ONE = { "piano.x": 975, "piano.y": 330, "piano.s": 1.2, "piano.ext": 0 };
const PIANO_TWO = { "piano.x": 790, "piano.y": 330, "piano.s": 0.88, "piano.ext": 1 };

export const defaults = {
	...cam(0, 0, 1600, 900),

	"title.o": 0,
	"title.w": 0,
	"sub.o": 0,

	"staff.o": 0,
	...STAFF_CENTER,
	"staff.draw": 0,
	"staff.tonic": "0",
	"staff.accHi": 0,
	...each("note", 8, ".o", 0),

	"piano.o": 0,
	...PIANO_ONE,
	"names.o": 0,
	dimOut: 0,
	halfTint: 0,

	"pat.o": 0,
	"pat.rot": 0,
	...each("bead", 8, ".o", 0),
	"deg.o": 0,
	...each("step", 7, ".d", 0),
	"steps.l": 0,
	"wrong.o": 0,

	"formula.o": 0,
	"formula.x": 800,
	"formula.y": 742,
	...each("f", 7, ".o", 0),

	interactive: 0,
};

export const beats = [
	{
		id: "title",
		chapter: "Listen",
		next: "Begin",
		set: { ...CAM_TITLE, "title.o": 1, "title.w": 1, "sub.o": 1 },
		time: [
			[CAM, { dur: 0.01 }],
			["title.w", { dur: 2.6, ease: (t) => t }],
			["sub.o", { delay: 2, dur: 0.9 }],
		],
		say: () => ["Turn your sound on."],
	},
	{
		id: "scale",
		chapter: "Listen",
		set: { ...CAM_STAFF, "title.o": 0, "sub.o": 0, "staff.o": 1, "staff.draw": 1, ...each("note", 8, ".o", 1) },
		time: [
			[CAM, { dur: 1.2 }],
			["title.o sub.o", { dur: 0.6 }],
			["staff.o", { delay: 0.3, dur: 0.3 }],
			["staff.draw", { delay: 0.3, dur: 1.4 }],
			[/^note(\d)\.o$/, { delay: (i) => 1.8 + i * GAP, dur: 0.25 }],
		],
		sound: { at: 1.8, play: (S) => scale(S, 0) },
		say: (N) => [
			`${N.do}, ${N.re}, ${N.mi}, ${N.fa}, ${N.sol}, ${N.la}, ${N.si}, ${N.do}. You've heard it all your life: it's the `,
			E("major scale"),
			".",
		],
	},
	{
		id: "piano",
		chapter: "Steps",
		set: { ...CAM_MAIN, ...STAFF_LEFT, "piano.o": 1, "names.o": 1, "pat.o": 1, ...each("bead", 8, ".o", 1), "deg.o": 1 },
		time: [
			[CAM, { dur: 1.2 }],
			["staff.x staff.y staff.s", { dur: 1.2 }],
			["piano.o names.o", { delay: 0.8, dur: 0.9 }],
			["deg.o", { delay: 1.8, dur: 0.01 }],
			[/^bead(\d)\.o$/, { delay: (i) => 2 + i * GAP, dur: 0.25 }],
		],
		sound: { at: 2, play: (S) => scale(S, 0) },
		say: (N) => [
			`Here are the same eight notes on a piano. Starting from ${N.do}, they are simply the white keys, one after the other.`,
		],
	},
	{
		id: "steps",
		chapter: "Steps",
		set: { halfTint: 1, ...each("step", 7, ".d", 1), "steps.l": 1 },
		time: [
			["steps.l", { dur: 0.01 }],
			["halfTint", { delay: 0.4, dur: 0.8 }],
			["step2.d", { delay: 0.5, dur: 0.5 }],
			["step6.d", { delay: 1.85, dur: 0.5 }],
			[/^step([01345])\.d$/, { delay: (i) => 3.6 + i * 0.22, dur: 0.45 }],
		],
		sound: { at: 0.5, play: (S) => S.seq([64, 65, null, 71, 72, null, null, 60, 62], { gap: 0.45 }) },
		say: (N) => [
			`${N.mi}–${N.fa} and ${N.si}–${N.do} are right next to each other, with no key in between: that's a `,
			H("half step"),
			", marked with a V. Keys that have a black key between them are a ",
			W("whole step"),
			" apart.",
		],
	},
	{
		id: "recipe",
		chapter: "Steps",
		set: { "formula.o": 1, ...each("f", 7, ".o", 1) },
		time: [
			["formula.o", { dur: 0.01 }],
			[/^f(\d)\.o$/, { delay: (i) => 0.5 + (i + 1) * GAP, dur: 0.35 }],
		],
		sound: { at: 0.5, play: (S) => scale(S, 0) },
		say: (N) => [
			`If we play the usual ${N.do} ${N.re} ${N.mi}…, we end up with this pattern: `,
			W("W"),
			W("W"),
			H("H"),
			W("W"),
			W("W"),
			W("W"),
			H("H"),
			", which is the ",
			E("major scale"),
			".",
		],
	},
	{
		id: "from-sol",
		chapter: "Any note",
		reset: { values: { ...each("note", 8, ".o", 0), ...each("bead", 8, ".o", 0), ...each("step", 7, ".d", 0) }, dur: 0.45 },
		set: {
			...PIANO_TWO,
			...STAFF_LEFT_NARROW,
			dimOut: 1,
			"pat.rot": 7,
			"staff.tonic": "7",
			...each("note", 8, ".o", 1),
			...each("bead", 8, ".o", 1),
			...each("step", 7, ".d", 1),
			"wrong.o": 1,
			"staff.accHi": 1,
		},
		time: [
			["piano.x piano.s piano.ext dimOut staff.x staff.y staff.s", { dur: 1.1 }],
			["pat.rot staff.tonic", { dur: 0.01 }],
			[/^(?:note|bead)(\d)\.o$/, { delay: (i) => 1.4 + i * WALK, dur: 0.25 }],
			[/^step(\d)\.d$/, { delay: (i) => 1.4 + i * WALK + 0.2, dur: WALK - 0.25 }],
			["wrong.o", { delay: 1.4 + 5 * WALK + 0.05, dur: 0.3 }],
			["staff.accHi", { delay: 1.4 + 6 * WALK, dur: 0.01 }],
		],
		sound: { at: 1.4, play: (S) => scale(S, 7, { gap: WALK }) },
		say: (N) => [
			"The recipe works from any note. Start on ",
			T(N.sol),
			" and take the same steps: whole, whole, half, whole, whole, whole, half. A whole step up from ",
			`${N.mi} isn't ${N.fa} — that's only a half step — it's `,
			G(N.faSharp),
			`, a black key. That's the ${N.sol} major scale.`,
		],
	},
	{
		id: "any",
		chapter: "Any note",
		interactive: true,
		set: { "wrong.o": 0, interactive: 1 },
		time: [["wrong.o", { dur: 0.5 }]],
		extras: [{ label: () => "Play the scale", play: (S, P) => scale(S, Number(P["staff.tonic"])) }],
		say: (N, P) => {
			const key = Number(P["staff.tonic"]);
			const notes = majorScale(key).slice(0, 7);
			const sig = keySignature(notes);
			const altered = notes.filter((n) => n.acc !== 0).map((n) => nameOf(n, N.naming));
			const kind = sig.sign > 0 ? "sharp" : "flat";
			const count =
				sig.count === 0 ? "no sharps or flats: only white keys" : `${sig.count} ${kind}${sig.count > 1 ? "s" : ""}: ${altered.join(", ")}`;
			return [
				"Your turn: click any key, white or black, to build its major scale. ",
				T(`${nameOf(tonicSpelling(key), N.naming)} major`),
				" — ",
				E(notes.map((n) => nameOf(n, N.naming)).join(" ")),
				" — ",
				G(count),
				".",
			];
		},
	},
];

/** Note names for the narration, in the reader's chosen naming. */
export function namer(naming) {
	const L = naming === "letters";
	return {
		naming,
		do: L ? "C" : "Do",
		re: L ? "D" : "Ré",
		mi: L ? "E" : "Mi",
		fa: L ? "F" : "Fa",
		sol: L ? "G" : "Sol",
		la: L ? "A" : "La",
		si: L ? "B" : "Si",
		faSharp: L ? "F♯" : "Fa♯",
	};
}

export function stage(layer) {
	return [title.create(layer()), formula.create(layer()), staff.create(layer()), piano.create(layer())];
}

/* --------------------------------------------------------------------------
   The last beat: the reader's turn */

const BUILD_GAP = 0.3;

/* Walk the recipe from the key that was clicked: the old scale fades, then
   each note appears on the staff and the piano as it sounds, each step
   drawn as it is taken — the demonstration again, at playing speed. The
   scale always starts in the lower octave, so it fits the keyboard. */
function build(sv, { store, S, later, clearTimers, kick, say, audio }) {
	const tonic = mod(sv, 12);
	clearTimers();
	audio.stop();
	store.finish();

	const parts = (v) => {
		const out = {};
		for (let j = 0; j < 8; j++) {
			out[`note${j}.o`] = v;
			out[`bead${j}.o`] = v;
			if (j < 7) out[`step${j}.d`] = v;
		}
		return out;
	};
	store.animate(parts(0), [], { dur: 0.18 });
	later(() => {
		store.set("pat.rot", tonic);
		store.set("staff.tonic", String(tonic));
		say();
		store.animate(parts(1), [
			[/^(?:note|bead)(\d)\.o$/, { delay: (i) => i * BUILD_GAP, dur: 0.18 }],
			[/^step(\d)\.d$/, { delay: (i) => i * BUILD_GAP + 0.08, dur: BUILD_GAP * 0.9 }],
		]);
		scale(S, tonic, { gap: BUILD_GAP });
		kick();
	}, 0.2);
	kick();
}

/** A piano key builds its scale; a note on the staff plays. */
export function interact(data, ctx) {
	if (data.s != null) build(Number(data.s), ctx);
	else if (data.midi != null) ctx.S.note(Number(data.midi));
}
