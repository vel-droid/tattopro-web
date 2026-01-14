# TattooPro Windows Deployment Script
# This script handles deployment to Yandex Cloud VM

$ErrorActionPreference = 'Stop'

# Configuration
$ProjectPath = 'C:\Projects\tattopro-web'
$AppName = 'tattopro-api'
$NodeVersion = 'v20.9.0'
$Port = 3000
$YandexCloudIP = '51.250.76.235'  # Your Yandex Cloud VM IP

# Colors for output
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Error-Custom { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }

Write-Info "Starting TattooPro deployment to Yandex Cloud..."

# Check if running as admin
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')) {
    Write-Error-Custom "This script must be run as Administrator!"
    exit 1
}

Write-Success "Running with Administrator privileges"

# Step 1: Stop existing service
Write-Info "Stopping existing services..."
try {
    Stop-Service -Name $AppName -ErrorAction SilentlyContinue
    Write-Success "Service stopped"
} catch {
    Write-Info "Service was not running"
}

# Step 2: Pull latest code from GitHub
Write-Info "Pulling latest code from GitHub..."
cd $ProjectPath
git fetch origin master
git reset --hard origin/master
Write-Success "Code updated"

# Step 3: Install dependencies
Write-Info "Installing dependencies..."
npm ci --production
Write-Success "Dependencies installed"

# Step 4: Build the application
Write-Info "Building application..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Build failed!"
    exit 1
}
Write-Success "Build completed"

# Step 5: Run database migrations
Write-Info "Running database migrations..."
set NODE_ENV=production
npm run migrate
Write-Success "Migrations completed"

# Step 6: Start the service
Write-Info "Starting TattooPro service..."
Start-Service -Name $AppName
Write-Success "Service started"

# Step 7: Verify deployment
Write-Info "Verifying deployment..."
Start-Sleep -Seconds 5

$healthCheck = Invoke-RestMethod -Uri "http://localhost:$Port/health" -Method Get -ErrorAction SilentlyContinue
if ($healthCheck.status -eq 'ok') {
    Write-Success "Deployment completed successfully!"
    Write-Success "Application is running on port $Port"
    Write-Info "Yandex Cloud VM: $YandexCloudIP:$Port"
} else {
    Write-Error-Custom "Health check failed. Service may not be running properly."
    exit 1
}

Write-Info "Deployment finished at $(Get-Date)"
