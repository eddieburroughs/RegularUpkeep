# RegularUpkeep Deployment Guide

## Overview

This project uses GitHub Actions for automated deployments with a rollback system for quick recovery.

```
GitHub Push → GitHub Actions → SSH to Server → Deploy Script → Production
```

## Quick Commands

```bash
# Manual deploy (on server)
./scripts/deploy.sh

# Rollback to previous version (with confirmation)
./scripts/rollback.sh

# Emergency rollback (no confirmation, immediate)
./scripts/emergency-rollback.sh

# View available backups
ls -lt /root/RegularUpkeep-backups/
```

## GitHub Actions Setup

### Required Secrets

Add these secrets in GitHub: **Settings → Secrets and variables → Actions**

| Secret | Description | Example |
|--------|-------------|---------|
| `SERVER_HOST` | Server IP or domain | `your-server-ip` |
| `SERVER_USER` | SSH username | `root` |
| `SERVER_PORT` | SSH port | `22` |
| `SERVER_SSH_KEY` | Private SSH key | (full key content) |

### Generate SSH Key (if needed)

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Add public key to server
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Copy private key content to GitHub secret
cat ~/.ssh/github_deploy
```

## Deployment Process

### Automatic (via GitHub Actions)

1. Push to `main` branch
2. GitHub Actions triggers automatically
3. Workflow SSHs to server and runs deploy script
4. Deploy script:
   - Backs up current build
   - Pulls latest code
   - Installs dependencies
   - Builds production bundle
   - Restarts PM2 process
   - Runs health check

### Manual (on server)

```bash
cd /root/RegularUpkeep-app
./scripts/deploy.sh
```

## Rollback Process

### Standard Rollback

```bash
./scripts/rollback.sh
```

This will:
1. List available backups with timestamps
2. Ask for confirmation
3. Restore the previous build
4. Restart the application

### Emergency Rollback

```bash
./scripts/emergency-rollback.sh
```

This immediately restores the most recent backup without confirmation.

### Rollback to Specific Version

```bash
./scripts/rollback.sh backup_20241219_030806
```

## Backup System

- Backups stored in: `/root/RegularUpkeep-backups/`
- Each backup includes the `.next` build folder
- Backups include git commit hash for reference
- Last 5 backups are retained automatically

## Monitoring

```bash
# Check application status
pm2 status

# View application logs
pm2 logs regularupkeep-main-app

# View last 100 lines
pm2 logs regularupkeep-main-app --lines 100

# Health check
curl -I http://localhost:3002
```

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs for error details
2. SSH to server and check PM2 logs:
   ```bash
   pm2 logs regularupkeep-main-app --lines 50
   ```
3. If needed, run emergency rollback:
   ```bash
   ./scripts/emergency-rollback.sh
   ```

### Build Errors

1. Check for TypeScript errors: `npm run build`
2. Check for missing dependencies: `npm ci`
3. Verify environment variables in `.env.local`

### Application Not Responding

1. Check if PM2 process is running: `pm2 status`
2. Check for port conflicts: `ss -tlnp | grep 3002`
3. Restart the application: `pm2 restart regularupkeep-main-app`

## File Structure

```
/root/RegularUpkeep-app/
├── scripts/
│   ├── deploy.sh           # Main deployment script
│   ├── rollback.sh         # Standard rollback with confirmation
│   └── emergency-rollback.sh  # Immediate rollback
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions workflow
└── .next/                  # Production build output

/root/RegularUpkeep-backups/
├── backup_20241219_030806/
│   ├── .next contents...
│   └── COMMIT_HASH
└── backup_20241219_025000/
    └── ...
```
