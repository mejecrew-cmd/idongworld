#!/usr/bin/env python3
"""
📁 tools/i18n/exportCsv.py — 모듈 i18n JSON → 통합 CSV (작가 export)
───────────────────────────────────────────────
📌 역할: packages/modules/*/i18n/{ko,en}.json 을 읽어
         packages/i18n-source/i18n.csv 단일 파일로 통합 (RFC 4180).

🔗 호출:
  python3 tools/i18n/exportCsv.py             # 전체 모듈
  python3 tools/i18n/exportCsv.py zone-garden # 단일 모듈

💡 출력 컬럼: module,key,ko,en,description,status
- description·status 는 기존 CSV 값 보존 (병합)
- 신규 키는 description=''·status='draft'

🔗 정합: 텍스트데이터입력_기획_v1_260511.md §2 (CSV 포맷) + §3 (JSON SoT)
"""
import csv, json, os, sys
from pathlib import Path

V1_ROOT = Path(__file__).resolve().parent.parent.parent
MODULES_DIR = V1_ROOT / 'packages' / 'modules'
SOURCE_CSV = V1_ROOT / 'packages' / 'i18n-source' / 'i18n.csv'
LOCALES = ['ko', 'en']
TARGET_MODULE = sys.argv[1] if len(sys.argv) > 1 else ''


def load_module_jsons():
    """모듈 i18n/{ko,en}.json 를 모두 읽어 (module, key) → {ko, en} 딕셔너리."""
    result = {}
    for mod_dir in sorted(MODULES_DIR.iterdir()):
        if not mod_dir.is_dir():
            continue
        mid = mod_dir.name
        if TARGET_MODULE and mid != TARGET_MODULE:
            continue
        for locale in LOCALES:
            json_path = mod_dir / 'i18n' / f'{locale}.json'
            if not json_path.exists():
                continue
            with open(json_path, encoding='utf-8') as f:
                data = json.load(f)
            for key, value in data.items():
                k = (mid, key)
                if k not in result:
                    result[k] = {'ko': '', 'en': ''}
                result[k][locale] = value
    return result


def load_existing_csv():
    """기존 CSV 에서 description·status 보존."""
    if not SOURCE_CSV.exists():
        return {}
    out = {}
    with open(SOURCE_CSV, encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row.get('module', '').strip()
            key = row.get('key', '').strip()
            if not mid or not key:
                continue
            out[(mid, key)] = {
                'description': row.get('description', '').strip(),
                'status': row.get('status', 'draft').strip() or 'draft',
            }
    return out


def main():
    SOURCE_CSV.parent.mkdir(parents=True, exist_ok=True)
    json_data = load_module_jsons()
    existing = load_existing_csv()

    rows = []
    for (mid, key), values in sorted(json_data.items()):
        meta = existing.get((mid, key), {'description': '', 'status': 'draft'})
        rows.append({
            'module': mid, 'key': key,
            'ko': values['ko'], 'en': values['en'],
            'description': meta['description'],
            'status': meta['status'],
        })

    # RFC 4180 — csv 모듈이 quote 자동 처리
    with open(SOURCE_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(
            f,
            fieldnames=['module', 'key', 'ko', 'en', 'description', 'status'],
            quoting=csv.QUOTE_MINIMAL,
            lineterminator='\n',
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"✅ {len(rows)} 키 → {SOURCE_CSV.relative_to(V1_ROOT)}")
    if not TARGET_MODULE:
        modules = sorted({m for m, _ in json_data.keys()})
        print(f"   모듈 {len(modules)}개: {', '.join(modules)}")


if __name__ == '__main__':
    main()
