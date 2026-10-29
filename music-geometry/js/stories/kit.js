/* What the stories after the major scale share: the camera, the coloured
   words in the narration, note names in the reader's naming, every
   component's starting parameters, and the title beat each lesson opens
   with.

   A story is a module exporting `beats`, `defaults`, `namer`, `stage(layer)`
   (the components it draws with) and, if its last beat lets the reader
   play, `interact(data, ctx)`. See js/lesson.js for how they are run, and
   js/stories/major-scale.js for the first one, which predates this kit. */

import { LETTERS, SOLFEGE } from "../theory.js";
import { parse } from "../rhythm.js";
import { rowDefaults, grandDefaults } from "../stage/score.js";
import { keyboardDefaults } from "../stage/keyboard.js";
import { conductorDefaults } from "../stage/conductor.js";

/* The camera: the part of the 1600×900 world that must be on screen. The
   stage fits it as large as it can, so a tighter frame means bigger
   notation, and moving it is a Manim camera move. */
export const cam = (x, y, w, h) => ({ "cam.x": x, "cam.y": y, "cam.w": w, "cam.h": h });
export const CAM = "cam.x cam.y cam.w cam.h";

export const linear = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t);

/* Coloured words, in the same colours as the things they name. */
export const W = (t) => ({ t, k: "whole" });
export const H = (t) => ({ t, k: "half" });
export const T = (t) => ({ t, k: "tonic" });
export const G = (t) => ({ t, k: "fits" });
export const E = (t) => ({ t, k: "em" });

/** Note names in the reader's naming: N("F#") is "Fa♯" or "F♯". */
export function namer(naming) {
	const letters = naming === "letters";
	const N = (spec) => {
		const name = (letters ? LETTERS : SOLFEGE)["CDEFGAB".indexOf(spec[0])];
		const marks = spec.slice(1).replace("##", "𝄪").replace("bb", "𝄫").replace("#", "♯").replace("b", "♭").replace("n", "♮");
		return name + marks;
	};
	N.naming = naming;
	N.letters = letters;
	return N;
}

/** Parameters under one prefix: at("st0", { o: 1 }) → { "st0.o": 1 }. */
export const at = (prefix, values) => Object.fromEntries(Object.entries(values).map(([k, v]) => [`${prefix}.${k}`, v]));
export const row = (r, values) => at(`st${r}`, values);
export const kb = (values) => at("kb", values);
export const cd = (values) => at("cd", values);

/** Every component's starting parameters, with a story's own on top. */
export function base(rows, over = {}) {
	return {
		...cam(0, 0, 1600, 900),
		"title.o": 0,
		"title.w": 0,
		"sub.o": 0,
		...Object.assign({}, ...Array.from({ length: rows }, (_, r) => rowDefaults(r))),
		...grandDefaults,
		...keyboardDefaults(),
		...conductorDefaults(),
		pick: "",
		interactive: 0,
		...over,
	};
}

/** The opening card. The beat after it fades the title out. */
export const titleBeat = (chapter) => ({
	id: "title",
	chapter,
	next: "Begin",
	set: { ...cam(0, 140, 1600, 620), "title.o": 1, "title.w": 1, "sub.o": 1 },
	time: [
		[CAM, { dur: 0.01 }],
		["title.w", { dur: 2.6, ease: linear }],
		["sub.o", { delay: 2, dur: 0.9 }],
	],
	say: () => ["Turn your sound on."],
});

export const untitle = { "title.o": 0, "sub.o": 0 };

/** A row's notes written in one by one, `gap` seconds apart from `delay`,
    each appearing as it sounds when the music starts at the same moment. */
export const writeIn = (r, delay, gap, n) => [`st${r}.rev`, { delay: delay + 0.1, dur: gap * n, ease: linear }];

/** How many items a line of music has — what `rev` counts up to. */
export const count = (m) => parse(m).items.length;

/** For a last beat's choices: fade `out`, then bring `into` on stage,
    rewrite the narration (it may name the choice), and play. */
export function swap(S, out, into, play) {
	S.set(out, 0.3);
	S.later(() => {
		S.set(into, 0.9);
		S.say();
		S.later(() => play(S), 1);
	}, 0.35);
}
