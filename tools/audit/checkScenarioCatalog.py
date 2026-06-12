#!/usr/bin/env python3
"""
tools/audit/checkScenarioCatalog.py

역할:
  shared-data/cutscene-catalog/scenarios.csv 의 구조와 written 시나리오 파일 정합을 검사한다.

검사:
  - 필수 컬럼 존재
  - scenarioId 중복
  - type/status 허용값
  - characterIds 가 aidong-master 캐릭터와 정합
  - 시나리오 루트가 있으면 written row 의 {scenarioId}.json 존재
  - JSON 파일이 있으면 id 필드가 scenarioId 와 정합

사용:
  python3 tools/audit/checkScenarioCatalog.py
  python3 tools/audit/checkScenarioCatalog.py --require-files
  SCENARIO_ROOT=path/to/scenarios python3 tools/audit/checkScenarioCatalog.py

종료 코드:
  0 = 정합
  1 = 거절 위반
  2 = 사용 오류
"""
import csv
import json
import os
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

V1_ROOT = Path(__file__).resolve().parents[2]
CATALOG = V1_ROOT / 'shared-data' / 'cutscene-catalog' / 'scenarios.csv'
AIDONG_MASTER = V1_ROOT / 'shared-data' / 'aidong-master' / 'characters.csv'
SCENARIO_POINTER = V1_ROOT / 'packages' / 'frontend' / 'public' / 'scenarios'

REQUIRED_COLUMNS = [
    'scenarioId',
    'type',
    'callSite',
    'characterIds',
    'status',
    'writer',
    'expectedDelivery',
    'length',
    'note',
]
VALID_TYPES = {'recruit', 'settle', 'cutscene', 'debut'}
VALID_STATUS = {'written', 'planned', 'in-review'}
ID_RE = re.compile(r'^[a-z0-9_]+$')


def usage_error(message: str) -> None:
    print(f'[사용 오류] {message}')
    sys.exit(2)


def read_csv_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    if not path.exists():
        usage_error(f'CSV 없음: {path.relative_to(V1_ROOT)}')
    with path.open(encoding='utf-8', newline='') as f:
        lines = [line for line in f if line.strip() and not line.lstrip().startswith('#')]
    reader = csv.DictReader(lines)
    return list(reader.fieldnames or []), list(reader)


def load_aidong_master() -> dict[str, dict[str, str]]:
    _, rows = read_csv_rows(AIDONG_MASTER)
    return {row['id'].strip(): row for row in rows if row.get('id')}


def resolve_scenario_root() -> Path | None:
    env_root = os.environ.get('SCENARIO_ROOT')
    candidates: list[Path] = []
    if env_root:
        candidates.append(Path(env_root))

    if SCENARIO_POINTER.is_dir():
        candidates.append(SCENARIO_POINTER)
    elif SCENARIO_POINTER.is_file():
        pointer = SCENARIO_POINTER.read_text(encoding='utf-8').strip()
        if pointer:
            p = Path(pointer)
            candidates.append(p if p.is_absolute() else (SCENARIO_POINTER.parent / p))

    candidates.append(V1_ROOT.parent / '기획' / '시나리오')

    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.exists() and resolved.is_dir():
            return resolved
    return None


def main() -> None:
    require_files = '--require-files' in sys.argv
    unknown = [arg for arg in sys.argv[1:] if arg != '--require-files']
    if unknown:
        usage_error(f'알 수 없는 인자: {", ".join(unknown)}')

    header, rows = read_csv_rows(CATALOG)
    errors: list[str] = []
    warnings: list[str] = []

    missing_columns = [col for col in REQUIRED_COLUMNS if col not in header]
    if missing_columns:
        errors.append(f'필수 컬럼 누락: {", ".join(missing_columns)}')

    aidongs = load_aidong_master()
    scenario_root = resolve_scenario_root()
    if scenario_root is None:
        message = '시나리오 루트를 찾지 못했다. SCENARIO_ROOT를 지정하면 written 파일 존재까지 검사한다.'
        if require_files:
            errors.append(message)
        else:
            warnings.append(message)

    seen: set[str] = set()
    written_count = 0

    for idx, row in enumerate(rows, start=2):
        sid = (row.get('scenarioId') or '').strip()
        stype = (row.get('type') or '').strip()
        status = (row.get('status') or '').strip()
        call_site = (row.get('callSite') or '').strip()
        loc = f'L{idx} {sid or "(scenarioId 없음)"}'

        if not sid:
            errors.append(f'{loc}: scenarioId 누락')
            continue
        if sid in seen:
            errors.append(f'{loc}: scenarioId 중복')
        seen.add(sid)
        if not ID_RE.match(sid):
            errors.append(f'{loc}: scenarioId는 lowercase snake_case만 허용')
        if stype not in VALID_TYPES:
            errors.append(f'{loc}: type 허용값 아님({stype})')
        if status not in VALID_STATUS:
            errors.append(f'{loc}: status 허용값 아님({status})')
        if not call_site:
            errors.append(f'{loc}: callSite 누락')

        char_field = (row.get('characterIds') or '').strip()
        if char_field:
            for character_id in [x.strip() for x in char_field.split(';') if x.strip()]:
                if character_id not in aidongs:
                    errors.append(f'{loc}: 미등록 characterId({character_id})')

        if status == 'written':
            written_count += 1
            if scenario_root:
                scenario_file = scenario_root / f'{sid}.json'
                if not scenario_file.exists():
                    errors.append(f'{loc}: written 이지만 파일 없음({scenario_file})')
                else:
                    try:
                        payload = json.loads(scenario_file.read_text(encoding='utf-8'))
                    except json.JSONDecodeError as exc:
                        errors.append(f'{loc}: JSON 파싱 실패({exc})')
                    else:
                        json_id = payload.get('id')
                        if json_id and json_id != sid:
                            errors.append(f'{loc}: JSON id 불일치({json_id})')

    if warnings:
        print('─── 경고 ───')
        for warning in warnings:
            print(f'[경고] {warning}')
        print('')

    if errors:
        print('─── 거절 ───')
        for error in errors:
            print(f'[거절] {error}')
        print('')
        print(f'[실패] scenario catalog 거절 {len(errors)}건 · 경고 {len(warnings)}건 · written {written_count}건 · 총 {len(rows)}행')
        sys.exit(1)

    print(f'[통과] scenario catalog 정합 · 경고 {len(warnings)}건 · written {written_count}건 · 총 {len(rows)}행')
    sys.exit(0)


if __name__ == '__main__':
    main()
