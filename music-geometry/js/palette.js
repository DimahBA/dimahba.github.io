/* The palette — Manim's, the colours of 3Blue1Brown's videos.

   Every colour means one thing, on the staff, the piano and in the
   narration alike. This file is the only place they are written down:
   `applyCssVars()` copies them onto :root so the HTML chrome uses the same
   values as the SVG stage. */

export const C = {
	bg: "#000000",
	white: "#FFFFFF",
	grayA: "#DDDDDD",
	grayB: "#BBBBBB",
	gray: "#888888",
	grayD: "#444444",
	grayE: "#222222",

	whole: "#58C4DD" /* BLUE_C   — a whole step */,
	half: "#F7D96F" /* YELLOW_C — a half step */,
	tonic: "#F0AC5F" /* GOLD_C   — the starting note, home */,
	tonicInk: "#C78D46" /* GOLD_E   — the same, legible on an ivory key */,
	fits: "#83C167" /* GREEN_C  — a note that fits the pattern */,
	breaks: "#FC6255" /* RED_C    — a note that breaks it */,
	blueB: "#9CDCEB" /* BLUE_B   — a key being played */,

	/* The home page's harmony needs two more meanings. */
	away: "#B189C6" /* PURPLE_B — away from home: the subdominant */,
	ivory: "#ECEAE4" /* a white key, when the keyboard is the only light thing */,
};

export const stepColor = (size) => (size === 1 ? C.half : size === 2 ? C.whole : C.breaks);

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Blends two hex colours; t = 0 is `a`, t = 1 is `b`. */
export function mix(a, b, t) {
	if (t <= 0) return a;
	if (t >= 1) return b;
	const A = rgb(a);
	const B = rgb(b);
	return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

export function applyCssVars(root = document.documentElement) {
	for (const [name, value] of Object.entries(C)) root.style.setProperty(`--${name}`, value);
}
