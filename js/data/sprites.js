/* The little drawings on the third panel of each note.

   Sprites are authored as 16×16 character grids rather than as SVG paths, for
   the same reason the Q&A copy lives in a data file: this is content, and it
   should be editable by someone who is not reading the renderer. A row is a
   row of pixels, one character each, and `.` is transparent. Every other
   character is a key into that sprite's own `palette`.

   16×16 is not arbitrary. Blown up to ~7rem on the note each pixel lands near
   7px, which is the same chunk size as the chibi and the sunflower sprites in
   static/PixelArt — the drawings have to look like they came out of the same
   tin as the rest of the café, and pixel size is most of what says that.

   Colours are `var()` references rather than hexes so a sprite inherits the
   note it is sitting on: `--art-ink` and `--art-accent` are set per tint in
   css/components.css, which is why the cat on the tan note is not the same
   brown as the rocket on the peach one. */

/** @type {Record<string, { w: number, h: number, palette: Record<string,string>, rows: string[] }>} */
export const sprites = {
	/* A mortarboard, tassel hanging off the right point. */
	cap: {
		w: 16,
		h: 16,
		palette: { o: "var(--art-ink)", b: "var(--art-paper)", t: "var(--art-accent)" },
		rows: [
			"................",
			"................",
			".......oo.......",
			".....oooooo.....",
			"...oooooooooo...",
			".oooooooooooooo.",
			"...oooooooooo.t.",
			".....oooooo..t..",
			".....oooooo..t..",
			".....obbbbo..t..",
			".....obbbbo..t..",
			".....oooooo.ttt.",
			"............ttt.",
			".............t..",
			"................",
			"................",
		],
	},

	/* A little rocket. Projects are the things that get launched. */
	rocket: {
		w: 16,
		h: 16,
		palette: {
			o: "var(--art-ink)",
			b: "var(--art-paper)",
			w: "var(--art-accent)",
			n: "var(--art-accent)",
			f: "var(--art-warm)",
		},
		rows: [
			".......oo.......",
			"......obbo......",
			".....obbbbo.....",
			"....obbbbbbo....",
			"....oboooobo....",
			"....obowwobo....",
			"....obowwobo....",
			"....oboooobo....",
			"....obbbbbbo....",
			"..nnobbbbbbonn..",
			".nnnobbbbbbonnn.",
			"nnnnobbbbbbonnnn",
			"nnn.obbbbbbo.nnn",
			"....oobbbboo....",
			"......ffff......",
			".......ff.......",
		],
	},

	/* Two beamed quavers. */
	notes: {
		w: 16,
		h: 16,
		palette: { o: "var(--art-ink)", a: "var(--art-accent)" },
		rows: [
			"................",
			"................",
			".....ooooooooo..",
			".....ooooooooo..",
			".....o.......o..",
			".....o.......o..",
			".....o.......o..",
			".....o.......o..",
			".....o.......o..",
			".....o.......o..",
			"..aaaa....aaaa..",
			".aaaaa...aaaaa..",
			".aaaaa...aaaaa..",
			"..aaaa....aaaa..",
			"................",
			"................",
		],
	},

	/* A cat, obviously. */
	cat: {
		w: 16,
		h: 16,
		palette: {
			o: "var(--art-ink)",
			f: "var(--art-paper)",
			p: "var(--art-accent)",
			w: "var(--art-paper)",
		},
		rows: [
			"................",
			"...o........o...",
			"..opo......opo..",
			".oppo......oppo.",
			".opppoooooopppo.",
			".offffffffffffo.",
			".offffffffffffo.",
			".offwoffffwoffo.",
			".offooffffooffo.",
			".offffffffffffo.",
			".offfffppfffffo.",
			".offffoffoffffo.",
			".offffffffffffo.",
			"..oooooooooooo..",
			"................",
			"................",
		],
	},
};

const SVG_NS = "http://www.w3.org/2000/svg";

/* Renders one sprite as an <svg> of rects.

   Runs of the same colour in a row become a single rect rather than one rect
   per pixel. That is not premature: a 16×16 grid is 256 pixels and these
   sprites are mostly flat bands, so the run-length pass takes the cat from
   256 nodes to 61. Four of them on the page is the difference between a
   handful of elements and a thousand.

   Built with createElementNS and no innerHTML anywhere, so the sprite data
   goes through the same no-markup-injection rule as every other string in
   this project — see js/lib/dom.js. */
export function renderSprite(name) {
	const sprite = sprites[name];
	if (!sprite) return null;

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", `0 0 ${sprite.w} ${sprite.h}`);
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("focusable", "false");
	/* Nearest-neighbour edges. Without it the browser antialiases every rect
	   boundary and the sprite arrives with a grey halo around each pixel,
	   which is exactly the look pixel art is not. */
	svg.style.shapeRendering = "crispEdges";

	sprite.rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const key = row[x];
			let run = 1;
			while (row[x + run] === key) run++;

			const fill = sprite.palette[key];
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
