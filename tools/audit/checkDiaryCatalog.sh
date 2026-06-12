#!/usr/bin/env bash
# tools/audit/checkDiaryCatalog.sh — diary catalog python wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python "${SCRIPT_DIR}/checkDiaryCatalog.py" "$@"
