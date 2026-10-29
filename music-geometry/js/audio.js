/* The instrument.

   A small synthesised piano-ish voice: a handful of harmonics through a
   low-pass filter that closes as the note dies, so each note starts bright
   and mellows, the way a struck string does. No samples, so nothing to
   download and nothing to fail to load.

   Browsers refuse to make sound before the reader has clicked something, so
   the AudioContext is only created on the first call from a click handler.

   Sequences are scheduled on the audio clock, which is sample-accurate. The
   page is told when each note sounds through ordinary timers aimed at the
   same instants — a few milliseconds of slack there is invisible, while the
   same slack in the audio would be audible. */

import { freq } from "./theory.js";

let ctx = null;
let out = null;
let wave = null;
const voices = new Set();
let timers = [];
let room = 0;
let generation = 0;

/* A small room, for pages that want one (the home page does; the lesson
   stays dry). The impulse is made, not downloaded: stereo noise that dies
   away over a couple of seconds and darkens as it goes, the way air
   swallows the highs of an echo first. */
function impulse(c, seconds) {
	const n = Math.round(c.sampleRate * seconds);
	const pre = Math.round(c.sampleRate * 0.012);
	const buf = c.createBuffer(2, n, c.sampleRate);
	for (let ch = 0; ch < 2; ch++) {
		const d = buf.getChannelData(ch);
		let lp = 0;
		for (let i = pre; i < n; i++) {
			const t = i / n;
			lp += (Math.random() * 2 - 1 - lp) * (0.85 - 0.7 * t);
			d[i] = lp * (1 - t) ** 3.2;
		}
	}
	return buf;
}

/** How much room to add, 0–1. Takes effect when sound first starts. */
export function setRoom(amount) {
	room = amount;
}

function context() {
	if (ctx) return ctx;

	const AC = window.AudioContext || window.webkitAudioContext;
	ctx = new AC();

	/* A gentle compressor so a fast scale, where tails overlap, does not
	   swell louder than a single note. */
	const glue = ctx.createDynamicsCompressor();
	glue.threshold.value = -20;
	glue.ratio.value = 3;
	glue.attack.value = 0.004;
	glue.release.value = 0.25;

	out = ctx.createGain();
	out.gain.value = 0.55;
	out.connect(glue).connect(ctx.destination);

	if (room > 0) {
		const verb = ctx.createConvolver();
		verb.buffer = impulse(ctx, 2.6);
		const send = ctx.createGain();
		send.gain.value = room;
		glue.connect(send).connect(verb).connect(ctx.destination);
	}

	/* Harmonic amplitudes, strongest first: warm rather than buzzy. */
	const partials = [0, 1, 0.46, 0.24, 0.13, 0.08, 0.045, 0.025, 0.012];
	wave = ctx.createPeriodicWave(new Float32Array(partials.length), new Float32Array(partials));

	return ctx;
}

/* Called synchronously from click and key handlers: some browsers only let
   audio start inside the gesture itself, not in a timer set up by it. */
export function unlock() {
	const c = context();
	if (c.state !== "running") c.resume();
}

async function ready() {
	const c = context();
	if (c.state !== "running") await c.resume();
	return c;
}

/* `sus` is for the rhythm lessons, where a note's length is the lesson: the
   tone holds steady until its time is up and then stops cleanly, instead of
   dying away like a struck string — so a whole note is heard for all four
   beats, and the silence of a rest after it is really silent. */
function strike(midi, when, hold, velocity = 1, sus = false) {
	const f = freq(midi);
	const c = ctx;

	const osc = c.createOscillator();
	osc.setPeriodicWave(wave);
	osc.frequency.value = f;

	/* A faint second voice a hair sharp, an octave up: the slow beating is
	   what keeps a pure synth tone from sounding like a test signal. */
	const shimmer = c.createOscillator();
	shimmer.type = "sine";
	shimmer.frequency.value = f * 2;
	shimmer.detune.value = 4;
	const shimmerGain = c.createGain();
	shimmerGain.gain.value = 0.06;

	const tone = c.createBiquadFilter();
	tone.type = "lowpass";
	tone.Q.value = 0.3;
	tone.frequency.setValueAtTime(Math.min(f * 8, 8000), when);
	tone.frequency.setTargetAtTime(Math.max(f * 2.2, 500), when, 0.3);

	/* Higher notes are a little quieter and die faster, as on a piano. */
	const peak = 0.34 * velocity * Math.min(1, (330 / f) ** 0.3);
	const decay = Math.min(1.4, Math.max(0.35, 1.1 * Math.sqrt(262 / f)));

	const amp = c.createGain();
	amp.gain.setValueAtTime(0.0001, when);
	amp.gain.linearRampToValueAtTime(peak, when + 0.006);
	if (sus) {
		tone.frequency.setTargetAtTime(Math.max(f * 3.2, 900), when, 0.4);
		amp.gain.setTargetAtTime(peak * 0.55, when + 0.006, 0.08);
		amp.gain.setTargetAtTime(peak * 0.38, when + 0.25, 2.2);
		amp.gain.setTargetAtTime(0.0001, when + hold, 0.035);
	} else {
		amp.gain.setTargetAtTime(peak * 0.35, when + 0.006, 0.09);
		amp.gain.setTargetAtTime(0.0001, when + 0.2, decay);
		amp.gain.setTargetAtTime(0.0001, when + hold, 0.14);
	}

	osc.connect(tone);
	shimmer.connect(shimmerGain).connect(tone);
	tone.connect(amp).connect(out);

	const end = when + hold + (sus ? 0.4 : 1);
	osc.start(when);
	shimmer.start(when);
	osc.stop(end);
	shimmer.stop(end);

	const voice = { amp, osc, shimmer };
	voices.add(voice);
	osc.onended = () => voices.delete(voice);
}

/* The metronome: a short, dry woodblock-like tick — a sine that drops a
   little in pitch as it dies in a few hundredths of a second. `level` 2 is
   the first beat of a measure, 1.5 the start of a group, 1 any other beat,
   below that a quiet subdivision. Higher and louder as the level rises, so
   the measure can be heard without being seen. */
function click(when, level = 1) {
	const c = ctx;
	const f = level >= 2 ? 1900 : level >= 1.5 ? 1500 : level >= 1 ? 1250 : 1000;
	const peak = level >= 2 ? 0.3 : level >= 1.5 ? 0.22 : level >= 1 ? 0.16 : 0.06;

	const osc = c.createOscillator();
	osc.type = "sine";
	osc.frequency.setValueAtTime(f, when);
	osc.frequency.exponentialRampToValueAtTime(f * 0.78, when + 0.05);

	const amp = c.createGain();
	amp.gain.setValueAtTime(0.0001, when);
	amp.gain.exponentialRampToValueAtTime(peak, when + 0.0015);
	amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);

	osc.connect(amp).connect(out);
	osc.start(when);
	osc.stop(when + 0.08);

	const voice = { amp, osc };
	voices.add(voice);
	osc.onended = () => voices.delete(voice);
}

/** Silences everything, and cancels any pending note callbacks. */
export function stop() {
	generation++;
	timers.forEach(clearTimeout);
	timers = [];
	if (!ctx) return;

	const now = ctx.currentTime;
	for (const { amp, osc, shimmer } of voices) {
		if (amp.gain.cancelAndHoldAtTime) amp.gain.cancelAndHoldAtTime(now);
		else amp.gain.cancelScheduledValues(now);
		amp.gain.setTargetAtTime(0.0001, now, 0.03);
		osc.stop(now + 0.2);
		shimmer?.stop(now + 0.2);
	}
	voices.clear();
}

export async function playNote(midi, hold = 0.9) {
	const c = await ready();
	strike(midi, c.currentTime + 0.01, hold);
}

/**
 * Plays `midis` one after another, `gap` seconds apart; a null is a rest.
 * An entry may be an array, which sounds as a chord. `onNote(i)` fires as
 * entry i sounds, `onEnd()` once the last note has rung for a moment.
 */
export async function playSequence(midis, { gap = 0.34, hold = 0.5, last = 1.3, onNote, onEnd } = {}) {
	stop();
	const c = await ready();
	const t0 = c.currentTime + 0.05;
	const at = (when) => Math.max(0, (when - c.currentTime) * 1000);

	midis.forEach((entry, i) => {
		const when = t0 + i * gap;
		const isLast = i === midis.length - 1;
		const chord = Array.isArray(entry);
		for (const midi of [entry].flat()) {
			if (midi != null) strike(midi, when, isLast || chord ? last : hold, chord ? 0.75 : 1);
		}
		timers.push(setTimeout(() => onNote?.(i), at(when)));
	});

	const end = t0 + (midis.length - 1) * gap + last * 0.7;
	timers.push(setTimeout(() => onEnd?.(), at(end)));
}

/**
 * Plays a score: each event strikes `notes` at `t` seconds from the start
 * and holds them `hold` seconds, at `vel` loudness (`sus` for a held tone).
 * An event with `tick` also clicks the metronome at that level. An event
 * without notes is a cue — it sounds nothing, but `onEvent` still fires on
 * time, which is how a picture changes on the beat. `onStart(ms)` says when
 * t = 0 falls on the page's clock (performance.now), for pictures that
 * follow the music continuously. `onEnd()` fires once everything has rung.
 * Starting another score, or `stop()`, cancels this one — even if it was
 * still waiting for the audio to wake up.
 */
export async function playScore(events, { onEvent, onStart, onEnd } = {}) {
	stop();
	const mine = generation;
	const c = await ready();
	if (mine !== generation) return;

	const t0 = c.currentTime + 0.06;
	const at = (when) => Math.max(0, (when - c.currentTime) * 1000);
	let end = 0;
	onStart?.(performance.now() + (t0 - c.currentTime) * 1000);

	for (const e of events) {
		const when = t0 + e.t;
		for (const midi of e.notes ?? []) strike(midi, when, e.hold ?? 0.6, e.vel ?? 1, e.sus);
		if (e.tick) click(when, e.tick);
		if (onEvent && (e.notes?.length || e.cue != null)) timers.push(setTimeout(() => onEvent(e), at(when)));
		end = Math.max(end, e.t + (e.notes?.length ? (e.hold ?? 0.6) : 0));
	}
	timers.push(setTimeout(() => onEnd?.(), at(t0 + end)));
}
