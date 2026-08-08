/* A cat walks where the cursor goes.

   The trail itself is cat-paw-prints, vendored in js/vendor — it draws a real
   four-beat walk (front-left, back-right, front-right, back-left) rather than
   a line of identical stamps, which is the whole reason to use it.

   What is here is the settings and the two things the library has no opinion
   about: whether a trail should be drawn at all, and what to do when that
   answer changes. */

import CatPawPrints from "../vendor/cat-paw-prints.js";
import { prefersReducedMotion, reduceMotionQuery } from "../lib/motion.js";

/* Only mount where there is a real cursor to follow. The library listens on
   `pointermove`, which a touch pointer emits mid-drag — without this, every
   finger-scroll would paint a paw trail down the page. */
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

const SETTINGS = {
	color: "#000000",
	maxPaws: 4,
	fadeOutDuration: 1400,
	spawnDistance: 40,
	spawnInterval: 55,

	/* Not the library's 9999, which ties with .skip-link and wins on document
	   order — paws would paint over the one control a keyboard reader needs
	   first. 600 clears the nav (500) so the trail does not stop dead at the
	   top of the screen, and a <dialog> is in the top layer and above all of
	   it either way, which is the wanted answer for the lightbox: no paws
	   crawling over an opened photograph. */
	zIndex: 600,
};

/**
 * Starts the paw trail, if this visitor should have one.
 * Returns a teardown function.
 */
export function initPawTrail() {
	const fine = window.matchMedia(FINE_POINTER);
	if (!fine.matches || prefersReducedMotion()) return () => {};

	const trail = new CatPawPrints(SETTINGS);
	trail.init();

	/* The container is decorative and lies over the whole viewport, so it must
	   not reach a screen reader. The library sets `pointer-events: none` on it
	   itself, so it is already out of hit-testing. */
	document.getElementById("cat-paw-prints-container")?.setAttribute(
		"aria-hidden",
		"true",
	);

	/* Turning reduced motion on in the OS — or docking a laptop to a touch
	   screen — should take effect there and then, not at the next reload.
	   `destroy` puts the page back exactly as it was, so the honest response
	   to either query changing is to run this from the top again: it re-reads
	   both and starts nothing if either now says no. `dispose` is what the
	   caller ends up cancelling, whichever run is the live one by then. */
	const teardown = () => {
		reduceMotionQuery.removeEventListener("change", onPreferenceChange);
		fine.removeEventListener("change", onPreferenceChange);
		trail.destroy();
	};

	let dispose = teardown;
	function onPreferenceChange() {
		teardown();
		dispose = initPawTrail();
	}
	reduceMotionQuery.addEventListener("change", onPreferenceChange);
	fine.addEventListener("change", onPreferenceChange);

	return () => dispose();
}
