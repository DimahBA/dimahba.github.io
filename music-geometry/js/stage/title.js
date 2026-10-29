/* The title card, written the way Manim's Write does it: the outline of
   every letter is drawn first, then the fill comes in behind it.

   An SVG text element can't report its outline length, so the dash is
   simply made longer than any glyph's outline at this size — each glyph
   then draws from nothing to whole as the offset runs down. */

import { s, attrs, show } from "../lib/dom.js";
import { C } from "../palette.js";
import { clamp01 } from "../engine/ease.js";

const DASH = 1400;

export function create(root, { text = "The Major Scale", sub: subText = "what it is made of, and how to start it on any note", size = 112 } = {}) {
	const title = s("text", {
		class: "stage-title",
		x: 800,
		y: 400,
		"text-anchor": "middle",
		"font-size": size,
		"stroke-dasharray": `${DASH} ${DASH}`,
		text,
	});
	const sub = s("text", {
		class: "stage-sub",
		x: 800,
		y: 478,
		"text-anchor": "middle",
		text: subText,
	});
	root.append(title, sub);

	return {
		render(P) {
			const w = P["title.w"];
			if (show(title, P["title.o"])) {
				attrs(title, {
					stroke: C.white,
					"stroke-dashoffset": DASH * (1 - clamp01(w / 0.7)),
					"fill-opacity": clamp01((w - 0.55) / 0.45),
				});
			}
			if (show(sub, P["sub.o"])) {
				attrs(sub, { transform: `translate(0 ${(1 - P["sub.o"]) * 14})` });
			}
			return false;
		},
	};
}
