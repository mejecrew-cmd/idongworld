#!/usr/bin/env bash
# 📁 tools/i18n/importCsv.sh — python wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "${SCRIPT_DIR}/importCsv.py" "$@"
