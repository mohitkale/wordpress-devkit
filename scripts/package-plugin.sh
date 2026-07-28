#!/usr/bin/env sh
set -eu

version="$(node -p "require('./.claude-plugin/plugin.json').version")"
output_dir="dist"
archive="$output_dir/wordpress-devkit-$version.zip"

mkdir -p "$output_dir"
rm -f "$archive"

zip --quiet --recurse-paths "$archive" \
  .claude-plugin \
  agents \
  commands \
  hooks \
  reference \
  skills \
  CHANGELOG.md \
  LICENSE \
  PRIVACY.md \
  README.md

printf '%s\n' "Created $archive"
