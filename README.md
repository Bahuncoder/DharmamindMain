# DharmaMind AI - Professional Waitlist Landing Page

![DharmaMind Logo](logo.jpeg)

[![Deployment Status](https://img.shields.io/badge/Status-Deployment%20Ready-brightgreen?style=for-the-badge)](DEPLOYMENT-GUIDE.md)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Node Version](https://img.shields.io/badge/Node-18%2B-green?style=for-the-badge)](package.json)

## 🧘 About DharmaMind

DharmaMind is an ethical AI platform that combines ancient wisdom with cutting-edge technology to provide guidance for clarity, growth, and purpose-driven living. This repository contains our professional waitlist landing page designed for maximum conversion and SEO performance.

**🚀 Status:** Ready for deployment! See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for instructions.

## ✨ Features

### 🎨 Professional UI/UX
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Responsive**: Mobile-first design that works on all devices
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support
- **Performance**: Optimized for Core Web Vitals and fast loading

### 🔍 SEO Optimized
- **Structured Data**: Schema.org markup for rich snippets
- **Meta Tags**: Complete Open Graph and Twitter Card support
- **Sitemap**: XML sitemap for search engine indexing
- **Robots.txt**: Optimized for search engines, blocks AI scrapers
- **Semantic HTML**: Proper heading structure and semantic elements

### 🚀 Technical Excellence
- **Modern Stack**: Node.js backend with Express.js
- **Serverless Ready**: Vercel and Netlify Functions support
- **Rate Limiting**: Protection against spam and abuse
- **Error Handling**: Comprehensive error handling and user feedback
- **Analytics Ready**: Google Analytics and custom event tracking
- **Progressive Enhancement**: Works without JavaScript

### 🛡️ Security & Privacy
- **Input Validation**: Server-side email validation and sanitization
- **CORS Protection**: Properly configured cross-origin requests
- **Rate Limiting**: IP-based submission limits
- **Privacy Focused**: Minimal data collection, GDPR compliant

## 🏗️ Project Structure

```
DharmaMindAI/
├── index.html              # Main landing page
├── style.css               # Professional styles
├── script.js               # Enhanced JavaScript functionality
├── server.js               # Express.js backend
├── package.json            # Node.js dependencies and scripts
├── vercel.json             # Vercel deployment config
├── netlify.toml            # Netlify deployment config
├── api/                    # Vercel serverless functions
├── netlify/functions/      # Netlify serverless functions
├── sitemap.xml             # SEO sitemap
├── robots.txt              # Search engine directives
├── logo.jpeg              # Brand logo
├── DEPLOYMENT.md          # Comprehensive deployment guide
└── setup.sh               # Automated setup script
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/dharmamind-waitlist.git
cd dharmamind-waitlist

# Run automated setup
./setup.sh
```

### 2. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:3000
```

### 3. Deploy to GitHub

#### Option A: Vercel (Recommended)
```bash
# Push to GitHub
git add .
git commit -m "Initial deployment"
git push origin main

# Connect to Vercel
# 1. Go to vercel.com
# 2. Import your GitHub repository
# 3. Deploy automatically
```

#### Option B: Netlify
```bash
# Push to GitHub
git add .
git commit -m "Initial deployment"
git push origin main

# Connect to Netlify
# 1. Go to netlify.com
# 2. Import your GitHub repository
# 3. Deploy automatically
```

#### Option C: GitHub Pages (Static Only)
```bash
# Enable GitHub Pages in repository settings
# Choose: Deploy from main branch / (root)
# Your site will be at: https://username.github.io/repository-name
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
PORT=3000
NODE_ENV=development

# Optional: Add database or email service keys
# MONGODB_URI=your_mongodb_connection_string
# SENDGRID_API_KEY=your_sendgrid_key
```

### Backend Options

The project includes three backend implementations:

1. **Express.js Server** (`server.js`) - For Railway, Render, Heroku
2. **Vercel Functions** (`api/submit_waitlist/route.js`) - For Vercel
3. **Netlify Functions** (`netlify/functions/submit_waitlist.js`) - For Netlify

## 📊 SEO Strategy

### Keywords Targeted
- AI wisdom, dharma AI, mindful AI
- Ethical artificial intelligence
- Spiritual AI assistant, personal growth AI
- Meditation AI, wisdom technology

### Technical SEO
- **Page Speed**: Optimized for <3s load time
- **Mobile First**: Responsive design
- **Core Web Vitals**: LCP, FID, CLS optimized
- **Structured Data**: Rich snippets support
- **Internal Linking**: Proper anchor navigation

## 🎯 Conversion Optimization

### A/B Testing Ready
- Multiple CTA placements
- Trust indicators
- Social proof elements
- Form optimization

### Analytics Integration
```javascript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID');

// Custom events
gtag('event', 'waitlist_signup', {
  event_category: 'engagement',
  event_label: 'email_signup'
});
```

## 🛡️ Security Best Practices

### Input Validation
- Email format validation
- SQL injection prevention
- XSS protection
- CSRF protection

### Rate Limiting
```javascript
// 5 submissions per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5 // 5 requests per hour per IP
});
```

## 📱 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Basic functionality without JavaScript

## 🧪 Testing

### Performance Testing
```bash
# Lighthouse CI
npm run check:performance
```

### Accessibility Testing
```bash
# axe-core testing
npm run test:accessibility
```

### Load Testing
```bash
# Start server and test endpoints
npm start
curl http://localhost:3000/api/health
```

## 📈 Analytics & Monitoring

### Key Metrics
- **Conversion Rate**: Waitlist signups / unique visitors
- **Page Speed**: Core Web Vitals
- **User Engagement**: Time on page, scroll depth
- **Traffic Sources**: Organic, direct, referral, social

### Health Check Endpoint
```bash
GET /api/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-06T...",
  "uptime": 123.45,
  "totalSignups": 42
}
```

## 🔄 Deployment Options

| Platform | Type | Cost | Setup Difficulty |
|----------|------|------|------------------|
| **Vercel** | Serverless | Free | ⭐ Easy |
| **Netlify** | Serverless | Free | ⭐ Easy |
| **Railway** | Container | Free tier | ⭐⭐ Medium |
| **Render** | Container | Free tier | ⭐⭐ Medium |
| **GitHub Pages** | Static | Free | ⭐ Easy |

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📞 Support

For technical support or questions:
- **Email**: support@dharmamind.ai
- **Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/dharmamind-waitlist/issues)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Design Inspiration**: Modern SaaS landing pages
- **Technical Stack**: Node.js, Express, Tailwind CSS
- **SEO Tools**: Google Search Console, Lighthouse
- **Accessibility**: WCAG 2.1 guidelines

---

**Built with ❤️ for the DharmaMind community**

*Transform your life with AI that has soul.*