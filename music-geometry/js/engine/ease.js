/* Rate functions, as in Manim.

   `smooth` is Manim's default: a sigmoid squashed to start and end exactly at
   rest, so everything eases out of its old place and settles into its new one
   without the mechanical snap of a cubic. */

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const EDGE = sigmoid(-5);

export const smooth = (t) =>
	t <= 0 ? 0 : t >= 1 ? 1 : (sigmoid(10 * (t - 0.5)) - EDGE) / (1 - 2 * EDGE);

export const linear = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t);

/* Fast start, gentle landing: for things that should feel thrown into place. */
export const rushInto = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a, b, t) => a + (b - a) * t;
