/* Minimal DOM construction, for HTML and for SVG.

   Nothing here assigns innerHTML: text goes through textContent, so the copy
   in js/data/ can never become markup. */

const SVG_NS = "http://www.w3.org/2000/svg";

function assign(el, props) {
	for (const [key, value] of Object.entries(props)) {
		if (value == null || value === false) continue;

		if (key === "class") el.setAttribute("class", value);
		else if (key === "text") el.textContent = value;
		else if (key.startsWith("--")) el.style.setProperty(key, value);
		else if (key.startsWith("on") && typeof value === "function") {
			el.addEventListener(key.slice(2).toLowerCase(), value);
		} else if (value === true) el.setAttribute(key, "");
		else el.setAttribute(key, value);
	}
}

/** h("button", { class: "chip", text: "Do", onClick }, ...children) */
export function h(tag, props = {}, ...children) {
	const el = document.createElement(tag);
	assign(el, props);
	el.append(...children.flat().filter((c) => c != null && c !== false));
	return el;
}

/** The same, in the SVG namespace. */
export function s(tag, props = {}, ...children) {
	const el = document.createElementNS(SVG_NS, tag);
	assign(el, props);
	el.append(...children.flat().filter((c) => c != null && c !== false));
	return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Sets text only when it changed. */
export function setText(el, text) {
	if (el.textContent !== text) el.textContent = text;
}

/* The stage redraws every frame while anything moves, and most attributes
   haven't changed since the last one. Remembering what was written last
   keeps those frames from touching the DOM at all. Numbers are rounded to
   two decimals — finer than a pixel at any size this page is shown. */
const written = new WeakMap();

export function attrs(el, values) {
	let last = written.get(el);
	if (!last) written.set(el, (last = {}));
	for (const [name, raw] of Object.entries(values)) {
		const value = typeof raw === "number" ? Math.round(raw * 100) / 100 : raw;
		if (last[name] === value) continue;
		last[name] = value;
		if (value == null || value === false) el.removeAttribute(name);
		else el.setAttribute(name, value);
	}
}

/** Shows or hides an SVG element, and sets its opacity when shown. */
export function show(el, opacity) {
	const on = opacity > 0.001;
	attrs(el, { display: on ? null : "none", opacity: on ? Math.min(1, opacity) : null });
	return on;
}
