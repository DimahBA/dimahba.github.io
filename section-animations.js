// section-animations.js
// Section entrance/exit animation system using Tailwind classes + controlled JS
class SectionAnimations {
    constructor() {
        this.introSection = null;
        this.blackboardSection = null;
        this.observers = [];

        this.introBubble = null;
        this.blackboardBubble = null;

        this.introIn = false;
        this.blackboardIn = false;
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.introSection = document.querySelector('.bg-green-background');
        this.blackboardSection = document.getElementById('blackboard-section');
        if (!this.introSection || !this.blackboardSection) return;

        // Bubble controllers
        this.introBubble = window.ChatBubbleAnim.get('chat-bubble');
        this.blackboardBubble = window.ChatBubbleAnim.get('blackboard-chat-bubble');

        // Ensure initial states
        this.setIntroInitialState();
        this.setBlackboardInitialState();

        this.createObserver(this.introSection, 'intro');
        this.createObserver(this.blackboardSection, 'blackboard');
    }

    setIntroInitialState() {
        const circle = document.getElementById('chibi-circle');
        const box = document.getElementById('chat-box');
        if (this.introBubble) this.introBubble.reset();

        if (circle) {
            circle.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
            circle.classList.add('opacity-0', 'scale-0');
        }
        if (box) {
            box.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
            box.classList.add('opacity-0', 'scale-0');
        }
    }

    setBlackboardInitialState() {
        const circle = document.getElementById('blackboard-chibi');
        const dialogue = document.getElementById('blackboard-dialogue');
        if (this.blackboardBubble) this.blackboardBubble.reset();

        if (circle) {
            circle.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
            circle.classList.add('opacity-0', 'scale-0');
        }
        if (dialogue) {
            dialogue.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
            dialogue.classList.add('opacity-0', 'scale-0');
        }
    }

    createObserver(section, name) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (name === 'intro') this.handleIntro(entry);
                else this.handleBlackboard(entry);
            });
        }, { threshold: 0.3, rootMargin: '-50px' });

        observer.observe(section);
        this.observers.push(observer);
    }

    handleIntro(entry) {
        const circle = document.getElementById('chibi-circle');
        const box = document.getElementById('chat-box');

        if (entry.isIntersecting) {
            if (this.introIn) return;
            this.introIn = true;

            // Ensure the typewriter is blank and idle BEFORE showing the box
            if (window.introTypewriter) {
                window.introTypewriter.reset();
            }

            // 1) Circle (Tailwind pop)
            if (circle) {
                circle.classList.remove('opacity-0', 'scale-0');
                circle.classList.add('animate-pop');
            }

            // 2) Bubble (pop + float) after circle
            setTimeout(() => {
                if (this.introBubble) {
                    this.introBubble.reset();
                    this.introBubble.start();
                }
            }, 1000);

            // 3) Box pops in; start typing ONLY AFTER its animation ends
            setTimeout(() => {
                if (box) {
                    // Remove any previous animation classes to retrigger animation cleanly
                    box.classList.remove('animate-pop', 'animate-strong-pop');
                    box.classList.remove('opacity-0', 'scale-0');
                    // Listen once for the animation end to start typing
                    const onAnimEnd = () => {
                        box.removeEventListener('animationend', onAnimEnd);
                        // Small safety delay so it's fully visible
                        setTimeout(() => {
                            if (window.introTypewriter) window.introTypewriter.start();
                        }, 30);
                    };
                    box.addEventListener('animationend', onAnimEnd, { once: true });
                    box.classList.add('animate-quick-pop');
                }
            }, 300);

        } else {
            if (!this.introIn) return;
            this.introIn = false;

            // Immediately stop and clear the typewriter so the box is empty while hidden
            if (window.introTypewriter) {
                window.introTypewriter.reset();
            }

            // Exit: box -> circle -> bubble
            if (box) {
                box.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
                box.classList.add('opacity-0', 'scale-0');
            }

            setTimeout(() => {
                if (circle) {
                    circle.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
                    circle.classList.add('opacity-0', 'scale-0');
                }
            }, 100);

            setTimeout(() => {
                if (this.introBubble) this.introBubble.stop();
            }, 200);
        }
    }

    handleBlackboard(entry) {
        const circle = document.querySelector('.bg-orange-200');
        const dialogue = document.getElementById('blackboard-dialogue');

        if (entry.isIntersecting) {
            if (this.blackboardIn) return;
            this.blackboardIn = true;

            // 1) Circle first (Tailwind pop)
            if (circle) {
                circle.classList.remove('opacity-0', 'scale-0');
                circle.classList.add('animate-pop');
            }

            // 2) Bubble pop+float after circle
            setTimeout(() => {
                if (this.blackboardBubble) {
                    this.blackboardBubble.reset();
                    this.blackboardBubble.start();
                }
            }, 500);

            // 3) Dialogue ready (scale in, but keep opacity 0 until answer)
            setTimeout(() => {
                if (dialogue) {
                    dialogue.classList.remove('opacity-0', 'scale-0');
                    // Keep opacity 0; BlackboardQA will set opacity 1 when an answer is shown
                    dialogue.style.opacity = '0';
                }
            }, 1000);

        } else {
            if (!this.blackboardIn) return;
            this.blackboardIn = false;

            // Exit: dialogue -> circle -> bubble
            if (dialogue) {
                dialogue.classList.add('opacity-0', 'scale-0');
                dialogue.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
            }

            setTimeout(() => {
                if (circle) {
                    circle.classList.remove('animate-pop', 'animate-quick-pop', 'animate-strong-pop');
                    circle.classList.add('opacity-0', 'scale-0');
                }
            }, 100);

            setTimeout(() => {
                if (this.blackboardBubble) this.blackboardBubble.stop();
            }, 200);

            setTimeout(() => {
                if (window.blackboardQA) window.blackboardQA.reset();
            }, 600);
        }
    }

    destroy() {
        this.observers.forEach(o => o.disconnect());
        this.observers = [];
    }
}

const sectionAnimations = new SectionAnimations();
sectionAnimations.init();
if (typeof window !== 'undefined') window.sectionAnimations = sectionAnimations;
