#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Define source and destination directories
SRC_DIR="/app/html/src"
DEST_DIR="/app/html/public/js"
DEST_FILE="$DEST_DIR/bundle.js"
ENTRY_POINT="$SRC_DIR/app.js"
ESBUILD_PATH="/app/html/node_modules/.bin/esbuild"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Bundle JavaScript files using esbuild
echo "Bundling JavaScript with esbuild..."
"$ESBUILD_PATH" "$ENTRY_POINT" --bundle --outfile="$DEST_FILE" --format=iife --allow-overwrite \
  --define:process.env.SUPABASE_URL="'$SUPABASE_URL'" \
  --define:process.env.SUPABASE_ANON_KEY="'$SUPABASE_ANON_KEY'" \
  --define:process.env.WEBHOOK_URL="'$WEBHOOK_URL'" \
  --define:process.env.IMAGE_WEBHOOK_URL="'$IMAGE_WEBHOOK_URL'"

echo "Build successful: $DEST_FILE created."
