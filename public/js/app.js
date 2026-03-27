class JarvisInterface {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.messages = [];
        this.init();
    }

    init() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = Math.min(this.userInput.scrollHeight, 150) + 'px';
        });
        
        this.addWelcomeMessage();
    }

    addWelcomeMessage() {
        setTimeout(() => {
            this.addMessage('JARVIS', 'System ready. All modules operational. How can I assist you, sir?', 'system');
        }, 1000);
    }

    async sendMessage() {
        const content = this.userInput.value.trim();
        if (!content) return;
        
        // Aggiungi messaggio utente
        this.addMessage('You', content, 'user');
        this.userInput.value = '';
        this.userInput.style.height = 'auto';
        
        // Mostra indicator di scrittura
        this.showTypingIndicator();
        
        try {
            const response = await fetch(`${this.apiUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: content }]
                })
            });
            
            const data = await response.json();
            this.hideTypingIndicator();
            
            if (data.success) {
                this.addMessage('JARVIS', data.response, 'system');
                this.simulateHologramEffect();
            } else {
                this.addMessage('JARVIS', `Error: ${data.error}`, 'system');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('JARVIS', `Connection error: ${error.message}`, 'system');
        }
    }
    
    addMessage(sender, content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const time = new Date().toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="message-header">${sender} • ${time}</div>
            <div class="message-content">${this.formatMessage(content)}</div>
            <div class="message-time">${time}</div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Effetto sonoro (opzionale)
        this.playBeep();
    }
    
    formatMessage(content) {
        // Formatta il codice
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="${lang || 'javascript'}">${this.escapeHtml(code)}</code></pre>`;
        });
        
        // Formatta il testo normale
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message system-message typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-header">JARVIS • typing</div>
            <div class="message-content">
                <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </div>
        `;
        this.chatMessages.appendChild(indicator);
        this.scrollToBottom();
        
        // Aggiungi stile per i punti
        const style = document.createElement('style');
        style.textContent = `
            .typing-indicator .dot {
                animation: typing 1.4s infinite;
                opacity: 0;
                font-size: 24px;
            }
            .typing-indicator .dot:nth-child(1) { animation-delay: 0s; }
            .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing {
                0%, 60%, 100% { opacity: 0; }
                30% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    simulateHologramEffect() {
        const core = document.querySelector('.hologram-core');
        if (core) {
            core.style.animation = 'none';
            core.offsetHeight;
            core.style.animation = 'pulse-core 1s ease-in-out infinite';
        }
    }
    
    playBeep() {
        // Effetto sonoro opzionale (richiede Web Audio API)
        if ('speechSynthesis' in window && Math.random() > 0.7) {
            const utterance = new SpeechSynthesisUtterance('Processing');
            utterance.voice = speechSynthesis.getVoices().find(v => v.name.includes('Google UK English Male'));
            utterance.rate = 2;
            speechSynthesis.speak(utterance);
        }
    }
}

// Avvia Jarvis quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    window.jarvis = new JarvisInterface();
});