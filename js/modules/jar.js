import { h } from "../lib/dom.js";
import { wait } from "../lib/motion.js";
import { host, topics } from "../data/qa.js";
import { renderStamp } from "../data/sprites.js";

/* Mirrors of three durations declared in CSS. Nothing here interpolates
   anything — CSS owns every pose — so these are only ever used to know when a
   transition has finished and the next step of the sequence may start.

   They live apart because they belong to different things, and each mirror
   sits next to the thing it belongs to:
   · FLY    — `--dur-fly` on `.qa__stage` in css/home.css §2 (crossing the room)
   · UNFOLD — `--dur-fold` plus `--ripple` on `.note` in css/components.css §9b
              (both flaps, from the first starting to the second landing)
   · SAY    — `--say-out` on `.bubble` in css/components.css §7 (her voice)
   Change one, change its twin.

   SAY is the strictest of the three: it is how long the bubble takes to fade
   out, and the new line goes in when it is up. Set it short and the words
   change in front of you. */
const FLY = 520;
const UNFOLD = 420 * 1.4;
const SAY = 180;

/* How far into the flight the letter starts to open: a little past half,
   so it is still coming towards you as the top flap lifts. Opened only after
   it lands, the two read as two separate things done to it; opened from the
   start, the first flap swings while the letter is still slip-sized and
   nobody sees it go. */
const LIFT = 0.55;

/* The jar of folded letters.

   Every state this thing can be in is a resting state: a slip is in the jar
   or out of it, the letter is folded where its slip was or open in front of
   the glass. There is no simulation and therefore no number for this module
   to own — CSS authors all of those poses, and this file only ever sets a
   class and waits for the transition it just started.

   The one thing it does write is a measurement. The letter leaves from
   wherever its slip lies, and only layout knows where that is, so the slip
   is measured once when it is taken and the four numbers are handed to CSS
   as custom properties (css/home.css §2). The same four bring it home.

   The whole letter is filled in the moment it is taken, while it is still
   folded shut. Filling a panel as it opens would change it in the middle of
   its own swing. */
export function initJar({ stage, slips, note, bubble, ui }) {
	const byId = new Map(topics.map((topic, i) => [topic.id, { topic, i }]));

	/* The slots, in DOM order, so a slip can be found again when its letter
	   flies home. The slot carries the fan pose and its tint; the button
	   inside it carries the hover lift. That split is the only reason
	   hovering a fanned slip does not have to restate the fan. */
	const slots = new Map();

	let openId = null; /* the topic whose letter is out */
	let busy = false; /* a flight or a fold is under way; swallow input */

	/* Bumped by reset(). Each step of a sequence checks it after every wait,
	   so a sequence interrupted by the room scrolling away does not wake up a
	   second later and open a letter in an empty room. */
	let generation = 0;

	/* ------------------------------------------------------------- the jar */

	for (const topic of topics) {
		/* The outer flap is its own element because it is shorter than the
		   slip: the strip of paper showing below its edge is the fold inside. */
		const slip = h(
			"button",
			{ class: "slip", type: "button", onclick: () => take(topic.id) },
			h(
				"span",
				{ class: "slip__flap" },
				h("span", { class: "slip__q", text: topic.text }),
			),
		);
		const slot = h("li", { class: "jar__slot", "data-tint": topic.tint }, slip);
		slots.set(topic.id, { slot, slip });
		slips.append(slot);
	}

	/* ------------------------------------------------------------ her line */

	/* Swapped at the far end of the fade, not at its midpoint. Her lines are
	   different lengths, so the bubble resizes around every one of them — and
	   the box has to be invisible when it does, or the outline snaps to a
	   width the text has not caught up with. Removing the class in the same
	   tick starts the fade back; the beat before she reappears is the delay
	   on that transition and belongs to CSS. */
	let swapTimer = null;
	function say(state) {
		bubble.classList.add("is-swap");
		clearTimeout(swapTimer);
		swapTimer = setTimeout(() => {
			bubble.textContent = host[state];
			bubble.classList.remove("is-swap");
		}, SAY);
	}

	/* ---------------------------------------------------------- the letter */

	/* An answer is a list of runs; a run with an `href` is a link. External
	   ones get `rel="noopener"`, like every other off-site link on the page. */
	const write = (runs) =>
		runs.map((run) =>
			run.href
				? h("a", {
						href: run.href,
						rel: /^https?:/.test(run.href) ? "noopener" : null,
						text: run.t,
					})
				: run.b
					? h("strong", { text: run.t })
					: document.createTextNode(run.t),
		);

	function fill(topic, i) {
		note.dataset.tint = topic.tint;
		ui.from.textContent = `from the jar · nº ${i + 1}`;
		ui.question.textContent = topic.text;
		ui.cover.textContent = topic.text;
		ui.answer.replaceChildren(...write(topic.answer));
		ui.ps.textContent = topic.ps;
		ui.art.replaceChildren(renderStamp(topic.art) ?? "");
	}

	/* Where the slip lies, as an offset from the middle of the room — which is
	   where the letter's own box is centred — plus the slip's angle and its
	   size against the letter's. The *slot* is measured, not the button: the
	   button is mid-hover when it is clicked, and the letter has to land back
	   where the slip rests, not where it was lifted to.

	   Reading a layout property at the end is the point, not an accident. The
	   letter's resting rule has no transitions, so the new pose applies at
	   once — but only once the browser has computed it. Forcing that here
	   makes this pose the "before" of the flight that the next class starts;
	   skip it, and the flight would start from the last slip taken. */
	function place(slot) {
		const from = slot.getBoundingClientRect();
		const room = stage.getBoundingClientRect();
		const x = from.left + from.width / 2 - (room.left + room.width / 2);
		const y = from.top + from.height / 2 - (room.top + room.height / 2);
		note.style.setProperty("--from-x", `${x}px`);
		note.style.setProperty("--from-y", `${y}px`);
		note.style.setProperty("--from-scale", String(slot.offsetWidth / note.offsetWidth));
		note.style.setProperty("--from-rot", getComputedStyle(slot).rotate);
		void note.offsetWidth;
	}

	/* ------------------------------------------------------------- the tree */

	async function take(id) {
		if (busy || openId) return;
		const entry = byId.get(id);
		if (!entry) return;

		busy = true;
		openId = id;
		const run = generation;

		const { slot, slip } = slots.get(id);
		fill(entry.topic, entry.i);
		place(slot);

		/* Disabled as well as hidden: a slip that is out of the jar should not
		   still be tabbable. Hidden and shown on the same tick as the letter,
		   so the hand-off is one frame and not two.

		   Whether it had focus is read first, because disabling it does not
		   reliably take focus away — current Chrome leaves a disabled button as
		   the active element — so "is focus loose?" alone would miss it. */
		const hadFocus = document.activeElement === slip;
		slip.disabled = true;
		slot.classList.add("is-out");
		note.classList.add("is-out");
		stage.classList.add("has-note");
		say("taken");

		await wait(FLY * LIFT);
		if (run !== generation) return;
		note.classList.add("is-open");

		await wait(UNFOLD);
		if (run !== generation) return;
		say("open");
		busy = false;
		/* The slip that had focus is gone, so the letter that replaced it is
		   where the conversation continues — on its title. */
		if (hadFocus || focusIsLoose()) handOver(note);
	}

	async function putAway() {
		if (busy || !openId) return;
		busy = true;
		const id = openId;
		const run = generation;

		/* Folded shut first, then carried home. A letter that leaves still
		   open reads as being snatched rather than put back. */
		note.classList.remove("is-open");
		say("idle");
		await wait(UNFOLD);
		if (run !== generation) return;

		note.classList.add("is-back");
		note.classList.remove("is-out");
		stage.classList.remove("has-note");
		await wait(FLY);
		if (run !== generation) return;

		/* Back in its slot, on one tick: the letter goes and the slip comes
		   back in the same frame, in the same place. */
		const { slot, slip } = slots.get(id);
		const hadFocus = note.contains(document.activeElement);
		note.classList.remove("is-back");
		slot.classList.remove("is-out");
		slip.disabled = false;
		openId = null;
		busy = false;
		/* Back where you left off: the slip you took, now back in the jar. */
		if (hadFocus || focusIsLoose()) handOver(slip);
	}

	/* ------------------------------------------------------------ the wiring */

	/* True when focus is sitting on nothing — which, on this page, means we
	   disabled or hid whatever had it. If the reader has since tabbed
	   somewhere else deliberately this is false and we leave them alone. */
	const focusIsLoose = () =>
		!document.activeElement || document.activeElement === document.body;

	function handOver(el) {
		el?.focus({ preventScroll: true });
	}

	/* Taking a letter out and putting it back are the same gesture: a click.
	   There is no close button on the paper — a click on the letter, or
	   anywhere else in the room, folds it up and puts it back. That includes a
	   click on a second slip, which puts the first letter away rather than
	   doing nothing. The click that *took* the letter bubbles up here too, but
	   it arrives while `busy` is set and is ignored.

	   A link is the one exception: a click on one is a click on the link. */
	stage.addEventListener("click", (event) => {
		if (openId && !event.target.closest("a")) putAway();
	});

	/* The keyboard's version of the same. Focus is on the letter once it is
	   open, so Enter or Space on the letter itself — not on a link inside it
	   — folds it back, and Escape does from anywhere in the room. */
	stage.addEventListener("keydown", (event) => {
		if (!openId) return;
		const press = event.key === "Enter" || event.key === " ";
		if (event.key === "Escape" || (press && event.target === note)) {
			event.preventDefault();
			event.stopPropagation();
			putAway();
		}
	});

	/* Called when the section scrolls out of view, so coming back to it finds
	   a full jar rather than a half-read letter. Everything is snapped rather
	   than animated: there is nobody watching it happen. */
	function reset() {
		generation++;
		openId = null;
		busy = false;
		clearTimeout(swapTimer);
		note.classList.remove("is-out", "is-open", "is-back");
		stage.classList.remove("has-note");
		for (const { slot, slip } of slots.values()) {
			slot.classList.remove("is-out");
			slip.disabled = false;
		}
		bubble.classList.remove("is-swap");
		bubble.textContent = host.idle;
	}

	reset();
	return { reset };
}
