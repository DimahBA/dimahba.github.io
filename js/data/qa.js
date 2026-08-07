/* Every piece of conversational copy on the home page.

   Transcribed verbatim from the old content-data.js, with two changes:
   · emphasis is expressed as runs (`{ t, b }`) instead of an HTML string
   · 'cats-dogs-why' is now reachable. Its answer has been sitting in the
     data since the site was written with no button pointing at it, so
     nobody has ever seen it.
*/

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

/* Her side of the jar. The paper carries every answer, so these are the only
   words she says out loud — one short line per state, in the speech bubble.
   Keyed by the state names in js/modules/jar.js. */
export const host = {
	idle: "Ask me anything !",
	taken: "go on, unfold it ..",
	open: "there you go !",
	deep: "I drew that one myself ~",
};

/* The four slips in the jar.

   `tint` names one of the paper colours in css/components.css §9. It is a
   name and not a colour because the tint sets four things at once — the
   sheet, the crease, the lining and the ink the drawing is done in — and
   those belong together in the stylesheet rather than spread across a data
   file. Every one of the four is light enough to carry --ink at body weight;
   that is the constraint on adding a fifth.

   `art` names a sprite in js/data/sprites.js and `caption` is the line
   written under it. The caption is a *third* beat, not a restatement — the
   question is on the cover and the answer is on the middle panel, so a
   caption that repeats either of them makes the last fold a let-down. */
export const topics = [
	{
		id: "education",
		text: "Education",
		tint: "moss",
		art: "cap",
		caption: "graphics, interfaces, and a lot of coffee",
	},
	{
		id: "projects",
		text: "Projects",
		tint: "peach",
		art: "rocket",
		caption: "the good ones are on the table below ↓",
	},
	{
		id: "music",
		text: "Music",
		tint: "butter",
		art: "notes",
		caption: "piano, guitar and violin ♪",
	},
	{
		id: "cats-dogs",
		text: "Cats or dogs?",
		tint: "tan",
		art: "cat",
		caption: "still waiting for mine ~",
	},
];

/* The tree, unchanged.

   Only the four top-level entries are reachable from the jar today: a note is
   three panels — question, answer, drawing — and the follow-ups have nowhere
   to go until there is a fourth. The nine follow-up entries are deliberately
   left in place rather than trimmed, because they are still the copy the
   <noscript> list in index.html is written from, and because the second level
   of interaction is a decision that was postponed, not dropped. */
export const answers = {
	education: {
		answer:
			"I'm a Master's student in IT with a focus on Computer Graphics and Human-Computer interactions. I love exploring how technology can create beautiful experiences, especially in AR settings.",
		followups: [
			{ id: "education-uni", text: "Which university?" },
			{ id: "education-skills", text: "Key skills?" },
			{ id: "back", text: "← Back" },
		],
	},
	"education-uni": {
		answer: "I'm studying at Institut Polytechnique de Paris!",
		followups: [
			{ id: "back", text: "← Back to Education" },
			{ id: "main", text: "← Main Menu" },
		],
	},
	"education-skills": {
		answer:
			"I've developed skills in Unity 3D, C++, and JavaScript. And I learned a lot about usability and design throughout my studies.",
		followups: [
			{ id: "back", text: "← Back to Education" },
			{ id: "main", text: "← Main Menu" },
		],
	},

	projects: {
		answer: "I have lots of projects .. Check them out below !",
		followups: [
			{ id: "projects-favorite", text: "Favorite project?" },
			{ id: "projects-future", text: "Future plans?" },
			{ id: "back", text: "← Back" },
		],
	},
	"projects-favorite": {
		answer:
			"My favorite project is the AR Pathfinding system for Parkinson's patients. It was my personal research project where I got to see a real impact on patients who suffered from mobility issues. It was an example of how technology can make people's lives a bit better and it's what I would love to work on in the future.",
		followups: [
			{ id: "back", text: "← Back to Projects" },
			{ id: "main", text: "← Main Menu" },
		],
	},
	"projects-future": {
		answer:
			"I want to explore more AR/VR applications in healthcare and education. The potential to create accessible, helpful technology really motivates me!",
		followups: [
			{ id: "back", text: "← Back to Projects" },
			{ id: "main", text: "← Main Menu" },
		],
	},

	music: {
		answer: "I love music .. what would you like to know ?",
		followups: [
			{ id: "music-instruments", text: "What instruments?" },
			{ id: "music-genres", text: "Favorite genres?" },
			{ id: "back", text: "← Back" },
		],
	},
	"music-instruments": {
		answer: "I play piano, guitar, and violin!",
		followups: [
			{ id: "back", text: "← Back to Music" },
			{ id: "main", text: "← Main Menu" },
		],
	},
	"music-genres": {
		answer: "I love Heavy Metal and Electro.",
		followups: [
			{ id: "back", text: "← Back to Music" },
			{ id: "main", text: "← Main Menu" },
		],
	},

	"cats-dogs": {
		answer: "Definitely cats! 🐱",
		followups: [
			{ id: "cats-dogs-pet", text: "Do you have a cat?" },
			{ id: "cats-dogs-why", text: "Why cats?" },
			{ id: "back", text: "← Back" },
		],
	},
	"cats-dogs-pet": {
		answer: "Sadly not, I've never had one .. But I can't wait !",
		followups: [
			{ id: "back", text: "← Back to Cats or Dogs" },
			{ id: "main", text: "← Main Menu" },
		],
	},
	"cats-dogs-why": {
		answer:
			"Cats are like elegant code - efficient, independent, and sometimes unpredictable! They respect your space but show affection on their own terms.",
		followups: [
			{ id: "back", text: "← Back to Cats or Dogs" },
			{ id: "main", text: "← Main Menu" },
		],
	},
};
