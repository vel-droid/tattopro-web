#!/bin/bash

# TattooPro Deployment Script for Yandex Cloud VM
# This script installs all dependencies and deploys the application

set -e  # Exit on error

echo "================================"
echo "TattooPro Deployment Started"
echo "================================"

# Update system packages
echo "[1/8] Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js LTS
echo "[2/8] Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

# Install PostgreSQL
echo "[3/8] Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
echo "PostgreSQL installed successfully"

# Create database and user
echo "[4/8] Creating database and user..."
sudo -u postgres psql -c "CREATE USER tattopro_user WITH PASSWORD 'tattopro_pass_123';" || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE tattopro_db OWNER tattopro_user;" || echo "Database already exists"
sudo -u postgres psql -c "ALTER USER tattopro_user CREATEDB;" || echo "Permissions already set"

# Clone repository
echo "[5/8] Cloning repository..."
cd /home/admin
git clone https://github.com/vel-droid/tattopro-web.git || cd tattopro-web && git pull
cd tattopro-web

# Install backend dependencies
echo "[6/8] Installing backend dependencies..."
cd backend
npm install

# Configure environment
echo "[7/8] Creating .env file..."
cat > .env << EOF
DATABASE_URL="postgresql://tattopro_user:tattopro_pass_123@localhost:5432/tattopro_db"
NODE_ENV="production"
PORT=3001
API_URL="http://158.160.183.230:3001"
EOF

# Run migrations
echo "[8/8] Running database migrations..."
npx prisma migrate deploy

# Build the project
echo "Building project..."
npm run build

echo "================================"
echo "Deployment completed successfully!"
echo "To start the server, run:"
echo "  cd /home/admin/tattopro-web/backend"
echo "  npm start"
echo "API will be available at: http://158.160.183.230:3001"
echo "================================"
