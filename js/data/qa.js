/* Every piece of conversational copy on the home page.

   Rich text is expressed as runs rather than as HTML strings: `{ t, b }` is a
   run of text, bold or not, and `{ t, href }` is a link. Nothing here is
   ever parsed as markup — js/lib/dom.js builds the nodes. */

/** The four chunks the café intro cycles through. */
export const intro = [
	[
		{ t: "I'm an IT student who likes cute things, music, and " },
		{ t: "coffee!", b: true },
	],
	[
		{
			t: "This website is my attempt to recreate the peacefulness that coffee gives me in the digital world ...",
		},
	],
	[
		{
			t: "Consider it a place to take a breather .. from that constant motion of the internet.",
		},
	],
	[{ t: "Enjoy your stay !" }],
];

/* Her side of the jar. The letter carries every answer, so these are the only
   words she says out loud — one short line per state, in the speech bubble.
   Keyed by the state names in js/modules/jar.js. */
export const host = {
	idle: "Ask me anything !",
	taken: "ooh, good pick ..",
	open: "I drew that doodle myself ~",
};

/* The five slips in the jar, in the order they lie in it.

   Each one is a small letter folded in three, and the three panels are the
   three beats of it:
   · `text`   — the question, written on the outside and again as the title
   · `answer` — the middle panel, and the only one that has to say anything
   · `ps`     — the bottom panel, beside the drawing. A *third* beat, not a
                restatement: a P.S. that repeats the answer makes the last
                fold a let-down.

   An answer has to fit its one panel — text does not run across a crease —
   so each is kept under ~170 characters. That is the number the panel in
   css/home.css §2 was sized against at its smallest; a longer answer means
   re-checking it there, at a 320px phone and a short laptop window both.

   `tint` names one of the paper colours in css/components.css §10. It is a
   name and not a colour because the tint sets several things at once — the
   sheet, its rules, the stamp and the ink the drawing is done in — and those
   belong together in the stylesheet rather than spread across a data file.
   No two neighbours in the jar share a tint, so the fan reads as five
   separate slips rather than as one stack.

   `art` names a sprite in js/data/sprites.js. */
export const topics = [
	{
		id: "education",
		text: "Education",
		tint: "moss",
		art: "cap",
		answer: [
			{
				t: "I completed a bachelor's degree in computer science, then followed a master's program at ",
			},
			{ t: "IP Paris", href: "https://www.ip-paris.fr/en" },
			{ t: " to pursue my passion: interaction design and XR." },
		],
		ps: "fuelled by a lot of coffee ~",
	},
	{
		id: "experience",
		text: "Experience",
		tint: "peach",
		art: "laptop",
		answer: [
			{
				t: "For my end-of-studies internship, I joined a cybersecurity startup as a UI/UX engineer. I designed new features from scratch and improved the platform's overall UX.",
			},
		],
		ps: "I also designed its complex data visualizations ✦",
	},
	{
		id: "projects",
		text: "Projects",
		tint: "butter",
		art: "glasses",
		answer: [
			{ t: "My biggest one is an " },
			{
				t: "AR guidance system for people with Parkinson's",
				href: "project-ar-pathfinding.html",
			},
			{ t: ": it lays a walking path across their own floor. For more projects, " },
			{ t: "check out the table below", href: "#work" },
			{ t: " ↓" },
		],
		ps: "it won Best Poster at IEEE ISMAR 2025 !",
	},
	{
		id: "music",
		text: "Music",
		tint: "sage",
		art: "clef",
		answer: [
			{
				t: "I love music! I play piano and guitar, and my playlists swing between heavy metal, hard rock and techno.",
			},
		],
		ps: "the louder, the better ♪",
	},
	{
		id: "cats-dogs",
		text: "Cats or dogs?",
		tint: "tan",
		art: "cat",
		answer: [
			{
				t: "Definitely cats! They make you work for their affection, and that's exactly what makes it worth it.",
			},
		],
		ps: "still waiting for mine ~",
	},
];
