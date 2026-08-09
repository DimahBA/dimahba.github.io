import { $, h } from "./lib/dom.js";
import { projects, slugs } from "./data/projects.js";
import { mountLightbox, makeZoomable } from "./modules/lightbox.js";
import { initPawTrail } from "./modules/paws.js";

const SITE = "https://dimahba.github.io/";
const YOUTUBE_ID = /^[\w-]{11}$/;

/* Own-property check, not `id in projects` and not a bare lookup. With a bare
   lookup, ?id=__proto__ / constructor / toString all resolve to truthy
   non-project objects and the renderer either explodes or starts reading
   strings out of Object.prototype. The data object's own keys are the
   whitelist, so there is no second list to keep in sync. */
const requested = new URLSearchParams(location.search).get("id");
const data =
	requested && Object.hasOwn(projects, requested) ? projects[requested] : null;

/* A project whose case study is not a paper sheet lives on a page of its own.
   The slug still resolves here, because project.html?id=… is the address that
   is in the sitemap and on anything already printed — `replace`, not `assign`,
   so the redirect does not sit in the history and trap the back button.

   Which page it goes to is decided by the data file, never by the query
   string: `requested` only ever selects an entry, and every `page` in that
   file is a relative path to a file in this repo. */
if (data?.page) {
	location.replace(data.page);
} else {
	if (data) render(requested, data);
	else if (requested) renderNotFound();
	else renderIndex();

	document.body.removeAttribute("data-loading");

	initPawTrail();
}

/* ------------------------------------------------------------------ render */

function render(id, project) {
	document.documentElement.dataset.theme = project.theme ?? "moss";

	setMeta(id, project);

	const badge = $('[data-slot="badge"]');
	if (project.badge) {
		badge.textContent = project.badge;
		badge.hidden = false;
	}

	$('[data-slot="title"]').textContent = project.title;

	$('[data-slot="tags"]').replaceChildren(
		...(project.tags ?? []).map((tag) => h("li", { class: "chip", text: tag })),
	);

	/* The deck and the credits card are both optional, and both collapse to
	   nothing when a project doesn't carry them — an older case study keeps
	   the plain centred title it was written for.

	   Both slots are also addressed defensively: a stale cached copy of the
	   shell that predates them should cost the reader a masthead, not the
	   whole case study — an uncaught throw here leaves the body empty. */
	const deck = $('[data-slot="deck"]');
	if (deck && project.meta && project.summary) deck.textContent = project.summary;

	const aside = $('[data-slot="meta"]');
	if (aside && project.meta) aside.replaceChildren(buildMeta(project.meta));

	const body = $('[data-slot="body"]');
	body.replaceChildren(...buildBody(project));

	makeZoomable(body);
	mountLightbox(body, { eyebrow: project.title });
}

/* Blocks and gutter figures are emitted in one pass so that DOM order is
   correct for the single-column fallback, while the row placement keeps each
   figure beside its anchor paragraph in the three-column layout. */
function buildBody(project) {
	const nodes = [];
	const blocks = project.body ?? [];
	const polaroids = project.polaroids ?? [];
	const rows = placeGutters(polaroids, blocks.length);

	blocks.forEach((block, index) => {
		for (const polaroid of polaroids) {
			if (anchorOf(polaroid, blocks.length) !== index) continue;
			const { start, end } = rows.get(polaroid);
			const figure = buildPolaroid(polaroid);
			figure.style.setProperty("--row-start", String(start));
			figure.style.setProperty("--row-end", String(end));
			nodes.push(figure);
		}

		const element = buildBlock(block);
		if (!element) return;
		element.style.setProperty("--row", String(index + 1));
		nodes.push(element);
	});

	return nodes;
}

/* An anchor past the end of the body still gets shown — beside the last
   block, rather than in a row that does not exist. Clamping here means the
   rest of the placement never has to think about out-of-range data. */
function anchorOf(polaroid, blockCount) {
	const anchor = polaroid.anchor ?? 0;
	if (!Number.isFinite(anchor)) return 0;
	return Math.min(Math.max(Math.trunc(anchor), 0), Math.max(blockCount - 1, 0));
}

/* Give every gutter figure a row *range* rather than a single row: from its
   own anchor down to wherever the next figure on the same side begins.

   This is what stops two photographs from landing on top of each other, and
   it does it from the data alone — no element is measured, so a long caption
   or an edited paragraph can never reintroduce the collision. Grid then does
   the only part that needs real sizes: if the prose in the range is shorter
   than the photograph, the range stretches to fit it.

   Two figures anchored to the same block are the interesting case. They
   cannot share a row range, so the second starts where the first ended —
   which reads as "and then this one, just below". */
function placeGutters(polaroids, blockCount) {
	const rows = new Map();
	const lastLine = Math.max(blockCount, 1) + 1;

	for (const side of ["left", "right"]) {
		const column = polaroids
			.filter((polaroid) => sideOf(polaroid) === side)
			.sort(
				(a, b) => anchorOf(a, blockCount) - anchorOf(b, blockCount),
			);

		let floor = 1;

		column.forEach((polaroid, index) => {
			const start = Math.max(anchorOf(polaroid, blockCount) + 1, floor);

			const next = column[index + 1];
			const end = next
				? Math.max(anchorOf(next, blockCount) + 1, start + 1)
				: Math.max(lastLine, start + 1);

			rows.set(polaroid, { start, end });
			floor = end;
		});
	}

	return rows;
}

function sideOf(polaroid) {
	return polaroid.side === "left" ? "left" : "right";
}

function buildBlock(block) {
	if (block.p) return h("p", { class: "case__p" }, inline(block.p));
	if (block.h2) return h("h2", { class: "case__h2", text: block.h2 });
	if (block.quote) return buildQuote(block);
	if (block.list) return buildList(block.list);
	if (block.img) return buildFigure(block.img);
	if (block.video) return buildVideo(block.video);
	if (block.link) {
		return h(
			"p",
			{ class: "case__link" },
			h("a", {
				href: block.link.href,
				text: block.link.label,
				target: "_blank",
				rel: "noopener",
			}),
		);
	}
	return null;
}

/* Inline formatting is a list of runs, never an HTML string — so <strong> and
   <a> are built with createElement and every character of copy goes in as
   text. There is nothing to sanitize because nothing is ever parsed. */
function inline(content) {
	if (typeof content === "string") return [document.createTextNode(content)];

	return content.map((run) => {
		if (typeof run === "string") return document.createTextNode(run);
		if (run.b) return h("strong", { text: run.b });
		if (run.i) return h("em", { text: run.i });
		if (run.a) {
			return h("a", {
				href: run.href,
				text: run.a,
				target: "_blank",
				rel: "noopener",
				class: "case__inline-link",
			});
		}
		return document.createTextNode("");
	});
}

/* The credits card beside the title: role, timeline, tooling. A description
   list rather than a paragraph of slashes, because that is what it is — and
   because it lets the stylesheet draw the rows without the copy having to
   carry the punctuation that fakes them. */
function buildMeta(rows) {
	return h(
		"dl",
		{ class: "case__meta" },
		...rows.flatMap((row) => [
			h("dt", { text: row.k }),
			h("dd", {}, ...inline(row.v)),
		]),
	);
}

/* A participant's own words, kept in the language they said them in. `cite`
   is the attribution line; `translation` is shown under the quote rather than
   replacing it, so the reader gets the sentence and the sense. */
function buildQuote(block) {
	return h(
		"blockquote",
		{ class: "case__quote" },
		h("p", { lang: block.lang ?? null }, ...inline(block.quote)),
		block.translation
			? h("p", { class: "case__quote-gloss", text: block.translation })
			: null,
		block.cite ? h("cite", { text: block.cite }) : null,
	);
}

function buildList(items) {
	return h(
		"ul",
		{ class: "case__list" },
		...items.map((item) => h("li", {}, ...inline(item))),
	);
}

function buildFigure(image) {
	return h(
		"figure",
		{ class: "case__figure" },
		h("img", {
			src: image.src,
			alt: image.alt ?? "",
			width: image.w,
			height: image.h,
			/* The same ratio the width and height attributes carry, in the one
			   form the stylesheet can do arithmetic with: it multiplies the
			   height cap by this to get a width, and that has to work before
			   the image has loaded. */
			"--fig-ar": image.w && image.h ? String(image.w / image.h) : null,
			loading: "lazy",
			decoding: "async",
		}),
		image.caption ? h("figcaption", { text: image.caption }) : null,
	);
}

function buildPolaroid(polaroid) {
	return h(
		"div",
		{ class: "gutter", "data-side": sideOf(polaroid) },
		h(
			"figure",
			{ class: "polaroid", "--rot": `${polaroid.rot ?? 0}deg` },
			h("img", {
				src: polaroid.src,
				alt: polaroid.alt ?? "",
				width: polaroid.w,
				height: polaroid.h,
				loading: "lazy",
				decoding: "async",
			}),
			polaroid.caption ? h("figcaption", { text: polaroid.caption }) : null,
		),
	);
}

function buildVideo(video) {
	if (!YOUTUBE_ID.test(video.id ?? "")) return null;

	const frame = h("div", {
		class: "case__video-frame",
		"--ar": video.aspect ?? "16 / 9",
	});

	/* maxresdefault 404s for plenty of videos — the old page used it with no
	   fallback, so the thumbnail was one upload away from being a broken image. */
	const thumbnail = h("img", {
		src: `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
		alt: "",
		loading: "lazy",
	});
	thumbnail.addEventListener(
		"error",
		() => {
			thumbnail.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
		},
		{ once: true },
	);

	const play = h(
		"button",
		{
			class: "case__play",
			type: "button",
			"aria-label": `Play video: ${video.title ?? "project demo"}`,
		},
		playIcon(),
	);

	play.addEventListener("click", () => {
		frame.replaceChildren(
			h("iframe", {
				src: `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`,
				title: video.title ?? "Project video",
				allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
				referrerpolicy: "strict-origin-when-cross-origin",
				loading: "lazy",
				frameborder: "0",
			}),
		);
	});

	frame.append(thumbnail, play);
	return h("div", { class: "case__video" }, frame);
}

function playIcon() {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "#fffdef");
	svg.setAttribute("aria-hidden", "true");
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", "M8 5v14l11-7z");
	svg.append(path);
	return svg;
}

/* -------------------------------------------------------------------- meta */

function setMeta(id, project) {
	const url = `${SITE}project.html?id=${encodeURIComponent(id)}`;
	const image = firstImage(project);

	document.title = `${project.title} — Dimah`;

	content('meta[name="description"]', project.summary ?? "");
	content('meta[property="og:title"]', project.title);
	content('meta[property="og:description"]', project.summary ?? "");
	content('meta[property="og:url"]', url);
	if (image) content('meta[property="og:image"]', new URL(image, SITE).href);

	const canonical = $('link[rel="canonical"]');
	if (canonical) canonical.href = url;
}

function firstImage(project) {
	const inBody = project.body?.find((block) => block.img)?.img?.src;
	return inBody ?? project.polaroids?.[0]?.src ?? null;
}

function content(selector, value) {
	$(selector)?.setAttribute("content", value);
}

/* ------------------------------------------------- index / not-found views */

/* project.html with no ?id is a useful URL rather than an error: it lists
   everything. */
function renderIndex() {
	document.documentElement.dataset.theme = "moss";
	document.title = "Projects — Dimah";
	$('[data-slot="title"]').textContent = "All projects";
	$('[data-slot="body"]').replaceChildren(
		h("div", { class: "notfound" }, projectList()),
	);
}

/* The requested id is never echoed back into the page — not into the title,
   not into an href, not into the message. It goes into the lookup and nowhere
   else. */
function renderNotFound() {
	document.documentElement.dataset.theme = "butter";
	document.title = "Not found — Dimah";

	const robots = h("meta", { name: "robots", content: "noindex" });
	document.head.append(robots);

	$('[data-slot="title"]').textContent = "This table's empty";
	$('[data-slot="body"]').replaceChildren(
		h(
			"div",
			{ class: "notfound" },
			h("p", {
				class: "case__p",
				text: "There's no case study at this address — it may have been renamed. Here's everything that is on the menu:",
			}),
			projectList(),
		),
	);
}

function projectList() {
	return h(
		"div",
		{ class: "notfound__list" },
		...slugs.map((slug) =>
			h("a", {
				class: "chip-link stitch",
				href:
					projects[slug].page ??
					`project.html?id=${encodeURIComponent(slug)}`,
				text: projects[slug].title,
			}),
		),
	);
}
