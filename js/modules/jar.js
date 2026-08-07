import { h } from "../lib/dom.js";
import { wait } from "../lib/motion.js";
import { host, topics, answers } from "../data/qa.js";
import { renderSprite } from "../data/sprites.js";

/* Mirrors of three durations declared in CSS. Nothing here interpolates
   anything — CSS owns every pose — so these are only ever used to know when a
   transition has finished and the next step of the sequence may start.

   They live apart because they belong to different things, and each mirror
   sits next to the thing it belongs to:
   · FLY  — `--dur-fly`   on `.qa__stage` in css/home.css §2 (crossing the room)
   · FOLD — `--dur-fold`  on `.note` in css/components.css §9b (the paper)
   · SAY  — `--say-out`   on `.bubble` in css/components.css §7 (her voice)
   Change one, change its twin.

   SAY is the strictest of the three: it is how long the bubble takes to fade
   out, and the new line goes in when it is up. Set it short and the words
   change in front of you. Neither of the other two numbers her voice is made
   of is here — the beat before she answers and the slow fade back are delays
   on one transition, and CSS owns them alone. */
const FLY = 520;
const FOLD = 420;
const SAY = 180;

/* The note is a sheet folded in three, so it opens twice. */
const DEPTH = 2;

/* Closing runs as a ripple rather than in lockstep: the bottom flap starts
   folding up, and the middle one follows before it has finished. That is the
   order your hands do it in, and it costs one number. Much past a half and
   the two beats separate and the note reads as being folded up by committee. */
const RIPPLE = 0.45;

/* The jar of folded questions.

   Every state this thing can be in is a resting state: a slip is in the jar
   or out of it, the note is at the jar's mouth or forward in front of the
   glass, and the paper is folded at depth 0, 1 or 2. There is no simulation
   and therefore no number for this module to own — CSS authors all of those
   poses, and this file only ever sets a class and waits for the transition it
   just started.

   The whole of a note is filled in the moment it is taken, while all of it
   except the cover is still folded away. Filling a panel as it opens would
   change that panel's height in the middle of its own swing, and the flap
   below it hangs off `top: 100%` of the one above — so one late-arriving
   paragraph moves both. */
export function initJar({ stage, slips, note, bubble, ui }) {
	const byId = new Map(topics.map((topic) => [topic.id, topic]));

	/* The four slots, in DOM order, so a slip can be found again when its note
	   flies home. The slot carries the fan pose and its tint; the button
	   inside it carries the hover lift. That split is the only reason hovering
	   a fanned slip does not have to restate the fan. */
	const slots = new Map();

	let openId = null; /* the topic whose note is out */
	let fold = 0;
	let busy = false; /* a flight is in the air; swallow input */

	/* ------------------------------------------------------------- the jar */

	for (const topic of topics) {
		const slip = h("button", {
			class: "slip",
			type: "button",
			text: topic.text,
			onclick: () => take(topic.id),
		});
		const slot = h("li", { class: "jar__slot", "data-tint": topic.tint }, slip);
		slots.set(topic.id, { slot, slip });
		slips.append(slot);
	}

	/* Focusable but not tabbable, so that when a fold opens we can put a
	   screen reader on the panel that just appeared and have it read the
	   paragraph before the button underneath it. `aria-live` is the obvious
	   alternative and the wrong one: a closed flap is `visibility: hidden`,
	   updates inside a hidden subtree are not announced, and by the time it is
	   visible nothing has changed for a live region to notice. */
	for (const sheet of ui.sheets) sheet.tabIndex = -1;

	/* ------------------------------------------------------------ her line */

	/* Swapped at the far end of the fade, not at its midpoint. Her four lines
	   are four different lengths, so the bubble resizes around every one of
	   them — and the box has to be invisible when it does, or the outline
	   snaps to a width the text has not caught up with. Removing the class in
	   the same tick starts the fade back; the beat before she reappears is the
	   delay on that transition and belongs to CSS. */
	let swapTimer = null;
	function say(state) {
		bubble.classList.add("is-swap");
		clearTimeout(swapTimer);
		swapTimer = setTimeout(() => {
			bubble.textContent = host[state];
			bubble.classList.remove("is-swap");
		}, SAY);
	}

	/* ---------------------------------------------------------- the folding */

	/* Cumulative rather than exclusive: `is-fold-2` means both flaps are open,
	   so each panel's rule reads as "am I past my own depth". */
	function setFold(depth) {
		fold = depth;
		note.classList.toggle("is-fold-1", depth >= 1);
		note.classList.toggle("is-fold-2", depth >= 2);
	}

	/* Whichever control is the one to press at this depth. The pull tab on a
	   panel is hidden the moment that panel's fold is open, so leaving focus
	   where it was would drop it on <body> — there is always a next thing, and
	   at the bottom of the note the next thing is the way out. */
	const controlAt = (depth) => ui.pulls[depth] ?? ui.away;

	/* ------------------------------------------------------------- the tree */

	async function take(id) {
		if (busy || openId) return;
		const topic = byId.get(id);
		if (!topic) return;

		busy = true;
		openId = id;

		const { slot, slip } = slots.get(id);
		/* Disabled as well as faded: an invisible slip is not in the jar any
		   more, and it should not still be tabbable while it is out. */
		slip.disabled = true;
		slot.classList.add("is-out");

		note.dataset.tint = topic.tint;
		ui.question.textContent = topic.text;
		ui.answer.textContent = answers[id]?.answer ?? "";
		ui.caption.textContent = topic.caption;
		ui.art.replaceChildren(renderSprite(topic.art) ?? "");

		setFold(0);
		note.classList.add("is-out");
		stage.classList.add("has-note");
		say("taken");

		await wait(FLY);
		busy = false;
		/* Disabling the slip dropped focus to <body>, so the tab on the note
		   that replaced it is where the conversation continues. */
		if (focusIsLoose()) handOver(controlAt(0));
	}

	/* Deliberately not guarded by `busy`. A fold is cheap and interruptible,
	   so a reader who clicks twice quickly gets both folds — the second swing
	   simply retargets the first. Only the flights across the room lock
	   input, because those have a slip to put back at the end of them. */
	function unfold() {
		if (busy || !openId || fold >= DEPTH) return;

		const depth = fold + 1;
		setFold(depth);
		say(depth === 1 ? "open" : "deep");

		/* Held until the flap has finished swinging. Moving focus onto a panel
		   that is still edge-on scrolls the page to a sliver of nothing. */
		setTimeout(() => {
			if (fold !== depth || !openId) return;
			if (focusIsLoose() || note.contains(document.activeElement)) {
				handOver(ui.sheets[depth]);
			}
		}, FOLD);
	}

	async function putAway() {
		if (busy || !openId) return;
		busy = true;

		const id = openId;
		openId = null;

		/* Folded shut first, then flown home. A note that leaves still open
		   reads as being snatched rather than put back. */
		if (fold >= DEPTH) {
			setFold(DEPTH - 1);
			await wait(FOLD * RIPPLE);
		}
		if (fold > 0) {
			setFold(0);
			await wait(FOLD);
		}

		note.classList.remove("is-out");
		stage.classList.remove("has-note");
		say("idle");
		await wait(FLY);

		const { slot, slip } = slots.get(id);
		slot.classList.remove("is-out");
		slip.disabled = false;

		busy = false;
		/* Back where you left off: the slip you took, now back in the jar. */
		if (focusIsLoose()) handOver(slip);
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

	/* One handler for the whole note, because the whole note is the button:
	   anywhere you click on the paper opens the next fold. The pull tabs are
	   real <button>s so the same thing can be tabbed to and pressed, and their
	   clicks bubble up to here rather than being wired separately, so there is
	   only ever one path through. The × is the exception — it means the
	   opposite of "carry on", so it stops here and is handled on its own. */
	function advance(event) {
		if (busy || event.target.closest("[data-qa-away]")) return;
		unfold();
	}

	note.addEventListener("click", advance);
	ui.away.addEventListener("click", putAway);
	stage.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && openId) {
			event.stopPropagation();
			putAway();
		}
	});

	/* Called when the section scrolls out of view, so coming back to it finds
	   a full jar rather than a half-read note. Everything is snapped rather
	   than animated: there is nobody watching it happen. */
	function reset() {
		openId = null;
		busy = false;
		fold = 0;
		clearTimeout(swapTimer);
		note.classList.remove("is-out", "is-fold-1", "is-fold-2");
		stage.classList.remove("has-note");
		ui.art.replaceChildren();
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
