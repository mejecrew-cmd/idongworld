#!/usr/bin/env python3
"""
📁 tools/audit/renameReviewed.py — 검수 작업: rename + frontmatter + cross-ref 일괄 갱신

🎯 동작:
  1. 기획/·개발/ 의 모든 active .md 수집 (.history/ 제외)
  2. 각 파일에 `reviewed_at: 2026-05-11` frontmatter 추가/갱신
  3. 파일명에 `_260511검수` 접미사 추가
  4. 모든 .md 안의 마크다운 cross-ref 자동 갱신

🛡️ 안전:
  - 코드 파일 (.ts·.tsx·.json·.csv·...) 절대 미수정
  - .history/ 안 파일 절대 미수정
  - dry-run 옵션 (--dry-run)
  - 이미 _260511검수 접미사 있는 파일은 frontmatter 만 갱신·rename 스킵

🔗 사용:
  python3 tools/audit/renameReviewed.py --dry-run    # 미리보기
  python3 tools/audit/renameReviewed.py              # 실 실행
"""
import os, re, sys
from pathlib import Path
from urllib.parse import quote, unquote

V1_ROOT = Path(__file__).resolve().parent.parent.parent  # 개발/v1_260509
PROJECT_ROOT = V1_ROOT.parent.parent                      # 아이동월드
SUFFIX = '_260511검수'
REVIEW_DATE = '2026-05-11'
DRY_RUN = '--dry-run' in sys.argv

# 검사 대상 — 기획·개발 (root README 도 포함)
SCAN_ROOTS = [
    PROJECT_ROOT / '기획',
    PROJECT_ROOT / '개발',
    PROJECT_ROOT,  # root README.md
]
EXCLUDE_DIRS = {'.history', 'node_modules', 'dist', '.git', '.vite'}


def is_excluded(path: Path) -> bool:
    return any(part in EXCLUDE_DIRS for part in path.parts)


def collect_md_files() -> list[Path]:
    """모든 active .md 파일 (기획·개발·root)."""
    out = []
    seen = set()
    for root in SCAN_ROOTS:
        if not root.exists():
            continue
        # root 자체는 PROJECT_ROOT 일 때만 1단 (재귀 X) — root README만
        if root == PROJECT_ROOT:
            for p in root.glob('*.md'):
                if p not in seen:
                    out.append(p); seen.add(p)
            continue
        # 그 외는 재귀
        for p in root.rglob('*.md'):
            if is_excluded(p): continue
            if p not in seen:
                out.append(p); seen.add(p)
    return sorted(out)


def add_or_update_frontmatter(content: str, key: str, value: str) -> str:
    """파일 본문에 frontmatter 의 key: value 를 추가/갱신."""
    if content.startswith('---\n'):
        # 기존 frontmatter 끝 찾기
        end_idx = content.find('\n---\n', 4)
        if end_idx == -1:
            end_idx = content.find('\n---', 4)
            if end_idx == -1:
                # 손상된 frontmatter — 무시
                return content
        fm_block = content[4:end_idx]
        rest = content[end_idx:]  # \n---\n... 이후
        # key 가 이미 있는지
        pattern = re.compile(rf'^{re.escape(key)}\s*:\s*.*$', re.M)
        if pattern.search(fm_block):
            new_fm = pattern.sub(f'{key}: {value}', fm_block)
        else:
            new_fm = fm_block.rstrip() + f'\n{key}: {value}\n'
        return '---\n' + new_fm + rest
    else:
        # frontmatter 없음 — 새로 추가
        return f'---\n{key}: {value}\n---\n\n' + content


def build_rename_map(files: list[Path]) -> dict[Path, Path]:
    """파일 → 새 파일 경로 매핑."""
    rmap = {}
    for f in files:
        if SUFFIX in f.stem:
            continue  # 이미 검수됨
        # `_history_문서정보.md` 등 history 메타는 skip
        if f.name.startswith('_history_'):
            continue
        new_path = f.with_name(f.stem + SUFFIX + f.suffix)
        rmap[f] = new_path
    return rmap


# 마크다운 링크 패턴 — `[text](path)` · `[text](path#anchor)` · 공백 인코딩 포함
LINK_RE = re.compile(r'(\]\()([^)\s]+?\.md)(#[^)]*)?(\))')


def update_cross_refs(content: str, file_path: Path, rename_map: dict[Path, Path]) -> str:
    """파일 안 마크다운 링크에서 rename 된 .md 를 새 이름으로."""
    def replace(m: re.Match) -> str:
        prefix, link_path, anchor, suffix_paren = m.group(1), m.group(2), m.group(3) or '', m.group(4)
        # 디코드 (예: 툴%20리스트 → 툴 리스트)
        decoded = unquote(link_path)
        # file_path 기준 절대 path 시도
        try:
            target = (file_path.parent / decoded).resolve()
        except Exception:
            return m.group(0)
        if target in rename_map:
            new_target = rename_map[target]
            # file_path.parent 기준 상대 path 다시
            try:
                rel = os.path.relpath(new_target, file_path.parent)
            except Exception:
                return m.group(0)
            # 공백 — 원래 인코딩 형태 보존 (있었으면 인코딩)
            had_encoded = '%20' in link_path
            if had_encoded:
                rel_url = quote(rel, safe='/#-_.가-힣ㄱ-ㅎㅏ-ㅣ')
                # %20 만 필요 — 한글은 그대로 유지
                rel_url = rel.replace(' ', '%20')
            else:
                rel_url = rel
            return f'{prefix}{rel_url}{anchor}{suffix_paren}'
        return m.group(0)
    return LINK_RE.sub(replace, content)


def main():
    files = collect_md_files()
    rmap = build_rename_map(files)
    print(f'📋 검사 대상 .md: {len(files)}')
    print(f'📋 rename 예정: {len(rmap)}')
    print(f'📋 스킵 (이미 검수됨 또는 history 메타): {len(files) - len(rmap)}')
    print('')

    # 1) 모든 파일 (rename 대상 + 비대상) frontmatter 갱신
    # 2) cross-ref 갱신
    # 3) rename (대상만)
    rel_root = PROJECT_ROOT

    changes = []
    for f in files:
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        new_content = add_or_update_frontmatter(content, 'reviewed_at', REVIEW_DATE)
        new_content = update_cross_refs(new_content, f, rmap)
        if new_content != content:
            changes.append((f, new_content))

    print(f'📝 frontmatter/cross-ref 갱신 예정: {len(changes)} 파일')
    print('')

    if DRY_RUN:
        print('🟡 dry-run — 변경 없음')
        # 샘플 5개만 출력
        for f, _ in changes[:5]:
            print(f'  [편집] {f.relative_to(rel_root)}')
        for src, dst in list(rmap.items())[:5]:
            print(f'  [rename] {src.relative_to(rel_root)} → {dst.name}')
        if len(changes) > 5:
            print(f'  ... +{len(changes) - 5} more 편집')
        if len(rmap) > 5:
            print(f'  ... +{len(rmap) - 5} more rename')
        return

    # 실 실행
    # 1) 편집 적용 (원본 경로에)
    for f, new_content in changes:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
    print(f'✅ 편집 완료 {len(changes)} 파일')

    # 2) rename
    renamed = 0
    for src, dst in rmap.items():
        if src.exists() and not dst.exists():
            src.rename(dst)
            renamed += 1
        else:
            print(f'⚠️  스킵 (충돌 또는 누락): {src.name}')
    print(f'✅ rename 완료 {renamed} 파일')

    print('')
    print('=== 다음 단계 ===')
    print('  1. grep -r "broken-link\\.md" 로 끊긴 링크 확인')
    print(f'  2. 기획/검수작업{SUFFIX}.md 갱신')


if __name__ == '__main__':
    main()
