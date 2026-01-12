// typewriter.js
// Reusable typewriter effect engine
class TypewriterEngine {
    constructor(config = {}) {
        this.baseSpeed = config.baseSpeed || 20;
        this.deletingSpeed = config.deletingSpeed || 10;
        this.pauseWords = config.pauseWords || [',', '.', '!', '?'];
        this.pauseDuration = config.pauseDuration || 250;
        this.timeout = null;
    }

    /**
     * Types text with natural pauses
     * @param {string} text - The text to type
     * @param {HTMLElement} element - The element to type into
     * @param {HTMLElement} cursor - The cursor element
     * @param {Object} options - Additional options
     */
    type(text, element, cursor, options = {}) {
        const speed = options.speed || this.baseSpeed;
        
        // Clear any existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        // Reset element
        element.textContent = '';
        
        // Show cursor
        if (cursor) {
            cursor.classList.remove('cursor-hidden');
            cursor.classList.add('cursor-blink');
        }
        
        let i = 0;
        
        const typeChar = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                
                // Calculate next speed with natural pauses
                const currentChar = text[i];
                const nextSpeed = this.getTypingSpeed(currentChar, text.substring(0, i));
                
                i++;
                this.timeout = setTimeout(typeChar, nextSpeed);
            } else {
                // Typing complete
                if (options.onComplete) {
                    options.onComplete();
                }
                
                // Hide cursor after completion
                if (cursor && !options.keepCursor) {
                    setTimeout(() => {
                        cursor.classList.add('cursor-hidden');
                    }, 1000);
                }
            }
        };
        
        typeChar();
    }

    /**
     * Types HTML content (preserves formatting)
     * @param {string} html - HTML string to render
     * @param {HTMLElement} element - The element to type into
     * @param {HTMLElement} cursor - The cursor element
     * @param {Object} options - Additional options
     */
    typeHTML(html, element, cursor, options = {}) {
        // Extract plain text for typing simulation
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const plainText = tempDiv.textContent || tempDiv.innerText;
        
        const speed = options.speed || this.baseSpeed;
        
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        element.textContent = '';
        
        if (cursor) {
            cursor.classList.remove('cursor-hidden');
            cursor.classList.add('cursor-blink');
        }
        
        let i = 0;
        
        const typeChar = () => {
            if (i < plainText.length) {
                element.textContent = plainText.substring(0, i + 1);
                
                const currentChar = plainText[i];
                const nextSpeed = this.getTypingSpeed(currentChar, plainText.substring(0, i));
                
                i++;
                this.timeout = setTimeout(typeChar, nextSpeed);
            } else {
                // Show final HTML version
                element.innerHTML = html;
                
                if (options.onComplete) {
                    options.onComplete();
                }
                
                if (cursor && !options.keepCursor) {
                    setTimeout(() => {
                        cursor.classList.add('cursor-hidden');
                    }, 1000);
                }
            }
        };
        
        typeChar();
    }

    /**
     * Deletes text with animation
     * @param {HTMLElement} element - The element containing text
     * @param {Function} onComplete - Callback when deletion completes
     */
    delete(element, onComplete) {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        const text = element.textContent;
        let i = text.length;
        
        const deleteChar = () => {
            if (i > 0) {
                element.textContent = text.substring(0, i - 1);
                i--;
                this.timeout = setTimeout(deleteChar, this.deletingSpeed);
            } else {
                if (onComplete) {
                    onComplete();
                }
            }
        };
        
        deleteChar();
    }

    /**
     * Calculate typing speed with natural pauses
     */
    getTypingSpeed(currentChar, previousChars) {
        // Pause after punctuation
        if ([',', '.', '!', '?'].includes(currentChar)) {
            return this.baseSpeed + 300;
        }
        
        // Pause after specific words
        const lastWord = previousChars.split(' ').pop();
        if (this.pauseWords.includes(lastWord) && currentChar === ' ') {
            return this.baseSpeed + this.pauseDuration;
        }
        
        // Random slight variation for natural feel
        return this.baseSpeed + Math.random() * 20;
    }

    /**
     * Stop any ongoing typing animation
     */
    stop() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TypewriterEngine;
}
