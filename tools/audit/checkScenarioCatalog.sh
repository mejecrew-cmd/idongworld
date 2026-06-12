#!/usr/bin/env bash
# tools/audit/checkScenarioCatalog.sh — scenario catalog python wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python "${SCRIPT_DIR}/checkScenarioCatalog.py" "$@"
