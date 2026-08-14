/* The full-bleed case study.

   Everything visual is in css/case-scroll.css. This file writes four things
   and nothing else:

     · `is-in` on a screen, once, when it first comes into view — the children
       stagger themselves off the --in-delay authored in the markup;
     · `--progress`, a number between 0 and 1, on the document element;
     · `aria-current` on the rail link for the screen you are standing in;
     · `aria-current` on the participant dot for the card the cohort strip is
       showing, and `disabled` on its chevrons at the two ends.

   Same division of labour as the rest of the site: CSS owns every pose, and
   the script owns only which state the page is in. The disclosure on the
   French verbatims is a <details>, so it is not here at all — and neither is
   the cohort strip's scrolling, which is a native overflow with scroll-snap
   and works with this file absent. */

import { $, $$ } from "./lib/dom.js";
import { revealOnce } from "./modules/reveal.js";
import { mountLightbox, makeZoomable } from "./modules/lightbox.js";
import { initPawTrail } from "./modules/paws.js";

/* Where in the viewport a screen counts as the one you are reading. Above the
   middle, because a screen you have scrolled past the top of is the one you
   are in, not the one below it. */
const ACTIVE_LINE = 0.45;

const root = document.documentElement;
const scroller = $("[data-scroller]");

/* ------------------------------------------------------------- entrances */

/* One observer per screen rather than one per element. A screen is a whole
   viewport tall, so 12% of it is a comfortable trigger — far enough in that
   the entrance is not already over when it reaches the middle of the window,
   and not so far that a short screen never reaches it. */
for (const screen of $$("[data-screen]", scroller)) {
	revealOnce(screen, "is-in", 0.12);
}

/* ----------------------------------------------- progress and the rail */

const links = $$("[data-rail] .rail__link");

/* Resolved once. getElementById per link per scroll event would be a lookup
   for every section on every frame of a scroll, to answer a question whose
   answer never changes. */
const sections = links
	.map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
	.filter((pair) => pair.section);

let queued = false;

function onScroll() {
	if (queued) return;
	queued = true;
	requestAnimationFrame(update);
}

function update() {
	queued = false;

	const max = root.scrollHeight - root.clientHeight;
	const ratio = max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0;
	root.style.setProperty("--progress", String(ratio));

	if (!sections.length) return;

	/* The last section whose top has crossed the line. A plain scan rather
	   than an IntersectionObserver: two adjacent full-height screens are both
	   intersecting for most of the scroll between them, so "which one is
	   visible" is the wrong question — "which one have I got to" is the right
	   one, and it is one number per section. */
	const line = root.clientHeight * ACTIVE_LINE;
	let active = -1;

	sections.forEach(({ section }, index) => {
		if (section.getBoundingClientRect().top <= line) active = index;
	});

	sections.forEach(({ link }, index) => {
		if (index === active) link.setAttribute("aria-current", "true");
		else link.removeAttribute("aria-current");
	});
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
update();

/* ------------------------------------------------------- the cohort strip */

/* Five participants on a scroll-snap strip. The strip scrolls on its own; all
   this adds is the two chevrons, the P1–P5 dots, and the readout of which
   card you have landed on.

   That readout comes from an observer on the cards rather than from a counter
   the buttons increment. The strip can also be dragged, flicked or tabbed
   through, and a stored index would be wrong the moment any of those happened
   — so the scroll position stays the single source of truth and the buttons
   only ask it to move. */
const cohort = $("[data-cohort]");

if (cohort) {
	const track = $("[data-cohort-track]", cohort);
	const cards = $$("[data-patient]", track);
	const dots = $$("[data-cohort-go]", cohort);
	const arrows = $$("[data-cohort-step]", cohort);

	let current = 0;

	function show(index) {
		current = index;

		dots.forEach((dot, i) => {
			if (i === index) dot.setAttribute("aria-current", "true");
			else dot.removeAttribute("aria-current");
		});

		/* A chevron that would not move the strip says so, rather than going
		   quiet and leaving the reader to guess whether it is broken. */
		for (const arrow of arrows) {
			const step = Number(arrow.dataset.cohortStep);
			arrow.disabled = index + step < 0 || index + step >= cards.length;
		}
	}

	/* Half the card, so the card that owns most of the strip is the current
	   one. `root: track` measures against the strip, not the window, which
	   matters because the strip is only ever one card wide. */
	const seen = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) show(cards.indexOf(entry.target));
			}
		},
		{ root: track, threshold: 0.5 },
	);

	for (const card of cards) seen.observe(card);

	for (const arrow of arrows) {
		arrow.addEventListener("click", () => {
			const next = current + Number(arrow.dataset.cohortStep);
			cards[Math.min(Math.max(next, 0), cards.length - 1)]?.scrollIntoView({
				block: "nearest",
				inline: "center",
			});
		});
	}

	for (const dot of dots) {
		dot.addEventListener("click", () => {
			cards[Number(dot.dataset.cohortGo)]?.scrollIntoView({
				block: "nearest",
				inline: "center",
			});
		});
	}

	show(0);
}

/* ---------------------------------------------------------- photographs */

if (scroller) {
	makeZoomable(scroller);
	mountLightbox(scroller, {
		eyebrow: "Adaptive AR pathfinding for Parkinson's disease",
	});
}

initPawTrail();
