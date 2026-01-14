#!/bin/bash

# TattooPro Quick Start Script
# One-command deployment for Yandex Cloud VM
# Usage: bash quick-start.sh

set -e

echo "="*50
echo "TattooPro Quick Start Deployment"
echo "="*50
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update system
echo "${YELLOW}[STEP 1/9]${NC} Updating system packages..."
sudo apt-get update > /dev/null 2>&1
sudo apt-get upgrade -y > /dev/null 2>&1
echo "${GREEN}✓ System updated${NC}"
echo ""

# Step 2: Install Node.js
echo "${YELLOW}[STEP 2/9]${NC} Installing Node.js LTS v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
sudo apt-get install -y nodejs > /dev/null 2>&1
echo "${GREEN}✓ Node.js installed: $(node --version)${NC}"
echo ""

# Step 3: Install PostgreSQL
echo "${YELLOW}[STEP 3/9]${NC} Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib > /dev/null 2>&1
sudo systemctl start postgresql
sudo systemctl enable postgresql > /dev/null 2>&1
echo "${GREEN}✓ PostgreSQL installed and running${NC}"
echo ""

# Step 4: Create database
echo "${YELLOW}[STEP 4/9]${NC} Creating database and user..."
sudo -u postgres psql -c "CREATE USER tattopro_user WITH PASSWORD 'tattopro_pass_123';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE tattopro_db OWNER tattopro_user;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "ALTER USER tattopro_user CREATEDB;" 2>/dev/null || true
echo "${GREEN}✓ Database and user created${NC}"
echo ""

# Step 5: Clone repository
echo "${YELLOW}[STEP 5/9]${NC} Cloning repository..."
cd /home/admin
if [ -d "tattopro-web" ]; then
  cd tattopro-web
  git pull > /dev/null 2>&1
else
  git clone https://github.com/vel-droid/tattopro-web.git > /dev/null 2>&1
  cd tattopro-web
fi
echo "${GREEN}✓ Repository ready${NC}"
echo ""

# Step 6: Install backend dependencies
echo "${YELLOW}[STEP 6/9]${NC} Installing backend dependencies..."
cd backend
npm install > /dev/null 2>&1
echo "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 7: Configure environment
echo "${YELLOW}[STEP 7/9]${NC} Configuring environment..."
cat > .env << 'EOF'
DATABASE_URL="postgresql://tattopro_user:tattopro_pass_123@localhost:5432/tattopro_db"
NODE_ENV="production"
PORT=3001
API_URL="http://158.160.183.230:3001"
EOF
echo "${GREEN}✓ Environment configured${NC}"
echo ""

# Step 8: Run migrations
echo "${YELLOW}[STEP 8/9]${NC} Running database migrations..."
npm run build > /dev/null 2>&1
npx prisma migrate deploy > /dev/null 2>&1 || echo "${YELLOW}(migrations skipped if already applied)${NC}"
echo "${GREEN}✓ Database ready${NC}"
echo ""

# Step 9: Create PM2 service
echo "${YELLOW}[STEP 9/9]${NC} Installing PM2 for process management..."
sudo npm install -g pm2 > /dev/null 2>&1
pm2 start "npm start" --name "tattopro-api" > /dev/null 2>&1 || pm2 restart tattopro-api > /dev/null 2>&1
pm2 startup > /dev/null 2>&1
pm2 save > /dev/null 2>&1
echo "${GREEN}✓ PM2 configured${NC}"
echo ""

echo "${GREEN}="*50
echo "✓ TattooPro Deployment Complete!"
echo "="*50${NC}"
echo ""
echo "${GREEN}API is running at:${NC}"
echo "  - Direct IP: http://158.160.183.230:3001"
echo "  - Domain: http://protattoosoft.ru:3001 (after DNS setup)"
echo ""
echo "${GREEN}Database:${NC}"
echo "  - Host: localhost:5432"
echo "  - User: tattopro_user"
echo "  - Password: tattopro_pass_123"
echo "  - Database: tattopro_db"
echo ""
echo "${GREEN}Useful commands:${NC}"
echo "  - View logs: pm2 logs"
echo "  - Stop API: pm2 stop tattopro-api"
echo "  - Start API: pm2 start tattopro-api"
echo "  - Restart API: pm2 restart tattopro-api"
echo ""
echo "${YELLOW}Next steps:${NC}"
echo "  1. Register protattoosoft.ru domain"
echo "  2. Point nameservers to: ns1.yandexcloud.net, ns2.yandexcloud.net"
echo "  3. Deploy frontend to Vercel"
echo "  4. Update frontend API_URL to http://protattoosoft.ru:3001"
echo ""
