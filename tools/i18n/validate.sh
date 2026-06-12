#!/usr/bin/env bash
# 📁 tools/i18n/validate.sh — python wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "${SCRIPT_DIR}/validate.py" "$@"
