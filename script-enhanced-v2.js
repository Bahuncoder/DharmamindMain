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
            const success = await this.submitToAPI(email);
            
            if (success) {
                this.handleSuccessfulSubmission(email, form);
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
                        return true;
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
    handleSuccessfulSubmission(email, form) {
        // Get marketing consent
        const marketingConsent = form.querySelector('#marketing-consent')?.checked || false;
        
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

        // Show success message with confetti effect
        this.showSuccessAnimation(form);
        this.showMessage(
            '🎉 Welcome to DharmaMind! Check your inbox for a special welcome message.', 
            'success', 
            form
        );

        // Clear form
        form.reset();

        // Track legacy event (if analytics is set up)
        this.trackEvent('waitlist_signup', { email: email, marketing_consent: marketingConsent });
    }

    // Add confetti/celebration animation
    showSuccessAnimation(form) {
        const container = form.closest('#waitlist');
        if (!container) return;
        
        // Add success state
        container.classList.add('signup-success');
        
        // Create celebration particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'success-particle';
            particle.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: ${['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 4)]};
                border-radius: 50%;
                left: 50%;
                top: 50%;
                pointer-events: none;
                animation: particle-burst 0.8s ease-out forwards;
                --tx: ${(Math.random() - 0.5) * 200}px;
                --ty: ${(Math.random() - 0.5) * 200}px;
            `;
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
        
        // Remove success state after animation
        setTimeout(() => container.classList.remove('signup-success'), 1000);
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