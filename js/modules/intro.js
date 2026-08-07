import { intro } from "../data/qa.js";

/* The café intro, paced by the reader rather than by a timer.

   She types a line, the caret goes out, the ▼ comes up, and the next line
   only arrives when you ask for it. Clicking while she is still typing skips
   to the end of that line — the first thing anyone who has met a dialogue
   box before will try. The last line has no ▼: there is nothing after it.

   `token` is bumped by every transition and checked after every await, so
   scrolling away mid-sentence stops the sequence instead of leaving a second
   one racing it. */
/* Lay every chunk into the line's grid cell as an invisible copy, so the cell
   is sized for the longest thing she says before she has said any of it. The
   panel then keeps one height while lines are typed, erased and rewrapped
   instead of jumping each time a line takes an extra row. Built from the same
   runs the typewriter types, and with the same markup, so the measurement is
   of the real thing. */
function reserveHeight(line) {
	if (!line) return;

	for (const runs of intro) {
		const ghost = document.createElement("span");
		ghost.className = "saypanel__ghost";

		for (const { t, b } of runs) {
			ghost.append(
				b ? Object.assign(document.createElement("strong"), { textContent: t }) : t,
			);
		}

		line.append(ghost);
	}
}

export function createIntro(typewriter, { panel, next, line: lineEl } = {}) {
	let index = 0;
	let token = 0;

	reserveHeight(lineEl);

	/* idle — nothing in flight · typing — mid-line · waiting — ▼ is up
	   done — the last line has landed and that is the end of it */
	let state = "idle";

	const isLast = (i) => i === intro.length - 1;

	function setState(value) {
		state = value;
		if (next) next.hidden = value !== "waiting";
		panel?.classList.toggle("is-typing", value === "typing");
		panel?.classList.toggle("is-ready", value === "waiting");
	}

	async function line(i) {
		const mine = (token += 1);
		index = i;
		setState("typing");

		const finished = await typewriter.type(intro[i]);
		if (!finished || mine !== token) return;
		setState(isLast(i) ? "done" : "waiting");
	}

	async function advance() {
		if (state === "typing") {
			typewriter.show(intro[index]);
			setState(isLast(index) ? "done" : "waiting");
			return;
		}
		if (state !== "waiting") return;

		const mine = (token += 1);
		setState("idle");
		if (!(await typewriter.erase()) || mine !== token) return;
		line(index + 1);
	}

	function play() {
		if (state !== "idle") return;
		line(0);
	}

	function stop() {
		token += 1;
		setState("idle");
		typewriter.stop();
	}

	function reset() {
		stop();
		index = 0;
		typewriter.clear();
	}

	/* One handler for the whole panel: the ▼ is a real button so it can be
	   tabbed to and pressed, and its click bubbles up to here rather than
	   being wired separately, so there is only ever one path through. */
	panel?.addEventListener("click", advance);

	return { play, stop, reset };
}
