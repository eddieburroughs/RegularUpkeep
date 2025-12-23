#!/bin/bash
# Run admin config seed script
# Usage: ./scripts/backfill/run-seed.sh

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Extract database URL from Supabase URL
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://api.regularupkeep.com}"
DB_HOST=$(echo $SUPABASE_URL | sed -E 's|https?://([^:/]+).*|\1|')

echo "Running admin config seed script..."
echo "Database host: $DB_HOST"

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "Error: psql is not installed"
  echo "Install with: apt-get install postgresql-client"
  exit 1
fi

# Run the SQL script
# Note: Update the connection string based on your Supabase setup
psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@$DB_HOST:5432/postgres" \
  -f scripts/backfill/seed-admin-config.sql

echo "Admin config seeding complete!"
