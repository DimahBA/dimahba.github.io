/* Scroll-triggered reveals.

   Entrance choreography lives in CSS: JS adds one class to the section and
   each child staggers itself with `transition-delay: var(--in-delay)`. The
   original site chained a dozen setTimeouts to do this, which meant scrolling
   quickly left overlapping timers fighting each other.

   IntersectionObserver does the work, but it is not trusted on its own.
   Chromium computes intersections as part of a rendering lifecycle update, and
   a page that is not being painted — a background tab, an occluded window —
   does not get one. requestAnimationFrame is part of the same lifecycle, so it
   is no help as a fallback either. Since everything here starts hidden and
   waits for a class, a missed callback means a blank section rather than a
   missing flourish. So every observer is backed by a plain geometry check on a
   timer, on scroll, and on becoming visible. */

function visibleRatio(element) {
	const rect = element.getBoundingClientRect();
	if (rect.height <= 0) return 0;
	const viewport = window.innerHeight || document.documentElement.clientHeight;
	const covered = Math.min(rect.bottom, viewport) - Math.max(rect.top, 0);
	return Math.max(0, covered) / rect.height;
}

/* Runs `check` now-ish and on any signal that the geometry may have changed,
   without depending on the rendering lifecycle. Returns a teardown function. */
function backstop(check) {
	let queued = false;

	const run = () => {
		queued = false;
		check();
	};

	const nudge = () => {
		if (queued) return;
		queued = true;
		setTimeout(run, 60);
	};

	const onVisible = () => {
		if (!document.hidden) nudge();
	};

	setTimeout(check, 250);
	window.addEventListener("scroll", nudge, { passive: true });
	window.addEventListener("resize", nudge, { passive: true });
	document.addEventListener("visibilitychange", onVisible);

	return () => {
		window.removeEventListener("scroll", nudge);
		window.removeEventListener("resize", nudge);
		document.removeEventListener("visibilitychange", onVisible);
	};
}

export function watch(element, { onEnter, onLeave, threshold = 0.25 } = {}) {
	if (!element) return () => {};

	let inside = false;

	const enter = () => {
		if (inside) return;
		inside = true;
		onEnter?.();
	};

	const leave = () => {
		if (!inside) return;
		inside = false;
		onLeave?.();
	};

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) enter();
			else leave();
		},
		{ threshold },
	);
	observer.observe(element);

	const stop = backstop(() => {
		if (visibleRatio(element) >= threshold) enter();
		else leave();
	});

	return () => {
		observer.disconnect();
		stop();
	};
}

/** Adds `className` the first time `element` scrolls into view, then stops.
    `onReveal` fires at the same moment, for entrances CSS cannot express on
    its own — the project table has to compute where its cards land first.
    Pass a null `className` when the callback owns the class itself. */
export function revealOnce(element, className = "is-in", threshold = 0.2, onReveal) {
	if (!element) return;

	let done = false;
	let stop = null;

	const reveal = () => {
		if (done) return;
		done = true;
		if (className) element.classList.add(className);
		observer.disconnect();
		stop?.();
		onReveal?.();
	};

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) reveal();
		},
		{ threshold },
	);
	observer.observe(element);

	stop = backstop(() => {
		if (visibleRatio(element) >= threshold) reveal();
	});
}
