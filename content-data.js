// All text content for the website
const contentData = {
    // Intro typewriter chunks
    introText: [
        {
            text: "I'm an IT student who likes cute things, music, and coffee!",
            html: "I'm an IT student who likes cute things, music, and <span class='font-bold'>coffee!</span>"
        },
        {
            text: "This website is my attempt to recreate the peacefulness that coffee gives me in the digital world ...",
            html: "This website is my attempt to recreate the peacefulness that coffee gives me in the digital world ..."
        },
        {
            text: "Consider it a place to take a breather .. from that constant motion of the internet.",
            html: "Consider it a place to take a breather .. from that constant motion of the internet."
        },
        {
            text: "Enjoy your stay !",
            html: "Enjoy your stay !"
        }
    ],

    // Q&A Blackboard content
    blackboard: {
        education: {
            answer: "I'm a Master's student in IT with a focus on Computer Graphics and Human-Computer interactions. I love exploring how technology can create beautiful experiences, especially in AR settings.",
            followups: [
                { id: 'education-uni', text: 'Which university?' },
                { id: 'education-skills', text: 'Key skills?' },
                { id: 'back', text: '← Back' }
            ]
        },
        'education-uni': {
            answer: "I'm studying at Institut Polytechnique de Paris!",
            followups: [
                { id: 'back', text: '← Back to Education' },
                { id: 'main', text: '← Main Menu' }
            ]
        },

        'education-skills': {
            answer: "I've developed skills in Unity 3D, C++, and JavaScript. And I learned a lot about usability and design throughout my studies.",
            followups: [
                { id: 'back', text: '← Back to Education' },
                { id: 'main', text: '← Main Menu' }
            ]
        },
        projects: {
            answer: "I have lots of projects .. Check them out below !",
            followups: [
                { id: 'projects-favorite', text: 'Favorite project?' },
                { id: 'projects-future', text: 'Future plans?' },
                { id: 'back', text: '← Back' }
            ]
        },
        'projects-favorite': {
            answer: "My favorite project is the AR Pathfinding system for Parkinson's patients. It was my personal research project where I got to see a real impact on patients who suffered from mobility issues. It was an example of how technology can make people's lives a bit better and it's what I would love to work on in the future.",
            followups: [
                { id: 'back', text: '← Back to Projects' },
                { id: 'main', text: '← Main Menu' }
            ]
        },

        'projects-future': {
            answer: "I want to explore more AR/VR applications in healthcare and education. The potential to create accessible, helpful technology really motivates me!",
            followups: [
                { id: 'back', text: '← Back to Projects' },
                { id: 'main', text: '← Main Menu' }
            ]
        },
        music: {
            answer: "I love music .. what would you like to know ?",
            followups: [
                { id: 'music-instruments', text: 'What instruments?' },
                { id: 'music-genres', text: 'Favorite genres?' },
                { id: 'back', text: '← Back' }
            ]
        },
        'music-instruments': {
            answer: "I play piano, guitar, and violin!",
            followups: [
                { id: 'back', text: '← Back to Music' },
                { id: 'main', text: '← Main Menu' }
            ]
        },
        'music-genres': {
            answer: "I love Heavy Metal and Electro.",
            followups: [
                { id: 'back', text: '← Back to Music' },
                { id: 'main', text: '← Main Menu' }
            ]
        },

        'cats-dogs': {
            answer: "Definitely cats! 🐱",
            followups: [
                { id: 'cats-dogs-pet', text: 'Do you have a cat?' },
                { id: 'back', text: '← Back' }
            ]
        },
        'cats-dogs-why': {
            answer: "Cats are like elegant code - efficient, independent, and sometimes unpredictable! They respect your space but show affection on their own terms.",
            followups: [
                { id: 'back', text: '← Back to Cats or Dogs' },
                { id: 'main', text: '← Main Menu' }
            ]
        },
        'cats-dogs-pet': {
            answer: "Sadly not, I've never had one .. But I can't wait !",
            followups: [
                { id: 'back', text: '← Back to Cats or Dogs' },
                { id: 'main', text: '← Main Menu' }
            ]
        }
    }
};