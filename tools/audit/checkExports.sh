#!/usr/bin/env bash
# 📁 tools/audit/checkExports.sh — manifest.exports ↔ 실 export 정합 검수 (python wrapper)
# ───────────────────────────────────────────────
# 📌 역할: 각 모듈 manifest.ts 의 `exports: [...]` 표면이 실제 src/index.ts 에 export 되는지 확인.
#
# 🔗 호출:
#   bash tools/audit/checkExports.sh
#   bash tools/audit/checkExports.sh vn-runner   # 단일 모듈
#
# 종료 코드: 0 정합 / 1 불일치

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
exec python3 "${SCRIPT_DIR}/checkExports.py" "${V1_ROOT}" "${1:-}"
