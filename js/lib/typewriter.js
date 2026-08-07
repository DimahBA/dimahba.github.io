import { prefersReducedMotion, wait } from "./motion.js";

/* A typewriter that never touches innerHTML.

   Copy is supplied as a list of runs — `[{ t: 'plain ' }, { t: 'bold', b: true }]`
   — so emphasis is real markup built with createElement, typed into text nodes
   character by character. The old implementation typed a plain string and then
   swapped in an HTML string at the end, which meant every piece of formatted
   copy went through innerHTML.

   Every animation is cancellable: each call bumps a generation counter and
   bails the moment it sees it has been superseded. */

const asRuns = (copy) => (typeof copy === "string" ? [{ t: copy }] : copy);

export class Typewriter {
	constructor(
		target,
		caret,
		{ speed = 22, eraseSpeed = 11, pause = 300, caretOnIdle = true } = {},
	) {
		this.el = target;
		this.caret = caret;
		this.speed = speed;
		this.eraseSpeed = eraseSpeed;
		this.pause = pause;
		/* Whether the caret keeps blinking once the line has landed. The café
		   intro wants it to — it is about to erase and type the next line, so
		   it is still mid-thought. The Q&A box does not: there the caret going
		   out is the signal that she has finished and it is your turn. */
		this.caretOnIdle = caretOnIdle;
		this.generation = 0;
		this.nodes = [];
	}

	stop() {
		this.generation += 1;
	}

	caretOn(on) {
		this.caret?.classList.toggle("is-on", on);
	}

	clear() {
		this.stop();
		this.el.replaceChildren();
		this.nodes = [];
		this.caretOn(false);
	}

	/** Render instantly, with no animation at all. */
	show(copy) {
		this.stop();
		this.#build(asRuns(copy), true);
		this.caretOn(false);
	}

	/** Type `copy` in. Resolves true if it finished, false if superseded. */
	async type(copy) {
		if (prefersReducedMotion()) {
			this.show(copy);
			return true;
		}

		const generation = (this.generation += 1);
		const runs = this.#build(asRuns(copy), false);
		this.caretOn(true);

		for (const { node, text } of runs) {
			for (const char of text) {
				if (generation !== this.generation) return false;
				node.data += char;
				const isPunctuation = ".,!?;:".includes(char);
				await wait(
					isPunctuation ? this.pause : this.speed + Math.random() * 18,
				);
			}
		}

		const finished = generation === this.generation;
		if (finished && !this.caretOnIdle) this.caretOn(false);
		return finished;
	}

	/** Delete everything currently shown, last character first. */
	async erase() {
		if (prefersReducedMotion()) {
			this.clear();
			return true;
		}

		const generation = (this.generation += 1);
		/* Back on for the duration: a line rubbing itself out with no cursor
		   in front of it looks like a rendering fault rather than an edit. */
		this.caretOn(true);

		for (let i = this.nodes.length - 1; i >= 0; i -= 1) {
			const node = this.nodes[i];
			while (node.data.length) {
				if (generation !== this.generation) return false;
				node.data = node.data.slice(0, -1);
				await wait(this.eraseSpeed);
			}
		}

		const finished = generation === this.generation;
		if (finished && !this.caretOnIdle) this.caretOn(false);
		return finished;
	}

	/* Lays out the element tree up front and returns one text node per run,
	   either pre-filled (instant) or empty and ready to be typed into. */
	#build(runs, filled) {
		this.el.replaceChildren();
		this.nodes = [];

		return runs.map((run) => {
			const node = document.createTextNode(filled ? run.t : "");
			const sink = run.b ? document.createElement("strong") : this.el;
			sink.append(node);
			if (sink !== this.el) this.el.append(sink);
			this.nodes.push(node);
			return { node, text: run.t };
		});
	}
}
