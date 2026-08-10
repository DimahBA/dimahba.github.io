/* A cat walks where the cursor goes.

   This used to be a vendored library that stamped a paw whenever the pointer
   had moved 40px, rotated to the angle of that single hop, and dropped the
   oldest print once more than four were on screen. Three faults, all of them
   visible: raw pointer samples are noisy so the angles twitched, the rhythm
   was the same whether you drifted or flung the mouse across the page, and a
   print disappeared because a newer one had arrived rather than because any
   time had passed.

   So: not a stamp, a cat. A body position chases the cursor with a little
   lag, which low-passes the path; the heading comes from that smoothed body's
   own motion, so it swings rather than snaps. Distance travelled — never a
   timer — advances a gait, and the gait says which foot lands, offset
   sideways from the line of travel and behind the body. Faster cursor, longer
   stride and narrower track, and past a threshold the walk breaks into a
   bound: front pair, back pair, a gap of suspension.

   Each print then lives LIFE seconds and fades on its own clock. Nothing is
   ever removed because something newer arrived.

   The whole thing is meant to be caught out of the corner of an eye, so it is
   small, faint, and thinly spread — and over anything clickable the cat stops
   walking altogether, because a decoration has no business crawling across
   the control someone is reaching for.

   Two canvases rather than DOM nodes. One blended `multiply` carries the ink,
   which is what shows on the cream pages; one blended `screen` carries the
   lift, which is what shows over the slate screens where dark ink would be
   invisible. Both paint from the same list on the same frame, so the print
   presses into whatever is underneath it instead of sitting on top of the
   page. Blending is also why they are two bare canvases pinned to <body>
   rather than one wrapped, transformed layer: a transform — or an opacity, or
   a filter — on an ancestor isolates the group and the blend stops reaching
   the page. */

import { clamp, prefersReducedMotion, reduceMotionQuery } from "../lib/motion.js";

/* Only mount where there is a real cursor to follow. A touch pointer emits
   `pointermove` mid-drag, so without this every finger-scroll would paint a
   trail down the page. The media query answers for the device and the
   pointerType check answers for the individual event, which is the case a
   hybrid laptop — hover: hover, and a touch screen — needs. */
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/* Seconds and CSS pixels throughout. */
const LIFE = 1.4; // a print, first contact to gone
const PRESS = 0.09; // the stamp itself
const SETTLE = 0.14; // the overshoot easing back out of it
const BLOOM = 0.46; // the ground's own reaction, which dies early

const BODY_TAU = 0.07; // how far the cat lags the cursor
const HEADING_TAU = 0.1;
const SPEED_TAU = 0.14;

/* The speed range the gait is mapped across: a drift, and flat out. */
const SLOW = 140;
const FAST = 1500;

/* Above BREAK the walk becomes a bound, below MEND it comes back. The two
   thresholds are apart on purpose — one number would flip the gait back and
   forth every frame for anyone hovering right at it. */
const BREAK = 900;
const MEND = 620;

/* The stride is deliberately longer than the cat: prints that come thick and
   fast are a distraction rather than a joke, and a long stride keeps only a
   handful on screen at once without touching the clock that fades them. */
const STRIDE_SLOW = 46;
const STRIDE_FAST = 120;
const TRACK_SLOW = 18; // distance between the left and right lines of prints
const TRACK_FAST = 12;
const BODY_SLOW = 40; // front paws to back paws
const BODY_FAST = 58;
const LEAD = 13; // how far behind the cursor the front paws land

const PAW_SIZE = 22;
const HIND_SIZE = 0.9;

/* Where the next foot lands, as a multiple of the current stride, and which
   foot it is. The walk is the four-beat diagonal sequence every quadruped
   uses at low speed. The bound puts the front pair down almost together, then
   the back pair, then leaves a long gap where the cat is off the ground. */
const WALK = [
	{ left: true, front: true, gap: 1 },
	{ left: false, front: false, gap: 1 },
	{ left: false, front: true, gap: 1 },
	{ left: true, front: false, gap: 1 },
];

const BOUND = [
	{ left: true, front: true, gap: 1.3 },
	{ left: false, front: true, gap: 0.22 },
	{ left: true, front: false, gap: 0.58 },
	{ left: false, front: false, gap: 0.22 },
];

/* Ink is warm brown rather than black: pure black multiplied over cream reads
   as grime, the same reason the shadows in base.css are tinted. Lift is a dim
   warm grey, which screened over cream is arithmetically almost nothing and
   over slate is a soft pale print. */
const INK = { className: "paw-trail--ink", rgb: "74 56 40", alpha: 0.34 };
const LIFT = { className: "paw-trail--lift", rgb: "168 158 138", alpha: 0.38 };

/* The paw is drawn in a unit box and scaled up, so one sprite serves every
   size. Sprite is twice the paw to leave room for the bloom around it. */
const PAW_UNIT = 48;
const SPRITE = 96;
const EDGE = 0.6; // how far the ink creeps past the outline

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (u) => 1 - (1 - u) ** 3;

/* Toes pointing at -y, metacarpal pad below them, and deliberately not
   symmetric: the outer toes sit lower and wider than the inner pair, which is
   what makes a mirrored print read as the other foot rather than the same one
   again. */
function drawPaw(ctx) {
	ctx.beginPath();
	ctx.moveTo(0.02, 0.0);
	ctx.bezierCurveTo(0.22, 0.01, 0.32, 0.14, 0.31, 0.26);
	ctx.bezierCurveTo(0.3, 0.4, 0.18, 0.47, 0.01, 0.46);
	ctx.bezierCurveTo(-0.17, 0.47, -0.3, 0.39, -0.31, 0.25);
	ctx.bezierCurveTo(-0.32, 0.13, -0.2, 0.01, 0.02, 0.0);
	ctx.closePath();
	ctx.fill();

	const toes = [
		[-0.29, -0.05, 0.145, 0.185, -0.4],
		[-0.1, -0.2, 0.15, 0.195, -0.14],
		[0.1, -0.21, 0.15, 0.195, 0.14],
		[0.28, -0.07, 0.14, 0.18, 0.38],
	];

	for (const [x, y, rx, ry, rot] of toes) {
		ctx.beginPath();
		ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
		ctx.fill();
	}
}

/* The print, blurred a little so its edge bites into the page instead of
   sitting on it as a cut-out. Drawn crisp first and blurred in a second pass
   at the identity transform, because `ctx.filter` lengths are in the current
   coordinate system and the first pass is scaled by 48. */
function buildPrint(rgb, dpr) {
	const px = Math.round(SPRITE * dpr);

	const crisp = document.createElement("canvas");
	crisp.width = px;
	crisp.height = px;
	const cc = crisp.getContext("2d");
	cc.scale(dpr, dpr);
	cc.translate(SPRITE / 2, SPRITE / 2);
	cc.scale(PAW_UNIT, PAW_UNIT);
	cc.fillStyle = `rgb(${rgb})`;
	drawPaw(cc);

	const soft = document.createElement("canvas");
	soft.width = px;
	soft.height = px;
	const sc = soft.getContext("2d");
	sc.filter = `blur(${EDGE * dpr}px)`;
	sc.drawImage(crisp, 0, 0);
	return soft;
}

/* The ground reacting: a soft round darkening under the paw at the moment it
   lands, gone long before the print is. */
function buildBloom(rgb, dpr) {
	const px = Math.round(SPRITE * dpr);
	const canvas = document.createElement("canvas");
	canvas.width = px;
	canvas.height = px;

	const ctx = canvas.getContext("2d");
	const mid = px / 2;
	const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
	gradient.addColorStop(0, `rgb(${rgb} / 0.5)`);
	gradient.addColorStop(0.4, `rgb(${rgb} / 0.22)`);
	gradient.addColorStop(1, `rgb(${rgb} / 0)`);
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, px, px);
	return canvas;
}

/* Anything the cursor is over to use rather than to look at. `cursor` is an
   inherited property, so reading it off the event target also answers for the
   heading and the photograph inside a card that made itself clickable, and
   for anything a stylesheet marks as clickable without saying so in HTML. The
   selector then covers the controls browsers give a plain arrow to. */
const CLICKABLE =
	'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], [contenteditable]';

function isClickable(node) {
	if (!(node instanceof Element)) return false;
	if (node.closest(CLICKABLE)) return true;
	return getComputedStyle(node).cursor === "pointer";
}

function createLayer({ className, rgb, alpha }) {
	const canvas = document.createElement("canvas");
	canvas.className = `paw-trail ${className} is-quiet`;
	canvas.setAttribute("aria-hidden", "true");
	document.body.append(canvas);
	return { canvas, ctx: canvas.getContext("2d"), rgb, alpha, print: null, bloom: null };
}

function createTrail() {
	const layers = [createLayer(INK), createLayer(LIFT)];
	const paws = [];

	let dpr = 0;
	let viewW = 0;
	let viewH = 0;
	let quiet = true;

	/* The cursor, and the cat chasing it. */
	let cursorX = 0;
	let cursorY = 0;
	let bodyX = 0;
	let bodyY = 0;
	let headX = 0;
	let headY = -1;
	let speed = 0;
	let started = false;

	/* Whether the cursor is currently on something clickable, and the element
	   that answer was worked out from. */
	let held = false;
	let judged = null;

	let travelled = 0;
	let nextGap = STRIDE_SLOW;
	let gait = WALK;
	let step = 0;

	let frame = 0;
	let last = 0;

	/* Called on resize and again before every paint. Sizing a canvas clears
	   it, so it only touches one that is actually the wrong size — and it has
	   to be checked rather than only listened for: a tab that loads in the
	   background has a zero-sized viewport and gets no resize event when it
	   is finally shown. */
	function resize() {
		const next = Math.min(window.devicePixelRatio || 1, 2);
		if (next === dpr && window.innerWidth === viewW && window.innerHeight === viewH) {
			return;
		}

		const rebuild = next !== dpr;
		dpr = next;
		viewW = window.innerWidth;
		viewH = window.innerHeight;

		for (const layer of layers) {
			layer.canvas.width = Math.round(viewW * dpr);
			layer.canvas.height = Math.round(viewH * dpr);
			layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (rebuild) {
				layer.print = buildPrint(layer.rgb, dpr);
				layer.bloom = buildBloom(layer.rgb, dpr);
			}
		}
	}

	function setQuiet(next) {
		if (next === quiet) return;
		quiet = next;
		for (const layer of layers) layer.canvas.classList.toggle("is-quiet", quiet);
	}

	/* One foot down. `back` is how far behind the body it belongs — the loop
	   below hands over whatever distance was left when the stride completed,
	   so a long frame lands the print where the foot actually was rather than
	   bunching it up at the body. */
	function place(foot, pace, back) {
		const perpX = -headY;
		const perpY = headX;

		const track = lerp(TRACK_SLOW, TRACK_FAST, pace) * (foot.front ? 1 : 0.85);
		const along = LEAD + back + (foot.front ? 0 : lerp(BODY_SLOW, BODY_FAST, pace));
		const side = (foot.left ? -0.5 : 0.5) * track;

		/* Real tracks are never a ruled line. */
		const wobble = (Math.random() - 0.5) * 3;
		const splay = (foot.left ? -1 : 1) * (foot.front ? 0.1 : 0.04);

		paws.push({
			x: bodyX + perpX * side - headX * along + perpX * wobble,
			y: bodyY + perpY * side - headY * along + perpY * wobble,
			/* The sprite's toes point at -y; +90° turns them into the heading. */
			angle: Math.atan2(headY, headX) + Math.PI / 2 + splay + (Math.random() - 0.5) * 0.14,
			size: PAW_SIZE * (foot.front ? 1 : HIND_SIZE) * (0.96 + Math.random() * 0.08),
			mirror: foot.left ? -1 : 1,
			/* A cat at speed skims; a cat picking its way leans in. */
			weight: lerp(1, 0.82, pace),
			age: 0,
		});
	}

	function walk(dt) {
		/* Exponential smoothing, framed as a time constant rather than a
		   per-frame fraction so the feel does not change with refresh rate. */
		const bodyK = 1 - Math.exp(-dt / BODY_TAU);
		const moveX = (cursorX - bodyX) * bodyK;
		const moveY = (cursorY - bodyY) * bodyK;
		bodyX += moveX;
		bodyY += moveY;

		const moved = Math.hypot(moveX, moveY);
		speed += (moved / dt - speed) * (1 - Math.exp(-dt / SPEED_TAU));

		/* Below a hair of movement the direction is noise, so keep the last
		   heading. Smoothing the vector and renormalising sidesteps the
		   wrap-around that smoothing an angle would run into at ±180°. */
		if (moved > 0.05) {
			const headK = 1 - Math.exp(-dt / HEADING_TAU);
			headX += (moveX / moved - headX) * headK;
			headY += (moveY / moved - headY) * headK;
			const length = Math.hypot(headX, headY) || 1;
			headX /= length;
			headY /= length;
		}

		/* Over something the cursor is there to use, the cat stands still. The
		   accumulator is emptied rather than paused, so leaving a button does
		   not dump the stride that built up while crossing it. */
		if (held) {
			travelled = 0;
			return;
		}

		travelled += moved;

		const pace = clamp((speed - SLOW) / (FAST - SLOW), 0, 1);
		const stride = lerp(STRIDE_SLOW, STRIDE_FAST, pace);

		while (travelled >= nextGap) {
			travelled -= nextGap;
			place(gait[step], pace, travelled);

			const wanted = speed > BREAK ? BOUND : speed < MEND ? WALK : gait;
			if (wanted !== gait) {
				gait = wanted;
				step = 0;
			} else {
				step = (step + 1) % gait.length;
			}
			nextGap = stride * gait[step].gap;
		}
	}

	function paint() {
		resize();

		for (const layer of layers) {
			const { ctx } = layer;
			ctx.clearRect(0, 0, viewW, viewH);

			for (const paw of paws) {
				const { age } = paw;

				/* Press, hold, go. The fade is slow at first and gathers
				   pace, so a print reads as still there right up until it
				   isn't, and the ink creeps a fraction wider as it goes. */
				const u = (age - PRESS) / (LIFE - PRESS);
				const alpha =
					age < PRESS ? easeOut(age / PRESS) : 1 - u ** 2.4;
				const pop =
					age < PRESS
						? lerp(0.84, 1.05, easeOut(age / PRESS))
						: lerp(1.05, 1, easeOut(Math.min(1, (age - PRESS) / SETTLE)));
				const scale = pop + Math.max(0, u) * 0.06;

				ctx.save();
				ctx.translate(paw.x, paw.y);
				ctx.rotate(paw.angle);

				if (age < BLOOM) {
					const b =
						age < PRESS
							? age / PRESS
							: (1 - (age - PRESS) / (BLOOM - PRESS)) ** 2;
					const spread = paw.size * (0.7 + easeOut(age / BLOOM) * 0.9);
					ctx.globalAlpha = b * layer.alpha * paw.weight * 0.45;
					ctx.drawImage(layer.bloom, -spread, -spread, spread * 2, spread * 2);
				}

				const reach = paw.size * scale;
				ctx.scale(paw.mirror, 1);
				ctx.globalAlpha = alpha * layer.alpha * paw.weight;
				ctx.drawImage(layer.print, -reach, -reach, reach * 2, reach * 2);
				ctx.restore();
			}
		}
	}

	function tick(now) {
		frame = 0;
		const dt = clamp((now - last) / 1000, 0.001, 0.05);
		last = now;

		walk(dt);

		let live = 0;
		for (const paw of paws) {
			paw.age += dt;
			if (paw.age < LIFE) paws[live++] = paw;
		}
		paws.length = live;

		if (live > 0) {
			setQuiet(false);
			paint();
		} else {
			setQuiet(true);
		}

		/* Keep running while there is something to draw or the cat is still
		   catching up; otherwise stop dead and let `pointermove` restart us.
		   An idle page should not be holding a frame callback open. */
		const chasing = Math.hypot(cursorX - bodyX, cursorY - bodyY) > 0.5;
		if (live > 0 || chasing) frame = requestAnimationFrame(tick);
	}

	function run() {
		if (frame) return;
		last = performance.now();
		frame = requestAnimationFrame(tick);
	}

	function onPointerMove(event) {
		if (event.pointerType && event.pointerType !== "mouse") return;

		cursorX = event.clientX;
		cursorY = event.clientY;

		/* Resolving a style is not free and a moving cursor sends a lot of
		   events, but nearly all of them land on the element the last one did.
		   The canvases take no pointer events, so the target is whatever is
		   really under the cursor. */
		if (event.target !== judged) {
			judged = event.target;
			held = isClickable(judged);
		}

		/* A cursor that arrives from off-screen, or crosses a desktop in one
		   sample, has not walked the distance in between. Put the cat under
		   it and start the stride again from there. */
		if (!started || Math.hypot(cursorX - bodyX, cursorY - bodyY) > 320) {
			started = true;
			bodyX = cursorX;
			bodyY = cursorY;
			travelled = 0;
			nextGap = STRIDE_SLOW;
			speed = 0;
		}

		run();
	}

	resize();
	window.addEventListener("resize", resize, { passive: true });
	window.addEventListener("pointermove", onPointerMove, { passive: true });

	return function destroy() {
		if (frame) cancelAnimationFrame(frame);
		window.removeEventListener("resize", resize);
		window.removeEventListener("pointermove", onPointerMove);
		for (const layer of layers) layer.canvas.remove();
		paws.length = 0;
	};
}

/**
 * Starts the paw trail, if this visitor should have one.
 * Returns a teardown function.
 */
export function initPawTrail() {
	const fine = window.matchMedia(FINE_POINTER);
	if (!fine.matches || prefersReducedMotion()) return () => {};

	const destroy = createTrail();

	/* Turning reduced motion on in the OS — or docking a laptop to a touch
	   screen — should take effect there and then, not at the next reload.
	   `destroy` puts the page back exactly as it was, so the honest response
	   to either query changing is to run this from the top again: it re-reads
	   both and starts nothing if either now says no. `dispose` is what the
	   caller ends up cancelling, whichever run is the live one by then. */
	const teardown = () => {
		reduceMotionQuery.removeEventListener("change", onPreferenceChange);
		fine.removeEventListener("change", onPreferenceChange);
		destroy();
	};

	let dispose = teardown;
	function onPreferenceChange() {
		teardown();
		dispose = initPawTrail();
	}
	reduceMotionQuery.addEventListener("change", onPreferenceChange);
	fine.addEventListener("change", onPreferenceChange);

	return () => dispose();
}
