#!/bin/bash
# AI Cleanup Cron Job
# Runs daily to clean up old AI jobs, outputs, and feedback
# Scheduled: 3 AM daily

# Load environment variables
source /root/RegularUpkeep-app/.env.local 2>/dev/null || true

API_URL="http://localhost:3002/api/cron/ai-cleanup"
LOG_FILE="/var/log/regularupkeep-ai-cleanup.log"

if [ -z "$CRON_SECRET" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: CRON_SECRET not set" >> "$LOG_FILE"
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting AI cleanup..." >> "$LOG_FILE"

response=$(curl -sL -w "\n%{http_code}" "$API_URL" \
  -H "Authorization: Bearer $CRON_SECRET")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleanup successful: $body" >> "$LOG_FILE"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleanup failed (HTTP $http_code): $body" >> "$LOG_FILE"
fi
