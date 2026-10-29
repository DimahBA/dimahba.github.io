/* The recipe, written out: W W H W W W H, each letter in its step's colour,
   appearing one at a time in step with the arcs that measure it. */

import { s, attrs, show } from "../lib/dom.js";
import { stepColor } from "../palette.js";
import { MAJOR_STEPS } from "../theory.js";

export function create(root) {
	const letters = MAJOR_STEPS.map((size) =>
		s("text", { class: "formula", "text-anchor": "middle", fill: stepColor(size), text: size === 1 ? "H" : "W" }),
	);
	root.append(...letters);

	return {
		render(P) {
			letters.forEach((t, j) => {
				const a = P["formula.o"] * P[`f${j}.o`];
				if (show(t, a)) {
					attrs(t, { x: P["formula.x"] + (j - 3) * 60, y: P["formula.y"] + (1 - P[`f${j}.o`]) * 16 });
				}
			});
			return false;
		},
	};
}
