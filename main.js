// main.js
// Main initialization file
// This file brings everything together

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', function () {
    // Create typewriter engine with custom config
    const typewriterEngine = new TypewriterEngine({
        baseSpeed: 20,
        deletingSpeed: 10,
        pauseWords: [',', '.', '!', '?', 'cute things', 'music', 'coffee', 'breather', 'constant', 'peacefulness', 'student', 'website'],
        pauseDuration: 250
    });

    // Initialize intro typewriter
    const introElement = document.getElementById('typewriter-text');
    const introCursor = document.getElementById('cursor');

    if (introElement && introCursor) {
        const introTypewriter = new IntroTypewriter(
            typewriterEngine,
            contentData.introText,
            introElement,
            introCursor
        );

        // Make accessible to section-animations
        window.introTypewriter = introTypewriter;

        // Do NOT auto-start typing here.
        // SectionAnimations will start typing after the chat box animation finishes.
    }

    // Initialize blackboard Q&A
    // Create a separate engine for blackboard to avoid conflicts
    const blackboardEngine = new TypewriterEngine({
        baseSpeed: 30,
        pauseWords: [',', '.', '!', '?'],
        pauseDuration: 200
    });

    blackboardQA = new BlackboardQA(blackboardEngine, contentData.blackboard);
});
