/* Minimal, safe DOM construction.

   Nothing in this project ever assigns innerHTML. Text always goes through
   textContent, and any URL goes through safeHref — so even if content later
   comes from somewhere less trusted than a file in this repo, there is no
   markup-injection path. */

/* Resolve against the document base and check the protocol that comes out,
   rather than pattern-matching the prefix. A prefix allowlist has to guess at
   every legitimate shape a relative path can take — and a bare
   "static/projects/x.png" doesn't look like any of them, so it silently
   becomes "#" and the image breaks. Resolving is both stricter about what it
   rejects (javascript:, data:, anything exotic, however it is spelled or
   padded) and correct about what it allows. */
const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

export function safeHref(url) {
	if (typeof url !== "string") return "#";
	try {
		const resolved = new URL(url, document.baseURI);
		return ALLOWED_PROTOCOLS.includes(resolved.protocol) ? url : "#";
	} catch {
		return "#";
	}
}

/**
 * h('a', { class: 'card', href: '/x', text: 'hello' }, ...children)
 * Keys starting with `--` are set as custom properties, `on*` as listeners.
 */
export function h(tag, props = {}, ...children) {
	const el = document.createElement(tag);

	for (const [key, value] of Object.entries(props)) {
		if (value == null || value === false) continue;

		if (key === "class") el.className = value;
		else if (key === "text") el.textContent = value;
		else if (key === "href" || key === "src") el.setAttribute(key, safeHref(value));
		else if (key.startsWith("--")) el.style.setProperty(key, value);
		else if (key.startsWith("on") && typeof value === "function") {
			el.addEventListener(key.slice(2).toLowerCase(), value);
		} else if (value === true) el.setAttribute(key, "");
		else el.setAttribute(key, value);
	}

	el.append(...children.flat().filter((c) => c != null && c !== false));
	return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
