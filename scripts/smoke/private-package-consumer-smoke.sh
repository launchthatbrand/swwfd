#!/usr/bin/env bash
set -euo pipefail

echo "[smoke:swwfd] Installing from lockfile..."
pnpm install --frozen-lockfile

echo "[smoke:swwfd] Regenerating Convex bindings..."
pnpm exec convex codegen

echo "[smoke:swwfd] Type checking..."
pnpm typecheck

echo "[smoke:swwfd] Building app..."
pnpm build

echo "[smoke:swwfd] Smoke checks passed."
