import { clamp, prefersReducedMotion } from "../lib/motion.js";

/* ==========================================================================
   The table.

   Eight sheets of paper thrown onto a desk. They fall in scattered, you drag
   them around, and a button tosses them into a fresh arrangement.

   The division of labour is the whole design:

     JS   computes three numbers per card — --x, --y, --rot — and nothing else.
     CSS  animates between whatever those numbers happen to be.

   So there is no physics loop. Falling in and tossing are plain CSS
   transitions with a per-card delay; the only time this module runs per frame
   is while a pointer is actually down, and then it does one style write.

   The predecessor tried to be a paper simulator — throw projection, a spring,
   elastic bounds, velocity estimation, lean and spin from a grab lever, a 3D
   tilt, a saved z-index ladder — and six of those systems could write the
   card's angle. Every visible bug lived in a handoff between two of them.
   Hence the rule kept here without exception: one owner per property.
   ========================================================================== */

const DRAG_PX = 5; // pointer slop before a click becomes a drag
const CLICK_GUARD = 250; // ms during which the post-drag click is swallowed

/* Never upside down, never vertical, and in fact much tighter than either —
   past about 15° a rectangle stops reading as "dropped" and starts reading as
   "broken layout". The dashed stitch also aliases badly at steep angles. */
const ROT_MAX = 12;

/* Slot pitch as a fraction of the card: how far apart neighbouring slots sit.
   0.7 means neighbours overlap by ~30% of a card. This is a pile of paper
   somebody tossed down, not a layout — cards are meant to cover each other,
   including some of each other's text. */
const PITCH_X = 0.7;
const PITCH_Y = 0.72;
const PITCH_MIN_X = 0.55;
const PITCH_MIN_Y = 0.58;

/* The vertical cap, raised, for a table taller than it is wide.

   On a phone the grid the solver picks is two columns by four rows, and four
   rows overlapping by 28% of a card come to about three quarters of the table
   — so the pile sat in a band across the middle with an eighth of the screen
   empty above it and another below. On a desk that cap is doing real work:
   it is what stops a roomy window pulling the pile apart into a grid. On a
   portrait one there is no width for a grid to form across, so the rows can
   have the room and the pile can be as tall as the table it is on. */
const PITCH_Y_TALL = 0.95;

/* Jitter off the slot centre, as a fraction of the card, and the whole reason
   the board does not read as a grid. The slots exist only to spread the cards
   over the table without clumping or leaving holes; this is what hides them.

   The budget is reserved inside solve(), so a jittered card is guaranteed to
   land on the stage. Reserving it is what stops the outermost cards from
   being clamped against the edges — and a row of cards all stopped dead on
   the same line is exactly the regularity the jitter is there to destroy. */
const JITTER_X = 0.18;
const JITTER_Y = 0.2;

const CARD_MAX_W = 424; // 26.5rem — the authored desktop width, never exceeded
const CARD_MIN_W = 240; // a floor on legibility, not on geometry — see solve()

/* The same floor, said again for stages too small for the first one to mean
   anything. 240px is a reasonable smallest card on a desk; on a 375px phone it
   is two thirds of the table, and a floor that never yields would leave every
   grid overflowing and the solver picking between arrangements that all hang
   off the edge. Below about 460px of stage the floor becomes a fraction of the
   room instead — the same intent, that a card stays a readable object rather
   than a stamp, measured against the space there actually is.

   Above half the table on purpose, which means two columns of them do not fit
   side by side and the solver knows it. That is not a miss: the scatter clamps
   every card onto the table by its own rotated box, so what a floor this size
   buys is a card you can read and a pile that overlaps more — which is what a
   handful of paper dropped on a small table does anyway. Push it much past
   here and the overlap stops being a pile and starts being a stack. */
const CARD_MIN_FRAC = 0.52;
const CARD_RATIO = 424 / 304; // width / height, from the authored card size

/* ---- ballistics ---------------------------------------------------------
   A toss is not an animation to a destination, it is a throw. Every card is
   given a launch velocity and then nothing touches it again: gravity does the
   rest, it accelerates, it hits the table, it bounces, it settles.

   That is the whole difference from what was here before, which eased each
   card to its spot on a staggered delay and read — correctly — as the board
   arranging itself one card at a time rather than as anything being thrown.

   Nothing is staggered now. Every card launches on the same frame; they land
   at different moments because they were thrown from different heights with
   different velocities, which is what actually happens when you toss a stack
   of paper in the air. */
const G = 2600; // px/s². Tuned by eye: real gravity in CSS pixels looks slow.
const RESTITUTION = 0.22; // fraction of impact speed a bounce keeps
const BOUNCE_MIN = 90; // px/s — below this a contact is a stop, not a bounce
const SKID = 0.45; // horizontal speed kept through a bounce
const TUMBLE = 0.4; // spin reversed and damped by a bounce

/* Flight time of a toss. Longer than the free-fall time for the same drop,
   which is exactly what makes the solved launch velocity point *upwards* —
   the card is thrown up and comes down, rather than sliding to its spot. */
const TOSS_T = [0.5, 0.8];
/* Drop height of the entrance, as a multiple of the stage. The spread is what
   breaks the landings apart without a queue. */
const DROP_H = [0.6, 1.5];

const MAX_DT = 1 / 30; // a late frame steps 33ms, never the whole stall

const RAD = Math.PI / 180;

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/* Fisher–Yates. Used to shuffle slot assignment, so that pressing toss twice
   never produces the same board twice — with a fixed assignment the jitter
   alone is too small to read as a new arrangement. */
function shuffle(list) {
	for (let i = list.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[list[i], list[j]] = [list[j], list[i]];
	}
	return list;
}

export function initCards({ board, tossButton }) {
	if (!board) return null;

	/* Reduced motion gets the plain stacked board, which is what the markup
	   already is with no JS at all — so there is nothing to set up and nothing
	   to tear down.

	   Touch used to be turned away here too, and it no longer is. The reason
	   given was that claiming the drag gesture would make the page
	   un-scrollable, and that reason was already covered twice over further
	   down: `onDown` returns immediately for `pointerType: "touch"`, so a
	   finger never starts a drag, and the card's `touch-action: manipulation`
	   never claims the scroll. What a phone was losing was the throw — the one
	   part of this board that is worth watching and that costs a touch reader
	   nothing. So a phone now gets the table, the fall and the toss button;
	   the drag stays a mouse gesture. */
	if (prefersReducedMotion()) {
		tossButton?.remove();
		return null;
	}

	const controller = new AbortController();
	const { signal } = controller;

	const cards = [...board.querySelectorAll(".card")].map((el, i) => ({
		el,
		i,
		x: 0,
		y: 0,
		rot: 0,
		w: 0,
		h: 0,
		/* Flight state. Untouched except by launch() and fly(). */
		vx: 0,
		vy: 0,
		vrot: 0,
		floorY: 0,
		flying: false,
		pointerId: null,
		from: null, // pointer position at grab
		base: null, // card position at grab
		dragging: false,
		clickGuard: 0,
		/* The z ladder is authored inline in the markup, and JS overwrites it on
		   the same inline style — so it cannot simply be removed to restore the
		   default. Kept here for teardown. */
		baseZ: el.style.getPropertyValue("--z"),
	}));

	if (!cards.length) return null;

	let stage = { w: 0, h: 0 };
	let topZ = cards.length;
	let dealt = false;
	let frame = null;
	let lastTime = 0;

	board.classList.add("is-stage");
	/* The section owns the one-viewport height and the trimmed chrome around
	   the stage, so it needs its own hook — the board cannot style upwards. */
	const section = board.closest(".board-section");
	section?.classList.add("is-table");

	for (const card of cards) bind(card);

	/* Measured once here and re-measured on resize. Reading it now — before
	   anything is positioned — is what makes the first layout correct rather
	   than a frame late. */
	measure();
	layout();

	const resizeObserver = new ResizeObserver(() => {
		measure();
		/* Cards the visitor has deliberately placed are left alone; they are
		   only pulled back if the new stage would leave them off the table. */
		layout({ keepPlaced: true });
	});
	resizeObserver.observe(board);

	tossButton?.addEventListener("click", () => toss(), { signal });

	/* If reduced motion is switched on while the page is open, hand the board
	   back to CSS rather than leaving a live drag surface behind. */
	window
		.matchMedia("(prefers-reduced-motion: reduce)")
		.addEventListener("change", (e) => e.matches && destroy(), { signal });

	return { deal, toss, destroy };

	/* ------------------------------------------------------------ geometry */

	function measure() {
		const rect = board.getBoundingClientRect();
		stage = { w: rect.width, h: rect.height };
	}

	/* Solve one candidate grid for the largest card that fits the stage, and
	   report how good the fit is.

	   The maths accounts for rotation: a card tilted by ROT_MAX has a bounding
	   box wider and taller than itself, and it is that box — not the card —
	   that has to clear the edge of the stage. */
	function solve(cols, rows, ratio) {
		const cos = Math.cos(ROT_MAX * RAD);
		const sin = Math.sin(ROT_MAX * RAD);

		/* Bounding box of a rotated card, expressed as multiples of its width
		   (height is width / ratio), plus the jitter budget: the outermost
		   card can wander half a jitter past its slot in each direction, and
		   that has to be paid for here rather than clawed back by a clamp. */
		const boxW = cos + sin / ratio + 2 * JITTER_X;
		const boxH = sin + cos / ratio + (2 * JITTER_Y) / ratio;

		const byWidth = stage.w / (boxW + (cols - 1) * PITCH_X);
		const byHeight = stage.h / (boxH + ((rows - 1) * PITCH_Y) / ratio);

		const minW = Math.min(CARD_MIN_W, stage.w * CARD_MIN_FRAC);
		const w = clamp(Math.min(byWidth, byHeight), minW, CARD_MAX_W);
		const h = w / ratio;

		/* Spread the cards across whatever room actually remains rather than
		   leaving the slack as margin — but never further apart than the
		   nominal pitch, or a roomy window pulls the pile into a grid. */
		const spanX = w * boxW;
		const spanY = w * boxH;
		const pitchX =
			cols > 1
				? clamp((stage.w - spanX) / (cols - 1), w * PITCH_MIN_X, w * PITCH_X)
				: 0;
		const pitchYMax = stage.h > stage.w ? PITCH_Y_TALL : PITCH_Y;
		const pitchY =
			rows > 1
				? clamp((stage.h - spanY) / (rows - 1), h * PITCH_MIN_Y, h * pitchYMax)
				: 0;

		const usedW = spanX + (cols - 1) * pitchX;
		const usedH = spanY + (rows - 1) * pitchY;

		/* CARD_MIN_W is a floor on legibility, not on geometry, so a grid can
		   come back too big for the stage. Measuring by how much lets a grid
		   that genuinely fits always beat one that only fits on paper. */
		const overflow =
			Math.max(0, usedW - stage.w) + Math.max(0, usedH - stage.h);
		const waste =
			Math.max(0, stage.w - usedW) * Math.max(0, stage.h - usedH);

		return {
			cols,
			rows,
			w,
			h,
			pitchX,
			pitchY,
			usedW,
			usedH,
			spanX,
			spanY,
			overflow,
			waste,
		};
	}

	/* Every plausible grid, solved, and the best one wins. This is what lets
	   the board adapt to a portrait window, a half-width window or an ultrawide
	   one without a single breakpoint: 4×2 wins on a laptop, 2×4 on a tall
	   narrow window, and nobody had to author either. */
	function bestGrid(ratio) {
		const count = cards.length;
		const options = [];

		for (let cols = 1; cols <= count; cols += 1) {
			const rows = Math.ceil(count / cols);
			/* Reject grids with a lot of empty slots — a 5×2 for eight cards
			   leaves two holes, and holes read as a mistake rather than as
			   scatter. One or two spare is fine and keeps the gap interesting. */
			if (cols * rows > count + Math.max(1, Math.floor(count / 4))) continue;
			options.push(solve(cols, rows, ratio));
		}

		/* Fit first, then the biggest cards, then least dead space. */
		return options.reduce((best, next) => {
			if (next.overflow !== best.overflow) {
				return next.overflow < best.overflow ? next : best;
			}
			if (Math.abs(next.w - best.w) > 0.5) return next.w > best.w ? next : best;
			return next.waste < best.waste ? next : best;
		});
	}

	/* CARD_RATIO is what the design says a card is. What a card *is* depends on
	   its blurb: the longest one runs several lines past the authored height,
	   and the stage sets min-height rather than height because clipping a
	   case-study summary to keep the arithmetic tidy would be the wrong trade.

	   So the fit is solved twice. The first pass uses the authored ratio and
	   commits a trial width; the second re-solves on the ratio the cards
	   actually rendered at. Without it every card is a good deal taller than
	   the maths believes, which quietly eats the vertical jitter budget and
	   pushes the bottom row off the stage — invisible in the arithmetic, very
	   visible on the table.

	   Two forced layouts, on a resize or a toss. Never in a frame loop. */
	function fit() {
		let grid = bestGrid(CARD_RATIO);
		commit(grid);

		const real = grid.w / tallest();
		if (real < CARD_RATIO - 0.02) {
			grid = bestGrid(real);
			commit(grid);
		}
		return grid;
	}

	function commit(grid) {
		board.style.setProperty("--w", `${grid.w.toFixed(1)}px`);
		board.style.setProperty("--h", `${grid.h.toFixed(1)}px`);
	}

	function tallest() {
		let max = 0;
		for (const card of cards) max = Math.max(max, card.el.offsetHeight);
		return max || 1;
	}

	/* One landing spot per card: a slot centre, nudged, with a random angle.
	   Slots are shuffled so the same card lands somewhere new on every toss. */
	function scatter() {
		const grid = fit();
		const { cols, rows, w, h, pitchX, pitchY } = grid;

		const originX = (stage.w - grid.usedW) / 2 + grid.spanX / 2;
		const originY = (stage.h - grid.usedH) / 2 + grid.spanY / 2;

		const slots = [];
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				slots.push({ cx: originX + c * pitchX, cy: originY + r * pitchY });
			}
		}

		/* Shuffled twice over, for two different reasons: the slot order decides
		   which card lands where (so a toss genuinely rearranges rather than
		   re-jittering), and the z ladder is shuffled independently of it. A
		   ladder that tracked position would give the tidy look of a dealt hand,
		   every card overlapping the same way; independent means a card can end
		   up under the two either side of it, which is what a tossed pile of
		   paper actually does. */
		shuffle(slots);
		const stack = shuffle(cards.map((_, i) => i + 1));

		/* `h` is the height the grid was solved for; individual cards still
		   differ from it. One batched read, after the width is committed and
		   before anything is positioned, so the clamp below uses real boxes. */
		const heights = cards.map((card) => Math.max(h, card.el.offsetHeight));

		return slots.slice(0, cards.length).map((slot, i) => {
			const cardH = heights[i];
			const rot = rand(-ROT_MAX, ROT_MAX);
			const cos = Math.abs(Math.cos(rot * RAD));
			const sin = Math.abs(Math.sin(rot * RAD));
			const halfW = (w * cos + cardH * sin) / 2;
			const halfH = (w * sin + cardH * cos) / 2;

			return {
				/* Jitter first, then clamp by this card's own rotated bounding box:
				   a steeply tilted card is bulkier and has to sit further in. The
				   clamp is why the jitter can be applied blind. */
				cx: clamp(
					slot.cx + rand(-w * JITTER_X, w * JITTER_X),
					halfW,
					Math.max(halfW, stage.w - halfW),
				),
				cy: clamp(
					slot.cy + rand(-h * JITTER_Y, h * JITTER_Y),
					halfH,
					Math.max(halfH, stage.h - halfH),
				),
				rot,
				z: stack[i],
				w,
				h: cardH,
			};
		});
	}

	/* How far a card may travel and still lie wholly on the table.

	   A tilted card is bulkier than its own box: rotating about its centre
	   pushes each corner out by (rotated extent − extent) / 2. Clamping to the
	   plain box instead — which is the obvious thing to write — lets a card at
	   x = 0 hang its corner off the left edge, and it is not subtle at 12°.
	   The scatter has always accounted for this; the flight and the drag have
	   to agree with it or a thrown card ends up somewhere a placed card never
	   could. */
	function bounds(card) {
		const cos = Math.abs(Math.cos(card.rot * RAD));
		const sin = Math.abs(Math.sin(card.rot * RAD));
		const overX = (card.w * cos + card.h * sin - card.w) / 2;
		const overY = (card.w * sin + card.h * cos - card.h) / 2;

		return {
			minX: overX,
			maxX: Math.max(overX, stage.w - card.w - overX),
			minY: overY,
			maxY: Math.max(overY, stage.h - card.h - overY),
		};
	}

	/* --------------------------------------------------------------- layout */

	/* Cards are absolutely positioned at the stage's top-left corner, so --x
	   and --y are simply the offset of the card's own top-left. Working in
	   centres and converting here keeps the scatter maths readable. */
	function place(card, spot) {
		card.w = spot.w;
		card.h = spot.h;
		card.x = spot.cx - spot.w / 2;
		card.y = spot.cy - spot.h / 2;
		card.rot = spot.rot;
		/* Placing is instant and absolute — it is what a resize does. Any card
		   still in the air is taken out of it rather than left to fall towards
		   a floor that has since moved. */
		card.flying = false;
		card.vx = card.vy = card.vrot = 0;
		card.el.style.setProperty("--z", String(spot.z));
		topZ = Math.max(topZ, spot.z);
	}

	function layout({ keepPlaced = false } = {}) {
		if (!stage.w || !stage.h) return;

		const spots = scatter();

		for (const [i, card] of cards.entries()) {
			const spot = spots[i];

			/* A card the visitor moved keeps its place across a resize — unless
			   the window shrank out from under it, in which case it is pulled
			   back onto the table rather than left stranded off-screen. */
			if (keepPlaced && card.placed) {
				card.w = spot.w;
				card.h = spot.h;
				const edge = bounds(card);
				card.x = clamp(card.x, edge.minX, edge.maxX);
				card.y = clamp(card.y, edge.minY, edge.maxY);
			} else {
				place(card, spot);
			}

			paint(card);
		}
	}

	/* ------------------------------------------------------------- the throw */

	function deal() {
		if (dealt) return;
		throwAll(true);
	}

	/* One scatter for the landing spots, then every card is launched on the
	   same frame and left alone. Where a card is at any moment after this is
	   decided by gravity, not by a timeline — which is the point. */
	function throwAll(fromAbove) {
		if (!stage.w || !stage.h) return;

		const spots = scatter();

		for (const [i, card] of cards.entries()) {
			if (card.dragging) continue; // a card in the hand is not on the table
			card.placed = false;
			launch(card, spots[i], fromAbove);
		}

		dealt = true;
		board.classList.add("is-dealt");
		run();
	}

	/* A declaration, not `const toss = () =>`. Everything in this module is
	   returned from an object literal near the top of the closure, which runs
	   before any `const` further down has been initialised — an arrow function
	   here throws a temporal-dead-zone ReferenceError on the way out. */
	function toss() {
		/* Pressing toss before the board has ever been dealt should still throw
		   the cards in from above rather than shuffle an empty table. */
		throwAll(!dealt);
	}

	/* Solve the launch that lands this card on its spot in T seconds, under
	   constant gravity. Two lines of secondary-school kinematics, and they are
	   the only place a trajectory is ever decided:

	       x(t) = x₀ + vx·t                    → vx = (x₁ − x₀) / T
	       y(t) = y₀ + vy·t + ½·g·t²           → vy = (y₁ − y₀)/T − ½·g·T

	   Solving for the launch rather than integrating blindly is what keeps the
	   scatter honest: the flight is genuinely uncontrolled once it starts, but
	   the cards still land spread across the table instead of in a heap. */
	function launch(card, spot, fromAbove) {
		card.w = spot.w;
		card.h = spot.h;

		const tx = spot.cx - spot.w / 2;
		const ty = spot.cy - spot.h / 2;

		let time;
		if (fromAbove) {
			/* Dropped from off the top of the table. A random height per card
			   is what makes them land on different beats — no queue, just
			   different distances to fall. */
			card.y = -(stage.h * rand(...DROP_H) + spot.h);
			card.x = tx + rand(-spot.w, spot.w) * 0.35;
			/* Exactly the free-fall time for that height, which makes the
			   solved vy come out at zero: released, not thrown. */
			time = Math.sqrt((2 * (ty - card.y)) / G);
		} else {
			time = rand(...TOSS_T);
		}

		card.vx = (tx - card.x) / time;
		card.vy = (ty - card.y) / time - 0.5 * G * time;

		/* Constant angular velocity, chosen so the card arrives at its resting
		   angle exactly as it touches down. Constant is also the physically
		   right answer: nothing exerts a torque on a body in free fall, so a
		   thrown card turns at a steady rate the whole way over. */
		card.vrot = (spot.rot - card.rot) / time;

		card.floorY = ty;
		card.flying = true;
		card.el.style.setProperty("--z", String(spot.z));
		topZ = Math.max(topZ, spot.z);
	}

	/* --------------------------------------------------------------- flight */

	function run() {
		board.classList.add("is-live");
		if (frame) return;
		lastTime = performance.now();
		frame = requestAnimationFrame(tick);
	}

	function tick(now) {
		/* Clamped, so a late frame steps 33ms rather than the whole stall. A
		   dropped frame should cost a little accuracy, never teleport a card
		   through the table. */
		const dt = Math.min((now - lastTime) / 1000, MAX_DT);
		lastTime = now;

		let busy = false;
		for (const card of cards) {
			if (!card.flying || card.dragging) continue;
			fly(card, dt);
			paint(card);
			busy = busy || card.flying;
		}

		frame = busy ? requestAnimationFrame(tick) : null;
		/* Nothing is moving: drop the compositor hint and stop asking for
		   frames entirely, so an idle board costs nothing. */
		if (!busy) board.classList.remove("is-live");
	}

	function fly(card, dt) {
		card.vy += G * dt;
		card.x += card.vx * dt;
		card.y += card.vy * dt;
		card.rot += card.vrot * dt;

		/* The table has edges. A card thrown past one stops there rather than
		   sailing off the board — and stops where its *rotated* corner meets
		   the edge, which is where a real sheet would. */
		const edge = bounds(card);
		card.x = clamp(card.x, edge.minX, edge.maxX);

		if (card.y < card.floorY || card.vy <= 0) return;

		card.y = card.floorY;

		/* Down for good. Everything stops at once, because nothing is acting on
		   a sheet of paper lying on a table — it does not keep turning after it
		   has come to rest. Whatever angle the flight left it at is the angle
		   it lies at, give or take the clamp below. */
		if (card.vy < BOUNCE_MIN) {
			card.vx = card.vy = card.vrot = 0;
			card.rot = clamp(card.rot, -ROT_MAX, ROT_MAX);
			card.flying = false;
			return;
		}

		/* Contact. Paper keeps almost nothing of the impact, so this is one
		   visible hop and then a scuff, not a bouncing ball. */
		card.vy = -card.vy * RESTITUTION;
		card.vx *= SKID;
		card.vrot *= -TUMBLE;
	}

	/* --------------------------------------------------------------- input */

	function bind(card) {
		const el = card.el;
		const on = (type, handler) => el.addEventListener(type, handler, { signal });

		on("pointerdown", (e) => onDown(card, e));
		on("pointermove", (e) => onMove(card, e));
		on("pointerup", (e) => onUp(card, e));
		on("pointercancel", () => onUp(card, null));
		on("lostpointercapture", () => onUp(card, null));

		on("click", (e) => {
			if (performance.now() >= card.clickGuard) return;
			e.preventDefault();
			e.stopPropagation();
		});

		/* Kills the native link-drag ghost. draggable="false" in the markup
		   covers Firefox; Safari wants the listener too. */
		on("dragstart", (e) => e.preventDefault());
	}

	function onDown(card, e) {
		if (e.pointerType === "touch") return; // fingers scroll the page
		if (!e.isPrimary || e.button !== 0) return; // middle/right → browser
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // open-in-tab

		/* No preventDefault: it suppresses focus and confuses :focus-visible. */
		try {
			card.el.setPointerCapture(e.pointerId);
		} catch {
			/* Capture is an optimisation, not a requirement — without it the
			   drag still tracks, it just stops if the pointer outruns the card.
			   Losing the whole gesture to a thrown exception would be worse. */
		}
		card.pointerId = e.pointerId;
		card.from = { x: e.clientX, y: e.clientY };
		card.base = { x: card.x, y: card.y };
		card.dragging = false;
	}

	function onMove(card, e) {
		if (card.pointerId !== e.pointerId) return;

		const dx = e.clientX - card.from.x;
		const dy = e.clientY - card.from.y;

		if (!card.dragging) {
			/* Distance only, never elapsed time. A slow deliberate drag is a
			   drag; a long press that never moved is a click on a link, and the
			   visitor expects it to open the case study. */
			if (Math.hypot(dx, dy) < DRAG_PX) return;
			startDrag(card);
		}

		/* Recomputed from the pointer's absolute position every time, never
		   accumulated. That is what lets the clamp below be a hard clamp: drag
		   past the edge and back and the card is under the cursor again
		   immediately, with no offset debt to pay off first. */
		const edge = bounds(card);
		card.x = clamp(card.base.x + dx, edge.minX, edge.maxX);
		card.y = clamp(card.base.y + dy, edge.minY, edge.maxY);
		paint(card);
	}

	/* Grabbing a card mid-flight takes it out of the air: the hand wins, and
	   the physics has no say over a card somebody is holding. */
	function startDrag(card) {
		card.dragging = true;
		card.placed = true;
		card.flying = false;
		card.vx = card.vy = card.vrot = 0;
		card.el.classList.add("is-drag");
		card.el.style.setProperty("--z", String((topZ += 1)));
		document.documentElement.classList.add("is-dragging");
		window.getSelection()?.removeAllRanges();
	}

	function onUp(card, e) {
		if (card.pointerId == null) return;
		if (e && card.pointerId !== e.pointerId) return;

		try {
			card.el.releasePointerCapture(card.pointerId);
		} catch {
			/* stale id after a cancel — releasePointerCapture throws */
		}
		card.pointerId = null;

		if (!card.dragging) return;
		card.dragging = false;
		card.el.classList.remove("is-drag");
		document.documentElement.classList.remove("is-dragging");
		/* The card simply stays where it was let go. That is the desk metaphor:
		   nothing springs back, and the toss button is the only thing that ever
		   moves a card the visitor placed. */
		card.clickGuard = performance.now() + CLICK_GUARD;
	}

	/* ---------------------------------------------------------------- paint */

	/* The only place any card's position reaches the DOM — from the flight
	   loop, from the drag, and from a resize alike. Three custom properties,
	   nothing else. */
	function paint(card) {
		const style = card.el.style;
		style.setProperty("--x", `${card.x.toFixed(1)}px`);
		style.setProperty("--y", `${card.y.toFixed(1)}px`);
		style.setProperty("--rot", `${card.rot.toFixed(2)}deg`);
	}

	/* ------------------------------------------------------------- teardown */

	function destroy() {
		controller.abort();
		resizeObserver.disconnect();
		if (frame) cancelAnimationFrame(frame);
		frame = null;
		document.documentElement.classList.remove("is-dragging");
		board.classList.remove("is-stage", "is-dealt", "is-live");
		section?.classList.remove("is-table");
		board.style.removeProperty("--w");
		board.style.removeProperty("--h");

		for (const card of cards) {
			card.flying = false;
			card.el.classList.remove("is-drag");
			for (const prop of ["--x", "--y", "--rot", "--z"]) {
				card.el.style.removeProperty(prop);
			}
			if (card.baseZ) card.el.style.setProperty("--z", card.baseZ);
		}
		tossButton?.remove();
	}
}
