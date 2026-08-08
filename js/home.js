import { $, $$ } from "./lib/dom.js";
import { Typewriter } from "./lib/typewriter.js";
import { createIntro } from "./modules/intro.js";
import { initCards } from "./modules/cards.js";
import { initJar } from "./modules/jar.js";
import { initNav } from "./modules/nav.js";
import { initPawTrail } from "./modules/paws.js";
import { revealOnce, watch } from "./modules/reveal.js";
import { initClock } from "./modules/shelf.js";

/* Typing starts a beat after the box has finished popping in. The delay is
   tied to the --in-delay values in the markup rather than guessed. */
const TYPE_AFTER = 700;

/* ------------------------------------------------------------------ footer */

const yearSlot = $("[data-year]");
if (yearSlot) yearSlot.textContent = String(new Date().getFullYear());

/* --------------------------------------------------------------------- cat */

initPawTrail();

/* --------------------------------------------------------------------- nav */

initNav({
	nav: $("[data-nav]"),
	hero: $("[data-hero]"),
	links: $$("[data-nav-link]"),
});

/* -------------------------------------------------------------------- hero */

const hero = $("[data-hero]");
/* Two portraits carry `data-chibi="hero"` — the one on the pavement and the
   one that sits on the text box below 48rem — and CSS decides which is in the
   layout. Both are cued, because the class is the entrance state and the wrong
   one being stuck at `scale: 0` is invisible until the window is resized. */
const heroPieces = [...$$('[data-chibi="hero"]'), $("[data-saybox]")];

const introTypewriter = new Typewriter($("[data-intro-text]"), $("[data-caret]"), {
	speed: 20,
	eraseSpeed: 10,
	caretOnIdle: false,
});
const intro = createIntro(introTypewriter, {
	panel: $("[data-saybox]"),
	next: $("[data-intro-next]"),
	line: $("[data-intro-line]"),
});
let introTimer = null;

watch(hero, {
	threshold: 0.3,
	onEnter: () => {
		for (const piece of heroPieces) piece?.classList.add("is-in");
		clearTimeout(introTimer);
		introTimer = setTimeout(() => intro.play(), TYPE_AFTER);
	},
	onLeave: () => {
		clearTimeout(introTimer);
		for (const piece of heroPieces) piece?.classList.remove("is-in");
		intro.reset();
	},
});

/* --------------------------------------------------------------------- Q&A */

const qaSection = $("[data-qa-section]");
const qaPieces = [$('[data-chibi="qa"]'), $("[data-qa-bubble]")];

/* Nothing types in the jar. Her voice is in the speech bubble, and the paper
   just has writing on it — a note you unfold is already written, and watching
   ink appear on it a character at a time would make the fold wait for the
   sentence instead of the other way round.

   `pulls` and `sheets` are in DOM order, which is fold order: index 0 is the
   cover, 1 the answer, 2 the drawing. js/modules/jar.js indexes them by fold
   depth on that basis. */
const jar = initJar({
	stage: $("[data-qa-stage]"),
	slips: $("[data-jar-slips]"),
	note: $("[data-qa-note]"),
	bubble: $("[data-qa-bubble]"),
	ui: {
		question: $("[data-qa-question]"),
		answer: $("[data-qa-answer]"),
		art: $("[data-qa-art]"),
		caption: $("[data-qa-caption]"),
		away: $("[data-qa-away]"),
		pulls: $$("[data-qa-unfold]"),
		sheets: $$("[data-qa-note] .note__sheet"),
	},
});

watch(qaSection, {
	threshold: 0.25,
	onEnter: () => {
		for (const piece of qaPieces) piece?.classList.add("is-in");
	},
	onLeave: () => {
		for (const piece of qaPieces) piece?.classList.remove("is-in");
		jar.reset();
	},
});

/* ------------------------------------------------------------------- board */

const board = $("[data-board]");
const table = initCards({ board, tossButton: $("[data-toss]") });

/* The cards fall in the first time the table scrolls into view. `deal` is a
   no-op on the fallback board, which is simply there — nothing to reveal. */
if (table) revealOnce(board, null, 0.15, () => table.deal());

/* ------------------------------------------------------------------- shelf */

/* `revealOnce`, not `watch`: the five cards arrive once and stay. Unlike the
   hero and the jar there is nothing here to reset — no typing to replay and
   no paper to fold back up — so leaving and coming back should find the wall
   exactly as it was left. The stagger is the --in-delay authored on each
   card; this adds one class to the section. */
revealOnce($("[data-shelf]"), "is-in", 0.15);

initClock({
	card: $("[data-clock]"),
	led: $("[data-clock-led]"),
	time: $("[data-clock-time]"),
});
