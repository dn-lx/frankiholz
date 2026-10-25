#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Web derivatives only; retain the approved original artwork/photos.
mkdir -p assets/images
image_tool=magick
command -v "$image_tool" >/dev/null || image_tool=convert
for width in 200 400; do
  "$image_tool" assets/host-inura.jpg -auto-orient -resize "${width}x" -strip -quality 82 "assets/images/host-inura-${width}.webp"
done
for width in 384 768; do
  "$image_tool" assets/frankiholz-logo-for-dark.png -resize "${width}x${width}" -define webp:lossless=true "assets/images/frankiholz-logo-dark-${width}.webp"
  "$image_tool" assets/frankiholz-logo-for-light.png -trim +repage -resize "${width}x${width}" -define webp:lossless=true "assets/images/frankiholz-logo-light-${width}.webp"
done
