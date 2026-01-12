// intro-typewriter.js
// Intro section typewriter - handles the cycling text animation
class IntroTypewriter {
    constructor(engine, chunks, element, cursor) {
        this.engine = engine;
        this.chunks = chunks;
        this.element = element;
        this.cursor = cursor;

        this.currentChunkIndex = 0;
        this.isDeleting = false;
        this.isWaiting = false;

        this.waitTime = 3000;
        this.deleteWaitTime = 1000;

        // Guard to avoid double-starts and allow restart after reset
        this.running = false;

        // Track internal timers so we can cancel them on reset/stop
        this.timers = new Set();
    }

    setTimer(fn, delay) {
        const id = setTimeout(() => {
            this.timers.delete(id);
            // If we've been reset/stopped meanwhile, do nothing
            if (!this.running) return;
            fn();
        }, delay);
        this.timers.add(id);
        return id;
    }

    clearTimers() {
        this.timers.forEach(clearTimeout);
        this.timers.clear();
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.typeCurrentChunk();
    }

    typeCurrentChunk() {
        if (!this.running) return;

        if (this.currentChunkIndex >= this.chunks.length) {
            // All chunks done
            this.running = false; // allow future restarts if needed
            return;
        }

        const chunk = this.chunks[this.currentChunkIndex];
        const isLastChunk = this.currentChunkIndex >= this.chunks.length - 1;

        this.engine.typeHTML(chunk.html, this.element, this.cursor, {
            onComplete: () => {
                if (!this.running) return;

                if (isLastChunk) {
                    // Last chunk - keep cursor visible and stop
                    this.running = false; // allow start() to work again later
                    return;
                }

                // Not last chunk - wait then delete
                this.setTimer(() => {
                    this.deleteCurrentChunk();
                }, this.deleteWaitTime);
            }
        });
    }

    deleteCurrentChunk() {
        if (!this.running) return;

        this.engine.delete(this.element, () => {
            if (!this.running) return;

            // Move to next chunk
            this.currentChunkIndex++;

            // Short pause before typing next chunk
            this.setTimer(() => {
                this.typeCurrentChunk();
            }, this.engine.baseSpeed);
        });
    }

    stop() {
        // Stop engine and any scheduled internal timers (but keep running flag)
        this.engine.stop();
        this.clearTimers();
    }

    reset() {
        // stop any ongoing typing and scheduled timers
        this.engine.stop();
        this.clearTimers();

        // rewind to first chunk
        this.currentChunkIndex = 0;
        this.isDeleting = false;
        this.isWaiting = false;

        // allow start again
        this.running = false;

        // clear displayed text and show cursor again
        if (this.element) {
            this.element.innerHTML = ''; // ensure fully cleared (text or HTML)
        }
        if (this.cursor) {
            this.cursor.classList.remove('cursor-hidden');
            this.cursor.classList.add('cursor-blink');
        }
    }
}
