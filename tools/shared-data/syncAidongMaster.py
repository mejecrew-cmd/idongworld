#!/usr/bin/env python3
"""
tools/shared-data/syncAidongMaster.py

역할:
  shared-data/aidong-master/characters.csv 를 기준으로 characters.json mirror 를 생성하거나 정합성을 검사한다.

사용:
  python tools/shared-data/syncAidongMaster.py --check
  python tools/shared-data/syncAidongMaster.py --write

검사:
  - 필수 컬럼 존재
  - id/scenarioId 중복
  - personaNumber 숫자
  - exposure/defaultExpression 허용값
  - signatureWords 세미콜론 분리
  - characters.json 이 CSV에서 생성한 결과와 일치하는지 확인

종료 코드:
  0 = 정합 또는 쓰기 성공
  1 = 거절 위반 또는 check 불일치
  2 = 사용 오류
"""
import csv
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

V1_ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = V1_ROOT / 'shared-data' / 'aidong-master' / 'characters.csv'
JSON_PATH = V1_ROOT / 'shared-data' / 'aidong-master' / 'characters.json'

REQUIRED_COLUMNS = [
    'id',
    'scenarioId',
    'species',
    'personaNumber',
    'gachaPool',
    'assetCategory',
    'description',
    'signatureWords',
    'voicePattern',
    'avoidPattern',
    'boardIconExposure',
    'bodyExposure',
    'defaultExpression',
]
VALID_EXPOSURE = {'public', 'protected'}
VALID_EXPRESSION = {'normal', 'happy', 'surprised', 'worried', 'sleepy'}
SCENARIO_ID_RE = re.compile(r'^[a-z0-9_]+$')


def usage_error(message: str) -> None:
    print(f'[사용 오류] {message}')
    sys.exit(2)


def read_csv_rows() -> tuple[list[str], list[dict[str, str]]]:
    if not CSV_PATH.exists():
        usage_error(f'CSV 없음: {CSV_PATH.relative_to(V1_ROOT)}')
    with CSV_PATH.open(encoding='utf-8', newline='') as f:
        lines = [line for line in f if line.strip() and not line.lstrip().startswith('#')]
    reader = csv.DictReader(lines)
    return list(reader.fieldnames or []), list(reader)


def normalize_signature_words(value: str) -> list[str]:
    return [part.strip() for part in value.split(';') if part.strip()]


def build_payload() -> tuple[dict[str, object], list[str]]:
    header, rows = read_csv_rows()
    errors: list[str] = []
    missing = [col for col in REQUIRED_COLUMNS if col not in header]
    if missing:
        errors.append(f'필수 컬럼 누락: {", ".join(missing)}')

    seen_ids: set[str] = set()
    seen_scenario_ids: set[str] = set()
    characters: list[dict[str, object]] = []

    for idx, row in enumerate(rows, start=2):
        cid = (row.get('id') or '').strip()
        scenario_id = (row.get('scenarioId') or '').strip()
        loc = f'L{idx} {cid or "(id 없음)"}'

        if not cid:
            errors.append(f'{loc}: id 누락')
            continue
        if cid in seen_ids:
            errors.append(f'{loc}: id 중복')
        seen_ids.add(cid)

        if not scenario_id:
            errors.append(f'{loc}: scenarioId 누락')
        elif not SCENARIO_ID_RE.match(scenario_id):
            errors.append(f'{loc}: scenarioId는 lowercase snake_case만 허용')
        if scenario_id in seen_scenario_ids:
            errors.append(f'{loc}: scenarioId 중복({scenario_id})')
        seen_scenario_ids.add(scenario_id)

        try:
            persona_number = int((row.get('personaNumber') or '').strip())
        except ValueError:
            persona_number = 0
            errors.append(f'{loc}: personaNumber 숫자 아님({row.get("personaNumber")})')

        board_icon_exposure = (row.get('boardIconExposure') or '').strip()
        body_exposure = (row.get('bodyExposure') or '').strip()
        default_expression = (row.get('defaultExpression') or '').strip()
        if board_icon_exposure not in VALID_EXPOSURE:
            errors.append(f'{loc}: boardIconExposure 허용값 아님({board_icon_exposure})')
        if body_exposure not in VALID_EXPOSURE:
            errors.append(f'{loc}: bodyExposure 허용값 아님({body_exposure})')
        if default_expression not in VALID_EXPRESSION:
            errors.append(f'{loc}: defaultExpression 허용값 아님({default_expression})')

        signature_words = normalize_signature_words(row.get('signatureWords') or '')
        if not signature_words:
            errors.append(f'{loc}: signatureWords 비어 있음')

        characters.append({
            'id': cid,
            'scenarioId': scenario_id,
            'species': (row.get('species') or '').strip(),
            'personaNumber': persona_number,
            'gachaPool': (row.get('gachaPool') or '').strip(),
            'assetCategory': (row.get('assetCategory') or '').strip(),
            'description': (row.get('description') or '').strip(),
            'signatureWords': signature_words,
            'voicePattern': (row.get('voicePattern') or '').strip(),
            'avoidPattern': (row.get('avoidPattern') or '').strip(),
            'boardIconExposure': board_icon_exposure,
            'bodyExposure': body_exposure,
            'defaultExpression': default_expression,
        })

    payload: dict[str, object] = {
        '$schema': '본진 5명 마스터 — characters.csv 와 1:1 정합 (machine-readable mirror)',
        '$policy': '영감원 식별어 0 매치. PM SoT 본진5명선정.md 만 외부 IP 영감원 보유.',
        'version': '1.0.0',
        'lastUpdated': '2026-05-10',
        'characters': characters,
    }
    return payload, errors


def dump_json(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2) + '\n'


def main() -> None:
    write = '--write' in sys.argv
    check = '--check' in sys.argv
    unknown = [arg for arg in sys.argv[1:] if arg not in {'--write', '--check'}]
    if unknown:
        usage_error(f'알 수 없는 인자: {", ".join(unknown)}')
    if write == check:
        usage_error('--write 또는 --check 중 하나만 지정')

    payload, errors = build_payload()
    if errors:
        print('─── 거절 ───')
        for error in errors:
            print(f'[거절] {error}')
        print('')
        print(f'[실패] aidong-master CSV 거절 {len(errors)}건')
        sys.exit(1)

    expected = dump_json(payload)

    if write:
        JSON_PATH.write_text(expected, encoding='utf-8')
        print(f'[통과] characters.json 재생성 완료 · characters {len(payload["characters"])}건')
        sys.exit(0)

    if not JSON_PATH.exists():
        print(f'[실패] JSON 없음: {JSON_PATH.relative_to(V1_ROOT)}')
        sys.exit(1)

    actual = JSON_PATH.read_text(encoding='utf-8')
    if actual != expected:
        print('[실패] characters.json 이 characters.csv 에서 생성한 결과와 다르다.')
        print('       `pnpm shared-data:sync-aidong` 실행 후 변경 내용을 확인한다.')
        sys.exit(1)

    print(f'[통과] aidong-master CSV/JSON 정합 · characters {len(payload["characters"])}건')
    sys.exit(0)


if __name__ == '__main__':
    main()
