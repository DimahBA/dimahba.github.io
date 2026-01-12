// blackboard.js
// Blackboard Q&A interaction system
class BlackboardQA {
    constructor(engine, data) {
        this.engine = engine;
        this.data = data;
        this.currentTopic = null;
        this.previousTopic = null;

        // History stack for robust back navigation
        this.history = [];
        
        // DOM elements
        this.chatBubble = document.getElementById('blackboard-chat-bubble');
        this.dialogue = document.getElementById('blackboard-dialogue');
        this.questionsDiv = document.getElementById('blackboard-questions');
        this.followupsDiv = document.getElementById('blackboard-followups');
        this.answerElement = document.getElementById('blackboard-answer');
        this.cursorElement = document.getElementById('blackboard-cursor');
    }

    selectQuestion(topic) {
        // Normalize "back" actions (support multiple ids like 'previous-topic')
        if (topic === 'back' || topic === 'previous-topic' || topic === 'previous' || topic === 'prev') {
            this.goBack();
            return;
        }
        
        // Handle main menu
        if (topic === 'main') {
            this.reset();
            return;
        }
        
        const topicData = this.data[topic];
        if (!topicData) return;
        
        // Push current topic to history when navigating to a different topic
        if (this.currentTopic && topic !== this.currentTopic) {
            this.history.push(this.currentTopic);
        }

        // Update pointers
        this.previousTopic = this.history.length ? this.history[this.history.length - 1] : null;
        this.currentTopic = topic;

        // Show the selected topic (handles UI + typing)
        this._showTopic(topicData);
    }

    goBack() {
        // If no history, return to main
        if (!this.history.length) {
            this.reset();
            return;
        }

        const prev = this.history.pop();
        const topicData = this.data[prev];
        if (!topicData) {
            this.reset();
            return;
        }

        this.currentTopic = prev;
        this.previousTopic = this.history.length ? this.history[this.history.length - 1] : null;

        this._showTopic(topicData);
    }

    _showTopic(topicData) {
        // Hide chat bubble (keep layout)
        if (this.chatBubble) this.chatBubble.style.opacity = '0';

        // Stop any current typing and clear text to avoid half-filled content
        this.engine.stop();
        if (this.answerElement) this.answerElement.textContent = '';

        setTimeout(() => {
            // Show dialogue (opacity only, element stays mounted)
            if (this.dialogue) this.dialogue.style.opacity = '1';

            // Start typewriter effect
            this.engine.type(topicData.answer, this.answerElement, this.cursorElement, {
                speed: 30
            });
        }, 300);
        
        // Update follow-up buttons
        this.updateFollowups(topicData.followups);
    }

    updateFollowups(followups) {
        if (this.questionsDiv) this.questionsDiv.style.opacity = '0';
        
        setTimeout(() => {
            if (this.questionsDiv) this.questionsDiv.classList.add('hidden');
            if (this.followupsDiv) this.followupsDiv.classList.remove('hidden');
            
            // Build follow-up buttons
            if (this.followupsDiv) {
                this.followupsDiv.innerHTML = followups.map(followup => `
                    <button onclick="blackboardQA.selectQuestion('${followup.id}')" 
                            class="flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer text-left group">
                        <img src="./static/PixelArt/tinyFlower.png" class="w-6 group-hover:scale-110 transition-transform" alt="">
                        <span class="text-white font-serif text-xl group-hover:text-gray-200">${followup.text}</span>
                    </button>
                `).join('');
                
                this.followupsDiv.style.opacity = '0';
                setTimeout(() => {
                    this.followupsDiv.style.opacity = '1';
                }, 50);
            }
        }, 300);
    }

    reset() {
        this.currentTopic = null;
        this.previousTopic = null;
        this.history = [];
        
        // Stop typewriter
        this.engine.stop();
        
        // Hide dialogue (just opacity, keep in DOM)
        if (this.dialogue) this.dialogue.style.opacity = '0';
        
        setTimeout(() => {
            // Clear the answer text
            if (this.answerElement) this.answerElement.textContent = '';
            
            // Show chat bubble
            if (this.chatBubble) this.chatBubble.style.opacity = '1';
        }, 300);
        
        // Reset blackboard to main questions
        if (this.followupsDiv) this.followupsDiv.style.opacity = '0';
        
        setTimeout(() => {
            if (this.followupsDiv) this.followupsDiv.classList.add('hidden');
            if (this.questionsDiv) {
                this.questionsDiv.classList.remove('hidden');
                this.questionsDiv.style.opacity = '1';
            }
        }, 300);
    }
}

// Global instance for onclick handlers
let blackboardQA;
