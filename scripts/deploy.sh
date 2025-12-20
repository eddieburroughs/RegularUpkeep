#!/bin/bash
# deploy.sh - Production deployment script with automatic backup
# Usage: ./scripts/deploy.sh

set -e  # Exit on any error

# TEST: Slack notification
exit 1

APP_DIR="/root/RegularUpkeep-app"
BACKUP_DIR="/root/RegularUpkeep-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_BACKUPS=5  # Keep last 5 backups

cd "$APP_DIR"

echo "=========================================="
echo "RegularUpkeep Deployment Script"
echo "=========================================="
echo "Timestamp: $TIMESTAMP"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Step 1: Backup current build
echo "[1/5] Backing up current build..."
if [ -d ".next" ]; then
    BACKUP_NAME="backup_${TIMESTAMP}"
    cp -r .next "$BACKUP_DIR/$BACKUP_NAME"

    # Save git commit hash for reference
    git rev-parse HEAD > "$BACKUP_DIR/$BACKUP_NAME/COMMIT_HASH"
    echo "       Backup saved to: $BACKUP_DIR/$BACKUP_NAME"

    # Clean up old backups (keep only MAX_BACKUPS)
    cd "$BACKUP_DIR"
    ls -dt backup_* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf 2>/dev/null || true
    cd "$APP_DIR"
    echo "       Old backups cleaned up (keeping last $MAX_BACKUPS)"
else
    echo "       No existing build to backup"
fi

# Step 2: Pull latest changes (if running from git)
echo ""
echo "[2/5] Pulling latest changes from GitHub..."
git pull origin main || echo "       Warning: Could not pull (may be ahead of origin)"

# Step 3: Install dependencies (if package.json changed)
echo ""
echo "[3/5] Checking dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install

# Step 4: Build production
echo ""
echo "[4/5] Building production bundle..."
npm run build

# Step 5: Restart the application
echo ""
echo "[5/5] Restarting application..."
pm2 restart regularupkeep-main-app

# Health check
echo ""
echo "Waiting for application to start..."
sleep 5

# Check if the app is responding
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "308" ]; then
    echo ""
    echo "=========================================="
    echo "✅ Deployment successful!"
    echo "=========================================="
    echo "HTTP Status: $HTTP_STATUS"
    echo "Backup: $BACKUP_DIR/$BACKUP_NAME"
    echo ""
    echo "To rollback if needed, run:"
    echo "  ./scripts/rollback.sh"
else
    echo ""
    echo "=========================================="
    echo "⚠️  Warning: Health check returned $HTTP_STATUS"
    echo "=========================================="
    echo "The application may not be responding correctly."
    echo "Check logs with: pm2 logs regularupkeep-main-app"
    echo ""
    echo "To rollback, run:"
    echo "  ./scripts/rollback.sh"
    exit 1
fi
