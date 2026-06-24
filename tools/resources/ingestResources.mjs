import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const KNOWN_CHARACTERS = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']

const FILE_SPEC = {
  'board_icon.png': { visibility: 'public', size: 256 },
  'body.png': { visibility: 'protected', size: 1024 },
  'face_normal.png': { visibility: 'protected', size: 1024 },
  'face_happy.png': { visibility: 'protected', size: 1024 },
  'face_surprised.png': { visibility: 'protected', size: 1024 },
  'face_worried.png': { visibility: 'protected', size: 1024 },
  'face_sleepy.png': { visibility: 'protected', size: 1024 },
  'signature.png': { visibility: 'protected', size: 1024 },
  'debut_bg.png': { visibility: 'protected', size: null },
}

function specFor(filename) {
  if (FILE_SPEC[filename]) return FILE_SPEC[filename]
  if (/^face_[a-z0-9]+\.png$/i.test(filename)) return { visibility: 'protected', size: 1024 }
  return null
}

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((arg) => arg.startsWith('--')))
const positional = argv.filter((arg) => !arg.startsWith('--'))
const categoryFlagIndex = argv.indexOf('--category')
const category = categoryFlagIndex >= 0 ? argv[categoryFlagIndex + 1] : 'aidong'
const stagingArg = positional.find((arg) => arg !== category)
const CHECK = flags.has('--check')
const COMMIT = flags.has('--commit')
const FORCE = flags.has('--force')

if (!stagingArg) {
  console.error('Usage: node tools/resources/ingestResources.mjs <staging-dir> [--category aidong] [--check] [--commit] [--force]')
  process.exit(2)
}

const STAGING = path.resolve(stagingArg)
if (!fs.existsSync(STAGING) || !fs.statSync(STAGING).isDirectory()) {
  console.error(`[ingest] staging directory not found: ${STAGING}`)
  process.exit(2)
}

function pngSize(file) {
  const fd = fs.openSync(file, 'r')
  try {
    const buffer = Buffer.alloc(24)
    const read = fs.readSync(fd, buffer, 0, 24, 0)
    if (read < 24) return null
    const signature = [137, 80, 78, 71, 13, 10, 26, 10]
    for (let index = 0; index < 8; index += 1) {
      if (buffer[index] !== signature[index]) return null
    }
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  } finally {
    fs.closeSync(fd)
  }
}

function collectItems() {
  const topEntries = fs.readdirSync(STAGING, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  const topNames = topEntries.map((entry) => entry.name)
  const structured = topNames.includes('public') || topNames.includes('protected')
  const items = []

  if (structured) {
    for (const visibility of ['public', 'protected']) {
      const visibilityDir = path.join(STAGING, visibility)
      if (!fs.existsSync(visibilityDir)) continue
      for (const character of fs.readdirSync(visibilityDir, { withFileTypes: true })) {
        if (!character.isDirectory()) continue
        const characterDir = path.join(visibilityDir, character.name)
        for (const file of fs.readdirSync(characterDir)) {
          if (file.startsWith('.')) continue
          items.push({
            id: character.name,
            file,
            src: path.join(characterDir, file),
            forcedVisibility: visibility,
          })
        }
      }
    }
  } else {
    for (const character of topEntries) {
      const characterDir = path.join(STAGING, character.name)
      for (const file of fs.readdirSync(characterDir)) {
        if (file.startsWith('.')) continue
        items.push({
          id: character.name,
          file,
          src: path.join(characterDir, file),
          forcedVisibility: null,
        })
      }
    }
  }

  return { items, structured }
}

function createPlan() {
  const { items, structured } = collectItems()
  const ok = []
  const warnings = []
  const errors = []

  for (const item of items) {
    const spec = specFor(item.file)
    const extension = path.extname(item.file).toLowerCase()

    if (!spec) {
      warnings.push(`skip: unsupported file name "${item.id}/${item.file}"`)
      continue
    }
    if (extension !== '.png') {
      warnings.push(`skip: not a PNG "${item.id}/${item.file}"`)
      continue
    }

    const visibility = item.forcedVisibility ?? spec.visibility
    if (item.forcedVisibility && item.forcedVisibility !== spec.visibility) {
      warnings.push(`visibility override: "${item.id}/${item.file}" folder=${item.forcedVisibility}, spec=${spec.visibility}`)
    }
    if (!KNOWN_CHARACTERS.includes(item.id)) {
      warnings.push(`unknown character id "${item.id}"`)
    }

    if (spec.size != null) {
      const dimensions = pngSize(item.src)
      if (!dimensions) {
        errors.push(`invalid PNG "${item.id}/${item.file}"`)
        continue
      }
      if (dimensions.width !== spec.size || dimensions.height !== spec.size) {
        errors.push(
          `wrong size "${item.id}/${item.file}": ${dimensions.width}x${dimensions.height}, expected ${spec.size}x${spec.size}`,
        )
        continue
      }
    }

    ok.push({
      ...item,
      visibility,
      dest: path.join(ROOT, 'resources', category, visibility, item.id, item.file),
    })
  }

  return { ok, warnings, errors, structured }
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function commitChanges(ok) {
  const resourcePath = path.join('resources', category)
  git(['add', '--', resourcePath])
  const staged = git(['diff', '--cached', '--name-only', '--', resourcePath])
  if (!staged) {
    console.log('[ingest] no resource changes to commit')
    return
  }

  const ids = [...new Set(ok.map((item) => item.id))]
  const message =
    `chore(resources): ingest ${category} assets (${ids.join(', ')})\n\n` +
    ok.map((item) => `- ${item.visibility}/${item.id}/${item.file}`).join('\n')

  git(['commit', '-m', message])
  console.log(git(['log', '-1', '--stat', '--oneline']))
}

function main() {
  const { ok, warnings, errors, structured } = createPlan()
  console.log(`[ingest] staging=${STAGING}`)
  console.log(`[ingest] layout=${structured ? 'structured' : 'flat'}, category=${category}`)
  console.log(`[ingest] ready=${ok.length}, warnings=${warnings.length}, errors=${errors.length}`)
  for (const warning of warnings) console.log(`  warn: ${warning}`)
  for (const error of errors) console.log(`  error: ${error}`)
  for (const item of ok) {
    console.log(`  ok: ${item.id}/${item.file} -> resources/${category}/${item.visibility}/${item.id}/`)
  }

  if (errors.length > 0 && !FORCE) {
    console.error('[ingest] stopped because validation failed. Use --force to copy anyway.')
    process.exit(1)
  }

  if (CHECK) {
    console.log('[ingest] check only. no files copied.')
    return
  }

  if (ok.length === 0) {
    console.log('[ingest] no assets to ingest.')
    return
  }

  for (const item of ok) {
    fs.mkdirSync(path.dirname(item.dest), { recursive: true })
    fs.copyFileSync(item.src, item.dest)
  }

  execFileSync(process.execPath, [path.join(ROOT, 'tools', 'resources', 'stageResources.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  })

  if (COMMIT) commitChanges(ok)
  else console.log('[ingest] copied. Commit resource files when ready.')
}

main()
