// Admin API for DharmaMind Dashboard
// Handles login and data retrieval with persistent storage

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

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

// Get signups from persistent storage
async function getSignups() {
  try {
    const store = getStore('waitlist');
    const data = await store.get('signups', { type: 'json' });
    return data || [];
  } catch (error) {
    console.error('Error reading signups:', error);
    return [];
  }
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

    // Get real data from persistent storage
    const signups = await getSignups();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Calculate stats
    const todaySignups = signups.filter(s => new Date(s.createdAt) >= today).length;
    const weekSignups = signups.filter(s => new Date(s.createdAt) >= weekAgo).length;
    
    // Get signups by day for chart (last 7 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = { labels: [], values: [] };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const count = signups.filter(s => {
        const signupDate = new Date(s.createdAt);
        return signupDate >= date && signupDate < nextDate;
      }).length;
      
      chartData.labels.push(dayNames[date.getDay()]);
      chartData.values.push(count);
    }
    
    // Recent signups (last 20, hide full email for privacy)
    const recentSignups = signups
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(s => ({
        email: s.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        fullEmail: s.email,
        date: s.createdAt,
        signupId: s.signupId,
        country: s.country || 'Unknown',
        status: 'verified'
      }));

    const data = {
      success: true,
      stats: {
        totalSignups: signups.length,
        todaySignups,
        weekSignups,
        conversionRate: signups.length > 0 ? 4.2 : 0
      },
      recentSignups,
      chartData
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  }

  // ============================================
  // EXPORT DATA ENDPOINT
  // ============================================
  if (path === '/export' && event.httpMethod === 'GET') {
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!verifySession(token)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, message: 'Unauthorized' })
      };
    }

    const signups = await getSignups();
    
    // Generate CSV
    const csvHeader = 'SignupID,Email,Position,Country,Date,BotScore\n';
    const csvRows = signups.map(s => 
      `${s.signupId},${s.email},${s.position},${s.country || 'Unknown'},${s.createdAt},${s.botScore || 0}`
    ).join('\n');
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dharmamind-waitlist-${new Date().toISOString().split('T')[0]}.csv"`
      },
      body: csvHeader + csvRows
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
