// Netlify serverless function for waitlist submission
// Sends notification to admin + welcome email to user
// Version 3.0 - Real email collection with admin notifications

const nodemailer = require('nodemailer');

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Create email transporter (Outlook/Hotmail default)
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
}

// Send notification to ADMIN (you receive this when someone joins)
async function sendAdminNotification(email, ip, userAgent) {
  const transporter = createTransporter();
  
  // IMPORTANT: Set ADMIN_EMAIL in Netlify environment variables to receive notifications
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 New Waitlist Signup!</h1>
        </div>

        <div style="padding: 30px;">
            <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Someone just joined the DharmaMind waitlist!</h2>
            
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>📧 Email:</strong> <a href="mailto:${email}" style="color: #3b82f6;">${email}</a></p>
                <p style="margin: 0 0 10px 0;"><strong>🕐 Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p>
                <p style="margin: 0 0 10px 0;"><strong>🌐 IP Address:</strong> ${ip}</p>
                <p style="margin: 0;"><strong>💻 Device:</strong> ${userAgent ? userAgent.substring(0, 100) : 'Unknown'}</p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                <p style="margin: 0; color: #065f46; font-weight: bold;">✅ Signup recorded successfully</p>
                <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">A welcome email has been sent to the user.</p>
            </div>

            <div style="margin-top: 25px; text-align: center;">
                <a href="mailto:${email}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reply to User</a>
            </div>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                DharmaMind Waitlist System v3.0
            </p>
        </div>
    </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"DharmaMind Waitlist" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🎉 New Waitlist Signup: ${email}`,
      html: htmlContent,
      text: `New Waitlist Signup!\n\nEmail: ${email}\nTime: ${new Date().toISOString()}\nIP: ${ip}\n\nA welcome email has been sent to the user.`
    });
    console.log('✅ Admin notification sent to:', adminEmail);
    return true;
  } catch (error) {
    console.error('❌ Admin notification failed:', error.message);
    return false;
  }
}

// Send welcome email to the user
async function sendWelcomeEmail(email) {
  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #475569 0%, #64748b 100%); padding: 50px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: bold;">🧘 DharmaMind</h1>
            <p style="color: #e2e8f0; margin: 15px 0 0 0; font-size: 18px;">AI with Soul. Powered by Dharma.</p>
        </div>

        <!-- Content -->
        <div style="padding: 50px 40px;">
            <h2 style="color: #1e293b; font-size: 28px; margin-top: 0; text-align: center;">Welcome to the Journey! 🎉</h2>
            
            <p style="color: #475569; line-height: 1.8; font-size: 16px; text-align: center;">
                You've taken the first step towards transforming your life with mindful AI guidance. We're honored to have you join our community.
            </p>

            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; padding: 30px; margin: 35px 0; border: 1px solid #e2e8f0;">
                <h3 style="color: #334155; margin-top: 0; font-size: 20px; text-align: center;">✨ What's Coming for You</h3>
                <ul style="color: #475569; line-height: 2; padding-left: 25px; font-size: 15px;">
                    <li><strong>VIP Early Access:</strong> Be among the first to experience DharmaMind</li>
                    <li><strong>Exclusive Updates:</strong> Behind-the-scenes insights and feature previews</li>
                    <li><strong>Founding Member Benefits:</strong> Special perks reserved just for you</li>
                    <li><strong>Wisdom Insights:</strong> Receive dharmic wisdom before anyone else</li>
                </ul>
            </div>

            <p style="color: #475569; line-height: 1.8; font-size: 16px; text-align: center;">
                We're building something special — AI that doesn't just answer questions, but helps you find deeper meaning and make wiser choices.
            </p>
            
            <p style="color: #475569; line-height: 1.8; font-size: 16px; text-align: center;">
                <strong>Expected Launch:</strong> Early 2026
            </p>

            <div style="text-align: center; margin: 40px 0;">
                <a href="https://dharmamind.ai" style="display: inline-block; background: linear-gradient(135deg, #475569 0%, #64748b 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(71, 85, 105, 0.3);">Visit DharmaMind</a>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 30px;">
                <p style="color: #64748b; font-size: 14px; line-height: 1.8; text-align: center;">
                    Connect with us:<br>
                    <a href="https://twitter.com/dharmamindai" style="color: #475569; text-decoration: none; margin: 0 8px;">Twitter</a> • 
                    <a href="https://linkedin.com/company/dharmamindai" style="color: #475569; text-decoration: none; margin: 0 8px;">LinkedIn</a> • 
                    <a href="https://instagram.com/dharmamindai" style="color: #475569; text-decoration: none; margin: 0 8px;">Instagram</a>
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                With gratitude and blessings,<br>
                <strong style="color: #475569;">The DharmaMind Team</strong>
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 15px;">
                You received this because you joined our waitlist. If this wasn't you, please ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
  `;

  const textContent = `
Welcome to DharmaMind! 🧘

You've taken the first step towards transforming your life with mindful AI guidance.

What's Coming for You:
• VIP Early Access: Be among the first to experience DharmaMind
• Exclusive Updates: Behind-the-scenes insights and feature previews  
• Founding Member Benefits: Special perks reserved just for you
• Wisdom Insights: Receive dharmic wisdom before anyone else

Expected Launch: Early 2026

Visit us: https://dharmamind.ai

With gratitude,
The DharmaMind Team
  `;

  try {
    const info = await transporter.sendMail({
      from: `"DharmaMind Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🧘 Welcome to DharmaMind - You're on the List!",
      text: textContent,
      html: htmlContent
    });
    console.log('✅ Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Welcome email failed:', error.message);
    return { success: false, error: error.message };
  }
}

// In-memory storage for duplicate checking within same session
const waitlistEmails = new Set();

// Main handler
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Health check
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'DharmaMind Waitlist API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0',
        emailConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
      }),
    };
  }

  // Handle POST requests
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const email = body.email?.trim().toLowerCase();

      // Validate email
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Email is required', code: 'EMAIL_REQUIRED' }),
        };
      }

      if (!isValidEmail(email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Please enter a valid email address', code: 'INVALID_EMAIL' }),
        };
      }

      // Get client info for logging
      const ip = event.headers['x-forwarded-for']?.split(',')[0] || event.headers['client-ip'] || 'unknown';
      const userAgent = event.headers['user-agent'] || 'unknown';
      
      console.log(`\n========================================`);
      console.log(`📧 NEW WAITLIST SIGNUP`);
      console.log(`Email: ${email}`);
      console.log(`IP: ${ip}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`========================================\n`);

      // Check for duplicates (in-memory for this function instance)
      if (waitlistEmails.has(email)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "You're already on the waitlist! Check your inbox for your welcome email. 🎉",
            code: 'EMAIL_EXISTS'
          }),
        };
      }

      // Add to set
      waitlistEmails.add(email);

      // Check if email is configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('⚠️ SMTP credentials not configured! Set SMTP_USER, SMTP_PASS, and ADMIN_EMAIL in Netlify environment variables.');
        
        // Still return success to user, but log the issue
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "🎉 Welcome to DharmaMind! You're on the list.",
            code: 'SUCCESS',
            note: 'Email notifications not configured'
          }),
        };
      }

      // Send emails in parallel
      const [adminResult, userResult] = await Promise.allSettled([
        sendAdminNotification(email, ip, userAgent),
        sendWelcomeEmail(email)
      ]);

      // Log results
      console.log('Admin notification:', adminResult.status === 'fulfilled' && adminResult.value ? '✅ Sent' : '❌ Failed');
      console.log('Welcome email:', userResult.status === 'fulfilled' && userResult.value?.success ? '✅ Sent' : '❌ Failed');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: "🎉 Welcome to DharmaMind! Check your email for a special welcome message.",
          code: 'SUCCESS'
        }),
      };

    } catch (error) {
      console.error('❌ Waitlist submission error:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          message: 'Something went wrong. Please try again.',
          code: 'INTERNAL_ERROR'
        }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
  };
};
