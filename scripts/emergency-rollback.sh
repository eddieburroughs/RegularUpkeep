#!/bin/bash
# emergency-rollback.sh - Immediate rollback without confirmation
# Usage: ./scripts/emergency-rollback.sh

set -e

APP_DIR="/root/RegularUpkeep-app"
BACKUP_DIR="/root/RegularUpkeep-backups"

cd "$APP_DIR"

echo "🚨 EMERGENCY ROLLBACK"
echo ""

# Get the most recent backup
BACKUP_NAME=$(ls -t "$BACKUP_DIR" 2>/dev/null | head -1)

if [ -z "$BACKUP_NAME" ]; then
    echo "❌ No backups available!"
    exit 1
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "Rolling back to: $BACKUP_NAME"

# Perform immediate rollback
rm -rf .next
cp -r "$BACKUP_PATH" .next
rm -f .next/COMMIT_HASH

pm2 restart regularupkeep-main-app

echo ""
echo "✅ Rollback complete. Check: curl -I http://localhost:3002"
