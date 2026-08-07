/* Reveals the nav once the café hero has scrolled away, and keeps the current
   section marked.

   The reveal is a scroll position check rather than an IntersectionObserver.
   It is one boolean, it is rAF-throttled, and unlike IO it cannot be silently
   skipped when the page is not being painted — a navigation bar that never
   appears is a functional loss, not just a missing flourish. Active-link
   tracking below is a flourish, so IO is fine for it. */
export function initNav({ nav, hero, links }) {
	if (nav && hero) {
		let queued = false;

		const sync = () => {
			queued = false;
			const past = window.scrollY > hero.offsetHeight * 0.85;
			nav.toggleAttribute("data-visible", past);
		};

		/* Throttled on a timer rather than requestAnimationFrame. rAF is part
		   of the rendering lifecycle, so it is suspended in a page that is not
		   being painted — and this writes one attribute, so it gains nothing
		   from being frame-aligned anyway. */
		window.addEventListener(
			"scroll",
			() => {
				if (queued) return;
				queued = true;
				setTimeout(sync, 50);
			},
			{ passive: true },
		);

		window.addEventListener("resize", sync, { passive: true });
		sync();
	}

	const targets = links
		.map((link) => {
			const id = link.getAttribute("href")?.slice(1);
			const section = id && document.getElementById(id);
			return section ? { link, section } : null;
		})
		.filter(Boolean);

	if (!targets.length) return;

	const ratios = new Map();

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
			}

			let best = null;
			let bestRatio = 0;
			for (const { link, section } of targets) {
				const ratio = ratios.get(section) ?? 0;
				if (ratio > bestRatio) {
					bestRatio = ratio;
					best = link;
				}
			}

			for (const { link } of targets) {
				if (link === best) link.setAttribute("aria-current", "true");
				else link.removeAttribute("aria-current");
			}
		},
		{ threshold: [0, 0.15, 0.35, 0.6, 0.85] },
	);

	for (const { section } of targets) observer.observe(section);
}
