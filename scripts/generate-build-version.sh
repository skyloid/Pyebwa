#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT_DIR/VERSION"
BUILD_TS="$(date -u +%Y%m%dT%H%M%SZ)"
GIT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo dev)"
BUILD_ID="${BUILD_TS}-${GIT_SHA}"
DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "1.0.0" > "$VERSION_FILE"
fi

CURRENT_VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
MAJOR="${MAJOR:-1}"
MINOR="${MINOR:-0}"
PATCH="${PATCH:-0}"

case "${1:-patch}" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  set)
    if [[ -z "${2:-}" ]]; then
      echo "Usage: $0 [patch|minor|major|set X.Y.Z]" >&2
      exit 1
    fi
    NEXT_VERSION="$2"
    ;;
  *)
    echo "Usage: $0 [patch|minor|major|set X.Y.Z]" >&2
    exit 1
    ;;
esac

if [[ -z "${NEXT_VERSION:-}" ]]; then
  NEXT_VERSION="${MAJOR}.${MINOR}.${PATCH}"
fi

printf '%s\n' "$NEXT_VERSION" > "$VERSION_FILE"

cat > "$ROOT_DIR/app/version.json" <<EOF
{
  "version": "$NEXT_VERSION",
  "buildId": "$BUILD_ID",
  "deployedAt": "$DEPLOYED_AT"
}
EOF

cat > "$ROOT_DIR/pyebwa.com/version.json" <<EOF
{
  "version": "$NEXT_VERSION",
  "buildId": "$BUILD_ID",
  "deployedAt": "$DEPLOYED_AT"
}
EOF

printf 'Updated semantic version: %s\n' "$NEXT_VERSION"
printf 'Updated build id: %s\n' "$BUILD_ID"
