// Admin API for DharmaMind Dashboard
// Handles login and data retrieval

const crypto = require('crypto');

// In-memory session store (resets on cold start)
const sessions = new Map();

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify session
function verifySession(token) {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const path = event.path.replace('/.netlify/functions/admin', '').replace('/api/admin', '');
  
  // ============================================
  // LOGIN ENDPOINT
  // ============================================
  if (path === '/login' && event.httpMethod === 'POST') {
    try {
      const { password } = JSON.parse(event.body || '{}');
      
      // Get admin password from environment variable
      const adminPassword = process.env.ADMIN_PASSWORD || 'dharma2025';
      
      if (password === adminPassword) {
        const token = generateToken();
        sessions.set(token, {
          created: Date.now(),
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });
        
        console.log('✅ Admin login successful');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            token,
            message: 'Login successful'
          })
        };
      } else {
        console.log('❌ Admin login failed - wrong password');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Invalid password'
          })
        };
      }
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Invalid request'
        })
      };
    }
  }

  // ============================================
  // VERIFY TOKEN ENDPOINT
  // ============================================
  if (path === '/verify' && event.httpMethod === 'POST') {
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (verifySession(token)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: true })
      };
    } else {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }
  }

  // ============================================
  // GET DASHBOARD DATA
  // ============================================
  if (path === '/data' && event.httpMethod === 'GET') {
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!verifySession(token)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, message: 'Unauthorized' })
      };
    }

    // Return mock data (in production, this would come from a database)
    const data = {
      success: true,
      stats: {
        totalSignups: 43,
        todaySignups: 3,
        weekSignups: 12,
        conversionRate: 4.2
      },
      recentSignups: [
        { email: 'user1@example.com', date: new Date().toISOString(), status: 'verified' },
        { email: 'user2@example.com', date: new Date(Date.now() - 86400000).toISOString(), status: 'verified' },
        { email: 'user3@example.com', date: new Date(Date.now() - 172800000).toISOString(), status: 'pending' }
      ],
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [5, 8, 12, 7, 15, 9, 11]
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  }

  // ============================================
  // LOGOUT ENDPOINT
  // ============================================
  if (path === '/logout' && event.httpMethod === 'POST') {
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    sessions.delete(token);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Logged out' })
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' })
  };
};
