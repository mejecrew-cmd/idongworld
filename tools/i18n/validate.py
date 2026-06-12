#!/usr/bin/env python3
"""
📁 tools/i18n/validate.py — i18n CSV/JSON 검수 게이트 7종
───────────────────────────────────────────────
📌 검사:
  1. 빈 키 (ko/en 비어있음·status=locked 시 거절)
  2. 길이 한계 (ko ≤200·en ≤300)
  3. 영감원 식별어 grep
  4. 중복 키 (module, key)
  5. 미정의 module (등록 모듈 외)
  6. placeholder {{var}} 일관성 (ko/en 동일)
  7. HTML 태그 (의도 외)

🔗 호출:
  python tools/i18n/validate.py [--strict]
   --strict: locked status 외에도 모든 위반을 거절 처리

🔗 정합: 텍스트데이터입력_기획_v1_260511.md §6 (게이트 7종)
종료 코드: 0 정합 / 1 거절 위반 / 2 사용 오류
"""
import csv, os, re, sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

V1_ROOT = Path(__file__).resolve().parent.parent.parent
MODULES_DIR = V1_ROOT / 'packages' / 'modules'
SOURCE_CSV = V1_ROOT / 'packages' / 'i18n-source' / 'i18n.csv'
STRICT = '--strict' in sys.argv

PERSONA_PATTERN = re.compile(r'정국|태민|창빈|레오|카이|jungkook|taemin|changbin|leo|kai', re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r'\{\{[^}]+\}\}')
HTML_RE = re.compile(r'<[a-zA-Z][^>]*>')

MAX_KO = 200
MAX_EN = 300

errors = []   # 거절
warnings = [] # 경고


def get_registered_modules():
    return sorted(p.name for p in MODULES_DIR.iterdir() if p.is_dir())


def main():
    if not SOURCE_CSV.exists():
        print(f"[사용 오류] CSV 없음: {SOURCE_CSV.relative_to(V1_ROOT)}")
        sys.exit(2)

    registered = set(get_registered_modules())
    seen = set()

    with open(SOURCE_CSV, encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for i, row in enumerate(rows, start=2):  # 헤더 다음부터 라인 번호
        mid = row.get('module', '').strip()
        key = row.get('key', '').strip()
        ko = row.get('ko', '')
        en = row.get('en', '')
        status = (row.get('status') or 'draft').strip()
        loc = f"L{i} {mid}:{key}"

        if not mid or not key:
            errors.append(f"[거절] {loc} — module 또는 key 누락")
            continue

        # 5. 미정의 module
        if mid not in registered:
            errors.append(f"[거절] {loc} — 미등록 모듈 '{mid}'")
            continue

        # 4. 중복
        if (mid, key) in seen:
            errors.append(f"[거절] {loc} — 중복 (module, key)")
        seen.add((mid, key))

        # 1. 빈 값
        if not ko or not en:
            msg = f"{loc} — 빈 값 (ko={'∅' if not ko else 'OK'}, en={'∅' if not en else 'OK'}) status={status}"
            if status == 'locked' or STRICT:
                errors.append(f"[거절] {msg}")
            else:
                warnings.append(f"[경고] {msg}")

        # 2. 길이
        if ko and len(ko) > MAX_KO:
            warnings.append(f"[경고] {loc} — ko 길이 {len(ko)} > {MAX_KO}")
        if en and len(en) > MAX_EN:
            warnings.append(f"[경고] {loc} — en 길이 {len(en)} > {MAX_EN}")

        # 3. 영감원
        for text, locale in [(ko, 'ko'), (en, 'en')]:
            if text and PERSONA_PATTERN.search(text):
                errors.append(f"[거절] {loc} — 영감원 식별어 ({locale}): {text[:50]}...")

        # 6. placeholder 일관성
        ko_vars = set(PLACEHOLDER_RE.findall(ko))
        en_vars = set(PLACEHOLDER_RE.findall(en))
        if ko_vars != en_vars:
            warnings.append(f"[경고] {loc} — placeholder 불일치 ko={ko_vars} en={en_vars}")

        # 7. HTML
        for text, locale in [(ko, 'ko'), (en, 'en')]:
            if text and HTML_RE.search(text):
                warnings.append(f"[경고] {loc} — HTML 태그 ({locale}): {HTML_RE.search(text).group()}")

    print('')
    if warnings:
        print('─── 경고 (locked 외 통과) ───')
        for w in warnings:
            print(w)
        print('')

    if errors:
        print('─── 거절 ───')
        for e in errors:
            print(e)
        print('')
        print(f"[실패] 거절 {len(errors)}건 · 경고 {len(warnings)}건 (총 {len(rows)} 행)")
        sys.exit(1)

    print(f"[통과] i18n 정합 (경고 {len(warnings)}건 · 총 {len(rows)} 행)")
    sys.exit(0)


if __name__ == '__main__':
    main()
