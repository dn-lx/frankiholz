#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Web derivatives only; retain the approved original artwork/photos.
mkdir -p assets/images
for width in 200 400; do
  magick assets/host-inura.jpg -auto-orient -resize "${width}x" -strip -quality 82 "assets/images/host-inura-${width}.webp"
done
for width in 384 768; do
  magick assets/frankiholz-logo-for-dark.png -resize "${width}x${width}" -define webp:lossless=true "assets/images/frankiholz-logo-dark-${width}.webp"
done
