# TattooPro Deployment Guide

## Windows Deployment to Yandex Cloud VM

### Overview

This guide provides instructions for deploying the TattooPro application to a Yandex Cloud Virtual Machine running Windows.

### Prerequisites

- Windows PowerShell (Administrator access required)
- Git installed and configured
- Node.js v20.9.0 or later
- npm installed
- SSH access to Yandex Cloud VM
- PostgreSQL database access configured

### Yandex Cloud VM Information

**Current Configuration:**
- **VM Name:** tattopro-api
- **Public IP:** 158.160.183.230 (dynamic - may change)
- **Internal IP:** 10.130.0.9
- **OS:** Ubuntu 24.04 LTS
- **vCPU:** 2 cores (100% guaranteed)
- **RAM:** 2 GB
- **Disk:** 20 GB SSD
- **Region:** ru-central1-d
- **Port:** 3000

### Deployment Steps

#### 1. Prepare the Deployment Environment

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. Execute the Deployment Script

```powershell
# Navigate to project directory
cd C:\Projects\tattopro-web

# Run the deployment script
.\deploy-windows.ps1
```

#### 3. Deployment Script Workflow

The `deploy-windows.ps1` script automatically performs these steps:

1. **Check Permissions** - Verifies Administrator access
2. **Stop Service** - Stops the running tattopro-api service
3. **Pull Code** - Fetches latest code from GitHub master branch
4. **Install Dependencies** - Runs `npm ci --production`
5. **Build Application** - Executes `npm run build`
6. **Run Migrations** - Executes database migrations
7. **Start Service** - Starts the tattopro-api service
8. **Verify Health** - Checks service health on port 3000

### Configuration

Edit these variables in `deploy-windows.ps1` as needed:

```powershell
$ProjectPath = 'C:\Projects\tattopro-web'      # Project directory
$AppName = 'tattopro-api'                       # Windows service name
$NodeVersion = 'v20.9.0'                        # Required Node version
$Port = 3000                                    # Application port
$YandexCloudIP = '158.160.183.230'             # Update with current public IP
```

### Accessing the Application

Once deployed, access the application at:
- Local: `http://localhost:3000`
- Remote: `http://158.160.183.230:3000` (update IP as needed)

### Troubleshooting

#### Service fails to start

```powershell
# Check service status
Get-Service -Name tattopro-api

# View recent logs
Get-EventLog -LogName Application -Source tattopro-api -Newest 10
```

#### Build fails

1. Verify Node.js version: `node --version`
2. Clear node_modules: `rm -r node_modules` (or `rmdir /s node_modules`)
3. Reinstall: `npm install`
4. Retry build: `npm run build`

#### Port conflicts

If port 3000 is in use:

```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
kill -PID <ProcessID>
```

### Database Connection

Ensure PostgreSQL environment variables are set:

```powershell
# Set environment variables for Windows service
[Environment]::SetEnvironmentVariable('DATABASE_URL', 'postgresql://...', 'Machine')
[Environment]::SetEnvironmentVariable('NODE_ENV', 'production', 'Machine')
```

### Monitoring and Logs

```powershell
# View service logs
Get-Content "C:\Projects\tattopro-web\logs\tattopro.log" -Tail 100

# Monitor service in real-time
Get-Process -Name node | Select-Object ProcessName, CPU, Memory
```

### Rollback Procedure

If deployment fails, rollback to previous version:

```powershell
# Stop service
Stop-Service -Name tattopro-api

# Revert code
cd C:\Projects\tattopro-web
git revert HEAD

# Rebuild and restart
npm run build
Start-Service -Name tattopro-api
```

### Support and Documentation

- GitHub Repository: https://github.com/vel-droid/tattopro-web
- Yandex Cloud Console: https://console.yandex.cloud
- Deployment Script: `./deploy-windows.ps1`

### Version History

- **v1.0** - Initial Windows deployment script
- Deployment script: `deploy-windows.ps1`
- Created: January 2026
