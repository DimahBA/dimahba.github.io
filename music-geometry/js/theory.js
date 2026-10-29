/* Music theory, as plain numbers.

   A pitch class is 0–11 with C = 0; a note is a MIDI number (60 = middle C,
   C4). Everything here works on numbers, and only the name functions at the
   bottom turn them into text — so the geometry, the piano and the synth never
   parse a note name.

   Spelling is done properly, one letter per scale degree, because a scale is
   seven *letters* before it is seven keys: Ré major has Fa♯ rather than
   Sol♭, and Fa♯ major needs a Mi♯. Getting that right is what keeps the
   staff honest — one note per line or space, climbing evenly. */

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const SOLFEGE = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

/* The major scale: semitones above the tonic, octave included, and the
   steps between them — whole, whole, half, whole, whole, whole, half. */
export const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
export const MAJOR_STEPS = [2, 2, 1, 2, 2, 2, 1];

/* How each of the twelve starting notes is spelled: [letter, accidental].
   The conventional choices — fewest accidentals, flats on the black keys,
   except F♯, where six sharps and six flats tie and F♯ is the one more
   often met. */
const TONIC = [
	[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0],
	[3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
];

/* Key-signature order: sharps arrive F C G D A E B, flats the reverse. */
export const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
export const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];

export const mod = (n, m = 12) => ((n % m) + m) % m;

/** The shortest signed way round the circle, in semitones: −6 < d ≤ 6. */
export const shortest = (d) => {
	const r = mod(d);
	return r > 6 ? r - 12 : r;
};

export const isBlack = (pc) => [1, 3, 6, 8, 10].includes(mod(pc));

export const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Diatonic position on the staff: C4 = 28, D4 = 29 … counted in letters,
    not semitones, which is exactly what a staff line or space is. The
    octave comes from the letter's natural, so C♭5 sits on the C5 space. */
export const staffStep = (midi, letter, acc) =>
	(Math.floor((midi - acc) / 12) - 1) * 7 + letter;

/** The major scale on `tonicPc`, from the fourth octave: eight notes, the
    last an octave above the first, each spelled on the next letter up. */
export function majorScale(tonicPc) {
	const tonic = mod(tonicPc);
	const [letter0] = TONIC[tonic];
	return MAJOR.map((off, k) => {
		const letter = (letter0 + k) % 7;
		const midi = 60 + tonic + off;
		const acc = shortest(midi - NATURAL[letter]);
		return { midi, pc: mod(midi), letter, acc, degree: (k % 7) + 1, step: staffStep(midi, letter, acc) };
	});
}

export function keySignature(notes) {
	const altered = notes.slice(0, 7).filter((n) => n.acc !== 0);
	const sign = altered.length ? Math.sign(altered[0].acc) : 0;
	const order = sign > 0 ? SHARP_ORDER : FLAT_ORDER;
	return { count: altered.length, sign, letters: order.slice(0, altered.length) };
}

/** How a pitch class outside the scale is spelled: sharps in a sharp key,
    flats in a flat key, and the tonic table's choice in Do major. */
export function spellPc(pc, sign = 0) {
	pc = mod(pc);
	const natural = NATURAL.indexOf(pc);
	if (natural >= 0) return { letter: natural, acc: 0 };
	if (sign === 0) return { letter: TONIC[pc][0], acc: TONIC[pc][1] };
	return sign > 0
		? { letter: NATURAL.indexOf(pc - 1), acc: 1 }
		: { letter: NATURAL.indexOf(pc + 1), acc: -1 };
}

/** Every pitch class named as it would be in the major key on `tonicPc`.
    Notes outside the key follow its sharps or flats; in Do major, which has
    neither, they take sharps — the story climbs, and Do♯ is the key you
    pass going up from Do to Ré. */
export function namesInKey(tonicPc) {
	const notes = majorScale(tonicPc);
	const sign = keySignature(notes).sign;
	return Array.from({ length: 12 }, (_, pc) => notes.find((n) => n.pc === pc) ?? spellPc(pc, sign || 1));
}

/* --------------------------------------------------------------------------
   Any scale or chord, spelled.

   A formula is a list of degrees the way players say them — "1 b3 5 b7" —
   and each degree is counted twice: in letters (a third is two letters up)
   and in semitones (a flat third is three). So C minor seventh comes out
   C E♭ G B♭, never C D♯ G A♯, and a diminished seventh gets its B𝄫. */

export const pcOf = ({ letter, acc }) => mod(NATURAL[letter] + acc);

/** "b3" → two letters and three semitones up. Degrees past 7 are the
    next octave: a 9 is a 2, twelve semitones higher. */
export function degree(token) {
	const [, marks, num] = /^([b#]*)(\d+)$/.exec(token);
	const n = Number(num) - 1;
	const shift = [...marks].reduce((sum, c) => sum + (c === "#" ? 1 : -1), 0);
	return { letters: n, semis: MAJOR[n % 7] + 12 * Math.floor(n / 7) + shift };
}

/** The note `letters` letter names and `semis` semitones above `root`. */
export function above(root, letters, semis) {
	const letter = mod(root.letter + letters, 7);
	const pc = mod(pcOf(root) + semis);
	return { letter, acc: shortest(pc - NATURAL[letter]), pc };
}

/** A formula spelled on `root`; each note keeps its distance in semitones
    (`semis`), so it can be placed on a keyboard from any starting key. */
export const spell = (root, formula) =>
	formula.split(" ").map((token) => {
		const d = degree(token);
		return { ...above(root, d.letters, d.semis), semis: d.semis };
	});

/** A minor key's tonic, spelled as the sixth of its relative major so the
    two share a key signature: D♯ minor beside F♯ major. */
export const minorTonicSpelling = (pc) => above(tonicSpelling(mod(pc) + 3), 5, 9);

/* --------------------------------------------------------------------------
   Names — the only place numbers become text. */

const MARK = { "-2": "𝄫", "-1": "♭", 0: "", 1: "♯", 2: "𝄪" };

export const accidental = (acc) => MARK[acc] ?? "";

export function nameOf({ letter, acc }, naming = "solfege") {
	return (naming === "letters" ? LETTERS : SOLFEGE)[letter] + accidental(acc);
}

export const tonicSpelling = (pc) => ({ letter: TONIC[mod(pc)][0], acc: TONIC[mod(pc)][1] });
