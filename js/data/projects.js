/* Every project case study, transcribed from the eight old
   project-details-*.html pages.

   The prose is the author's, word for word. Three typos were corrected
   ("Adressing", "Developement", "cheking"); everything else is left exactly
   as written. Three passages that need the author's own attention are marked
   with TODO comments rather than silently edited.

   Two structural changes from the old markup:

   · The floating gutter images used hardcoded pixel offsets (top-[200px],
     top-[1300px], …) which only ever lined up on the author's own screen at
     the author's own text length. Each one now carries an `anchor` instead:
     the index of the `body` block it should sit beside.
   · Emphasis and links inside a paragraph are expressed as runs (a plain
     string, `{ b }` or `{ a, href }`) rather than an HTML string.

   Every image carries `w` and `h`: its real pixel size, read off the file.
   They are not display sizes — the stylesheet decides how big anything is
   drawn — they are there so the browser can reserve the right box before the
   bytes arrive. Without them a lazily loaded image is 0×0 until it decodes
   and the whole case study reflows underneath the reader as they scroll.
   They also give the lightbox an exact aspect ratio to open at, so the
   photograph lands on its thumbnail instead of near it.
*/

export const projects = {
	"ar-pathfinding": {
		title: "Adaptive Augmented Reality Pathfinding for Parkinson's Disease",
		theme: "moss",
		badge: "ISMAR Best Poster Award 2025",
		tags: [
			"Augmented Reality",
			"Unity AR",
			"C#",
			"Human-Computer Interaction",
		],
		summary:
			"AR system using Meta Quest 3 integrating dynamic visual cues to help Parkinson's patients navigate complex spaces",
		body: [
			{
				p: "I've always believed that technology should serve everyone, especially those who need it most. This became my most ambitious solo project, combining everything I learned about HCI and AR programming to create something that could genuinely improve people's lives.",
			},
			// TODO Dimah: this sentence is cut off in the original — how did it end?
			{
				p: "Parkinson's disease causes debilitating gait impairments that severely impact mobility and independence. While AR visual cueing had shown promise in helping patients walk, none of the existing systems provided the patient with the ability to choose their own",
			},
			{
				p: "I developed an adaptive AR pathfinding system using the Meta Quest 3 to address this issue. Patients simply point to where they want to go, and the system dynamically generates a safe path through their actual environment, displaying visual cues (like strips on the ground) that guide them around furniture and obstacles. The system adapts to them, not the other way around.",
			},
			{
				p: "Building the system meant diving deep into Unity's NavMesh algorithms, integrating Meta's Mixed Reality Utility Kit for real-time spatial mapping and obstacle detection, and implementing smooth spline interpolation so the paths wouldn't have jarring turns.",
			},
			// TODO Dimah: this sentence is cut off in the original — how did it end?
			{
				p: "Testing the prototype with real patients gave me so much inspiration, they showed real improvements and they were able to gain autonomy by choosing their own target. I would love to see how this project can evolve with more advanced AR technology, using light-weight see-through glasses so that it can",
			},
			{
				p: "This project was presented at the ISMAR 2025 conference in South Korea, where it received the Best Poster Award.",
			},
			{
				link: {
					href: "https://hal.science/hal-05281349",
					label: "Check it out !",
				},
			},
		],
		polaroids: [
			{
				src: "static/projects/roomsetup-A.png",
				w: 303,
				h: 338,
				alt: "Photograph of the pilot study room with AR visual cues overlaid on the floor as strips leading between the furniture.",
				caption:
					"Pilot Study Overview: real-world with overlaid AR visual cues",
				side: "right",
				anchor: 1,
				rot: 3,
			},
			{
				src: "static/projects/roomsetup-B.png",
				w: 216,
				h: 338,
				alt: "Plan of the pilot study room showing the walking area and the furniture placed as obstacles.",
				caption: "Layout of the pilot study room",
				side: "left",
				anchor: 3,
				rot: -6,
			},
		],
	},

	"gaussian-splatting": {
		title: "Interactive Manipulation of Objects for 3D Gaussian Splatting",
		theme: "peach",
		badge: null,
		tags: ["WebGL", "JavaScript", "Computer Vision", "Computer Graphics"],
		summary:
			"Interactive 3D scene editing system with multi-modal segmentation and hit-testing algorithm",
		body: [
			{
				p: "3D Gaussian Splatting has emerged as a groundbreaking technique in computer graphics, offering a compelling alternative to traditional mesh-based and neural rendering approaches. However existing viewers were purely passive, you could navigate and observe, but never interact with the scene itself.",
			},
			{
				p: "This project transformed a static WebGL Gaussian Splatting viewer into a fully interactive editing tool. The core challenge was enabling object-level manipulation in scenes composed of millions of floating Gaussian points rather than traditional 3D meshes.",
			},
			{
				p: "We developed a complete editing system featuring label-based selection through a custom HitTesting algorithm, I focused on implementing the editing features providing GPU-accelerated object movement, visibility controls, and object recoloring. Transformations happen directly in the GPU vertex shader during rendering resulting in smooth interactions even with complex scenes containing massive numbers of Gaussians.",
			},
			{
				p: "The object segmentation in the scenes were very challenging, My teammates explored multiple approaches including deep learning models, K-means clustering, and region growing algorithms to create coherent object labels.",
			},
			{
				link: {
					href: "https://github.com/OnurBasci/Interactive_object_manipulation_for_3D_gaussian_splatting_viewer",
					label: "Check it out !",
				},
			},
		],
		polaroids: [
			{
				src: "static/projects/segmentation.png",
				w: 1557,
				h: 1038,
				alt: "A rendered view of a splatted room where each detected object is tinted a different colour by the segmentation pass.",
				caption: "segmented objects in 2D image",
				side: "right",
				anchor: 0,
				rot: 3,
			},
			{
				src: "static/projects/color.png",
				w: 1902,
				h: 765,
				alt: "The same splatted scene with one piece of furniture recoloured while the rest of the scene is untouched.",
				caption:
					"changing colors of 3D objects in real time in gaussian splats scene",
				side: "left",
				anchor: 2,
				rot: -6,
			},
			{
				src: "static/projects/leftDisappear.png",
				w: 1902,
				h: 765,
				alt: "The splatted scene after an object on the left has been hidden, leaving empty space where it stood.",
				caption: "deleting an object from 3D scene",
				side: "right",
				anchor: 3,
				rot: 0,
			},
		],
	},

	"line-vectorization": {
		title: "Line Drawing Vectorization",
		theme: "butter",
		badge: null,
		tags: ["Python", "Computer Graphics", "OpenCV"],
		summary:
			"Bitmap-to-vector conversion system for hand-drawn sketches using skeleton extraction and topological graph construction",
		body: [
			{
				p: "I built a line-drawing vectorizer that turns hand-drawn raster sketches into clean SVGs. The goal was to keep the artist’s intent while removing jitter, variable stroke widths, and messy junctions that make sketches hard to scale.",
			},
			{
				p: "The pipeline follows Favreau et al.’s “Fidelity vs. Simplicity” idea. First, I extract a single-pixel skeleton using trapped-ball region segmentation to bridge small gaps and handle varying stroke thickness, then clean and unify strokes by dilating and thinning with a Zhang–Suen implementation.",
			},
			{
				p: "Next, I construct a topological graph by detecting endpoints, junctions, and turn points. I designed a direction-aware traversal that tracks both a base and current angle with gentle dampening, so it catches sharp turns without overreacting to gentle curves. Nearby critical points are merged to avoid clutter, and paths are traced with a proximity-based BFS that tolerates small misalignments at junctions.",
			},
			{
				p: "Finally, each path becomes a cubic Bézier curve via chord-length parameterization and least-squares fitting, preserving topology while producing smooth, compact geometry. The result is exported directly as SVG.",
			},
		],
		polaroids: [
			{
				src: "static/projects/output.png",
				w: 1282,
				h: 582,
				alt: "A hand-drawn sketch beside the vectorized result, the second version with even, jitter-free strokes.",
				caption: "original sketch VS generated SVG",
				side: "right",
				anchor: 0,
				rot: 3,
			},
			{
				src: "static/projects/skeleton.png",
				w: 824,
				h: 810,
				alt: "A single-pixel skeleton of a sketch with turn points marked yellow, junctions red and end points green.",
				caption:
					"Segmentation of the skeleton: turn points are shown in yellow, junctions are shown in red, and end points are shown in green",
				side: "right",
				anchor: 2,
				rot: 0,
			},
			{
				src: "static/projects/city.png",
				w: 1843,
				h: 696,
				alt: "A dense sketch of a city street, redrawn as vector paths with all its windows and rooflines intact.",
				caption: "Complex sketch of a city transformed to SVG",
				side: "left",
				anchor: 3,
				rot: -3,
			},
		],
	},

	"smart-wardrobe": {
		title:
			"Smart Wardrobe: Addressing digital over-consumption through physical design",
		theme: "peach",
		badge: null,
		tags: ["Critical UX", "Design"],
		summary:
			"The \"Smart Wardrobe\" is a concept — a design intervention that directly addresses the problem of clothing overconsumption by creating a physical constraint mechanism, unlike digital solutions that rely on willpower alone.",
		body: [
			{
				img: {
					src: "static/projects/closet-Photoroom.png",
					w: 732,
					h: 1280,
					alt: "Render of the Smart Wardrobe: a tall cabinet with one hanging bar inside and a donation box below it.",
					caption: null,
				},
			},
			{
				p: "This project started from a very familiar place: doom‑scrolling through online shops, convincing myself I “needed” a few new pieces, and then feeling awful afterwards. I realised my problem wasn’t that I owned nothing to wear, it was that the digital side made it way too easy to ignore what was already in my closet. I wanted a solution that didn’t live on yet another screen, didn’t send me more notifications, and didn’t ask for more self‑discipline than I realistically have.",
			},
			{
				p: "So I imagined a wardrobe that quietly enforces its own limits. Inside, there’s a single bar where every hanger has to slide in from the same side. Each time I wear something and put it back, it re‑enters from that side, which means my most‑used clothes naturally stay close to the “entrance” while the least‑used ones slowly migrate to the far end. When the bar is full and I try to add something new, the item at the opposite end is pushed off and drops into a donation box. No pop‑ups, no guilt‑trippy stats—just a very clear, physical “if this comes in, something else has to go.”",
			},
			{
				img: {
					src: "static/projects/closetHanger-Photoroom.png",
					w: 889,
					h: 722,
					alt: "Cutaway of the wardrobe's single hanging bar, open at one end so hangers can only be fed in from that side.",
					caption: null,
				},
			},
			{
				img: {
					src: "static/projects/hangers-Photoroom.png",
					w: 1280,
					h: 649,
					alt: "Hangers lined up along the bar, ordered from the most recently worn at the entrance to the least worn at the far end.",
					caption: null,
				},
			},
			{
				p: "I built a cardboard prototype to test the idea with a few people. Users instinctively tried to insert hangers from the wrong side, hesitated when items dropped into the donation area, and some even reacted with “I’d hate to lose my clothes like this.” Their behavior showed that the wardrobe made the cost of “just one more item” feel concrete, instead of burying it under free shipping and easy returns, and it highlighted that tension between wanting new things and not wanting to let go which is exactly what this project is about.",
			},
		],
		polaroids: [
			{
				src: "static/projects/takeout.gif",
				w: 720,
				h: 1280,
				alt: "Animation of a hanger being lifted straight out from the middle of the bar.",
				caption: "You can take items out from anywhere on the bar",
				side: "right",
				anchor: 1,
				rot: 3,
			},
			{
				src: "static/projects/putback.gif",
				w: 720,
				h: 1280,
				alt: "Animation of a hanger being slid back onto the bar through its left-hand entrance, pushing the others along.",
				caption:
					"You can only put an item back from the left side of the bar",
				side: "left",
				anchor: 2,
				rot: -6,
			},
			{
				src: "static/projects/fall.gif",
				w: 720,
				h: 1280,
				alt: "Animation of the hanger at the far end of a full bar being pushed off and dropping into the donation box.",
				caption:
					"Once the bar is full, adding new items would make the least used item fall into the donation box",
				side: "right",
				anchor: 4,
				rot: -2,
			},
			{
				src: "static/projects/close.gif",
				w: 720,
				h: 1280,
				alt: "Animation of the donation box lid shutting immediately after an item has fallen in.",
				caption:
					"The donation box is closed after each drop to prevent you from taking the items out of it When the box is full, a notification is sent to the donation center to come pick the box up !",
				side: "left",
				anchor: 5,
				rot: 3,
			},
		],
	},

	"coffee-dataviz": {
		title: "Coffee Data Visualization",
		theme: "moss",
		badge: null,
		tags: ["data visualization", "JavaScript", "D3"],
		summary:
			"Interactive visualization platform for exploring global coffee trade patterns and sustainability metrics",
		body: [
			{
				p: "We developed this interactive data visualization using D3.js to explore the global coffee industry from multiple perspectives: international trade networks, production trends, consumption patterns, and product quality across different countries and time periods.",
			},
			{
				p: "The project features dynamic graph visualization that seamlessly transition into a world map, and also other interactive choropleth maps with time-series data from 1960-2023, with detailed tooltips We focused on creating smooth animations and intuitive interactions .",
			},
			{
				p: "This was a particularly fun project to work on, because I got to dive deep into data about something I love: coffee ☕",
			},
			{
				link: {
					href: "https://data-vis-project.netlify.app/",
					label: "Check it out !",
				},
			},
		],
		polaroids: [
			// These two files really have no extension on disk. Left as-is.
			{
				src: "static/projects/dataVizMap",
				w: 1300,
				h: 703,
				alt: "World map with coffee trade routes drawn as arcs between exporting and importing countries.",
				caption: "coffee trade network world map",
				side: "right",
				anchor: 0,
				rot: 3,
			},
			{
				src: "static/projects/dataVizGraph",
				w: 834,
				h: 713,
				alt: "Force-directed network of coffee trading partners, each country's node sized by its trade volume.",
				caption:
					"trade network graph where node size reflects each country's coffee trade volume",
				side: "left",
				anchor: 1,
				rot: -6,
			},
		],
	},

	gateway: {
		title: "GaTewAY Molecular Trajectory Analysis",
		theme: "butter",
		badge: "Internship",
		tags: ["C++", "Software Development", "Molecular Dynamics"],
		summary:
			"Rewriting and optimizing GATEwAY, a post-processing tool designed to automatically analyze conformational changes in molecular dynamics (MD) simulation data.",
		body: [
			{
				p: "During my third year at IUT d’Orsay, I joined the LAMBE research lab (Analysis, Modeling, Materials for Biology and the Environment) at Université d’Évry to work on GaTewAY, a tool that analyzes molecular dynamics trajectories by transforming raw atomic data into graph-based representations, and helps understand how molecules actually move, bind, and reorganize over time.",
			},
			{
				p: "Instead of just staring at thousands of 3D snapshots, Gateway converts each frame into a 2D molecular graph where atoms are vertices and interactions (covalent, hydrogen, ionic, organometallic) are edges, then it tracks which conformations appear, how long they live, and how the system jumps from one to another.",
			},
			{
				p: "During my internship, I helped refactor the legacy C code into modern C++, redesigning the architecture around clean object‑oriented components and extending the analysis. I worked on detecting different bond types, building conformation graphs, and computing statistics like connected components and cycle distributions, using igraph for fast graph algorithms and GraphViz/Gnuplot to visualize structures and trends.",
			},
		],
		polaroids: [
			{
				src: "static/projects/conformation.png",
				w: 472,
				h: 417,
				alt: "A 2D molecular graph with atoms as labelled vertices and bonds as edges, split into two connected components.",
				caption:
					"2D Graph representation of a molecule with an organometallic interaction and two connected components",
				side: "right",
				anchor: 0,
				rot: 3,
			},
			{
				src: "static/projects/graph.png",
				w: 796,
				h: 730,
				alt: "A transition graph of a trajectory: one node per conformation, arrows showing the jumps between them.",
				caption:
					"Example of a transtion graph generated by GaTewAY, it represents how the molecule changes forms throughout a trajectory",
				side: "left",
				anchor: 1,
				rot: -2,
			},
			{
				src: "static/projects/viz.png",
				w: 501,
				h: 308,
				alt: "Timeline plot of hydrogen bonds across a trajectory, coloured red where bonds form, blue for proton transfers and grey where they break.",
				caption:
					"An example of the time evolution of hydrogen bonds provided by GaTewAY: red indicates the forming of a hydrogen bond, blue indicates a proton transfer, and grey indicates the breaking of the bond.",
				side: "left",
				anchor: 2,
				rot: -6,
			},
		],
	},

	goodreads: {
		title: "GoodReads Usability Study",
		theme: "moss",
		badge: null,
		tags: ["UX Research", "Python"],
		summary:
			"A quantitative user experience (UX) study conducted on the Goodreads website. The project aimed to evaluate how intuitive, efficient, and satisfying the process is for users when finding a book recommendation",
		body: [
			{
				p: "Goodreads promises easy book discovery, but we wanted to test how it actually feels to use. I worked with a small team of 4 people to run 16 people through three realistic tasks while tracking their mouse movements and asking what they thought afterward.",
			},
			{ h2: "User Journey Mapping" },
			{
				p: "We mapped the complete Goodreads user journey to identify critical pain points. The emotional journey reveals significant drops during \"Exploration & Search\" and \"Post-Interaction\" phases, validating our research focus on book discovery.",
			},
			{
				img: {
					src: "static/projects/user-journey.png",
					w: 4034,
					h: 4041,
					alt: "User journey map of Goodreads, its emotional curve dipping through the Exploration & Search and Post-Interaction phases.",
					caption: null,
				},
			},
			{ h2: "Task 1: Free exploration" },
			{
				p: "New users signed up and searched for a book they'd actually want to read. They rated it 3.9/5. Some liked the clean design, but many found it confusing with too much info and hated signing in just to browse. Mouse paths showed endless loops back to Home and time wasted in empty \"My Books\" section.",
			},
			{ h2: "Task 2: Feature tour" },
			{
				p: "We had users try different features of Goodreads: Similar Books, Explore, Lists, Genres, and Community. Similar Books worked showed the best performance, people spent the longest time exploring it and checking out multiple books. Community feature however was the worst, more than 3+ minutes on average wasted trying to find a book recommendation, users ended up barely finding any books (0.7 books found), and called it a \"Craigslist from 2009.\" due to the old design.",
			},
			{ h2: "Task 3: Gift recommendation" },
			{
				p: "Users browsed a friend's profile to pick a birthday book. This actually worked well, half users gave perfect scores and loved seeing the read lists and favorite genres of their friends.",
			},
			{ h2: "What we learned" },
			{
				p: "More time/clicks directly correlated with lower satisfaction, users who struggled longer hated it more. No filters anywhere was the #1 complaint, blocking refinement of searches. Community screamed for a redesign (visuals, group filters, newbie guidance). Personalization felt weak despite good data like friend profiles. Other gripes: login barrier, info overload, unappealing design. Mouse heatmaps pinpointed dead zones (empty sections) vs. value spots (Similar Books, profiles). Overall, navigation averaged \"okay\" but frustrated enough people that many wouldn't return.",
			},
		],
		polaroids: [
			{
				src: "static/projects/heatmap.png",
				w: 1514,
				h: 1260,
				alt: "Mouse heatmap over the Goodreads interface, hottest across the Browse and My Books navigation items.",
				caption:
					"Heatmap showing users primarily interacted with \"Browse\" and \"My Books\" sections",
				side: "right",
				anchor: 2,
				rot: 3,
			},
			{
				src: "static/projects/avg-time.png",
				w: 3375,
				h: 2534,
				alt: "Bar chart of average time spent per Goodreads feature, with Community far above every other feature.",
				caption:
					"Average time per feature - Community required significantly more time",
				side: "right",
				anchor: 7,
				rot: -6,
			},
			{
				src: "static/projects/helpfullness.png",
				w: 3375,
				h: 2591,
				alt: "Chart of participants' helpfulness ratings per feature: Similar Books at five stars, Community lowest.",
				caption:
					"Similar Books received 5-star ratings; Community section received most negative ratings",
				side: "left",
				anchor: 9,
				rot: 3,
			},
		],
	},

	"ar-city-builder": {
		title: "AR City Builder",
		theme: "peach",
		badge: null,
		tags: ["Unity", "C#", "AR", "Tangible Interactions"],
		summary:
			"An augmented reality urban planning game that brings city management into the physical world through tangible interaction.",
		body: [
			{
				video: {
					id: "odxApuTEADE",
					aspect: "9 / 16",
					title: "AR City Builder video preview",
				},
			},
			{
				p: "AR City Builder brings city management into the real world. You arrange physical cards on a table, each one spawns houses, factories, services, or shops in augmented reality overlaying your physical space. Moving cards physically reshapes your city, making zoning decisions feel immediate and spatial.",
			},
			{
				p: "The city management works around happiness, houses show green/yellow/red diamonds based on nearby services vs. polluting factories. Services need funding or shut down. Factories poison housing but feed commercial zones. Shops only profit from happy, populated areas.",
			},
			// TODO Dimah: this paragraph was pasted in from the Gaussian Splatting page — replace or delete?
			{
				p: "We developed a complete editing system featuring label-based selection through a custom HitTesting algorithm, I focused on implementing the editing features providing GPU-accelerated object movement, visibility controls, and object recoloring. Transformations happen directly in the GPU vertex shader during rendering resulting in smooth interactions even with complex scenes containing massive numbers of Gaussians.",
			},
			{
				p: "We designed double‑sided cards that work as both AR targets and quick reference (cost/effects on back), plus a printed playmat that perfectly matches the virtual city bounds so positioning actually matters in physical space.",
			},
			{
				p: "This became my favorite project. I loved designing the gameplay balance and crafting the physical cards, plus working in AR where digital systems gain real tangibility through physical interaction.",
			},
			{
				link: {
					href: "https://kenney.nl",
					label: "All the virtual assets come from kenney.nl !",
				},
			},
		],
		polaroids: [
			{
				src: "static/projects/physicalCity.jpeg",
				w: 1997,
				h: 1247,
				alt: "The printed playmat on a table with the double-sided building cards laid out across it.",
				caption: "Physical playmat and building cards",
				side: "right",
				anchor: 1,
				rot: 3,
			},
			{
				src: "static/projects/ARCity.png",
				w: 1008,
				h: 2244,
				alt: "The AR view through a phone: houses, factories and shops standing on the playmat between the cards.",
				caption: "This is how the AR city would look like !",
				side: "left",
				anchor: 3,
				rot: -6,
			},
			{
				src: "static/projects/houses.png",
				w: 1008,
				h: 2244,
				alt: "A cluster of AR houses on the playmat, each topped with a green diamond marking high happiness.",
				caption: "AR houses with green happiness indicator",
				side: "right",
				anchor: 5,
				rot: 3,
			},
		],
	},
};

export const slugs = Object.keys(projects);
