/**
 * tools/dev/runDev.mjs
 * ------------------------------------------------------------
 * Runs the frontend and backend dev servers without nesting them under
 * multiple Windows batch jobs. This avoids garbled "Terminate batch job?"
 * prompts when stopping `pnpm dev` on Korean Windows terminals.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const children = new Set()
let shuttingDown = false

function prefixOutput(prefix, stream, chunk) {
  const text = chunk.toString()
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue
    stream.write(`[${prefix}] ${line}\n`)
  }
}

function spawnNode(label, args, options = {}) {
  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    ...options,
  })

  children.add(child)
  child.stdout.on('data', (chunk) => prefixOutput(label, process.stdout, chunk))
  child.stderr.on('data', (chunk) => prefixOutput(label, process.stderr, chunk))
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (!shuttingDown && code !== 0) {
      console.error(`[${label}] exited with ${signal ?? code}`)
      shutdown(code ?? 1)
    }
  })
  return child
}

function resolveTool(relativePath) {
  const fullPath = path.join(rootDir, relativePath)
  if (!existsSync(fullPath)) {
    console.error(`[DEV] missing tool: ${relativePath}`)
    process.exit(1)
  }
  return fullPath
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 250).unref()
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

spawnNode('STAGE', [resolveTool('tools/resources/stageResources.mjs')]).on('exit', (code) => {
  if (shuttingDown || code !== 0) return

  spawnNode('FE', [resolveTool('node_modules/.pnpm/node_modules/vite/bin/vite.js')], {
    cwd: path.join(rootDir, 'packages/frontend'),
  })
  spawnNode(
    'BE',
    [
      resolveTool('node_modules/.pnpm/node_modules/tsx/dist/cli.mjs'),
      'watch',
      '--clear-screen=false',
      '--ignore',
      '../../node_modules/**',
      '--ignore',
      './node_modules/**',
      'src/index.ts',
    ],
    {
      cwd: path.join(rootDir, 'packages/backend'),
    },
  )
})
