#!/usr/bin/env python3
"""
📁 tools/audit/checkExports.py — manifest.exports ↔ 실 export 정합 검수

각 모듈의 manifest.ts 가 선언한 exports 가 실제 src/index.ts 에 존재하는지 확인.
barrel `export * from` 은 false positive 방지 위해 통과 처리.
"""
import os, re, sys

V1_ROOT = sys.argv[1]
TARGET = sys.argv[2] if len(sys.argv) > 2 else ''
MODULES_DIR = os.path.join(V1_ROOT, 'packages', 'modules')

# manifest.ts 의 exports: [ ... ] 안 식별자 추출
EXPORTS_RE = re.compile(r"exports\s*:\s*\[([^\]]*)\]", re.S)
IDENT_RE = re.compile(r"['\"]([a-zA-Z_$][a-zA-Z0-9_$]*)['\"]")

# index.ts 의 export 패턴들
EXPORT_NAMED = re.compile(r"export\s*(?:type)?\s*\{([^}]*)\}")  # export { a, b } / export type { x }
EXPORT_DECL = re.compile(r"^export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)", re.M)
EXPORT_STAR = re.compile(r"export\s*\*\s*from")  # barrel (false positive 방지)

ERR_COUNT = 0
PASS_COUNT = 0

if not os.path.isdir(MODULES_DIR):
    print(f"❌ modules dir 없음: {MODULES_DIR}")
    sys.exit(2)

for mid in sorted(os.listdir(MODULES_DIR)):
    mod_dir = os.path.join(MODULES_DIR, mid)
    if not os.path.isdir(mod_dir):
        continue
    if TARGET and mid != TARGET:
        continue

    manifest_path = os.path.join(mod_dir, 'manifest.ts')
    index_path = os.path.join(mod_dir, 'src', 'index.ts')
    if not os.path.isfile(manifest_path):
        continue
    if not os.path.isfile(index_path):
        print(f"❌ {mid}: src/index.ts 없음")
        ERR_COUNT += 1
        continue

    # manifest exports
    with open(manifest_path, encoding='utf-8') as f:
        mtext = f.read()
    m = EXPORTS_RE.search(mtext)
    if not m:
        continue  # exports 없음 (asset·shared 등)
    block = m.group(1)
    # // 주석 제거
    block = re.sub(r"//[^\n]*", '', block)
    declared = sorted(set(IDENT_RE.findall(block)))
    if not declared:
        continue

    # actual exports (index.ts)
    with open(index_path, encoding='utf-8') as f:
        itext = f.read()
    has_barrel = bool(EXPORT_STAR.search(itext))

    actual = set()
    for named in EXPORT_NAMED.findall(itext):
        for sym in named.split(','):
            sym = sym.strip()
            # `a as b` → b 우선
            if ' as ' in sym:
                sym = sym.split(' as ')[-1].strip()
            sym = re.sub(r"[^a-zA-Z0-9_$]", '', sym)
            if sym:
                actual.add(sym)
    for sym in EXPORT_DECL.findall(itext):
        actual.add(sym)

    missing = [s for s in declared if s not in actual]
    if missing and has_barrel:
        # barrel 사용 시 false positive — 경고만
        print(f"🟡 {mid}: manifest 선언 but explicit export X (barrel 통해 가능): {' '.join(missing)}")
        PASS_COUNT += 1
    elif missing:
        print(f"❌ {mid}: manifest 선언 but index.ts 미발견: {' '.join(missing)}")
        ERR_COUNT += 1
    else:
        print(f"✅ {mid}")
        PASS_COUNT += 1

print('')
if ERR_COUNT:
    print(f"❌ 정합 실패: {ERR_COUNT} 모듈 (통과 {PASS_COUNT})")
    sys.exit(1)
print(f"✅ 전체 manifest exports 정합 ({PASS_COUNT} 모듈)")
sys.exit(0)
