#!/usr/bin/env python3
"""
📁 tools/i18n/importCsv.py — 통합 CSV → 모듈 i18n JSON
───────────────────────────────────────────────
📌 역할: packages/i18n-source/i18n.csv 를 읽어
         packages/modules/{mid}/i18n/{ko,en}.json 자동 생성·덮어쓰기.

🔗 호출:
  python3 tools/i18n/importCsv.py
  python3 tools/i18n/importCsv.py --dry-run   # 변경 미리보기

💡 동작:
- CSV → (module → {key: {ko, en}}) 그룹
- 각 모듈 ko.json / en.json 으로 분리 저장
- 키 정렬: CSV 순서 유지 (sorted import 시 --sort)
- 빈 값: 빈 문자열 그대로 (JSON 에서도 "")

🔗 정합: 텍스트데이터입력_기획_v1_260511.md §3 (JSON 포맷)
"""
import csv, json, os, sys
from pathlib import Path
from collections import OrderedDict

V1_ROOT = Path(__file__).resolve().parent.parent.parent
MODULES_DIR = V1_ROOT / 'packages' / 'modules'
SOURCE_CSV = V1_ROOT / 'packages' / 'i18n-source' / 'i18n.csv'
LOCALES = ['ko', 'en']
DRY_RUN = '--dry-run' in sys.argv
SORT_KEYS = '--sort' in sys.argv


def main():
    if not SOURCE_CSV.exists():
        print(f"❌ source CSV 없음: {SOURCE_CSV.relative_to(V1_ROOT)}")
        print(f"   먼저 `pnpm i18n:export` 실행 후 작가에게 전달.")
        sys.exit(2)

    # CSV 읽기 (module → {key: {ko, en}})
    by_module = {}
    with open(SOURCE_CSV, encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row.get('module', '').strip()
            key = row.get('key', '').strip()
            if not mid or not key:
                continue
            if mid not in by_module:
                by_module[mid] = OrderedDict()
            by_module[mid][key] = {
                'ko': row.get('ko', ''),
                'en': row.get('en', ''),
            }

    if not by_module:
        print(f"❌ CSV 가 비어있음 — 적어도 1행 필요")
        sys.exit(2)

    # 모듈별 JSON 작성
    total_keys = 0
    for mid, keys in sorted(by_module.items()):
        mod_dir = MODULES_DIR / mid
        i18n_dir = mod_dir / 'i18n'
        if not mod_dir.exists():
            print(f"⚠️  모듈 폴더 없음 — 스킵: {mid}")
            continue
        i18n_dir.mkdir(exist_ok=True)

        for locale in LOCALES:
            out_path = i18n_dir / f'{locale}.json'
            items = list(keys.items())
            if SORT_KEYS:
                items.sort(key=lambda kv: kv[0])
            data = OrderedDict((k, v[locale]) for k, v in items)

            if DRY_RUN:
                print(f"  [dry-run] {out_path.relative_to(V1_ROOT)} ({len(data)} keys)")
            else:
                with open(out_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.write('\n')
        total_keys += len(keys)
        print(f"  ✅ {mid} ({len(keys)} keys × {len(LOCALES)} locales)")

    print('')
    if DRY_RUN:
        print(f"🟡 dry-run — 변경 없음. 총 {total_keys} 키.")
    else:
        print(f"✅ 총 {total_keys} 키 import 완료 (모듈 {len(by_module)})")


if __name__ == '__main__':
    main()
