# Music Geometry — dimahba.github.io/music-geometry

A small music-theory course, in two kinds of page:

- **The home page** (`index.html`) — the curriculum as 29 lesson tiles in six
  chapters (Basics, Rhythm & meter, Sound, Scales & keys, Chords, Harmony),
  beside a pinned stage: a circle of fifths, a readout, and a keyboard.
  Pressing a tile plays that idea on the circle and the keyboard at once;
  clicking a key on the circle replays it in that key. Nine tiles are full
  lessons (`tile--ready`); every other tile is a demonstration of what its
  lesson will teach.
- **Lessons** — nine pages, each a short, narrated, animated explainer that
  runs like a 3Blue1Brown video — one screen, a few beats, every idea drawn
  and heard rather than stated — and ends with the reader playing:
  - `major-scale.html` — the major scale and how to build it on any note.
  - The basics, after musictheory.net/lessons: `staff.html` (staff, clefs,
    ledger lines, grand staff), `note-duration.html`, `time-signatures.html`
    (measures and time signatures), `rests.html`, `dots-ties.html`,
    `steps-accidentals.html`.
  - Rhythm and meter, after the same site: `meter.html` (simple and compound),
    `odd-meter.html`.

Content comes from general theory sources, not from a book. Tymoczko's *A
Geometry of Music* (the PDF in `/book/` at the repo root) is no longer the
reference — Dimah's call, 2026-10-05. Never commit the PDF.

This folder is its own project inside the portfolio repo. It shares nothing
with the portfolio (no stylesheet, script or asset) and nothing outside
`music-geometry/` is touched from here — no sitemap entry, no nav link — until
Dimah decides otherwise. The page carries `noindex` while it is a prototype.

## Scope — Dimah's decisions, keep to them

### The home page

- Lesson tiles on the left; **the circle of fifths beside them, the keyboard
  below the circle**, both playing each tile's idea together.
- The tiles are the roadmap: reading music first (Basics, Rhythm & meter),
  then the concepts needed to understand chords, harmony and the circle of
  fifths. A tile becomes a full lesson by getting its own page and a
  `tile--ready` link. The Basics tile "Steps & accidentals" keeps the old
  half-and-whole-steps demonstration (id `steps`) and links to
  `steps-accidentals.html`.

### How every lesson is written (Dimah, 2026-10-05)

- **In musictheory.net's style**: simple, plain, straightforward sentences —
  "The half note has half the duration of a whole note." Use that *style*,
  never its words. This is how Dimah wants all lessons written, the major
  scale included when it is next rewritten.
- Follow musictheory.net's lesson order and content, but take as many or as
  few beats as the idea needs.

### The basics and rhythm lessons

- **Always play a melody, and always show the staff and the piano.** Every
  example is a tune on the staff, heard and lit on the keyboard.
- **Note lengths are heard against a click.** Whenever a lesson is about how
  long something lasts, the metronome plays the beat under it (the first beat
  of a measure loudest), and a timing bar under each note fills as it sounds.
- **Time signatures are conducted.** A hand traces the beat pattern in time
  with the music: the downbeat falls straight down, the upbeat rises back to
  the top; 4 is down, in, out, up, and crosses itself. Compound meters are
  beaten in their felt pulse (6/8 in 2, 9/8 in 3, 12/8 in 4; only a slow 6/8
  in 6); 5/4 is a 4-pattern with one beat doubled on the side of the longer
  group (3+2 doubles "in", 2+3 "out"); 7/8 is in 3 with one long beat; a fast
  3/4 is in 1. What the hand draws follows the felt pulse, not the top
  number.
- The steps lesson draws a whole step as one arch, never as two half-step
  hops (the major scale's rule), and says it has one key in between.

### The major scale lesson

- **Seven beats:** title → the scale on a staff → the same notes on a piano
  beside it → half steps (V) and whole steps (arch) → the recipe W W H W W W H
  → the recipe walked from Sol (landing on Fa♯, a black key) → the reader's
  turn.
- **Only the major scale and how to build it.** No "why it sounds bright"
  beats, no circle — both were tried and cut *from this lesson* as too many
  steps / not a good visualization. Don't bring them back into it unasked.
  (The circle lives on the home page, by Dimah's request.)
- **The staff sits next to the piano**, side by side, from the piano's first
  beat to the end — never stacked above it.
- **Half steps are a V under the notes, never an arch.** Whole steps are an
  arch over them. Both on the staff and on the piano.
- Whole steps are explained only as "keys with a black key between them";
  don't break a whole step into two half-step hops.
- The ending covers all twelve keys, black ones included, and shows exactly
  which keys a scale needs.
- **Desktop only for now.** Don't spend effort on phone layouts until asked.
  (The home page has one plain fallback: below 960px the stage stacks above
  the tiles.)

## Running it

- The `site` launch config serves the repo root; the home page is at
  `/music-geometry/`, each lesson at `/music-geometry/<name>.html`. ES
  modules, so it must be served — `file://` won't work.
- Sound needs a user gesture: on the lesson the title screen's **Begin** is
  that gesture; on the home page, pressing a tile or a key.
- Home page: `#<lesson-id>` in the URL (e.g. `#triads`) opens with that tile
  chosen and its picture showing. Check every lesson builds in every key with
  a loop over `lessons` from `js/home/lessons.js` (12 keys × both namings).
- Verify by loading the page, reading the console, and stepping through every
  beat with → (and back with ←) at 1280×720 and full size, screenshotting the
  beats you changed. `#N` in the URL loads beat N directly. The tools can't
  resize the browser window: load the page into a fixed-size same-origin
  iframe to test a viewport size.
- Changing only the `#N` of a page that failed to load doesn't reload it: add
  a query (`?r=2`) or reload. A tab Chrome reports as `hidden` runs no
  animation frames, so nothing moves there: judge motion only in a visible
  tab.

## Layout

### The home page

- `index.html` — the tiles (static HTML, so the course reads without
  JavaScript) and the stage: `#wheel`, the readout, `#keys`.
- `css/home.css` — all of its look, including every state the scripts toggle
  (`is-on`, `is-set`, `is-current`, `data-tone`, `--dur`).
- `js/home.js` — wiring: tiles, hover previews, playing a lesson's score,
  the readout, key picking, the computer-keyboard piano, note names.
- `js/home/lessons.js` — every tile's demonstration: `build(k, naming)`
  returns steps (`dur`, `play`, `view`, `title`, `sub`, `say`); the header
  comment documents the view fields and tones. Most edits to the home page's
  teaching happen here. Its words are Claude's draft until Dimah rewrites them.
- `js/home/wheel.js` — the circle (springs for the key slice and chord
  polygon; classes for everything else) and the tiles' miniatures.
- `js/home/keys.js` — the keyboard, C2–C6.

### Lessons

- `<name>.html` — one per lesson, all the same shell: the stage `<svg>`, the
  narration band, the controls. `<html data-story="…">` names its story.
- `css/style.css` — fonts, the one-screen grid, narration and controls, and
  type sizes for text on the stage. Nothing else on the stage is CSS.
- `js/lesson.js` — the one runner every lesson page loads: picks the story
  (from a fixed list, so the attribute can't load anything else), navigation
  (next, back, jump, replay, `#beat` in the URL), the render loop, sound
  (`S.seq` for a run of notes; `S.music` plays score rows in time with the
  metronome and starts the transports the pictures follow), narration,
  extras buttons, and the reader's presses on the stage.
- `js/stories/<name>.js` — one per lesson: `beats` (parameter targets,
  timing, sound, narration), `defaults`, `namer`, `stage(layer)` (its
  components) and `interact` (its last beat's clicks). Most edits to a lesson
  happen here and nowhere else. `kit.js` holds what the newer stories share
  (camera, coloured words, note names, the title beat, `swap` for choice
  buttons); `major-scale.js` predates it.
- `js/engine/` — `params.js` (tweens), `ease.js` (Manim's `smooth`),
  `live.js` (which notes are sounding, and transports: where a row's music or
  the conductor is, in quarter notes).
- `js/stage/` — one component per thing drawn. Each exports
  `create(layer, options)` → `{ render(P, live, now, dt) }`, and `render`
  returns true while it still has springs settling.
  - The major scale's own: `title` (shared), `staff`, `piano`, `formula`.
  - The rest: `score` (rows of real notation — any rhythm, rests, dots, ties,
    beams, clefs, time signatures, timing bars, beat counts, beat brackets,
    the grand staff; its header lists every parameter), `keyboard` (any
    range, sets, gold keys, V/arch step marks), `conductor` (the beat
    patterns and the moving hand).
- `js/rhythm.js` — music as strings ("E4q. D4e D4h |"), parsed to numbers;
  meters ("7/8:2+2+3"), clicks, ties, beams. Its header documents the
  notation.

### Shared

- `js/theory.js` — spelling, scales and chord formulas ("1 b3 5 b7"), numbers
  only. `js/audio.js` — the synth; `playScore` schedules a whole score on the
  audio clock, `setRoom` adds a synthetic room (the home page uses it, the
  lesson stays dry).
- `js/palette.js` — colours. `js/lib/dom.js` — element helpers and a cached
  attribute setter (the stage redraws every frame while anything moves).
- Gotcha: never `.map(mod)` — `map` passes the index as `mod`'s modulus.
  Write `.map((n) => mod(n))`.

## The one-screen rule

Everything fits in one viewport height; nothing scrolls. The stage is an SVG
whose viewBox is the camera (`cam.*`), fitted into whatever is left above the
narration band and the controls. Nothing is laid out by the browser inside it.

## How it works

- **Numbers in, pictures out.** The whole stage is a pure function of one flat
  object of parameters (`P`): opacities, positions, draw progress, the
  camera, where the scale starts. Components in `js/stage/` read `P` and set
  SVG attributes; they own no story state.
- **A beat is a target.** Each beat sets some parameters; a beat's full target
  is every earlier beat's settings merged, so any beat can be reached from any
  other (back, jump, replay) by tweening to its target. Timing rules (delays,
  staggers, durations) only shape the forward transition. A beat's `reset`
  fades things out before its own transition — how the same notes can vanish
  and be drawn again within one beat.
- **Tweens, not keyframes.** `js/engine/params.js` interpolates numbers and
  colours with Manim's `smooth` curve. Pressing → while a beat is still
  animating finishes it instantly, then starts the next.
- **Derived motion uses springs.** Staff notes glide to their new line or
  space whenever the key changes, whether the story or a click changed it.
- **Pitch is a number.** `s` = semitones above C4 (MIDI − 60); keys, beads and
  staff notes are all found from it. The scale is the pattern
  `s = rot + (0 2 4 5 7 9 11 12)`: building it on a new note only changes
  `rot`, and every bead, step mark and tint follows.
- Sound: `js/audio.js` (a small Web Audio synth). When a note sounds, `live`
  records it and every view shows it for ~0.7 s — the note brightens and a
  ring expands and fades, 3b1b's "flash".

## Style — 3Blue1Brown

- Black ground. Crisp strokes, flat fills, no gradients, no glow, no shadow.
- Manim's palette, one meaning per colour everywhere (`js/palette.js` is the
  single source; it also writes the CSS custom properties): whole step
  `BLUE_C #58C4DD`, half step `YELLOW_C #F7D96F`, the starting note `GOLD_C
  #F0AC5F`, a note the new key had to change `GREEN_C #83C167`, the tempting
  wrong key `RED_C #FC6255`, text white and `GRAY_B #BBBBBB`. The home page
  keeps those meanings and adds: green also for a note from outside the key,
  red for tension (a dominant, a tritone), `PURPLE_B #B189C6` for the
  subdominant, `BLUE_B` for a note sounding, ivory for white keys.
- Computer Modern (CMU Serif, from jsDelivr) for all text, time signatures
  included; Noto Music only for clefs, accidentals and rests. The score sets
  Noto Music at 80px (its em is one staff height); the positions in
  `score.js` were measured against it.
- The rhythm lessons add: a note's timing bar is a grey outline that fills
  with `GRAY_A` (`BLUE_B` while it sounds); a rest's is dashed and stays
  empty; beat 1 — its count, its conductor bead — is gold, like a home note.
- Motion is Manim-like: things are *drawn* in (stroke progress), *written*
  (outline then fill), fade in with a small shift, move with `smooth`, and
  arrive staggered; the camera frames each beat. One idea moves at a time.
- Real notation on the staff: whole notes, treble clef, ledger lines,
  accidentals beside the notes.

## Teaching

- One idea per beat; the narration is one or two sentences, in the band under
  the stage.
- Every claim is drawn and heard: each beat moves something and plays it.
- Notes are named in fixed do (Do = C) or letters, toggled in the controls.
  Scale degrees are numbers 1–7.
- The narration in `js/stories/` is Claude's draft, except the major scale's
  recipe beat, which is Dimah's sentence. Once Dimah rewrites a beat, it is
  hers word for word — don't smooth it.
- Melodies are public-domain tunes (Twinkle, Ode to Joy, Mary Had a Little
  Lamb, Row Row Row Your Boat, the opening of Für Elise) or simple originals,
  never named on screen.

## Conventions

- Tabs, double quotes, ES modules, no build step, no dependencies. External
  requests: Google Fonts (Noto Music) and jsDelivr (CMU Serif).
- Comments explain *why*, in prose, at the top of a file or block.
- Interactive things are real `<button>`s where they are HTML; on the stage,
  the piano keys, the staff's notes and the score's rows are clickable in a
  lesson's last beat.
- A beat's `reset` only shapes the forward transition: anything it fades
  that should stay faded must also be in the beat's `set`, or jumping
  straight to the beat (`#N`, back) brings it back.
