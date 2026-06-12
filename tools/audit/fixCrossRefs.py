#!/usr/bin/env python3
"""
📁 tools/audit/fixCrossRefs.py — rename 후 끊긴 cross-ref 자동 fix
───────────────────────────────────────────────
🎯 동작:
  1. 모든 active .md 파일 (with _260511검수) 순회
  2. 각 파일 안 `](path/file.md)` 링크 추출
  3. 링크 대상이 실재하지 않으면:
     a) 파일명 끝에 `_260511검수` 추가 시 실재 → 그걸로 변경
     b) 그래도 실재 X → broken (보고만)
"""
import re, sys
from pathlib import Path
from typing import Optional, List
from urllib.parse import unquote

PROJECT_ROOT = Path('/Users/whtdrgon/Library/CloudStorage/GoogleDrive-mejecrew@gmail.com/내 드라이브/_antigravity_MEJE01/아이동월드')
SUFFIX = '_260511검수'
DRY_RUN = '--dry-run' in sys.argv

LINK_RE = re.compile(r'(\]\()([^)\s]+?\.md)((?:#[^)]*)?)(\))')


def collect_files() -> List[Path]:
    out = []
    for root in [PROJECT_ROOT / '기획', PROJECT_ROOT / '개발']:
        for p in root.rglob('*.md'):
            if '.history' in p.parts: continue
            if 'node_modules' in p.parts: continue
            out.append(p)
    for p in PROJECT_ROOT.glob('*.md'):
        out.append(p)
    return out


def try_fix_link(link_path: str, base_dir: Path) -> Optional[str]:
    """링크 대상이 끊겼으면 _260511검수 적용한 경로 시도. 성공 시 새 link_path 반환."""
    decoded = unquote(link_path)
    target = base_dir / decoded
    if target.exists():
        return None  # 이미 정상
    # 파일명 끝 .md 앞에 _260511검수 삽입 시도
    if decoded.endswith('.md') and SUFFIX not in decoded:
        candidate_decoded = decoded[:-3] + SUFFIX + '.md'
        candidate = base_dir / candidate_decoded
        if candidate.exists():
            # 원래 인코딩 보존
            if '%20' in link_path:
                new_link = link_path[:-3].replace(' ', '%20') + SUFFIX + '.md'
                # 한글 공백 처리 — 안전하게 단순 치환
                new_link = link_path.replace('.md', SUFFIX + '.md', 1)
            else:
                new_link = link_path.replace('.md', SUFFIX + '.md', 1)
            return new_link
    return None


def main():
    files = collect_files()
    print(f'📋 검사 대상: {len(files)} 파일')
    fixed = 0
    still_broken = 0
    file_changes = 0
    sample_broken = []

    for f in files:
        with open(f, encoding='utf-8') as fh:
            content = fh.read()
        local_fixed = 0

        def replace(m: re.Match) -> str:
            nonlocal local_fixed, still_broken
            prefix, link_path, anchor, paren = m.group(1), m.group(2), m.group(3), m.group(4)
            new_link = try_fix_link(link_path, f.parent)
            if new_link:
                local_fixed += 1
                return f'{prefix}{new_link}{anchor}{paren}'
            # 아직 끊김 — 보고
            decoded = unquote(link_path)
            target = f.parent / decoded
            if not target.exists():
                still_broken_path = (f.relative_to(PROJECT_ROOT), link_path)
                sample_broken.append(still_broken_path)
            return m.group(0)

        new_content = LINK_RE.sub(replace, content)
        if local_fixed > 0:
            fixed += local_fixed
            file_changes += 1
            if not DRY_RUN:
                with open(f, 'w', encoding='utf-8') as fh:
                    fh.write(new_content)

    still_broken = len(sample_broken)
    print(f'✅ fix: {fixed} 링크 ({file_changes} 파일{"  [dry-run]" if DRY_RUN else ""})')
    print(f'❌ still broken: {still_broken}')
    for b in sample_broken[:15]:
        print(f'  ❌ {b[0]} → {b[1]}')
    if still_broken > 15:
        print(f'  ... +{still_broken - 15} more')


if __name__ == '__main__':
    main()
