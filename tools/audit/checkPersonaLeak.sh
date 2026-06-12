#!/usr/bin/env bash
# 📁 tools/audit/checkPersonaLeak.sh — 영감원 식별어 grep 검수 (P0)
# ───────────────────────────────────────────────
# 📌 역할: 코드·자산·문서에서 영감원(외부 IP) 식별어 0 매치 강제.
#           CI·pre-commit·매주 정기 점검에서 호출.
#
# 🔗 연결:
#   - 툴 리스트_v1_260510.md §2.4
#   - 중간작업검수절차.md §1.B-3
#   - 작가_시나리오지침서_v1_260510.md §5.1
#
# 사용:
#   bash tools/audit/checkPersonaLeak.sh                    # 전체 (v1_260509 + 기획)
#   bash tools/audit/checkPersonaLeak.sh path/to/file.md    # 단일 파일
#   bash tools/audit/checkPersonaLeak.sh --strict           # 정의 문서 예외 X
#   bash tools/audit/checkPersonaLeak.sh --silent           # 0 매치 시 출력 없음
#
# 종료 코드:
#   0 = 정합 (0 매치 또는 예외 파일 매치만)
#   1 = 위반 (0 매치 강제 위배)
#   2 = 사용 오류

set -euo pipefail

# ─── 설정 ───────────────────────────────────────
# 검사 대상 식별어 (grep -E)
PATTERNS='정국|태민|창빈|레오|카이|jungkook|taemin|changbin|leo|kai'

# 검사 디렉토리 root 결정 — 본 스크립트는 v1_260509/tools/audit/ 에 있음
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="$(cd "${V1_ROOT}/.." && pwd)"      # 아이동월드 디렉토리

# 정의·예외 파일 (의도적으로 식별어 명시) — strict 모드 외에는 통과
EXCEPT_FILES=(
  "기획/모듈/본진5명선정.md"
  "기획/작가/작가_시나리오지침서_v1_260510.md"
  "기획/작가/시나리오_작성테이블_v1_260510.md"
  "개발/v1_260509/중간작업검수절차.md"
  "개발/v1_260509/툴 리스트_v1_260510.md"
  "개발/v1_260509/tools/audit/checkPersonaLeak.sh"
)

# 검사 제외 디렉토리 (코드 외 잡음)
EXCLUDE_DIRS=(
  "node_modules"
  "dist"
  ".vite"
  ".turbo"
  ".git"
  "[폐기기획]"
)

# ─── 인자 파싱 ───────────────────────────────────
STRICT=0
SILENT=0
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict) STRICT=1 ; shift ;;
    --silent) SILENT=1 ; shift ;;
    -h|--help)
      sed -n '1,/^set -euo/p' "$0" | grep -E '^# ' | sed 's/^# \?//'
      exit 0
      ;;
    *)
      TARGET="$1" ; shift ;;
  esac
done

# ─── grep 실행 ───────────────────────────────────
# 검사 범위
if [[ -n "$TARGET" ]]; then
  if [[ ! -e "$TARGET" ]]; then
    echo "❌ 대상 없음: $TARGET" >&2
    exit 2
  fi
  SEARCH_PATHS=("$TARGET")
else
  SEARCH_PATHS=(
    "${PROJECT_ROOT}/개발/v1_260509"
    "${PROJECT_ROOT}/기획"
  )
fi

# grep 옵션 합성
GREP_EXCLUDES=()
for d in "${EXCLUDE_DIRS[@]}"; do
  GREP_EXCLUDES+=("--exclude-dir=${d}")
done

# 모든 매치 모음 (예외 필터 전)
RAW_MATCHES="$(grep -rEn "$PATTERNS" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --include='*.json' --include='*.md' --include='*.csv' --include='*.yaml' --include='*.yml' \
  --include='*.sh' \
  "${GREP_EXCLUDES[@]}" \
  "${SEARCH_PATHS[@]}" 2>/dev/null || true)"

# 예외 필터 — strict 모드가 아니면 정의 문서 매치를 제외
if [[ "$STRICT" -eq 0 && -n "$RAW_MATCHES" ]]; then
  FILTERED="$RAW_MATCHES"
  for ex in "${EXCEPT_FILES[@]}"; do
    # 예외 파일 경로(부분 일치) 줄 제거
    FILTERED="$(echo "$FILTERED" | grep -vF "/${ex}:" || true)"
  done
else
  FILTERED="$RAW_MATCHES"
fi

# ─── 결과 출력 ───────────────────────────────────
if [[ -z "$FILTERED" ]]; then
  if [[ "$SILENT" -eq 0 ]]; then
    echo "✅ 영감원 식별어 0 매치 (예외 ${#EXCEPT_FILES[@]} 개 제외)"
  fi
  exit 0
fi

# 위반 — 출력 + exit 1
echo "❌ 영감원 식별어 매치 발견" >&2
echo "" >&2
echo "$FILTERED" >&2
echo "" >&2
echo "→ 위 매치는 모두 코드·실 콘텐츠에서 제거되어야 합니다." >&2
echo "→ 의도적 정의 (PM SoT) 라면 EXCEPT_FILES 에 추가 후 재실행." >&2
exit 1
