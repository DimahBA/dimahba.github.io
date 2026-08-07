/* The lightbox: click a photograph and it flies out of the page into a panel
   with the writing beside it.

   Two decisions shape everything below.

   · It is a real <dialog> opened with showModal(). The top layer, the focus
     trap, `inert` on the rest of the page and Esc are all things a hand-rolled
     overlay has to reimplement and usually half-implements. The only thing
     taken back from the platform is the Esc *behaviour* — the `cancel` event
     is intercepted so the panel can fly home instead of blinking out.

   · The opening move is a FLIP, and it obeys the same ownership rule as the
     rest of the site: CSS authors where the frame rests, this module writes
     only how far it currently is from rest. Three custom properties go on for
     one frame and come straight back off; nothing here ever animates anything,
     and nothing here ever writes a value CSS also writes.

   What is deliberately absent: any per-frame work. There is no rAF loop, no
   measurement inside a transition, no correction after landing. Two rect reads
   per gesture — the thumbnail and the frame — and then the browser is left
   alone to run one transition. */

import { $, $$, h } from "../lib/dom.js";
import { prefersReducedMotion } from "../lib/motion.js";

/* Long enough to cover --dur-slow plus a comfortable margin. Only a
   backstop: the panel normally tears down on transitionend. If a transition
   is dropped — a background tab, a browser that skipped it — this is what
   stops the page from being left scroll-locked behind an invisible dialog. */
const TEARDOWN_FALLBACK = 900;

export function mountLightbox(root, options = {}) {
	if (!root || typeof HTMLDialogElement === "undefined") return;

	const eyebrow = options.eyebrow ?? "";

	let dialog = null;
	let frame = null;
	let sheet = null;
	let image = null;
	let scrim = null;

	/* The thumbnail this panel came out of. Held so the closing flight has
	   somewhere to land, and so focus can be handed back to the exact button
	   that was pressed rather than dropped on <body>. */
	let source = null;
	let closing = false;
	let teardownTimer = 0;

	/* Bumped by every open and every close. The one deferred callback in this
	   module — the frame that releases the flight — checks it before touching
	   anything, so a close that lands in the gap cannot be undone by a
	   callback queued before it. Background tabs make that gap unbounded:
	   requestAnimationFrame stops running when the tab is hidden, so "next
	   frame" can be minutes later and after anything. */
	let generation = 0;

	root.addEventListener("click", onClick);

	function onClick(event) {
		const button = event.target.closest?.("[data-zoom]");
		if (!button || !root.contains(button)) return;
		open(button);
	}

	/* ---------------------------------------------------------------- open */

	function open(button) {
		const thumb = $("img", button);
		if (!thumb) return;

		build();

		/* Reopening on top of a close that is still flying home. Cancelling the
		   pending teardown is not enough on its own — the frame is somewhere
		   mid-flight with the previous gesture's offsets still written on it,
		   and they have to go before this gesture measures anything. */
		cancelTeardown();
		release();
		closing = false;
		source = button;
		const token = ++generation;

		const figure = button.closest("figure");
		const caption = $("figcaption", figure)?.textContent?.trim() ?? "";
		const alt = thumb.getAttribute("alt")?.trim() ?? "";

		/* currentSrc, not the src attribute: it is the URL the browser actually
		   resolved and already has in cache, so the large view paints on the
		   same frame the panel opens rather than flashing empty. */
		image.src = thumb.currentSrc || thumb.src;

		/* Carried across, unless the panel is about to print it. A figure with
		   no caption puts its alt text on screen as the title, and an image
		   labelled with a sentence that is also sitting next to it makes a
		   screen reader say the same thing twice in a row. */
		image.alt = caption ? alt : "";

		frame.style.setProperty("--ar", ratioOf(thumb));

		writeNote({ caption, alt });

		/* Labelled by value rather than by reference. aria-labelledby would
		   point at a heading that does not exist when a figure has nothing
		   written about it, and a dangling reference leaves the dialog with no
		   accessible name at all. */
		dialog.setAttribute("aria-label", caption || alt || "Image");

		/* Locking the page without this leaves the scrollbar's width behind as
		   a sideways jump of the whole layout under the scrim. */
		const bar = window.innerWidth - document.documentElement.clientWidth;
		document.documentElement.style.setProperty("--sbw", `${bar}px`);
		document.documentElement.classList.add("is-zoomed");

		if (!dialog.open) dialog.showModal();

		if (prefersReducedMotion()) {
			dialog.classList.add("is-open");
			return;
		}

		/* Park the frame on the thumbnail with no transition, let the style
		   land, then release it on the next frame. Reading a rect between the
		   two is what forces the parked pose to be a real computed state
		   rather than being coalesced away with the one that follows it. */
		dialog.classList.add("is-flipping");
		parkOn(thumb);
		frame.getBoundingClientRect();

		requestAnimationFrame(() => {
			if (token !== generation) return;
			dialog.classList.remove("is-flipping");
			release();
			dialog.classList.add("is-open");
		});
	}

	/* --------------------------------------------------------------- close */

	function close() {
		if (!dialog?.open || closing) return;
		closing = true;
		generation++;

		/* Both come off, in this order. is-flipping is normally gone by now —
		   it lives for one frame at the start of an opening — but a close that
		   lands inside that frame would otherwise fly home with transitions
		   switched off, which is to say not fly at all. */
		dialog.classList.remove("is-flipping");
		dialog.classList.remove("is-open");

		const thumb = source ? $("img", source) : null;
		/* An off-screen thumbnail has a rect, but flying to it would send the
		   photograph off the side of the window on the way out. Fading in place
		   is the better read. */
		if (thumb && !prefersReducedMotion() && isOnScreen(thumb)) parkOn(thumb);

		teardownTimer = window.setTimeout(teardown, TEARDOWN_FALLBACK);
	}

	/* The scrim is the one thing that always transitions on the way out, in
	   both the flying and the fading case, so it is the signal to tear down
	   on. Filtering by target as well as property matters: the frame's own
	   translate finishes at the same moment and would fire this twice. */
	function onTransitionEnd(event) {
		if (!closing) return;
		if (event.target !== scrim) return;
		if (event.propertyName !== "opacity") return;
		teardown();
	}

	function teardown() {
		cancelTeardown();
		if (!dialog?.open) return;

		dialog.close();
		release();
		closing = false;

		document.documentElement.classList.remove("is-zoomed");
		document.documentElement.style.removeProperty("--sbw");

		/* Focus goes back to the button that opened the panel. showModal moves
		   it into the dialog and does not reliably put it back, and a keyboard
		   visitor who is returned to <body> has to tab the whole page again to
		   get to the next photograph. */
		source?.focus?.();
		source = null;

		/* Drop the bitmap. Eight case studies' worth of full-size images held
		   live in a detached <img> is a lot of decoded pixels to keep for a
		   panel nobody is looking at. */
		image.removeAttribute("src");
	}

	function cancelTeardown() {
		if (!teardownTimer) return;
		clearTimeout(teardownTimer);
		teardownTimer = 0;
	}

	/* ---------------------------------------------------------------- flip */

	/* Both rects are read here, once per gesture, and turned into three
	   numbers.

	   Photograph to photograph, not photograph to frame. The transform is
	   applied to the frame, but both measurements have to be of the same
	   thing or the scale comes out wrong by the ratio of the mount: measuring
	   the frame here made the frame's *outer* edge match the thumbnail, which
	   left the image itself landing 3% small and visibly settling at the end
	   of the flight. It works out because the mount's padding is uniform, so
	   the frame's centre is the photograph's centre — scaling the frame about
	   its own centre scales the photograph about the photograph's centre. */
	function parkOn(thumb) {
		const from = thumb.getBoundingClientRect();
		const to = image.getBoundingClientRect();
		if (!from.width || !to.width) return;

		frame.style.setProperty(
			"--fx",
			`${from.left + from.width / 2 - (to.left + to.width / 2)}px`,
		);
		frame.style.setProperty(
			"--fy",
			`${from.top + from.height / 2 - (to.top + to.height / 2)}px`,
		);
		frame.style.setProperty("--fs", String(from.width / to.width));
	}

	function release() {
		frame.style.removeProperty("--fx");
		frame.style.removeProperty("--fy");
		frame.style.removeProperty("--fs");
	}

	/* One plain number, width over height. The stylesheet uses it twice — once
	   as an aspect-ratio and once as a multiplier against the height budget —
	   and the second of those is arithmetic, so `w / h` as a ratio token would
	   not do. It also has to be exactly the thumbnail's shape or the flight
	   lands crooked: a uniform scale can only map one rectangle onto another
	   if they agree.

	   The authored width/height attributes are the answer that is right
	   earliest and stays right. naturalWidth needs a decode, and the rendered
	   box is a last resort that has already been rounded by layout. */
	function ratioOf(thumb) {
		const w = Number(thumb.getAttribute("width"));
		const h = Number(thumb.getAttribute("height"));
		if (w > 0 && h > 0) return String(w / h);
		if (thumb.naturalWidth && thumb.naturalHeight) {
			return String(thumb.naturalWidth / thumb.naturalHeight);
		}
		if (thumb.clientWidth && thumb.clientHeight) {
			return String(thumb.clientWidth / thumb.clientHeight);
		}
		return "1";
	}

	function isOnScreen(element) {
		const rect = element.getBoundingClientRect();
		return rect.bottom > 0 && rect.top < window.innerHeight;
	}

	/* ---------------------------------------------------------------- note */

	/* The caption, and only the caption.

	   A figure carries two pieces of writing, and it is tempting to show both
	   because they are worded differently. They are not different: the caption
	   is the author's line, and the alt text says what is in the picture. In a
	   panel built around showing you the picture, the second one is a
	   description of something you are looking at, so it came out as the
	   caption again in other words — "Heatmap showing users primarily
	   interacted with Browse and My Books" above "Mouse heatmap over the
	   Goodreads interface, hottest across the Browse and My Books navigation
	   items". That is not a few unlucky pairs to be special-cased; it is what
	   alt text is for, so it repeated almost everywhere.

	   So the alt text goes back to being alt text, on the image where it does
	   real work for anyone who cannot see it. It only becomes visible writing
	   when there is no caption at all, because a figure with nothing said
	   about it is worse than one thing said once.

	   With neither, the column is removed rather than left standing empty, and
	   :has() in the stylesheet gives the photograph the whole sheet. */
	function writeNote({ caption, alt }) {
		const title = caption || alt;
		if (!title) {
			$(".lightbox__note", sheet)?.remove();
			return;
		}

		const note = h(
			"div",
			{ class: "lightbox__note" },
			eyebrow ? h("p", { class: "lightbox__eyebrow", text: eyebrow }) : null,
			h("h2", { class: "lightbox__title", text: title }),
		);

		const existing = $(".lightbox__note", sheet);
		if (existing) existing.replaceWith(note);
		else sheet.append(note);
	}

	/* --------------------------------------------------------------- build */

	/* Built once, lazily, on the first click. A visitor who never opens a
	   photograph never pays for the markup, and there is no dialog sitting in
	   the accessibility tree of a page that has no use for one. */
	function build() {
		if (dialog) return;

		image = h("img", { alt: "", decoding: "async" });
		frame = h("div", { class: "lightbox__frame" }, image);

		const close_ = h("button", {
			class: "lightbox__close",
			type: "button",
			"aria-label": "Close",
			text: "✕",
		});
		close_.addEventListener("click", close);

		sheet = h(
			"div",
			{ class: "lightbox__sheet paper stitch" },
			frame,
			close_,
		);

		scrim = h("div", { class: "lightbox__scrim" });
		dialog = h("dialog", { class: "lightbox" }, scrim, sheet);

		/* Anywhere that is not the sheet closes. Testing for the sheet rather
		   than for the scrim is what makes the padding around the sheet — and
		   the dialog element itself — part of the dismiss target, which is
		   where people actually click when they mean "away". */
		dialog.addEventListener("pointerdown", (event) => {
			if (!event.target.closest(".lightbox__sheet")) close();
		});

		/* Esc reaches a modal dialog as `cancel`. Left alone it would close the
		   dialog outright, skipping the flight home and, worse, skipping the
		   teardown that unlocks the page. */
		dialog.addEventListener("cancel", (event) => {
			event.preventDefault();
			close();
		});

		/* And Esc again, by hand, because `cancel` is the platform's *close
		   request* rather than a key event — it is not guaranteed to arrive
		   from every source that can produce an Escape, and it was observed
		   not arriving at all while this was being tested. Escape closing the
		   panel is not a nicety; without it a visitor who cannot use a mouse
		   is shut inside a focus trap. close() is idempotent, so the two paths
		   firing together costs nothing. */
		dialog.addEventListener("keydown", (event) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			close();
		});

		dialog.addEventListener("transitionend", onTransitionEnd);

		document.body.append(dialog);
	}
}

/* Wraps every image under `root` in a zoom button, in place. Done here rather
   than in the renderer so that the markup shape and the behaviour that
   depends on it stay in one file. */
export function makeZoomable(root) {
	for (const img of $$("figure img", root)) {
		if (img.closest("[data-zoom]")) continue;

		const figure = img.closest("figure");
		const label = $("figcaption", figure)?.textContent?.trim() || img.alt || "";

		const button = h("button", {
			class: "zoom",
			type: "button",
			"data-zoom": true,
			"aria-label": label ? `Expand image: ${label}` : "Expand image",
		});

		img.replaceWith(button);
		button.append(img);
	}
}
