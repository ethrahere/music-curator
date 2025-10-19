#!/bin/bash

# Script to regenerate OG image locally
# Usage: ./regenerate-og.sh [track-id]

# Default track ID (can be overridden by first argument)
TRACK_ID="${1:-0b49ca24-9f76-463c-b37f-aad410349def}"

# Add cache-busting timestamp
TIMESTAMP=$(date +%s)

echo "🎨 Regenerating OG image for track: $TRACK_ID"
echo "📍 Fetching from: http://localhost:3000/api/frame/$TRACK_ID/og?t=$TIMESTAMP"

# Fetch with cache-busting and save
curl -s "http://localhost:3000/api/frame/$TRACK_ID/og?t=$TIMESTAMP" -o generated-og-image.png

if [ $? -eq 0 ]; then
    echo "✅ Image saved to: generated-og-image.png"
    echo "📊 File size: $(du -h generated-og-image.png | cut -f1)"

    # Open the image (macOS)
    open generated-og-image.png
else
    echo "❌ Failed to generate image"
    exit 1
fi
