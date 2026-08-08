/* The clock on the café wall.

   Everything else on the shelf is written into the HTML, because everything
   else is a fact that changes a few times a year. A time is not, so this is
   the one widget with a script behind it — and the one that is hidden
   outright when there is no script to run (see `html:not(.js)` in
   css/home.css). A clock stuck at --:-- is worse than no clock.

   The zone is fixed rather than taken from the visitor's machine: the point
   of the card is what time it is *where she is*, so a reader in Tokyo and a
   reader in Paris are told the same thing. Intl does the whole job, daylight
   saving included — there is no arithmetic here to get wrong twice a year.

   The face is a seven-segment panel, which is why this file draws as well as
   counts: 28 bars is not markup worth writing by hand, and the panel is a
   picture of a clock rather than text — the readable time is carried beside
   it in a visually hidden <time>, so a screen reader gets a string and not a
   pile of empty spans. */

/* Under a minute, so the displayed minute is never more than a few seconds
   stale, and cheap enough that being wrong about the alignment costs nothing:
   the tick only writes when the string it formatted actually changed. */
const TICK = 20_000;

/* Which of the seven bars are lit for each digit, in the usual a–g order:
   a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left,
   g middle. */
const SEGMENTS = "abcdef bc abged abcdg bcfg acdfg acdefg abc abcdefg abcdfg";
const DIGITS = SEGMENTS.split(" ");
const BARS = ["a", "b", "c", "d", "e", "f", "g"];

/* One digit's worth of bars. Every bar is always present — an unlit segment
   is a visible part of a seven-segment display, not an absent one, and
   leaving it out would make the panel read as a set of floating strokes. */
function buildDigit(slot) {
	for (const bar of BARS) {
		const seg = document.createElement("i");
		seg.className = `seg seg--${bar}`;
		/* Which bar this is, kept somewhere the lighting cannot touch. Reading
		   it back off the class list instead looks tempting and is wrong: the
		   moment a segment lights, its class becomes "seg seg--a is-on" and the
		   letter is no longer the last thing in the string. The first minute
		   renders correctly and every one after it is garbage. */
		seg.dataset.seg = bar;
		slot.append(seg);
	}
}

function showDigit(slot, value) {
	const lit = DIGITS[value] ?? "";
	for (const seg of slot.children) {
		seg.classList.toggle("is-on", lit.includes(seg.dataset.seg));
	}
}

export function initClock({ card, led, time }) {
	if (!card || !led) return () => {};

	const slots = [...led.querySelectorAll(".led__digit")];
	for (const slot of slots) buildDigit(slot);

	const clock = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Europe/Paris",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});

	let shown = null;

	const tick = () => {
		const now = new Date();
		const stamp = clock.format(now);
		if (stamp === shown) return;
		shown = stamp;

		/* "09:30" → the four digits, colon dropped. Read off the formatted
		   string rather than off the Date, so the panel and the text beside it
		   can never disagree about what minute it is. */
		const figures = [...stamp].filter((c) => c >= "0" && c <= "9");
		slots.forEach((slot, i) => showDigit(slot, Number(figures[i])));

		if (time) {
			time.textContent = stamp;
			/* Valid as a machine-readable time string, so the <time> element
			   is telling the truth about itself. */
			time.dateTime = stamp;
		}
	};

	tick();
	const timer = setInterval(tick, TICK);

	/* A background tab is throttled to about a minute between timers, so the
	   first thing a returning reader would otherwise see is a stale minute.
	   Catch it on the way back in. */
	const onVisible = () => {
		if (!document.hidden) tick();
	};
	document.addEventListener("visibilitychange", onVisible);

	return () => {
		clearInterval(timer);
		document.removeEventListener("visibilitychange", onVisible);
	};
}
