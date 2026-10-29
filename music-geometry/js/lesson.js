/* Music Geometry — a lesson, told in beats.

   Every lesson page runs this one machine. What it tells comes from a
   story in js/stories/, named on the page — <html data-story="rests"> — and
   looked up in a fixed list, so the page can only ever load a story that
   exists.

   One parameter store (`P`), the stage components the story asks for, and
   a list of beats that are targets for it. Moving forward tweens to the
   next beat's target with that beat's own timing and plays its sound;
   moving back or jumping tweens there plainly, in silence; replay snaps to
   the previous beat and plays this one again.

   A single requestAnimationFrame loop runs while anything is moving — a
   tween, a spring, a note's flash, music being followed — and stops when
   the stage is still, so an idle page costs nothing. The camera is part of
   `P` too: the stage's viewBox is simply the `cam.*` rectangle.

   A story's last beat can hand the instruments to the reader: its
   `interact` hook gets every press on the stage, and a beat's `extras`
   become buttons under the narration. */

import { applyCssVars } from "./palette.js";
import { createParams } from "./engine/params.js";
import { createLive } from "./engine/live.js";
import * as audio from "./audio.js";
import { parse, meter, pulses, sounds } from "./rhythm.js";
import { pattern } from "./stage/conductor.js";
import { s, h, $, attrs } from "./lib/dom.js";

const STORIES = {
	"major-scale": () => import("./stories/major-scale.js"),
	staff: () => import("./stories/staff.js"),
	"note-duration": () => import("./stories/note-duration.js"),
	"time-signatures": () => import("./stories/time-signatures.js"),
	rests: () => import("./stories/rests.js"),
	"dots-ties": () => import("./stories/dots-ties.js"),
	"steps-accidentals": () => import("./stories/steps-accidentals.js"),
	meter: () => import("./stories/meter.js"),
	"odd-meter": () => import("./stories/odd-meter.js"),
};

const name = document.documentElement.dataset.story;
const story = await (Object.hasOwn(STORIES, name) ? STORIES[name] : STORIES["major-scale"])();
const { beats, defaults } = story;

applyCssVars();

const remembered = (() => {
	try {
		return localStorage.getItem("mg:naming") === "letters" ? "letters" : "solfege";
	} catch {
		return "solfege";
	}
})();

/* --------------------------------------------------------------------------
   Stage */

const svg = $("#stage");
const views = story.stage(() => svg.appendChild(s("g")));

const store = createParams({ ...defaults, naming: remembered });
const { P } = store;
const live = createLive();

const targets = [];
beats.reduce((acc, b, i) => (targets[i] = { ...acc, ...b.set }), defaults);

let raf = 0;
let last = 0;

function frame(now) {
	const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
	last = now;
	let busy = store.tick(now);
	attrs(svg, { viewBox: `${P["cam.x"]} ${P["cam.y"]} ${P["cam.w"]} ${P["cam.h"]}` });
	for (const v of views) busy = v.render(P, live, now, dt) || busy;
	busy = live.busy(now) || busy;
	raf = busy ? requestAnimationFrame(frame) : 0;
}

function kick() {
	if (raf) return;
	last = performance.now();
	raf = requestAnimationFrame(frame);
}

/* --------------------------------------------------------------------------
   Sound */

let timers = [];
const later = (fn, seconds) => timers.push(setTimeout(fn, seconds * 1000));

function clearTimers() {
	timers.forEach(clearTimeout);
	timers = [];
}

const S = {
	/** Notes one after another, `gap` seconds apart; null is a rest. */
	seq(midis, { gap = 0.34 } = {}) {
		audio.playSequence(midis, {
			gap,
			onNote: (i) => {
				for (const midi of [midis[i]].flat()) if (midi != null) live.hit(midi);
				kick();
			},
		});
	},

	note(midi, hold = 0.9) {
		audio.playNote(midi, hold);
		live.hit(midi);
		kick();
	},

	/**
	 * Plays what is written on score rows, in time, with the metronome:
	 * `parts` is a row number or a list of them, or of { row, from, to,
	 * times, with, mute, cd, pulse } — items `from`…`to` only, played `times` over,
	 * started together `with` an earlier part rather than after it, `mute`d
	 * (followed on screen, not heard), or conducted in pattern `cd`. Each
	 * row's pictures follow its own transport, and the conductor's hand,
	 * when it is on stage, follows the music from a silent beat before it.
	 * `pulse` clicks a finer grid than the beat; `sub` adds soft ticks on
	 * every subdivision.
	 * Returns how long it all lasts, in seconds.
	 */
	music(parts, opts = {}) {
		const { bpm = 84, click = true, gap = 1, sus = true, vel = 0.8 } = opts;
		const spq = 60 / bpm;
		const conduct = opts.conduct ?? P["cd.o"] > 0.5;
		const list = [parts].flat().map((p) => (typeof p === "number" ? { row: p } : p));
		const events = [];
		const starts = [];
		let t0 = performance.now();
		let at = 0.15 / spq;

		list.forEach((part, k) => {
			const row = `st${part.row}.`;
			const music = parse(part.m ?? P[`${row}m`]);
			const m = meter(part.time ?? P[`${row}time`]);
			const pulse = part.pulse ?? opts.pulse ?? (Number(P[`${row}pulse`]) || 0);
			const a = part.from ? music.items[part.from].t : 0;
			const b = part.to != null ? (music.items[part.to]?.t ?? music.total) : music.total;
			const span = b - a;
			const times = part.times ?? 1;
			const pat = conduct && part.with == null ? pattern(part.cd ?? P["cd.pat"]) : null;
			if (pat) at += pat.lens.at(-1);
			const start = part.with != null ? starts[part.with] : at;
			starts[k] = start;

			if (pat) {
				events.push({
					t: Math.max(0, start - pat.lens.at(-1)) * spq,
					cue: k,
					run() {
						if (part.cd) store.set("cd.pat", part.cd);
						live.run("cd", t0 + start * spq * 1000, spq, span * times);
					},
				});
			}
			for (let rep = 0; rep < times; rep++) {
				const off = start + rep * span - a;
				events.push({ t: (off + a) * spq, cue: k, run: () => live.run(`st${part.row}`, t0 + off * spq * 1000, spq, b) });
				if (!part.mute) {
					for (const snd of sounds(music)) {
						if (snd.t < a - 1e-6 || snd.t >= b - 1e-6) continue;
						const d = Math.min(snd.d, b - snd.t);
						events.push({ t: (off + snd.t) * spq, notes: [snd.midi], hold: Math.max(0.08, d * spq - 0.03), vel, sus });
					}
				}
				if (click && part.with == null && part.click !== false) {
					const inside = (q) => q.t >= a - 1e-6 && q.t < b - 1e-6;
					const main = pulses(music, m, pulse).filter(inside);
					for (const q of main) events.push({ t: (off + q.t) * spq, tick: q.level });
					/* Soft ticks between the beats, so a beat can be heard
					   splitting in two or in three. */
					if (opts.sub) {
						const on = new Set(main.map((q) => Math.round(q.t * 1000)));
						for (const q of pulses(music, m, m.sub).filter(inside)) {
							if (!on.has(Math.round(q.t * 1000))) events.push({ t: (off + q.t) * spq, tick: 0.5 });
						}
					}
				}
			}
			if (part.with == null) at = start + span * times + (k < list.length - 1 ? gap : 0);
		});

		audio.playScore(events, {
			onStart(ms) {
				t0 = ms;
			},
			onEvent(e) {
				e.run?.();
				for (const midi of e.notes ?? []) live.hit(midi);
				kick();
			},
		});
		kick();
		return at * spq;
	},

	/** Tweens some parameters, from a story's extras or clicks. */
	set(values, dur = 0.6) {
		store.animate(values, [], { dur });
		if (reduceMotion.matches) store.finish();
		kick();
	},

	/** Runs `fn` in `seconds`, unless the reader moves on first. */
	later(fn, seconds) {
		later(fn, seconds);
	},

	/** Writes the narration again, for a beat whose words follow a choice. */
	say() {
		renderSay(false);
	},

	P,
};

/* --------------------------------------------------------------------------
   Beats */

let beat = 0;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function go(k, mode = "jump") {
	k = Math.max(0, Math.min(beats.length - 1, k));
	clearTimers();
	audio.stop();
	live.clear();
	store.finish();

	const b = beats[k];
	if (mode === "forward" || mode === "replay") {
		if (mode === "replay") Object.assign(P, k > 0 ? targets[k - 1] : defaults);
		/* A reset fades some things out first; the beat proper starts once
		   they are gone. */
		const lead = b.reset ? b.reset.dur + 0.05 : 0;
		const run = () => {
			store.animate(targets[k], b.time ?? []);
			if (reduceMotion.matches) store.finish();
			kick();
		};
		if (b.reset) {
			store.animate(b.reset.values, [], { dur: b.reset.dur });
			later(run, lead);
		} else run();
		/* The sound reads the stage it plays, so any discrete change that
		   was due by now is applied first. */
		if (b.sound) {
			later(() => {
				store.tick(performance.now());
				b.sound.play(S, P);
			}, lead + b.sound.at);
		}
	} else {
		store.animate(targets[k], [], { dur: 0.9 });
		if (reduceMotion.matches) store.finish();
	}

	beat = k;
	history.replaceState(null, "", k ? `#${k}` : location.pathname + location.search);
	renderChrome();
	renderSay(true);
	kick();
}

const next = () => beat < beats.length - 1 && go(beat + 1, "forward");
const back = () => beat > 0 && go(beat - 1, "jump");

/* Editing the #beat in the address bar jumps there. */
window.addEventListener("hashchange", () => {
	const k = Number.parseInt(location.hash.slice(1), 10) || 0;
	if (k !== beat) go(k, "jump");
});

/* A reload comes back to the same beat, already in place. */
function start() {
	const k = Number.parseInt(location.hash.slice(1), 10);
	if (!(k > 0 && k < beats.length)) return go(0, "forward");
	Object.assign(P, targets[k]);
	beat = k;
	renderChrome();
	renderSay(false);
	kick();
}

/* --------------------------------------------------------------------------
   Narration */

const sayEl = $("#say");
const extrasEl = $("#extras");

function renderSay(animate) {
	const b = beats[beat];
	const N = story.namer(P.naming);
	const segments = b.say ? b.say(N, P) : [];

	/* Each word is its own span so it can fade in on its own beat. Pieces
	   with no space between them — a coloured "whole" and the comma after
	   it — are wrapped together so a line can never break between them. */
	const out = [];
	let group = null;
	let i = 0;
	for (const seg of segments) {
		const text = typeof seg === "string" ? seg : seg.t;
		const cls = typeof seg === "string" ? "" : ` k-${seg.k}`;
		for (const part of text.split(/(\s+)/)) {
			if (!part) continue;
			if (/^\s+$/.test(part)) {
				group = null;
				out.push(" ");
				continue;
			}
			if (!group) out.push((group = h("span", { class: "unbroken" })));
			group.append(h("span", { class: `word${cls}`, "--i": i++, text: part }));
		}
	}
	sayEl.replaceChildren(...out);
	sayEl.classList.toggle("is-still", !animate);

	extrasEl.replaceChildren(
		...(b.extras ?? []).map((x) =>
			h("button", {
				type: "button",
				class: "extra",
				"aria-pressed": x.on ? String(Boolean(x.on(P))) : null,
				text: x.label(N, P),
				onClick: () => {
					audio.unlock();
					clearTimers();
					x.play(S, P);
				},
			}),
		),
	);
}

/* --------------------------------------------------------------------------
   Controls */

const nextBtn = $("#next");
const backBtn = $("#back");
const progress = $("#progress");

const chapters = [];
beats.forEach((b, i) => {
	let c = chapters.at(-1);
	if (!c || c.name !== b.chapter) chapters.push((c = { name: b.chapter, beats: [] }));
	c.beats.push(i);
});

const ticks = [];
progress.replaceChildren(
	...chapters.map((c) =>
		h(
			"li",
			{ class: "chapter" },
			h("span", { class: "chapter__name", text: c.name }),
			h(
				"span",
				{ class: "chapter__ticks" },
				c.beats.map((i) => {
					const t = h("button", {
						type: "button",
						class: "tick",
						"aria-label": `${c.name}, beat ${i + 1}`,
						onClick: () => {
							audio.unlock();
							go(i, i === beat + 1 ? "forward" : "jump");
						},
					});
					ticks[i] = t;
					return t;
				}),
			),
		),
	),
);

function renderChrome() {
	ticks.forEach((t, i) => {
		t.classList.toggle("is-done", i < beat);
		if (i === beat) t.setAttribute("aria-current", "step");
		else t.removeAttribute("aria-current");
	});
	nextBtn.textContent = beats[beat].next ?? "Next";
	nextBtn.disabled = beat === beats.length - 1;
	backBtn.disabled = beat === 0;
	svg.classList.toggle("is-interactive", Boolean(beats[beat].interactive));
	for (const b of document.querySelectorAll("[data-naming]")) {
		b.setAttribute("aria-pressed", String(b.dataset.naming === P.naming));
	}
}

nextBtn.addEventListener("click", () => {
	audio.unlock();
	next();
});
backBtn.addEventListener("click", back);
$("#replay").addEventListener("click", () => {
	audio.unlock();
	go(beat, "replay");
});

for (const b of document.querySelectorAll("[data-naming]")) {
	b.addEventListener("click", () => {
		P.naming = b.dataset.naming;
		try {
			localStorage.setItem("mg:naming", P.naming);
		} catch {
			/* private window: fine */
		}
		renderChrome();
		renderSay(false);
		kick();
	});
}

document.addEventListener("keydown", (e) => {
	if (e.altKey || e.ctrlKey || e.metaKey) return;
	const onButton = e.target.closest?.("button");
	if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !onButton)) {
		e.preventDefault();
		audio.unlock();
		next();
	} else if (e.key === "ArrowLeft" || e.key === "PageUp") {
		e.preventDefault();
		back();
	} else if (e.key === "r" || e.key === "R") {
		audio.unlock();
		go(beat, "replay");
	}
});

/* --------------------------------------------------------------------------
   The reader's turn: presses on the stage go to the story. */

const ctx = { P, store, live, S, audio, later, clearTimers, kick, say: () => renderSay(false) };

svg.addEventListener("pointerdown", (e) => {
	if (!(P.interactive > 0.5) || e.button !== 0 || !story.interact) return;
	const data = e.target.dataset ?? {};
	if (!Object.keys(data).length) return;
	audio.unlock();
	story.interact(data, ctx);
});

start();
