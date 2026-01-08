// Netlify serverless function for waitlist submission
// Enterprise Grade v4.1 - Production-ready with persistent storage
// Features: Rate limiting, bot protection, email validation, analytics, Netlify Blobs storage

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  version: '4.1.0',
  rateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,           // per IP per hour
    blockDuration: 24 * 60 * 60 * 1000 // 24 hour block for abuse
  },
  email: {
    maxLength: 254,
    minLength: 5,
    blockedDomains: [
      'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
      'temp-mail.org', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
      'yopmail.com', 'getnada.com', 'mohmal.com', 'tempail.com', 'tmpmail.org',
      'sharklasers.com', 'guerrillamail.info', 'grr.la', 'spam4.me'
    ]
  },
  security: {
    honeypotField: 'website', // Hidden field bots fill out
    minSubmitTime: 2000,      // Minimum time to fill form (ms) - blocks bots
    maxSubmitTime: 600000     // Maximum time (10 min) - blocks replay attacks
  }
};

// CORS headers with security
const headers = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, X-Fingerprint, X-Timestamp',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// ============================================
// IN-MEMORY STORES (For rate limiting - OK to reset)
// ============================================

const rateLimitStore = new Map();
const blockedIPs = new Set();
const analyticsBuffer = [];

// ============================================
// PERSISTENT STORAGE (Netlify Blobs)
// ============================================

async function getWaitlistStore() {
  return getStore('waitlist');
}

async function getSignups() {
  try {
    const store = await getWaitlistStore();
    const data = await store.get('signups', { type: 'json' });
    return data || [];
  } catch (error) {
    console.error('Error reading signups:', error);
    return [];
  }
}

async function saveSignup(signup) {
  try {
    const store = await getWaitlistStore();
    const signups = await getSignups();
    signups.push(signup);
    await store.setJSON('signups', signups);
    return true;
  } catch (error) {
    console.error('Error saving signup:', error);
    return false;
  }
}

async function emailExists(emailHash) {
  const signups = await getSignups();
  return signups.some(s => s.emailHash === emailHash);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate unique signup ID
function generateSignupId() {
  return `DM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Hash email for privacy-safe storage
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

// Sanitize input to prevent XSS/injection
function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[<>\"'&]/g, '')
    .substring(0, 500);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

// Comprehensive email validation
function validateEmail(email) {
  const errors = [];
  
  if (!email) {
    return { valid: false, errors: ['Email is required'] };
  }

  const sanitized = sanitize(email);

  // Length check
  if (sanitized.length < CONFIG.email.minLength) {
    errors.push('Email is too short');
  }
  if (sanitized.length > CONFIG.email.maxLength) {
    errors.push('Email is too long');
  }

  // Format validation (RFC 5322 compliant)
  const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
  
  if (!emailRegex.test(sanitized)) {
    errors.push('Invalid email format');
  }

  // Domain extraction and validation
  const domain = sanitized.split('@')[1];
  if (domain) {
    // Block disposable email domains
    if (CONFIG.email.blockedDomains.some(blocked => domain.includes(blocked))) {
      errors.push('Please use a permanent email address');
    }

    // Check for valid TLD
    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2) {
      errors.push('Invalid email domain');
    }
  }

  return {
    valid: errors.length === 0,
    email: sanitized,
    domain,
    errors
  };
}

// ============================================
// RATE LIMITING
// ============================================

function checkRateLimit(ip) {
  const now = Date.now();
  
  // Check if IP is blocked
  if (blockedIPs.has(ip)) {
    return { allowed: false, reason: 'IP temporarily blocked due to abuse', retryAfter: 86400 };
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(ip);
  
  if (!entry) {
    entry = { requests: [], blocked: false };
    rateLimitStore.set(ip, entry);
  }

  // Clean old requests outside window
  entry.requests = entry.requests.filter(time => now - time < CONFIG.rateLimit.windowMs);

  // Check if over limit
  if (entry.requests.length >= CONFIG.rateLimit.maxRequests) {
    // Block IP if severely abusing
    if (entry.requests.length >= CONFIG.rateLimit.maxRequests * 2) {
      blockedIPs.add(ip);
      console.warn(`🚫 IP blocked for abuse: ${ip}`);
    }
    
    const oldestRequest = Math.min(...entry.requests);
    const retryAfter = Math.ceil((oldestRequest + CONFIG.rateLimit.windowMs - now) / 1000);
    
    return { 
      allowed: false, 
      reason: 'Too many requests. Please try again later.',
      retryAfter,
      remaining: 0
    };
  }

  // Record this request
  entry.requests.push(now);

  return { 
    allowed: true, 
    remaining: CONFIG.rateLimit.maxRequests - entry.requests.length,
    resetAt: new Date(now + CONFIG.rateLimit.windowMs).toISOString()
  };
}

// ============================================
// BOT DETECTION
// ============================================

function detectBot(event, body) {
  const flags = [];
  let score = 0;

  // Check honeypot field
  if (body[CONFIG.security.honeypotField]) {
    flags.push('honeypot_filled');
    score += 100;
  }

  // Check submission timing
  const timestamp = parseInt(body._timestamp || body.timestamp || '0');
  if (timestamp) {
    const elapsed = Date.now() - timestamp;
    if (elapsed < CONFIG.security.minSubmitTime) {
      flags.push('too_fast');
      score += 50;
    }
    if (elapsed > CONFIG.security.maxSubmitTime) {
      flags.push('too_slow');
      score += 20;
    }
  }

  // Check for suspicious user agents
  const userAgent = event.headers['user-agent'] || '';
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java\//i, /php\//i, /^$/
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    flags.push('suspicious_ua');
    score += 30;
  }

  // Check for missing headers typical in browsers
  if (!event.headers['accept-language']) {
    flags.push('no_accept_language');
    score += 15;
  }
  if (!event.headers['accept']) {
    flags.push('no_accept');
    score += 10;
  }

  // Check fingerprint (if provided by frontend)
  const fingerprint = event.headers['x-fingerprint'];
  if (!fingerprint && body._fingerprint) {
    // Fingerprint in body but not header - might be replayed
    flags.push('fingerprint_mismatch');
    score += 20;
  }

  return {
    isBot: score >= 50,
    score,
    flags,
    confidence: Math.min(score, 100)
  };
}

// ============================================
// EMAIL SENDING
// ============================================

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  console.log(`📧 SMTP Config: host=${host}, port=${port}, user=${user ? user.substring(0, 5) + '***' : 'NOT SET'}, pass=${pass ? '***SET***' : 'NOT SET'}`);
  
  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
}

// Send admin notification with enhanced details
async function sendAdminNotification(data) {
  const { email, signupId, ip, userAgent, country, referrer, botScore } = data;
  const transporter = createTransporter();
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
        
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🎉 New Waitlist Signup</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 14px;">Signup ID: ${signupId}</p>
        </div>

        <div style="padding: 30px;">
            <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Contact Details</h3>
                <p style="margin: 0; color: #f1f5f9; font-size: 18px;">
                    <a href="mailto:${email}" style="color: #60a5fa; text-decoration: none;">${email}</a>
                </p>
            </div>

            <div style="display: grid; gap: 15px;">
                <div style="background-color: #0f172a; border-radius: 8px; padding: 15px;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Time (UTC)</span>
                    <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 14px;">${new Date().toISOString()}</p>
                </div>
                <div style="background-color: #0f172a; border-radius: 8px; padding: 15px;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">IP Address</span>
                    <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 14px;">${ip}</p>
                </div>
                <div style="background-color: #0f172a; border-radius: 8px; padding: 15px;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Bot Score</span>
                    <p style="color: ${botScore > 30 ? '#f87171' : '#10b981'}; margin: 5px 0 0 0; font-size: 14px;">${botScore}/100 ${botScore > 30 ? '⚠️' : '✅'}</p>
                </div>
                <div style="background-color: #0f172a; border-radius: 8px; padding: 15px;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Referrer</span>
                    <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 14px;">${referrer || 'Direct'}</p>
                </div>
            </div>

            <div style="margin-top: 25px; text-align: center;">
                <a href="mailto:${email}?subject=Welcome to DharmaMind!" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Reply to User</a>
            </div>
        </div>

        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">DharmaMind Enterprise Waitlist v${CONFIG.version}</p>
        </div>
    </div>
</body>
</html>`;

  try {
    console.log(`📧 Attempting to send admin notification to: ${adminEmail}`);
    const info = await transporter.sendMail({
      from: `"DharmaMind System" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🎉 New Signup: ${email} [${signupId}]`,
      html: htmlContent,
      text: `New Waitlist Signup!\n\nID: ${signupId}\nEmail: ${email}\nTime: ${new Date().toISOString()}\nIP: ${ip}\nBot Score: ${botScore}/100`,
      priority: 'high'
    });
    console.log(`✅ Admin notification sent successfully! MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Admin notification failed:', error.message);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
}

// Send welcome email with waitlist position
async function sendWelcomeEmail(email, signupId, position) {
  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 60px 40px; text-align: center; border-bottom: 1px solid #475569;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #475569 0%, #64748b 100%); border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">🧘</span>
            </div>
            <h1 style="color: #f8fafc; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">DharmaMind</h1>
            <p style="color: #94a3b8; margin: 12px 0 0 0; font-size: 16px; font-weight: 400;">AI with Soul. Powered by Dharma.</p>
        </div>

        <!-- Welcome Badge -->
        <div style="text-align: center; padding: 40px 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 8px 20px; border-radius: 100px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ✨ You're In!
            </div>
        </div>

        <!-- Content -->
        <div style="padding: 30px 40px 50px;">
            <h2 style="color: #f8fafc; font-size: 28px; margin: 0 0 15px 0; text-align: center; font-weight: 600;">Welcome to the Journey</h2>
            
            <p style="color: #94a3b8; line-height: 1.8; font-size: 16px; text-align: center; margin: 0 0 30px 0;">
                You've taken the first step towards transforming your life with mindful AI guidance. We're honored to have you join our community of seekers.
            </p>

            <!-- Position Card -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 30px; margin: 30px 0; border: 1px solid #334155; text-align: center;">
                <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0;">Your Signup ID</p>
                <p style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0; font-family: 'SF Mono', 'Consolas', monospace;">${signupId}</p>
                <p style="color: #475569; font-size: 13px; margin: 15px 0 0 0;">Save this for early access priority</p>
            </div>

            <!-- Benefits -->
            <div style="background-color: #0f172a; border-radius: 16px; padding: 30px; margin: 30px 0; border: 1px solid #334155;">
                <h3 style="color: #f8fafc; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">✨ What's Coming for You</h3>
                <div style="color: #cbd5e1; line-height: 2; font-size: 15px;">
                    <p style="margin: 0 0 12px 0;">🚀 <strong style="color: #f8fafc;">VIP Early Access</strong> — Be among the first to experience DharmaMind</p>
                    <p style="margin: 0 0 12px 0;">🎁 <strong style="color: #f8fafc;">Founding Member Benefits</strong> — Exclusive perks reserved for you</p>
                    <p style="margin: 0 0 12px 0;">📬 <strong style="color: #f8fafc;">Insider Updates</strong> — Behind-the-scenes insights and previews</p>
                    <p style="margin: 0;">🧘 <strong style="color: #f8fafc;">Wisdom Insights</strong> — Dharmic wisdom delivered to your inbox</p>
                </div>
            </div>

            <p style="color: #94a3b8; line-height: 1.8; font-size: 15px; text-align: center;">
                We're building AI that doesn't just answer questions, but helps you find deeper meaning and make wiser choices.
            </p>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; margin: 25px 0;">
                <strong style="color: #94a3b8;">Expected Launch:</strong> Q1 2026
            </p>

            <div style="text-align: center; margin: 35px 0;">
                <a href="https://dharmamind.ai" style="display: inline-block; background: linear-gradient(135deg, #475569 0%, #64748b 100%); color: #ffffff; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">Visit DharmaMind</a>
            </div>
        </div>

        <!-- Social -->
        <div style="padding: 30px 40px; border-top: 1px solid #334155; text-align: center;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 15px 0;">Connect with us</p>
            <div>
                <a href="https://twitter.com/dharmamindai" style="color: #94a3b8; text-decoration: none; margin: 0 12px; font-size: 14px;">Twitter</a>
                <a href="https://linkedin.com/company/dharmamindai" style="color: #94a3b8; text-decoration: none; margin: 0 12px; font-size: 14px;">LinkedIn</a>
                <a href="https://instagram.com/dharmamindai" style="color: #94a3b8; text-decoration: none; margin: 0 12px; font-size: 14px;">Instagram</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0f172a; padding: 30px 40px; text-align: center;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">
                With gratitude and blessings,<br>
                <strong style="color: #94a3b8;">The DharmaMind Team</strong>
            </p>
            <p style="color: #475569; font-size: 11px; margin: 15px 0 0 0;">
                You received this because you joined our waitlist at dharmamind.ai<br>
                © ${new Date().getFullYear()} DharmaMind AI. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

  const textContent = `
Welcome to DharmaMind! 🧘

You're In! Your Signup ID: ${signupId}
Save this ID for early access priority.

What's Coming for You:
• VIP Early Access — Be among the first to experience DharmaMind
• Founding Member Benefits — Exclusive perks reserved for you
• Insider Updates — Behind-the-scenes insights and previews
• Wisdom Insights — Dharmic wisdom delivered to your inbox

Expected Launch: Q1 2026

Visit us: https://dharmamind.ai

With gratitude,
The DharmaMind Team

© ${new Date().getFullYear()} DharmaMind AI
`;

  try {
    console.log(`📧 Attempting to send welcome email to: ${email}`);
    const info = await transporter.sendMail({
      from: `"DharmaMind" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🧘 You're on the DharmaMind Waitlist!",
      text: textContent,
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-Signup-ID': signupId
      }
    });
    console.log(`✅ Welcome email sent successfully! MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Welcome email failed:', error.message);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
}

// ============================================
// ANALYTICS & LOGGING
// ============================================

function logAnalytics(event, data) {
  const entry = {
    event,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  analyticsBuffer.push(entry);
  
  // Log to console in structured format
  console.log(JSON.stringify(entry));
  
  // Keep buffer manageable
  if (analyticsBuffer.length > 1000) {
    analyticsBuffer.shift();
  }
}

// ============================================
// MAIN HANDLER
// ============================================

exports.handler = async (event, context) => {
  const startTime = Date.now();
  const requestId = crypto.randomBytes(8).toString('hex');

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Get client info
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             event.headers['client-ip'] || 
             event.headers['x-real-ip'] || 
             'unknown';
  const userAgent = event.headers['user-agent'] || 'unknown';
  const referrer = event.headers['referer'] || event.headers['referrer'] || '';
  const country = event.headers['x-country'] || event.headers['cf-ipcountry'] || '';

  // Health check endpoint
  if (event.httpMethod === 'GET') {
    const path = event.path || '';
    const queryParams = event.queryStringParameters || {};
    
    // Test email endpoint - for debugging
    if (queryParams.test === 'email') {
      console.log('🧪 Testing email configuration...');
      console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
      console.log(`SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`);
      console.log(`SMTP_USER: ${process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 5) + '***' : 'NOT SET'}`);
      console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '***SET (' + process.env.SMTP_PASS.length + ' chars)***' : 'NOT SET'}`);
      console.log(`ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || 'NOT SET'}`);
      
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'SMTP credentials not configured',
            smtp_user_set: !!process.env.SMTP_USER,
            smtp_pass_set: !!process.env.SMTP_PASS,
            smtp_host: process.env.SMTP_HOST || 'NOT SET',
            smtp_port: process.env.SMTP_PORT || 'NOT SET'
          })
        };
      }
      
      try {
        const transporter = createTransporter();
        
        // Verify connection
        console.log('🔌 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!');
        
        // Send test email
        const testEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
        console.log(`📧 Sending test email to: ${testEmail}`);
        
        const info = await transporter.sendMail({
          from: `"DharmaMind Test" <${process.env.SMTP_USER}>`,
          to: testEmail,
          subject: '✅ DharmaMind Email Test - It Works!',
          text: 'If you received this email, your SMTP configuration is working correctly!',
          html: '<h1>✅ Email Test Successful!</h1><p>Your DharmaMind waitlist email system is working correctly.</p><p>Time: ' + new Date().toISOString() + '</p>'
        });
        
        console.log(`✅ Test email sent! MessageId: ${info.messageId}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Test email sent successfully!',
            messageId: info.messageId,
            sentTo: testEmail
          })
        };
      } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('❌ Full error:', error);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message,
            errorCode: error.code,
            errorCommand: error.command,
            smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
            smtp_port: process.env.SMTP_PORT || '587'
          })
        };
      }
    }
    
    // Stats endpoint (protected)
    if (path.includes('/stats') && event.headers['x-admin-key'] === process.env.ADMIN_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          version: CONFIG.version,
          uptime: process.uptime(),
          emailsCollected: emailStore.size,
          rateLimitedIPs: rateLimitStore.size,
          blockedIPs: blockedIPs.size,
          recentAnalytics: analyticsBuffer.slice(-50)
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'healthy',
        version: CONFIG.version,
        timestamp: new Date().toISOString(),
        emailConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        requestId
      })
    };
  }

  // Handle POST requests
  if (event.httpMethod === 'POST') {
    try {
      // Parse body
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false,
            message: 'Invalid request format',
            code: 'INVALID_JSON',
            requestId
          })
        };
      }

      // Rate limiting check
      const rateLimit = checkRateLimit(ip);
      if (!rateLimit.allowed) {
        logAnalytics('rate_limited', { ip, reason: rateLimit.reason });
        
        return {
          statusCode: 429,
          headers: {
            ...headers,
            'Retry-After': rateLimit.retryAfter?.toString() || '3600',
            'X-RateLimit-Remaining': '0'
          },
          body: JSON.stringify({
            success: false,
            message: rateLimit.reason,
            code: 'RATE_LIMITED',
            retryAfter: rateLimit.retryAfter,
            requestId
          })
        };
      }

      // Bot detection
      const botCheck = detectBot(event, body);
      if (botCheck.isBot) {
        logAnalytics('bot_blocked', { ip, score: botCheck.score, flags: botCheck.flags });
        
        // Return fake success to not reveal detection
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "🎉 Welcome to DharmaMind! Check your email.",
            code: 'SUCCESS',
            requestId
          })
        };
      }

      // Validate email
      const validation = validateEmail(body.email);
      if (!validation.valid) {
        logAnalytics('validation_failed', { ip, errors: validation.errors });
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: validation.errors[0] || 'Invalid email address',
            code: 'INVALID_EMAIL',
            requestId
          })
        };
      }

      const email = validation.email;
      const emailHash = hashEmail(email);

      // Check for duplicates (persistent check)
      const isDuplicate = await emailExists(emailHash);
      if (isDuplicate) {
        logAnalytics('duplicate_signup', { ip, emailHash });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "You're already on the waitlist! Check your inbox for your welcome email. 🎉",
            code: 'ALREADY_REGISTERED',
            requestId
          })
        };
      }

      // Generate signup ID
      const signupId = generateSignupId();
      const allSignups = await getSignups();
      const position = allSignups.length + 1;

      // Save signup to persistent storage
      const signupData = {
        signupId,
        email,
        emailHash,
        position,
        ip,
        userAgent,
        country,
        referrer: referrer.substring(0, 200),
        botScore: botCheck.score,
        createdAt: new Date().toISOString()
      };
      
      await saveSignup(signupData);

      // Log successful signup
      logAnalytics('signup_success', {
        signupId,
        position,
        ip,
        domain: validation.domain,
        botScore: botCheck.score,
        referrer: referrer.substring(0, 200),
        country
      });

      console.log(`\n${'='.repeat(50)}`);
      console.log(`🎉 NEW SIGNUP #${position}`);
      console.log(`ID: ${signupId}`);
      console.log(`Email: ${email}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`IP: ${ip} | Bot Score: ${botCheck.score}/100`);
      console.log(`${'='.repeat(50)}\n`);

      // Send emails (don't await - fire and forget for speed)
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        Promise.allSettled([
          sendAdminNotification({
            email,
            signupId,
            ip,
            userAgent,
            country,
            referrer,
            botScore: botCheck.score
          }),
          sendWelcomeEmail(email, signupId, position)
        ]).then(results => {
          const [admin, welcome] = results;
          console.log(`📧 Admin notification: ${admin.status === 'fulfilled' && admin.value?.success ? '✅' : '❌'}`);
          console.log(`📧 Welcome email: ${welcome.status === 'fulfilled' && welcome.value?.success ? '✅' : '❌'}`);
        });
      } else {
        console.warn('⚠️ SMTP not configured - emails not sent');
      }

      // Calculate response time
      const responseTime = Date.now() - startTime;

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-Response-Time': `${responseTime}ms`,
          'X-RateLimit-Remaining': rateLimit.remaining?.toString() || '5'
        },
        body: JSON.stringify({
          success: true,
          message: "🎉 Welcome to DharmaMind! Check your email for a special welcome message.",
          code: 'SUCCESS',
          signupId,
          requestId
        })
      };

    } catch (error) {
      console.error('❌ Unhandled error:', error);
      logAnalytics('error', { ip, error: error.message });

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Something went wrong. Please try again.',
          code: 'INTERNAL_ERROR',
          requestId
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ 
      success: false,
      message: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
      requestId
    })
  };
};
