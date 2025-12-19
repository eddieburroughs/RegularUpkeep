#!/bin/bash
# rollback.sh - Rollback to previous build
# Usage: ./scripts/rollback.sh [backup_name]

set -e

APP_DIR="/root/RegularUpkeep-app"
BACKUP_DIR="/root/RegularUpkeep-backups"

cd "$APP_DIR"

echo "=========================================="
echo "RegularUpkeep Rollback Script"
echo "=========================================="

# List available backups
echo ""
echo "Available backups:"
echo "------------------------------------------"
ls -lt "$BACKUP_DIR" 2>/dev/null | grep "^d" | head -10 | while read line; do
    dir_name=$(echo "$line" | awk '{print $NF}')
    if [ -f "$BACKUP_DIR/$dir_name/COMMIT_HASH" ]; then
        commit=$(cat "$BACKUP_DIR/$dir_name/COMMIT_HASH" | cut -c1-8)
        echo "  $dir_name (commit: $commit)"
    else
        echo "  $dir_name"
    fi
done

if [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo "  No backups available!"
    exit 1
fi

echo ""

# Determine which backup to use
if [ -n "$1" ]; then
    BACKUP_NAME="$1"
else
    # Use the most recent backup
    BACKUP_NAME=$(ls -t "$BACKUP_DIR" | head -1)
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

if [ ! -d "$BACKUP_PATH" ]; then
    echo "❌ Error: Backup '$BACKUP_NAME' not found!"
    exit 1
fi

echo "Rolling back to: $BACKUP_NAME"

# Show commit info if available
if [ -f "$BACKUP_PATH/COMMIT_HASH" ]; then
    echo "Commit: $(cat $BACKUP_PATH/COMMIT_HASH)"
fi

echo ""
read -p "Are you sure you want to rollback? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Rollback cancelled."
    exit 0
fi

# Perform rollback
echo ""
echo "[1/3] Replacing current build with backup..."
rm -rf .next
cp -r "$BACKUP_PATH" .next
rm -f .next/COMMIT_HASH  # Remove the commit hash file from .next

echo "[2/3] Restarting application..."
pm2 restart regularupkeep-main-app

echo "[3/3] Running health check..."
sleep 5

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "308" ]; then
    echo ""
    echo "=========================================="
    echo "✅ Rollback successful!"
    echo "=========================================="
    echo "HTTP Status: $HTTP_STATUS"
    echo "Rolled back to: $BACKUP_NAME"
else
    echo ""
    echo "=========================================="
    echo "⚠️  Warning: Health check returned $HTTP_STATUS"
    echo "=========================================="
    echo "Check logs with: pm2 logs regularupkeep-main-app"
fi
