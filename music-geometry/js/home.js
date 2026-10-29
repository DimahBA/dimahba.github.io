/* Music Geometry — the home page: the course, and the circle that plays it.

   Each tile is a lesson. Pressing one plays its demonstration
   (js/home/lessons.js) on the circle of fifths and the keyboard at once,
   with a sentence under the circle saying what you are hearing; pressing it
   again stops it. Hovering a tile previews its picture, silently.

   The circle is also the key: click any key on it (or step round with ←
   and →) and the chosen lesson plays again from there — or, with no lesson
   chosen, that key's scale and home chord. The keyboard is an instrument:
   click, drag, or play it from the computer keyboard.

   A lesson's steps become one score: every note and every change of
   picture is scheduled on the audio clock, and the picture follows each cue
   as it sounds (js/audio.js, playScore), so they cannot drift apart. */

import { applyCssVars } from "./palette.js";
import * as audio from "./audio.js";
import { mod, nameOf, tonicSpelling, minorTonicSpelling } from "./theory.js";
import { $, $$, h, setText } from "./lib/dom.js";
import { lessons, keyDemo } from "./home/lessons.js";
import { createWheel, miniature } from "./home/wheel.js";
import { createKeys, LOW, HIGH } from "./home/keys.js";

applyCssVars();
audio.setRoom(0.3);

let naming = (() => {
	try {
		return localStorage.getItem("mg:naming") === "letters" ? "letters" : "solfege";
	} catch {
		return "solfege";
	}
})();

/** Every step merged over the ones before it, and the score they make. */
function compile(steps) {
	const events = [];
	const states = [];
	let t = 0;
	let acc = { view: {}, title: "", sub: "", say: "" };
	steps.forEach((st, i) => {
		acc = {
			view: { ...acc.view, ...st.view },
			title: st.title ?? acc.title,
			sub: st.sub ?? (st.title != null ? "" : acc.sub),
			say: st.say ?? acc.say,
		};
		states.push(acc);
		events.push({ t, cue: i });
		for (const p of st.play ?? []) events.push({ t: t + (p.dt ?? 0), notes: p.notes, hold: p.hold, vel: p.vel, sus: p.sus, tick: p.tick });
		t += st.dur;
	});
	return { events, states, total: t };
}

const IDLE = {
	view: {},
	title: "The circle of fifths",
	sub: "",
	say: "Twelve keys, each a fifth from the last. Press a lesson and it plays here — drawn on the circle, sounded on the keys.",
};

/* --------------------------------------------------------------------------
   The stage: circle, readout, keyboard */

const stage = $("#stage");
const wheel = createWheel($("#wheel"), { onPick: pick });
const keys = createKeys($("#keys"), { onPress: press });

const out = {
	eyebrow: $("#now-eyebrow"),
	row: $("#now-row"),
	title: $("#now-title"),
	sub: $("#now-sub"),
	say: $("#now-say"),
	again: $("#now-again"),
	key: $("#now-key"),
};

function paint(view) {
	wheel.set(view);
	keys.set(view);
}

function retrigger(el, name) {
	el.classList.remove(name);
	void el.offsetWidth;
	el.classList.add(name);
}

/* The sentence comes in word by word, as the lesson's narration does. */
function readout(state, eyebrow, animate = true) {
	if (eyebrow != null) setText(out.eyebrow, eyebrow);
	/* A new title rises in; a sub that changes under the same title (a
	   note's name as a scale climbs) just changes, or it would flicker. */
	if (out.title.textContent !== state.title) {
		setText(out.title, state.title);
		if (animate) retrigger(out.row, "is-new");
	}
	setText(out.sub, state.sub ?? "");
	if (out.say.dataset.text !== state.say) {
		out.say.dataset.text = state.say;
		out.say.replaceChildren(...state.say.split(" ").flatMap((w, i) => [h("span", { class: "word", "--i": i, text: w }), " "]));
		out.say.classList.toggle("is-still", !animate);
	}
}

function show(state, eyebrow, animate = true) {
	paint(state.view);
	readout(state, eyebrow, animate);
}

/* Notes light the keyboard and the circle while they ring. */
let ringing = [];

function sound(notes, hold = 0.6) {
	for (const m of notes) {
		keys.sound(m, true);
		wheel.sound(m, true);
		ringing.push(
			setTimeout(() => {
				keys.sound(m, false);
				wheel.sound(m, false);
			}, Math.max(140, hold * 800)),
		);
	}
}

function silence() {
	ringing.forEach(clearTimeout);
	ringing = [];
	keys.clear();
	wheel.clear();
}

/* --------------------------------------------------------------------------
   Playing a lesson */

let current = null; // { src, k, states, index, playing }
let rest = IDLE;
let restEyebrow = "Press any lesson";
let picked = null; // { pc, ring } once the reader chooses a key on the circle

function start(src) {
	halt();
	const k = picked?.pc ?? src.key;
	const { events, states, total } = compile(src.build(k, naming));
	current = { src, k, states, index: 0, playing: true };

	for (const t of $$(".tile.is-current")) t.classList.remove("is-current");
	if (src.tile) {
		src.tile.classList.add("is-current");
		src.tile.style.setProperty("--dur", `${total.toFixed(2)}s`);
		retrigger(src.tile, "is-playing");
		src.button.setAttribute("aria-pressed", "true");
	}
	stage.classList.add("is-playing");
	controls();

	audio.playScore(events, {
		onEvent(e) {
			if (e.cue != null && current?.src === src) {
				current.index = e.cue;
				show(current.states[e.cue], src.eyebrow);
			}
			if (e.notes) sound(e.notes, e.hold);
		},
		onEnd: settle,
	});
	if (src.id) history.replaceState(null, "", `#${src.id}`);
}

function settle() {
	if (!current) return;
	current.playing = false;
	rest = current.states.at(-1);
	restEyebrow = current.src.eyebrow;
	current.src.tile?.classList.remove("is-playing");
	current.src.button?.setAttribute("aria-pressed", "false");
	stage.classList.remove("is-playing");
	controls();
}

function halt() {
	audio.stop();
	silence();
	if (current?.playing) settle();
}

function controls() {
	out.again.hidden = !current;
	out.again.dataset.state = current?.playing ? "stop" : "play";
	out.again.setAttribute("aria-label", current?.playing ? "Stop" : "Play again");
	setText($(".now__again-text", out.again), current?.playing ? "Stop" : "Play again");

	out.key.hidden = !picked;
	if (picked) {
		const name = nameOf(picked.ring === "minor" ? minorTonicSpelling(picked.pc) : tonicSpelling(picked.pc), naming);
		setText($(".now__key-name", out.key), picked.ring === "minor" ? `${name.toLowerCase()} minor` : name);
	}
}

out.again.addEventListener("click", () => {
	audio.unlock();
	if (current?.playing) halt();
	else if (current) start(current.src);
});

out.key.addEventListener("click", () => {
	picked = null;
	controls();
	if (current && !current.playing) start(current.src);
});

/* --------------------------------------------------------------------------
   The tiles */

const sources = new Map();
let hover = 0;

function signature(src) {
	const { states } = compile(src.build(picked?.pc ?? src.key, naming));
	return states[src.glyph ?? states.length - 1] ?? states.at(-1);
}

/* Previews wait a moment, so sweeping the pointer across the grid doesn't
   flicker the circle — and never paint over a lesson that started since. */
function preview(src) {
	clearTimeout(hover);
	hover = setTimeout(() => current?.playing || paint(signature(src).view), 90);
}

function unpreview() {
	clearTimeout(hover);
	hover = setTimeout(() => current?.playing || paint(rest.view), 140);
}

for (const tile of $$(".tile[data-lesson]")) {
	const lesson = lessons.find((l) => l.id === tile.dataset.lesson);
	if (!lesson) continue;
	const button = $(".tile__play", tile);
	const src = {
		...lesson,
		tile,
		button,
		eyebrow: `${$(".tile__num", tile).textContent} · ${$(".tile__name", tile).textContent}`,
	};
	sources.set(lesson.id, src);

	const { states } = compile(lesson.build(lesson.key, naming));
	$(".tile__glyph", tile).append(miniature((states[lesson.glyph ?? states.length - 1] ?? states.at(-1)).view));

	button.setAttribute("aria-pressed", "false");
	button.addEventListener("click", () => {
		audio.unlock();
		if (current?.src === src && current.playing) halt();
		else start(src);
	});
	tile.addEventListener("pointerenter", () => preview(src));
	tile.addEventListener("pointerleave", unpreview);
	button.addEventListener("focus", () => preview(src));
	button.addEventListener("blur", unpreview);
}

/* --------------------------------------------------------------------------
   Keys: the circle picks one; the keyboard plays */

function keySource(pc, ring) {
	return {
		id: null,
		key: pc,
		eyebrow: ring === "minor" ? "A minor key" : "A major key",
		build: (k, n) => keyDemo(k, ring, n),
	};
}

function pick(pc, ring = "major") {
	audio.unlock();
	clearTimeout(hover);
	picked = { pc: mod(pc), ring };
	start(current?.src?.id ? current.src : keySource(picked.pc, ring));
}

function press(midi) {
	audio.unlock();
	audio.playNote(midi, 1);
	sound([midi], 1);
}

/* The computer keyboard as a piano: the home row is the white keys from C,
   the row above it the black keys, as on most music software. */
const QWERTY = "awsedftgyhujkolp;'";
let octave = 60;

document.addEventListener("keydown", (e) => {
	if (e.altKey || e.ctrlKey || e.metaKey) return;
	if (e.key === "Escape") {
		halt();
		return;
	}
	if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
		e.preventDefault();
		const from = picked?.pc ?? current?.k ?? 0;
		pick(from + (e.key === "ArrowRight" ? 7 : -7), picked?.ring ?? "major");
		return;
	}
	const key = e.key.toLowerCase();
	if (key === "z" || key === "x") {
		octave = Math.min(HIGH - 12, Math.max(LOW, octave + (key === "x" ? 12 : -12)));
		return;
	}
	const i = QWERTY.indexOf(key);
	if (i >= 0 && !e.repeat && octave + i <= HIGH) press(octave + i);
});

/* Sound keeps going in a background tab, but the timers that draw it
   don't: stop rather than drift. */
document.addEventListener("visibilitychange", () => {
	if (document.hidden) halt();
});

/* --------------------------------------------------------------------------
   Names */

function rename(to) {
	naming = to;
	try {
		localStorage.setItem("mg:naming", to);
	} catch {
		/* private window: fine */
	}
	for (const b of $$("[data-naming]")) b.setAttribute("aria-pressed", String(b.dataset.naming === to));
	wheel.relabel(to);
	keys.relabel(to);
	if (current) {
		current.states = compile(current.src.build(current.k, to)).states;
		if (!current.playing) rest = current.states.at(-1);
		readout(current.states[current.index] ?? rest, null, false);
	} else {
		readout(rest, null, false);
	}
	controls();
}

for (const b of $$("[data-naming]")) b.addEventListener("click", () => rename(b.dataset.naming));

/* --------------------------------------------------------------------------
   A lesson named in the address bar is shown, ready to play — on first
   paint, and again whenever the hash changes (back, forward, a pasted link). */

function open(src, scroll) {
	halt();
	const { states } = compile(src.build(picked?.pc ?? src.key, naming));
	current = { src, k: picked?.pc ?? src.key, states, index: states.length - 1, playing: false };
	rest = states.at(-1);
	restEyebrow = src.eyebrow;
	for (const t of $$(".tile.is-current")) t.classList.remove("is-current");
	src.tile.classList.add("is-current");
	if (scroll) src.tile.scrollIntoView({ block: "center" });
	controls();
	show(rest, restEyebrow, false);
}

rename(naming);
const named = sources.get(location.hash.slice(1));
if (named) open(named, true);
else show(rest, restEyebrow, false);

window.addEventListener("hashchange", () => {
	const src = sources.get(location.hash.slice(1));
	if (src && src !== current?.src) open(src, true);
});
