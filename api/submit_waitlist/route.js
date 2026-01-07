// Serverless function for Vercel deployment
import { NextRequest, NextResponse } from 'next/server';

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// In-memory storage for demo (in production, use a database)
let waitlistEmails = new Set();
let rateLimit = new Map();

// Rate limiting function
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 5;

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  }

  const requests = rateLimit.get(ip);
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }

  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}

export async function GET(request) {
  return NextResponse.json(
    { 
      message: 'DharmaMind Waitlist API is running',
      status: 'healthy',
      timestamp: new Date().toISOString()
    },
    { status: 200, headers: corsHeaders }
  );
}

export async function POST(request) {
  try {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED' 
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    // Validate email
    if (!email) {
      return NextResponse.json(
        { 
          message: 'Email is required',
          code: 'EMAIL_REQUIRED' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { 
          message: 'Invalid email format',
          code: 'INVALID_EMAIL' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if email already exists
    if (waitlistEmails.has(email)) {
      return NextResponse.json(
        { 
          message: 'This email is already on the waitlist. Thanks for your interest!',
          code: 'EMAIL_EXISTS' 
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Add email to waitlist
    waitlistEmails.add(email);
    
    // Log for monitoring (in production, send to analytics)
    console.log(`New waitlist signup: ${email} from IP: ${ip}`);

    return NextResponse.json(
      { 
        message: 'Successfully joined the waitlist! We\'ll be in touch soon.',
        code: 'SUCCESS' 
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error. Please try again.',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}