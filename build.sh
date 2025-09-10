#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Define source and destination directories
SRC_DIR="/usr/share/nginx/html/src"
DEST_DIR="/usr/share/nginx/html/public/js"
DEST_FILE="$DEST_DIR/bundle.js"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Concatenate JS files
# The order is important here. Config and state first, then others, and app last.
cat "$SRC_DIR/config.js" \
    "$SRC_DIR/state.js" \
    "$SRC_DIR/ui.js" \
    "$SRC_DIR/api.js" \
    "$SRC_DIR/auth.js" \
    "$SRC_DIR/app.js" > "$DEST_FILE"

echo "Build successful: $DEST_FILE created."
