import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const RESOURCES_DIR = path.join(ROOT, 'resources')
const DEST_DIR = path.join(ROOT, 'packages', 'frontend', 'public', 'assets')

function copyFilter(src) {
  const base = path.basename(src)
  if (base.startsWith('.')) return false
  if (base.toLowerCase().endsWith('.md')) return false
  return true
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) count += countFiles(fullPath)
    else count += 1
  }
  return count
}

function main() {
  if (!fs.existsSync(RESOURCES_DIR)) {
    console.error(`[stage] resources directory not found: ${RESOURCES_DIR}`)
    process.exit(1)
  }

  fs.rmSync(DEST_DIR, { recursive: true, force: true })
  fs.mkdirSync(DEST_DIR, { recursive: true })

  const categories = fs
    .readdirSync(RESOURCES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('_'))
    .map((entry) => entry.name)

  for (const category of categories) {
    const publicDir = path.join(RESOURCES_DIR, category, 'public')
    const protectedDir = path.join(RESOURCES_DIR, category, 'protected')

    if (fs.existsSync(publicDir)) {
      fs.cpSync(publicDir, path.join(DEST_DIR, category), { recursive: true, filter: copyFilter })
    }
    if (fs.existsSync(protectedDir)) {
      fs.cpSync(protectedDir, path.join(DEST_DIR, category, 'protected'), {
        recursive: true,
        filter: copyFilter,
      })
    }
  }

  const total = countFiles(DEST_DIR)
  console.log(`[stage] resources -> public/assets complete. files=${total}, categories=[${categories.join(', ')}]`)
}

main()
