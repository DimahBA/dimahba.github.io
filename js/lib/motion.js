/* Shared environment queries and maths helpers. */

export const reduceMotionQuery = window.matchMedia(
	"(prefers-reduced-motion: reduce)",
);

export const prefersReducedMotion = () => reduceMotionQuery.matches;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
