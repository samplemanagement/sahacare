#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

find "$ROOT_DIR/api" -type f -name '*.js' -print0 | while IFS= read -r -d '' file; do
  node --check "$file"
done

echo "JS syntax checks passed."
