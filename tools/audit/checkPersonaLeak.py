#!/usr/bin/env python3
"""
tools/audit/checkPersonaLeak.py

역할:
  코드·문서·CSV·JSON에서 영감원 식별어가 실 콘텐츠로 새지 않았는지 검사한다.

사용:
  python tools/audit/checkPersonaLeak.py
  python tools/audit/checkPersonaLeak.py path/to/file.md
  python tools/audit/checkPersonaLeak.py --strict
  python tools/audit/checkPersonaLeak.py --silent

종료 코드:
  0 = 정합
  1 = 위반
  2 = 사용 오류
"""
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

V1_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = V1_ROOT.parent

PATTERN = re.compile(r'정국|태민|창빈|레오|카이|jungkook|taemin|changbin|leo|kai', re.IGNORECASE)
INCLUDE_SUFFIXES = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.csv', '.yaml', '.yml', '.sh', '.py'}
EXCLUDE_FILES = {
    'package-lock.json',
    'pnpm-lock.yaml',
    '중간작업검수절차_260511검수.md',
    '툴 리스트_v1_260510_260511검수.md',
    'COMPACT_인수인계_260510_260511검수.md',
    '텍스트데이터입력_기획_v1_260511_260511검수.md',
}
EXCLUDE_DIRS = {'node_modules', 'dist', '.vite', '.turbo', '.git', '[폐기기획]'}
EXCEPT_PARTS = [
    Path('기획/모듈/본진5명선정.md'),
    Path('기획/작가/작가_시나리오지침서_v1_260510.md'),
    Path('기획/작가/시나리오_작성테이블_v1_260510.md'),
    Path('v1_260509/중간작업검수절차.md'),
    Path('v1_260509/툴 리스트_v1_260510.md'),
    Path('v1_260509/COMPACT_인수인계_260510_260511검수.md'),
    Path('v1_260509/텍스트데이터입력_기획_v1_260511_260511검수.md'),
    Path('v1_260509/shared-data/aidong-master/README_260511검수.md'),
    Path('v1_260509/tools/i18n/validate.py'),
    Path('v1_260509/tools/audit/checkPersonaLeak.sh'),
    Path('v1_260509/tools/audit/checkPersonaLeak.py'),
]


def usage_error(message: str) -> None:
    print(f'[사용 오류] {message}')
    sys.exit(2)


def is_excluded(path: Path) -> bool:
    return any(part in EXCLUDE_DIRS for part in path.parts)


def is_exception(path: Path) -> bool:
    normalized = Path(*path.parts[-len(path.parts):])
    text = str(normalized).replace('\\', '/')
    return any(str(part).replace('\\', '/') in text for part in EXCEPT_PARTS)


def iter_files(targets: list[Path]) -> list[Path]:
    files: list[Path] = []
    for target in targets:
        if target.is_file():
            if target.name in EXCLUDE_FILES:
                continue
            if target.suffix in INCLUDE_SUFFIXES:
                files.append(target)
            continue
        if target.is_dir():
            for path in target.rglob('*'):
                if path.is_file() and path.suffix in INCLUDE_SUFFIXES and not is_excluded(path):
                    if path.name in EXCLUDE_FILES:
                        continue
                    files.append(path)
    return files


def main() -> None:
    strict = '--strict' in sys.argv
    silent = '--silent' in sys.argv
    args = [arg for arg in sys.argv[1:] if arg not in {'--strict', '--silent'}]
    if len(args) > 1:
        usage_error('검사 대상은 하나만 지정할 수 있음')

    if args:
        target = Path(args[0])
        if not target.exists():
            usage_error(f'대상 없음: {target}')
        targets = [target]
    else:
        targets = [V1_ROOT]
        planning_root = PROJECT_ROOT / '기획'
        if planning_root.exists():
            targets.append(planning_root)

    matches: list[str] = []
    for path in iter_files(targets):
        if not strict and is_exception(path):
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for line_no, line in enumerate(text.splitlines(), start=1):
            if PATTERN.search(line):
                rel = path.resolve()
                try:
                    rel_text = str(rel.relative_to(PROJECT_ROOT))
                except ValueError:
                    rel_text = str(rel)
                matches.append(f'{rel_text}:{line_no}: {line.strip()}')

    if matches:
        print('[실패] 영감원 식별어 매치 발견')
        print('')
        for match in matches:
            print(match)
        print('')
        print('위 매치는 코드·실 콘텐츠에서 제거되어야 한다.')
        sys.exit(1)

    if not silent:
        print(f'[통과] 영감원 식별어 0 매치 · 검사 파일 {len(iter_files(targets))}개')
    sys.exit(0)


if __name__ == '__main__':
    main()
