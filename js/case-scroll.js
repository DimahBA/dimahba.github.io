/* The full-bleed case study.

   Everything visual is in css/case-scroll.css. This file writes three things
   and nothing else:

     · `is-in` on a screen, once, when it first comes into view — the children
       stagger themselves off the --in-delay authored in the markup;
     · `--progress`, a number between 0 and 1, on the document element;
     · `aria-current` on the rail link for the screen you are standing in.

   Same division of labour as the rest of the site: CSS owns every pose, and
   the script owns only which state the page is in. The disclosure on the
   French verbatims is a <details>, so it is not here at all. */

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

/* ---------------------------------------------------------- photographs */

if (scroller) {
	makeZoomable(scroller);
	mountLightbox(scroller, {
		eyebrow: "Adaptive AR pathfinding for Parkinson's disease",
	});
}

initPawTrail();
