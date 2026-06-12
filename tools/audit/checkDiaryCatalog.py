#!/usr/bin/env python3
"""
tools/audit/checkDiaryCatalog.py

역할:
  shared-data/cutscene-catalog/diaries.csv 의 구조와 written 일기 파일 정합을 검사한다.

검사:
  - 필수 컬럼 존재
  - diaryId 중복
  - characterId/personaNumber/day/layer/status 정합
  - day 1~20 범위와 layer(surface/deep) 정합
  - 시나리오 루트가 있으면 written row 의 {diaryId}.json 존재
  - JSON 파일이 있으면 id, characterId, day 필드가 catalog 와 정합

사용:
  python3 tools/audit/checkDiaryCatalog.py
  python3 tools/audit/checkDiaryCatalog.py --require-files
  SCENARIO_ROOT=path/to/scenarios python3 tools/audit/checkDiaryCatalog.py

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
CATALOG = V1_ROOT / 'shared-data' / 'cutscene-catalog' / 'diaries.csv'
AIDONG_MASTER = V1_ROOT / 'shared-data' / 'aidong-master' / 'characters.csv'
SCENARIO_POINTER = V1_ROOT / 'packages' / 'frontend' / 'public' / 'scenarios'

REQUIRED_COLUMNS = [
    'diaryId',
    'characterId',
    'personaNumber',
    'day',
    'layer',
    'unlockCondition',
    'motif',
    'status',
    'writer',
    'expectedDelivery',
]
VALID_STATUS = {'written', 'planned', 'in-review'}
VALID_LAYERS = {'surface', 'deep'}
DIARY_ID_RE = re.compile(r'^diary_([a-z0-9_]+)_day([0-9]{1,2})$')


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


def expected_layer(day: int) -> str:
    return 'surface' if 1 <= day <= 9 else 'deep'


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
        diary_id = (row.get('diaryId') or '').strip()
        character_id = (row.get('characterId') or '').strip()
        persona_text = (row.get('personaNumber') or '').strip()
        day_text = (row.get('day') or '').strip()
        layer = (row.get('layer') or '').strip()
        status = (row.get('status') or '').strip()
        loc = f'L{idx} {diary_id or "(diaryId 없음)"}'

        if not diary_id:
            errors.append(f'{loc}: diaryId 누락')
            continue
        if diary_id in seen:
            errors.append(f'{loc}: diaryId 중복')
        seen.add(diary_id)

        match = DIARY_ID_RE.match(diary_id)
        if not match:
            errors.append(f'{loc}: diaryId 형식 오류')
        if character_id not in aidongs:
            errors.append(f'{loc}: 미등록 characterId({character_id})')

        try:
            day = int(day_text)
        except ValueError:
            day = -1
            errors.append(f'{loc}: day 숫자 아님({day_text})')
        if not 1 <= day <= 20:
            errors.append(f'{loc}: day 범위 오류({day_text})')
        if match and day != -1 and int(match.group(2)) != day:
            errors.append(f'{loc}: diaryId day와 day 컬럼 불일치')

        if layer not in VALID_LAYERS:
            errors.append(f'{loc}: layer 허용값 아님({layer})')
        elif 1 <= day <= 20 and layer != expected_layer(day):
            errors.append(f'{loc}: day {day}의 layer는 {expected_layer(day)} 이어야 함')

        if status not in VALID_STATUS:
            errors.append(f'{loc}: status 허용값 아님({status})')

        if character_id in aidongs:
            master = aidongs[character_id]
            expected_scenario_id = master.get('scenarioId', '').strip()
            if match and match.group(1) != expected_scenario_id:
                errors.append(f'{loc}: diaryId scenarioId({match.group(1)})와 character scenarioId({expected_scenario_id}) 불일치')
            try:
                persona = int(persona_text)
                expected_persona = int(master.get('personaNumber', '0'))
                if persona != expected_persona:
                    errors.append(f'{loc}: personaNumber({persona})와 master({expected_persona}) 불일치')
            except ValueError:
                errors.append(f'{loc}: personaNumber 숫자 아님({persona_text})')

        if status == 'written':
            written_count += 1
            if scenario_root:
                diary_file = scenario_root / f'{diary_id}.json'
                if not diary_file.exists():
                    errors.append(f'{loc}: written 이지만 파일 없음({diary_file})')
                else:
                    try:
                        payload = json.loads(diary_file.read_text(encoding='utf-8'))
                    except json.JSONDecodeError as exc:
                        errors.append(f'{loc}: JSON 파싱 실패({exc})')
                    else:
                        json_id = payload.get('id')
                        if json_id and json_id != diary_id:
                            errors.append(f'{loc}: JSON id 불일치({json_id})')
                        if payload.get('characterId') and payload.get('characterId') != character_id:
                            errors.append(f'{loc}: JSON characterId 불일치({payload.get("characterId")})')
                        if payload.get('day') is not None and int(payload.get('day')) != day:
                            errors.append(f'{loc}: JSON day 불일치({payload.get("day")})')

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
        print(f'[실패] diary catalog 거절 {len(errors)}건 · 경고 {len(warnings)}건 · written {written_count}건 · 총 {len(rows)}행')
        sys.exit(1)

    print(f'[통과] diary catalog 정합 · 경고 {len(warnings)}건 · written {written_count}건 · 총 {len(rows)}행')
    sys.exit(0)


if __name__ == '__main__':
    main()
