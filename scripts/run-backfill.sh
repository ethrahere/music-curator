#!/bin/bash

# Backfill existing tracks to new schema
# This script migrates old recommendations to use the new tracks table

echo "🚀 Starting tracks backfill..."
echo ""

# Load environment variables
if [ -f .env.local ]; then
  source .env.local
fi

# Run the TypeScript backfill script
npx tsx scripts/backfill-tracks.ts

echo ""
echo "✅ Backfill complete!"
