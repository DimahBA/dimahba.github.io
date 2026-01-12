// animate_chatbubble.js
const bubbles = new Map();

function createBubbleController(id) {
    const el = document.getElementById(id);
    if (!el) return null;

    let floatTimer = null;
    let started = false;

    const resetStyles = () => {
        // Reset to initial hidden state
        el.style.opacity = '0';
        el.style.transform = 'scale(0) translateY(0px)';
        el.style.transition = 'none';
    };

    const startFloating = () => {
        // Smooth float loop with cancel
        let up = true;
        const step = () => {
            if (!floatTimer) return;
            el.style.transition = 'transform 1s ease-in-out';
            el.style.transform = up ? 'scale(1) translateY(-8px)' : 'scale(1) translateY(0px)';
            up = !up;
            floatTimer = setTimeout(step, 1000);
        };
        floatTimer = setTimeout(step, 1000);
    };

    const stopFloating = () => {
        if (floatTimer) {
            clearTimeout(floatTimer);
            floatTimer = null;
        }
    };

    const start = () => {
        if (started) return;
        started = true;

        // Pop in
        el.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.opacity = '1';
        el.style.transform = 'scale(1.05) translateY(0px)';

        setTimeout(() => {
            el.style.transform = 'scale(1) translateY(0px)';
            // Start floating after short settle
            setTimeout(() => {
                stopFloating();
                startFloating();
            }, 200);
        }, 300);
    };

    const stop = () => {
        // Pop out and stop float
        stopFloating();
        started = false;
        el.style.transition = 'all 0.4s ease-out';
        el.style.transform = 'scale(0)';
        el.style.opacity = '0';
    };

    const reset = () => {
        stopFloating();
        started = false;
        resetStyles();
    };

    // Initialize hidden
    resetStyles();

    return { start, stop, reset, element: el };
}

// Public API
window.ChatBubbleAnim = {
    get(id) {
        if (!bubbles.has(id)) {
            bubbles.set(id, createBubbleController(id));
        }
        return bubbles.get(id);
    }
};
