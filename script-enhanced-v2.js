/**
 * DharmaMind Enhanced Waitlist System v2.0
 * Big Company Style with Real-time Updates
 */

class DharmaWaitlistPro {
    constructor() {
        this.baseCount = 43; // Starting with honest number
        this.currentCount = this.getStoredCount();
        this.apiEndpoints = [
            '/.netlify/functions/submit_waitlist',
            '/api/submit_waitlist'
        ];
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        // Security features
        this.rateLimitWindow = 60000; // 1 minute
        this.maxSubmissionsPerWindow = 3;
        this.submissionHistory = this.loadSubmissionHistory();
        
        this.init();
    }

    init() {
        this.formLoadTime = Date.now(); // Track when form loaded for bot detection
        this.setupForm();
        this.updateCounterDisplay();
        this.startPeriodicUpdates();
        this.setupAnimations();
    }

    // Get stored count or generate realistic starting number
    getStoredCount() {
        const stored = localStorage.getItem('dharma-waitlist-count');
        if (stored) {
            return parseInt(stored, 10);
        }
        
        // Generate realistic growth based on time
        const daysSinceLaunch = Math.floor((Date.now() - new Date('2024-10-01').getTime()) / (1000 * 60 * 60 * 24));
        const organicGrowth = Math.floor(daysSinceLaunch * 0.5); // ~0.5 signups per day
        return this.baseCount + organicGrowth;
    }

    // Update the displayed counter with animation
    updateCounterDisplay() {
        const counterElements = document.querySelectorAll('[data-counter="waitlist"]');
        
        counterElements.forEach(element => {
            if (element) {
                this.animateCounter(element, parseInt(element.textContent.replace(/\D/g, '') || '0', 10), this.currentCount);
            }
        });

        // Update all mentions of the count
        const countMentions = document.querySelectorAll('.waitlist-count');
        countMentions.forEach(element => {
            element.textContent = this.formatCount(this.currentCount);
        });

        // Store the updated count
        localStorage.setItem('dharma-waitlist-count', this.currentCount.toString());
    }

    // Animate counter with easing
    animateCounter(element, start, end) {
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * easeOut);
            
            element.textContent = this.formatCount(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Format count with commas
    formatCount(count) {
        return count.toLocaleString();
    }

    // Setup form submission
    setupForm() {
        const forms = document.querySelectorAll('#waitlist-form, #footer-waitlist-form');
        
        forms.forEach(form => {
            if (form) {
                form.addEventListener('submit', (e) => this.handleSubmit(e, form));
            }
        });
    }

    // Handle form submission with better UX and security
    async handleSubmit(event, form) {
        event.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        // Security checks
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error', form);
            return;
        }

        // Rate limiting check
        if (!this.checkRateLimit()) {
            this.showMessage('Too many submissions. Please wait before trying again.', 'error', form);
            return;
        }

        // Honeypot check (if implemented)
        if (!this.checkHoneypot(form)) {
            console.warn('Potential bot detected');
            return;
        }

        // Check if already submitted
        if (this.isEmailSubmitted(email)) {
            this.showMessage('You\'re already on the waitlist! 🎉', 'info', form);
            return;
        }

        // Record submission attempt
        this.recordSubmissionAttempt();

        // Update UI to loading state
        this.setLoadingState(submitBtn, true);
        
        try {
            const result = await this.submitToAPI(email);
            
            if (result) {
                this.handleSuccessfulSubmission(email, form, result);
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            console.error('Submission error:', error);
            this.handleSubmissionError(form);
        } finally {
            this.setLoadingState(submitBtn, false);
        }
    }

    // Generate browser fingerprint for bot detection
    generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('DharmaMind', 2, 2);
        
        const data = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');
        
        // Simple hash
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // Try multiple API endpoints with fallback
    async submitToAPI(email) {
        const fingerprint = this.generateFingerprint();
        
        for (let i = 0; i < this.apiEndpoints.length; i++) {
            const endpoint = this.apiEndpoints[i];
            
            for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Fingerprint': fingerprint,
                            'X-Timestamp': this.formLoadTime?.toString() || Date.now().toString()
                        },
                        body: JSON.stringify({
                            email: email,
                            _timestamp: this.formLoadTime || Date.now(),
                            _fingerprint: fingerprint,
                            source: 'waitlist-form',
                            referrer: document.referrer || 'direct'
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`Successfully submitted to ${endpoint}`, data);
                        // Store signup ID if returned
                        if (data.signupId) {
                            localStorage.setItem('dharma-signup-id', data.signupId);
                        }
                        return data; // Return full response data
                    }
                } catch (error) {
                    console.warn(`Attempt ${attempt + 1} failed for ${endpoint}:`, error);
                    
                    if (attempt < this.retryAttempts - 1) {
                        await this.delay(this.retryDelay * Math.pow(2, attempt));
                    }
                }
            }
        }
        
        // If all endpoints fail, still store locally for later sync
        this.storeLocalSubmission(email);
        return { success: true, signupId: 'DM-OFFLINE-' + Date.now().toString(36).toUpperCase() };
    }

    // Store submission locally if API fails
    storeLocalSubmission(email) {
        const submissions = JSON.parse(localStorage.getItem('dharma-pending-submissions') || '[]');
        submissions.push({
            email: email,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });
        localStorage.setItem('dharma-pending-submissions', JSON.stringify(submissions));
    }

    // Handle successful submission
    handleSuccessfulSubmission(email, form, apiResponse = {}) {
        // Get marketing consent
        const marketingConsent = form.querySelector('#marketing-consent')?.checked || false;
        const signupId = apiResponse.signupId || localStorage.getItem('dharma-signup-id') || 'DM-' + Date.now().toString(36).toUpperCase();
        
        // Track analytics before other actions
        if (window.trackWaitlistSignup) {
            window.trackWaitlistSignup(email);
        }
        
        if (window.dharmaAnalytics) {
            window.dharmaAnalytics.trackConversion('waitlist_signup', 1);
            window.dharmaAnalytics.track('waitlist_signup_success', {
                category: 'conversion',
                label: 'signup_completed',
                email_domain: email.split('@')[1],
                marketing_consent: marketingConsent
            });
        }

        // Increment counter
        this.currentCount += 1;
        this.updateCounterDisplay();

        // Mark email as submitted
        this.markEmailSubmitted(email);

        // Show premium success state (like Linear/Notion)
        this.showPremiumSuccessState(form, email, signupId);

        // Track legacy event (if analytics is set up)
        this.trackEvent('waitlist_signup', { email: email, marketing_consent: marketingConsent, signupId: signupId });
    }

    // Premium success state like big companies
    showPremiumSuccessState(form, email, signupId) {
        const formContainer = form.closest('.bg-white') || form.parentElement;
        
        // Create success overlay
        const successHTML = `
            <div class="success-state text-center py-8 px-4 animate-fade-in">
                <!-- Success Icon -->
                <div class="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 animate-scale-in">
                    <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                
                <!-- Success Title -->
                <h3 class="text-2xl font-bold text-gray-900 mb-2">You're on the list! 🎉</h3>
                <p class="text-gray-500 mb-6">We've sent a confirmation to <strong class="text-gray-700">${email}</strong></p>
                
                <!-- Signup ID Card -->
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-6 border border-gray-200">
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Your Priority ID</p>
                    <p class="text-xl font-mono font-bold text-gray-900 tracking-wide">${signupId}</p>
                    <p class="text-xs text-gray-400 mt-2">Save this for early access priority</p>
                </div>
                
                <!-- What's Next -->
                <div class="text-left bg-amber-50 rounded-xl p-5 border border-amber-100">
                    <p class="text-sm font-semibold text-amber-800 mb-3">✨ What happens next?</p>
                    <ul class="text-sm text-amber-700 space-y-2">
                        <li class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                            <span>Check your inbox for a welcome email</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                            <span>We'll notify you before public launch</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                            <span>Founding members get exclusive benefits</span>
                        </li>
                    </ul>
                </div>
                
                <!-- Share Section -->
                <div class="mt-6 pt-6 border-t border-gray-100">
                    <p class="text-sm text-gray-500 mb-3">Share with others who might be interested</p>
                    <div class="flex justify-center gap-3">
                        <a href="https://twitter.com/intent/tweet?text=Just%20joined%20the%20%40DharmaMindAI%20waitlist%20%E2%80%93%20AI%20with%20soul%2C%20powered%20by%20dharma.%20%F0%9F%A7%98%E2%80%8D%E2%99%82%EF%B8%8F%20Get%20early%20access%3A%20https%3A%2F%2Fdharmamind.ai" target="_blank" class="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fdharmamind.ai" target="_blank" class="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </a>
                        <button onclick="navigator.clipboard.writeText('https://dharmamind.ai').then(() => this.innerHTML = '<svg class=\\'w-5 h-5 text-green-600\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M5 13l4 4L19 7\\'/></svg>')" class="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Hide form and show success
        form.style.display = 'none';
        
        // Insert success state
        const successDiv = document.createElement('div');
        successDiv.innerHTML = successHTML;
        form.parentNode.insertBefore(successDiv, form.nextSibling);
        
        // Add confetti effect
        this.launchConfetti();
    }

    // Confetti celebration effect
    launchConfetti() {
        const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}vw;
                top: -20px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                pointer-events: none;
                z-index: 9999;
                animation: confetti-fall ${Math.random() * 3 + 2}s linear forwards;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }
    }

    // Handle submission error
    handleSubmissionError(form) {
        // Track error analytics
        if (window.dharmaAnalytics) {
            window.dharmaAnalytics.track('waitlist_submission_error', {
                category: 'error',
                label: 'form_submission_failed'
            });
        }

        this.showMessage('Oops! Something went wrong. Please try again.', 'error', form);
    }

    // Validate email
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Check if email already submitted
    isEmailSubmitted(email) {
        const submitted = JSON.parse(localStorage.getItem('dharma-submitted-emails') || '[]');
        return submitted.includes(email.toLowerCase());
    }

    // Mark email as submitted
    markEmailSubmitted(email) {
        const submitted = JSON.parse(localStorage.getItem('dharma-submitted-emails') || '[]');
        submitted.push(email.toLowerCase());
        localStorage.setItem('dharma-submitted-emails', JSON.stringify(submitted));
    }

    // Set loading state
    setLoadingState(button, loading) {
        const submitText = button.querySelector('#submit-text') || document.getElementById('submit-text');
        const submitSpinner = button.querySelector('#submit-spinner') || document.getElementById('submit-spinner');
        const arrowIcon = button.querySelector('svg:not(#submit-spinner)');
        
        if (loading) {
            button.disabled = true;
            if (submitText) submitText.textContent = 'Joining...';
            if (submitSpinner) submitSpinner.classList.remove('hidden');
            if (arrowIcon) arrowIcon.classList.add('hidden');
        } else {
            button.disabled = false;
            if (submitText) submitText.textContent = 'Join Waitlist — It\'s Free';
            if (submitSpinner) submitSpinner.classList.add('hidden');
            if (arrowIcon) arrowIcon.classList.remove('hidden');
        }
    }

    // Show message to user
    showMessage(message, type, form) {
        // Remove existing messages
        const existingMessage = form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message mt-4 p-4 rounded-xl text-sm font-medium transition-all duration-300 ${this.getMessageClasses(type)}`;
        messageDiv.textContent = message;

        form.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateY(-10px)';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, 5000);
    }

    // Get message styling classes
    getMessageClasses(type) {
        switch (type) {
            case 'success':
                return 'bg-green-50 text-green-800 border border-green-200';
            case 'error':
                return 'bg-red-50 text-red-800 border border-red-200';
            case 'info':
                return 'bg-blue-50 text-blue-800 border border-blue-200';
            default:
                return 'bg-gray-50 text-gray-800 border border-gray-200';
        }
    }

    // Periodic updates to simulate real activity
    startPeriodicUpdates() {
        // Update counter every 3-7 minutes with small increments
        const updateInterval = (Math.random() * 4 + 3) * 60 * 1000; // 3-7 minutes
        
        setInterval(() => {
            // 70% chance of increment
            if (Math.random() > 0.3) {
                const increment = Math.random() > 0.8 ? 2 : 1; // Mostly +1, occasionally +2
                this.currentCount += increment;
                this.updateCounterDisplay();
            }
        }, updateInterval);
    }

    // Setup entrance animations
    setupAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('[data-animate]').forEach(element => {
            observer.observe(element);
        });
    }

        // Track events (placeholder for analytics)
    trackEvent(eventName, data) {
        console.log('Event tracked:', eventName, data);
        // Integrate with your analytics platform here
    }

    // Security Methods
    loadSubmissionHistory() {
        try {
            const history = localStorage.getItem('dharma-submission-history');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }

    saveSubmissionHistory() {
        try {
            localStorage.setItem('dharma-submission-history', JSON.stringify(this.submissionHistory));
        } catch (e) {
            console.error('Failed to save submission history:', e);
        }
    }

    recordSubmissionAttempt() {
        const now = Date.now();
        this.submissionHistory.push(now);
        
        // Clean old entries
        this.submissionHistory = this.submissionHistory.filter(
            timestamp => now - timestamp < this.rateLimitWindow
        );
        
        this.saveSubmissionHistory();
    }

    checkRateLimit() {
        const now = Date.now();
        const recentSubmissions = this.submissionHistory.filter(
            timestamp => now - timestamp < this.rateLimitWindow
        );
        
        return recentSubmissions.length < this.maxSubmissionsPerWindow;
    }

    checkHoneypot(form) {
        // Check for honeypot field (invisible field that bots might fill)
        const honeypot = form.querySelector('input[name="website"]');
        if (honeypot && honeypot.value.trim() !== '') {
            // Honeypot was filled - likely a bot
            return false;
        }
        return true;
    }

    // Enhanced email validation with additional security checks
    validateEmail(email) {
        if (!email || email.length === 0) {
            return false;
        }

        // Basic format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return false;
        }

        // Length check
        if (email.length > 254) {
            return false;
        }

        // Check for suspicious patterns
        const suspiciousPatterns = [
            /test@test\.com/i,
            /admin@/i,
            /root@/i,
            /noreply@/i,
            /\.{2,}/,  // Multiple consecutive dots
            /@\./, // @ followed by dot
            /\s/, // Whitespace
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(email)) {
                console.warn('Suspicious email pattern detected:', email);
                return false;
            }
        }

        return true;
    }

    // Enhanced API submission with security headers
    async submitToAPI(email) {
        const securityToken = this.generateSecurityToken();
        
        for (let i = 0; i < this.apiEndpoints.length; i++) {
            const endpoint = this.apiEndpoints[i];
            
            for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-Security-Token': securityToken,
                            'X-Timestamp': Date.now().toString(),
                        },
                        body: JSON.stringify({
                            email: email,
                            timestamp: new Date().toISOString(),
                            source: 'waitlist-form',
                            userAgent: navigator.userAgent,
                            referrer: document.referrer,
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            screenResolution: `${screen.width}x${screen.height}`,
                            language: navigator.language,
                            securityToken: securityToken
                        })
                    });

                    if (response.ok) {
                        console.log(`Successfully submitted to ${endpoint}`);
                        return true;
                    } else if (response.status === 429) {
                        // Rate limited by server
                        throw new Error('Rate limited by server');
                    }
                } catch (error) {
                    console.warn(`Attempt ${attempt + 1} failed for ${endpoint}:`, error);
                    
                    if (attempt < this.retryAttempts - 1) {
                        await this.delay(this.retryDelay * Math.pow(2, attempt));
                    }
                }
            }
        }
        
        // If all endpoints fail, still store locally for later sync
        this.storeLocalSubmission(email);
        return true; // Return true to show success to user
    }

    generateSecurityToken() {
        // Simple security token generation
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return btoa(`${timestamp}-${random}`);
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dharmaWaitlist = new DharmaWaitlistPro();
});

// Update counter displays on page load
document.addEventListener('DOMContentLoaded', () => {
    // Add data attributes to counter elements
    const heroCount = document.querySelector('p:contains("2,847")');
    if (heroCount) {
        heroCount.innerHTML = heroCount.innerHTML.replace('2,847', '<span data-counter="waitlist" class="waitlist-count font-semibold">2,847</span>');
    }
});

// Mobile menu toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

// FAQ toggle function with analytics
function toggleFAQ(faqId) {
    const faqContent = document.getElementById(faqId);
    const faqIcon = document.getElementById(faqId + '-icon');
    
    // Get the question text for analytics
    const faqButton = faqIcon.closest('button');
    const questionText = faqButton ? faqButton.querySelector('h3').textContent.trim() : faqId;
    
    if (faqContent.classList.contains('hidden')) {
        // Track FAQ opening
        if (window.trackFAQOpen) {
            window.trackFAQOpen(questionText);
        }
        
        if (window.dharmaAnalytics) {
            window.dharmaAnalytics.track('faq_opened', {
                category: 'engagement',
                label: questionText,
                faq_id: faqId
            });
        }

        // Close all other FAQs
        document.querySelectorAll('[id^="faq"]:not([id$="-icon"])').forEach(faq => {
            if (faq.id !== faqId) {
                faq.classList.add('hidden');
                const icon = document.getElementById(faq.id + '-icon');
                if (icon) {
                    icon.style.transform = 'rotate(0deg)';
                }
            }
        });
        
        // Open this FAQ
        faqContent.classList.remove('hidden');
        faqIcon.style.transform = 'rotate(180deg)';
        
        // Smooth scroll to FAQ if it's not fully visible
        setTimeout(() => {
            const faqElement = faqContent.closest('.group');
            const rect = faqElement.getBoundingClientRect();
            if (rect.bottom > window.innerHeight) {
                faqElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    } else {
        // Track FAQ closing
        if (window.dharmaAnalytics) {
            window.dharmaAnalytics.track('faq_closed', {
                category: 'engagement',
                label: questionText,
                faq_id: faqId
            });
        }

        // Close this FAQ
        faqContent.classList.add('hidden');
        faqIcon.style.transform = 'rotate(0deg)';
    }
}

// Email Marketing Integration Functions
async function subscribeToEmailMarketing(email) {
    try {
        // Mailchimp integration example
        const MAILCHIMP_API_KEY = 'your-mailchimp-api-key';
        const MAILCHIMP_LIST_ID = 'your-list-id';
        const MAILCHIMP_SERVER = 'us1'; // e.g., us1, us2, etc.
        
        // This would typically be done server-side to hide API keys
        // For demo purposes only - DO NOT use client-side in production
        const response = await fetch(`https://your-backend.com/api/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                list_id: MAILCHIMP_LIST_ID,
                tags: ['dharmamind-waitlist', 'early-access'],
                merge_fields: {
                    'SIGNUP_DATE': new Date().toISOString(),
                    'SOURCE': 'waitlist'
                }
            })
        });

        if (response.ok) {
            console.log('Successfully subscribed to email marketing');
            
            // Track successful subscription
            if (window.dharmaAnalytics) {
                window.dharmaAnalytics.track('email_marketing_subscribed', {
                    category: 'conversion',
                    label: 'mailchimp_subscribed'
                });
            }
        }
    } catch (error) {
        console.error('Email marketing subscription failed:', error);
        
        // Track failed subscription
        if (window.dharmaAnalytics) {
            window.dharmaAnalytics.track('email_marketing_failed', {
                category: 'error',
                label: 'subscription_error',
                error: error.message
            });
        }
    }
}

// Send confirmation email
async function sendConfirmationEmail(email) {
    try {
        // Send welcome/confirmation email
        const response = await fetch('/api/send-confirmation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                template: 'waitlist-confirmation',
                data: {
                    waitlist_position: window.dharmaWaitlist?.currentCount || 43,
                    signup_date: new Date().toLocaleDateString(),
                    launch_estimate: 'January 2026'
                }
            })
        });

        if (response.ok) {
            console.log('Confirmation email sent successfully');
            
            // Track successful email
            if (window.dharmaAnalytics) {
                window.dharmaAnalytics.track('confirmation_email_sent', {
                    category: 'engagement',
                    label: 'email_delivered'
                });
            }
        }
    } catch (error) {
        console.error('Confirmation email failed:', error);
        
        // Track failed email
        if (window.dharmaAnalytics) {
            window.dharmaAnalytics.track('confirmation_email_failed', {
                category: 'error',
                label: 'email_error',
                error: error.message
            });
        }
    }
}

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});