#!/bin/bash
# auto-push.sh - Automatically push committed changes to GitHub
# Runs via cron at 3AM daily

cd /root/RegularUpkeep-app

# Only push if there are commits ahead of origin
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null)

if [ "$AHEAD" -gt 0 ]; then
    echo "[$(date)] Pushing $AHEAD commit(s) to GitHub..."
    git push origin main >> /root/RegularUpkeep-app/logs/auto-push.log 2>&1
    echo "[$(date)] Push complete." >> /root/RegularUpkeep-app/logs/auto-push.log
else
    echo "[$(date)] No commits to push." >> /root/RegularUpkeep-app/logs/auto-push.log
fi
