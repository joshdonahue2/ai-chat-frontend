#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Install esbuild
echo "Installing esbuild..."
apk add --no-cache esbuild

# Define source and destination directories
SRC_DIR="/usr/share/nginx/html/src"
DEST_DIR="/usr/share/nginx/html/public/js"
DEST_FILE="$DEST_DIR/bundle.js"
ENTRY_POINT="$SRC_DIR/app.js"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Bundle JavaScript files using esbuild
echo "Bundling JavaScript with esbuild..."
esbuild "$ENTRY_POINT" --bundle --outfile="$DEST_FILE" --format=iife --allow-overwrite

echo "Build successful: $DEST_FILE created."
