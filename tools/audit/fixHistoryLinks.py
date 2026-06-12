#!/usr/bin/env python3
"""
📁 tools/audit/fixHistoryLinks.py — .history 이동 후 끊긴 링크 redirect
───────────────────────────────────────────────
🎯 [폐기기획]/README.md → .history/_old_[폐기기획]_README.md
   참고자료/의도문서_260504.md → .history/의도문서_260504.md
"""
import re, sys
from pathlib import Path
from typing import List
from urllib.parse import unquote

PROJECT_ROOT = Path('/Users/whtdrgon/Library/CloudStorage/GoogleDrive-mejecrew@gmail.com/내 드라이브/_antigravity_MEJE01/아이동월드')
DRY_RUN = '--dry-run' in sys.argv

# (matched_path_pattern, redirect_to)
REDIRECTS = [
    # (decoded link, new decoded link)
    ('[폐기기획]/README.md', '.history/_old_[폐기기획]_README.md'),
    ('참고자료/의도문서_260504.md', '.history/의도문서_260504.md'),
]

LINK_RE = re.compile(r'(\]\()([^)\s]+?\.md)((?:#[^)]*)?)(\))')


def collect_files() -> List[Path]:
    out = []
    for root in [PROJECT_ROOT / '기획', PROJECT_ROOT / '개발']:
        for p in root.rglob('*.md'):
            if '.history' in p.parts: continue
            if 'node_modules' in p.parts: continue
            out.append(p)
    return out


def fix_link(link_path: str, base_dir: Path) -> str:
    decoded = unquote(link_path)
    # 각 redirect 패턴 검사 — 절대 경로로 비교
    try:
        target_abs = (base_dir / decoded).resolve()
    except Exception:
        return link_path
    for old_rel, new_rel in REDIRECTS:
        old_abs = (PROJECT_ROOT / '기획' / old_rel).resolve()
        if target_abs == old_abs:
            new_abs = (PROJECT_ROOT / '기획' / new_rel).resolve()
            try:
                from os.path import relpath
                rel = relpath(new_abs, base_dir)
                return rel.replace(' ', '%20')
            except Exception:
                return link_path
    return link_path


def main():
    files = collect_files()
    fixed = 0
    file_changes = 0
    for f in files:
        with open(f, encoding='utf-8') as fh:
            content = fh.read()
        local = 0
        def replace(m: re.Match) -> str:
            nonlocal local
            prefix, lp, anchor, paren = m.group(1), m.group(2), m.group(3), m.group(4)
            new_lp = fix_link(lp, f.parent)
            if new_lp != lp:
                local += 1
                return f'{prefix}{new_lp}{anchor}{paren}'
            return m.group(0)
        new_content = LINK_RE.sub(replace, content)
        if local > 0:
            fixed += local
            file_changes += 1
            if not DRY_RUN:
                with open(f, 'w', encoding='utf-8') as fh:
                    fh.write(new_content)

    print(f'✅ history redirect fix: {fixed} 링크 ({file_changes} 파일{"  [dry-run]" if DRY_RUN else ""})')


if __name__ == '__main__':
    main()
