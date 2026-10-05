/* The little drawings stuck on each letter from the jar, as stamps.

   Sprites are authored as 16×16 character grids rather than as SVG paths, for
   the same reason the Q&A copy lives in a data file: this is content, and it
   should be editable by someone who is not reading the renderer. A row is a
   row of pixels, one character each, and `.` is transparent. Every other
   character is a key into that sprite's own `palette`.

   16×16 is not arbitrary. Blown up on the letter each pixel lands near 4–5px,
   which is close to the chunk size of the chibi, the sunflower and the jar —
   the drawings have to look like they came out of the same tin as the rest
   of the café, and pixel size is most of what says that.

   Every drawing is lit from the upper left, like the jar and the plant: the
   cat's cheek is shaded on its right, the cap catches a glint on its left
   edge, the lenses are bright in their top-left corner.

   They are deliberately not on the slips in the jar. A slip is a folded
   letter seen from outside, and the outside of a letter says who it is for
   and nothing else; the drawing is something you find when you open it.

   Colours are `var()` references rather than hexes so a sprite inherits the
   note it is sitting on: `--art-accent` and friends are set per tint in
   css/components.css §10, which is why the bars on the peach letter are moss
   and not peach. */

/** @type {Record<string, { w: number, h: number, palette: Record<string,string>, rows: string[] }>} */
export const sprites = {
	/* A mortarboard, tassel hanging off the right point. */
	cap: {
		w: 16,
		h: 16,
		palette: {
			o: "var(--art-ink)",
			d: "var(--art-ink-soft)",
			s: "var(--art-glint)",
			w: "var(--art-warm)",
			a: "var(--art-accent)",
		},
		rows: [
			"................",
			"................",
			"................",
			"................",
			"......oooo......",
			"...ooossddooo...",
			"ooossddwwaaaaaoo",
			"...oooddddooo.a.",
			"....oooooooo..a.",
			"....oddddddo..a.",
			"....ossddddo.aaa",
			"....ossddddo.aaa",
			".....oooooo...a.",
			"................",
			"................",
			"................",
		],
	},

	/* A laptop with a little dashboard open on it: a window bar, a divider,
	   and a bar chart that only goes up. */
	laptop: {
		w: 16,
		h: 16,
		palette: {
			o: "var(--art-ink)",
			p: "var(--art-paper)",
			s: "var(--art-shade)",
			a: "var(--art-accent)",
			w: "var(--art-warm)",
		},
		rows: [
			"................",
			"................",
			".oooooooooooooo.",
			".opapwppppppppo.",
			".osssssssssssso.",
			".opppppppppaapo.",
			".opppppppppaapo.",
			".opppppwwppaapo.",
			".opaappwwppaapo.",
			".opaappwwppaapo.",
			".oooooooooooooo.",
			"oooooooooooooooo",
			"osssssssssssssso",
			".oooooooooooooo.",
			"................",
			"................",
		],
	},

	/* AR glasses, and the waypoint they are guiding you towards. */
	glasses: {
		w: 16,
		h: 16,
		palette: {
			o: "var(--art-ink)",
			a: "var(--art-accent)",
			p: "var(--art-paper)",
			w: "var(--art-warm)",
			h: "var(--art-paper)",
			g: "var(--art-glass)",
			s: "var(--art-glass-shade)",
		},
		rows: [
			"................",
			"......oooo......",
			".....oaaaao.....",
			"....oaappaao....",
			"....oaappaao....",
			".....oaaaao.....",
			"......oaao......",
			".......oo.......",
			"................",
			".......ww.......",
			"................",
			".oooooo..oooooo.",
			"oohgggoooohgggoo",
			".ogggso..ogggso.",
			"..oooo....oooo..",
			"................",
		],
	},

	/* A treble clef — the G clef, the one every piano piece starts with. */
	clef: {
		w: 16,
		h: 16,
		palette: { o: "var(--art-ink)" },
		rows: [
			".......oo.......",
			"......oooo......",
			"......o..o......",
			"......o.oo......",
			"......ooo.......",
			".....oo.........",
			"....oo.o........",
			"...oo..oo.......",
			"..oo..oooo......",
			"..o..oo.o.oo....",
			"..o..o..o..o....",
			"..oo..o.o.oo....",
			"...oooooooo.....",
			".......o........",
			"...oo..o........",
			"...oooo.........",
		],
	},

	/* A cat who knows exactly how much you would like her to come over. */
	cat: {
		w: 16,
		h: 16,
		palette: {
			o: "var(--art-ink)",
			p: "var(--art-paper)",
			a: "var(--art-accent)",
			s: "var(--art-shade)",
		},
		rows: [
			"................",
			"................",
			"...o........o...",
			"..oao......oao..",
			"..oaao....oaao..",
			".opppoooooopppo.",
			".opppppppppppso.",
			".opppppppppppso.",
			".opoooppppoooso.",
			".oaapppaapppaao.",
			".oppppoppopppso.",
			".opppppooppppso.",
			"..opppppppppso..",
			"...oooooooooo...",
			"................",
			"................",
		],
	},
};

const SVG_NS = "http://www.w3.org/2000/svg";

/* Draws one grid as an <svg> of rects.

   Runs of the same colour in a row become a single rect rather than one rect
   per pixel. That is not premature: a 16×16 grid is 256 pixels and these
   sprites are mostly flat bands, so the run-length pass takes a drawing from
   hundreds of nodes to a few dozen.

   Built with createElementNS and no innerHTML anywhere, so the sprite data
   goes through the same no-markup-injection rule as every other string in
   this project — see js/lib/dom.js. */
function draw({ w, h, palette, rows }) {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");
	/* Nearest-neighbour edges. Without it the browser antialiases every rect
	   boundary and the sprite arrives with a grey halo around each pixel,
	   which is exactly the look pixel art is not. */
	svg.style.shapeRendering = "crispEdges";

	rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const key = row[x];
			let run = 1;
			while (row[x + run] === key) run++;

			const fill = palette[key];
			if (fill) {
				const rect = document.createElementNS(SVG_NS, "rect");
				rect.setAttribute("x", String(x));
				rect.setAttribute("y", String(y));
				rect.setAttribute("width", String(run));
				rect.setAttribute("height", "1");
				/* `style` and not the `fill` attribute: presentation attributes
				   do not accept var(), so setting fill="var(--art-ink)" here
				   silently paints everything black. */
				rect.style.fill = fill;
				svg.append(rect);
			}
			x += run;
		}
	});

	return svg;
}

/* A drawing as a postage stamp, for the bottom of the letter.

   The frame is drawn on the same pixel grid as the drawing rather than in
   CSS, so the perforations are pixels too: three rings round the 16×16 —
   the outer one alternating paper and nothing, which is the torn edge, and
   two of solid paper inside it. A perforated edge drawn as a CSS mask would
   be smooth and round, and a smooth edge next to a pixel cat is two
   different hands on one stamp.

   The picture's background is its own key, `G`, so the stamp can have a
   ground of its own colour without the drawing knowing about it. */
const FRAME = 3;

export function renderStamp(name) {
	const sprite = sprites[name];
	if (!sprite) return null;

	const w = sprite.w + FRAME * 2;
	const h = sprite.h + FRAME * 2;
	const rows = [];
	for (let y = 0; y < h; y++) {
		let row = "";
		for (let x = 0; x < w; x++) {
			const edgeX = x === 0 || x === w - 1;
			const edgeY = y === 0 || y === h - 1;
			if (edgeX || edgeY) {
				/* Corners left out, so the stamp's outline is rounded off by
				   one pixel like a real one torn from the sheet. */
				row += !(edgeX && edgeY) && (x + y) % 2 === 1 ? "P" : ".";
			} else if (x < FRAME || y < FRAME || x >= w - FRAME || y >= h - FRAME) {
				row += "P";
			} else {
				const key = sprite.rows[y - FRAME][x - FRAME];
				row += key === "." ? "G" : key;
			}
		}
		rows.push(row);
	}

	return draw({
		w,
		h,
		rows,
		palette: {
			...sprite.palette,
			P: "var(--stamp-paper)",
			G: "var(--stamp-ground)",
		},
	});
}
