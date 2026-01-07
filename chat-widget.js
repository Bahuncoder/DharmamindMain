/**
 * DharmaMind Real-Time Chat Widget
 * Professional chat system like Intercom/Zendesk
 */

class DharmaChatWidget {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.userId = this.getUserId();
        this.apiEndpoint = '/api/chat';
        this.websocket = null;
        this.chatElement = null;
        this.unreadCount = 0;
        
        this.init();
    }

    init() {
        this.createChatWidget();
        this.setupEventListeners();
        this.loadWelcomeMessages();
        this.connectWebSocket();
        this.setupAutoResponses();
    }

    // Create the chat widget HTML
    createChatWidget() {
        const chatHTML = `
            <!-- Chat Widget Container -->
            <div id="dharma-chat-widget" class="fixed bottom-6 right-6 z-50 font-inter">
                <!-- Chat Button -->
                <div id="chat-toggle" class="relative cursor-pointer transform transition-all duration-300 hover:scale-105">
                    <div class="w-16 h-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-slate-800 transition-colors duration-300">
                        <svg id="chat-icon" class="w-7 h-7 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        <svg id="close-icon" class="w-6 h-6 absolute inset-0 m-auto hidden transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <!-- Unread badge -->
                    <div id="unread-badge" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold hidden animate-pulse">
                        <span id="unread-count">0</span>
                    </div>
                    <!-- Online indicator -->
                    <div class="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                <!-- Chat Window -->
                <div id="chat-window" class="absolute bottom-20 right-0 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl transform scale-0 origin-bottom-right transition-all duration-300 opacity-0 border border-slate-200 overflow-hidden">
                    <!-- Chat Header -->
                    <div class="bg-slate-900 text-white p-4 rounded-t-2xl">
                        <div class="flex items-center space-x-3">
                            <div class="relative">
                                <div class="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-sm font-semibold">
                                    DM
                                </div>
                                <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div>
                                <h3 class="font-semibold text-lg">DharmaMind Support</h3>
                                <p class="text-slate-300 text-sm">Usually replies instantly</p>
                            </div>
                        </div>
                    </div>

                    <!-- Chat Messages -->
                    <div id="chat-messages" class="flex-1 p-4 space-y-4 h-80 overflow-y-auto bg-slate-50">
                        <!-- Messages will be inserted here -->
                    </div>

                    <!-- Chat Input -->
                    <div class="border-t border-slate-200 p-4 bg-white rounded-b-2xl">
                        <div class="flex space-x-3">
                            <input 
                                type="text" 
                                id="chat-input" 
                                placeholder="Ask us anything..." 
                                class="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-200"
                                maxlength="500"
                            >
                            <button 
                                id="send-button" 
                                class="px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors duration-200 flex items-center justify-center min-w-[3rem]"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                            </button>
                        </div>
                        <p class="text-xs text-slate-500 mt-2 flex items-center">
                            <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Powered by DharmaMind AI
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Insert chat widget into page
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        this.chatElement = document.getElementById('dharma-chat-widget');
    }

    // Setup event listeners
    setupEventListeners() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');

        chatToggle.addEventListener('click', () => this.toggleChat());
        sendButton.addEventListener('click', () => this.sendMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Auto-resize for mobile
        window.addEventListener('resize', () => this.handleResize());
    }

    // Toggle chat window
    toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        const chatIcon = document.getElementById('chat-icon');
        const closeIcon = document.getElementById('close-icon');

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            chatWindow.classList.remove('scale-0', 'opacity-0');
            chatWindow.classList.add('scale-100', 'opacity-100');
            chatIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
            
            // Clear unread count
            this.unreadCount = 0;
            this.updateUnreadBadge();
            
            // Focus input
            setTimeout(() => {
                document.getElementById('chat-input').focus();
            }, 300);
        } else {
            chatWindow.classList.add('scale-0', 'opacity-0');
            chatWindow.classList.remove('scale-100', 'opacity-100');
            chatIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
        }
    }

    // Send message
    sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Simulate AI response
        setTimeout(() => {
            this.hideTypingIndicator();
            this.handleAIResponse(message);
        }, 1000 + Math.random() * 2000); // 1-3 seconds
    }

    // Add message to chat
    addMessage(content, sender, isSystem = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const messageHTML = `
            <div class="flex ${sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up">
                <div class="max-w-xs ${sender === 'user' 
                    ? 'bg-slate-900 text-white' 
                    : isSystem 
                        ? 'bg-blue-50 border border-blue-200 text-blue-800' 
                        : 'bg-white border border-slate-200 text-slate-800'
                } rounded-2xl px-4 py-3 shadow-sm">
                    <p class="text-sm leading-relaxed">${content}</p>
                    <p class="text-xs opacity-70 mt-1">${timestamp}</p>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();

        // Update unread count if chat is closed
        if (!this.isOpen && sender !== 'user') {
            this.unreadCount++;
            this.updateUnreadBadge();
        }

        this.messages.push({ content, sender, timestamp: new Date() });
    }

    // Show typing indicator
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const typingHTML = `
            <div id="typing-indicator" class="flex justify-start animate-fade-in-up">
                <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div class="flex space-x-1">
                        <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
        this.scrollToBottom();
    }

    // Hide typing indicator
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Handle AI responses
    handleAIResponse(userMessage) {
        const message = userMessage.toLowerCase();
        let response = '';

        // Smart responses based on keywords
        if (message.includes('price') || message.includes('cost') || message.includes('free')) {
            response = "DharmaMind will be completely free during the beta phase! We believe ethical AI guidance should be accessible to everyone. 🙏";
        } else if (message.includes('when') || message.includes('launch') || message.includes('available')) {
            response = "We're launching in early 2026! Join our waitlist to get exclusive early access and be among the first to experience AI with soul. ✨";
        } else if (message.includes('dharma') || message.includes('wisdom') || message.includes('philosophy')) {
            response = "DharmaMind combines timeless Dharma wisdom with cutting-edge AI to provide ethical guidance for modern life. It's like having a wise mentor available 24/7. Check our FAQ section to learn more about Dharma, Karma, and other key concepts! 🧘‍♂️";
        } else if (message.includes('karma') || message.includes('law of karma')) {
            response = "Karma is the universal law of cause and effect in Hindu philosophy. Every action creates consequences that shape our future. DharmaMind helps you make choices that generate positive karma through compassion and righteousness. ✨";
        } else if (message.includes('moksha') || message.includes('liberation') || message.includes('enlightenment')) {
            response = "Moksha is the ultimate goal - liberation from suffering and realization of your true divine nature. DharmaMind guides you toward practices that cultivate inner peace and self-realization. 🕉️";
        } else if (message.includes('atman') || message.includes('self') || message.includes('soul')) {
            response = "Atman is your true, eternal Self - the divine consciousness within you. DharmaMind helps you connect with this deeper identity beyond the ego-mind through wisdom and self-awareness practices. 🌟";
        } else if (message.includes('email') || message.includes('waitlist') || message.includes('join')) {
            response = "You can join our waitlist right here on this page! Just enter your email above and you'll be among the first to know when we launch. No spam, ever! 📧";
        } else if (message.includes('ai') || message.includes('artificial intelligence')) {
            response = "Our AI is designed to be ethical, compassionate, and rooted in timeless wisdom. Unlike other AI systems, DharmaMind prioritizes your wellbeing and moral growth. 🤖💚";
        } else if (message.includes('help') || message.includes('support')) {
            response = "I'm here to help! You can ask me about DharmaMind features, pricing, launch timeline, or anything else. What would you like to know? 😊";
        } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            response = "Hello! Welcome to DharmaMind. I'm here to answer any questions about our AI with soul. What would you like to know? 👋";
        } else {
            // Generic responses
            const genericResponses = [
                "That's a great question! DharmaMind is designed to help with exactly these kinds of inquiries. Would you like to join our waitlist for early access? 🌟",
                "I'd love to help you with that! Our AI will be able to provide much deeper insights. Join our waitlist to be the first to experience it! ✨",
                "Interesting question! DharmaMind's ethical AI will excel at providing thoughtful guidance on topics like this. Want to be notified when we launch? 🧘",
                "Thank you for your question! Our team is working hard to create an AI that can address complex topics with wisdom and compassion. Join our waitlist! 💫"
            ];
            response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
        }

        this.addMessage(response, 'bot');
    }

    // Load welcome messages
    loadWelcomeMessages() {
        setTimeout(() => {
            this.addMessage("Welcome to DharmaMind! 👋", 'bot', true);
        }, 1000);

        setTimeout(() => {
            this.addMessage("I'm here to answer any questions about our AI with soul. How can I help you today?", 'bot');
        }, 2500);
    }

    // Auto-responses based on page behavior
    setupAutoResponses() {
        // Show message when user hovers over waitlist form
        let hasShownWaitlistHint = false;
        const waitlistForm = document.getElementById('waitlist-form');
        
        if (waitlistForm) {
            waitlistForm.addEventListener('mouseenter', () => {
                if (!hasShownWaitlistHint && !this.isOpen) {
                    setTimeout(() => {
                        this.addMessage("Need help joining the waitlist? I'm here to assist! 😊", 'bot');
                        hasShownWaitlistHint = true;
                    }, 2000);
                }
            });
        }

        // Show message after user spends time on page
        setTimeout(() => {
            if (!this.isOpen && this.messages.length < 5) {
                this.addMessage("Questions about DharmaMind? Click here to chat! 💬", 'bot');
            }
        }, 30000); // 30 seconds
    }

    // Update unread badge
    updateUnreadBadge() {
        const badge = document.getElementById('unread-badge');
        const count = document.getElementById('unread-count');
        
        if (this.unreadCount > 0) {
            badge.classList.remove('hidden');
            count.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
        } else {
            badge.classList.add('hidden');
        }
    }

    // Scroll to bottom of messages
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }

    // Handle responsive design
    handleResize() {
        const chatWindow = document.getElementById('chat-window');
        if (window.innerWidth < 480) {
            chatWindow.classList.add('w-full', 'h-full', 'fixed', 'inset-0', 'rounded-none');
            chatWindow.classList.remove('w-96', 'h-[32rem]', 'absolute', 'bottom-20', 'right-0', 'rounded-2xl');
        } else {
            chatWindow.classList.remove('w-full', 'h-full', 'fixed', 'inset-0', 'rounded-none');
            chatWindow.classList.add('w-96', 'h-[32rem]', 'absolute', 'bottom-20', 'right-0', 'rounded-2xl');
        }
    }

    // Get or create user ID
    getUserId() {
        let userId = localStorage.getItem('dharma-user-id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('dharma-user-id', userId);
        }
        return userId;
    }

    // Connect WebSocket (placeholder for real-time functionality)
    connectWebSocket() {
        // This would connect to your real-time server
        // For now, we'll simulate with setTimeout
        console.log('Chat widget initialized with user ID:', this.userId);
    }
}

// Initialize chat widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
        window.dharmaChatWidget = new DharmaChatWidget();
    }, 2000);
});

// Add required CSS for animations
const chatStyles = `
<style>
@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in-up {
    animation: fade-in-up 0.3s ease-out;
}

/* Custom scrollbar for chat */
#chat-messages::-webkit-scrollbar {
    width: 4px;
}

#chat-messages::-webkit-scrollbar-track {
    background: #f1f5f9;
}

#chat-messages::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
}

#chat-messages::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

/* Mobile responsive adjustments */
@media (max-width: 480px) {
    #dharma-chat-widget {
        bottom: 1rem;
        right: 1rem;
    }
}
</style>`;

document.head.insertAdjacentHTML('beforeend', chatStyles);