#!/usr/bin/env bash
# tools/shared-data/syncAidongMaster.sh — aidong-master sync python wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python "${SCRIPT_DIR}/syncAidongMaster.py" "$@"
