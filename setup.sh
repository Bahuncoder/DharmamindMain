#!/bin/bash

# 🚀 DharmaMind Waitlist Setup Script
# This script prepares your project for deployment

echo "🧘 Setting up DharmaMind Waitlist..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}⚠️  npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your environment variables${NC}"
fi

# Initialize git if not already initialized
if [ ! -d .git ]; then
    echo -e "${BLUE}🔧 Initializing git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit: DharmaMind waitlist setup"
    echo -e "${YELLOW}📝 Don't forget to add remote origin: git remote add origin <your-repo-url>${NC}"
fi

# Test the server
echo -e "${BLUE}🧪 Testing server...${NC}"
npm start &
SERVER_PID=$!
sleep 3

# Check if server is running
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Server test failed. Check your configuration.${NC}"
fi

# Stop the test server
kill $SERVER_PID 2>/dev/null

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your environment variables"
echo "2. Test locally: npm run dev"
echo "3. Deploy to your preferred platform:"
echo "   - Vercel: Push to GitHub and connect to Vercel"
echo "   - Netlify: Push to GitHub and connect to Netlify"
echo "   - Railway: Push to GitHub and connect to Railway"
echo ""
echo "📚 See DEPLOYMENT.md for detailed deployment instructions"
echo ""
echo -e "${BLUE}🔗 Useful commands:${NC}"
echo "  npm start          - Start production server"
echo "  npm run dev        - Start development server"
echo "  npm run build      - Build optimized assets"
echo "  npm test           - Run tests"
echo ""
echo -e "${GREEN}🧘 Your DharmaMind waitlist is ready to transform lives!${NC}"