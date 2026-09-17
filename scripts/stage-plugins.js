#!/usr/bin/env node
/**
 * stage-plugins.js — copy first-party plugins into a clean staging directory
 * for Tauri bundling and CLI `dist/plugins`, stripping build-time-only
 * artifacts (node_modules, tests, lockfiles) so the packaged app only ships
 * plugin source + manifest.
 *
 * Desktop: tauri.conf.json maps `resources/plugins-staged` → `plugins`.
 * CLI/npm: tsup onSuccess copies the same tree to `dist/plugins`.
 *
 * Why this exists:
 *   - plugins/ is a normal npm workspace area; developers may run `npm install`
 *     inside a plugin during development (e.g. design plugin's puppeteer deps).
 *   - Shipping those node_modules inside the .app would bloat the bundle by
 *     tens of MB and is unnecessary: the sidecar runs `npm install` at plugin
 *     install time using the bundled npm.
 *   - Excluding tests and lockfiles keeps the runtime package lean and avoids
 *     leaking development-only files.
 */
import { existsSync, mkdirSync, rmSync, readdirSync, cpSync } from 'node:fs'
import { join, dirname, resolve, relative, parse, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const sourceRoot = join(repoRoot, 'plugins')
const desktopTargetRoot = join(repoRoot, 'desktop', 'src-tauri', 'resources', 'plugins-staged')

/** Paths / globs to keep out of the packaged plugin bundle. */
const EXCLUDED_NAMES = new Set([
  'node_modules',
  '.git',
  '.github',
  '__tests__',
  'test',
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.npmrc',
  '__pycache__',
  '.pytest_cache',
])

const EXCLUDED_EXTS = ['.test.ts', '.test.js', '.spec.ts', '.spec.js', '.pyc', '.rar']

export function shouldExclude(name) {
  if (EXCLUDED_NAMES.has(name)) return true
  for (const ext of EXCLUDED_EXTS) {
    if (name.endsWith(ext)) return true
  }
  return false
}

function copyPlugin(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true })
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (shouldExclude(entry.name)) continue
    const src = join(sourceDir, entry.name)
    const dest = join(targetDir, entry.name)
    if (entry.isDirectory()) {
      copyPlugin(src, dest)
    } else {
      cpSync(src, dest)
    }
  }
}

/**
 * Stage first-party plugins into `targetRoot`. Returns the number of plugin
 * directories copied, or 0 if `plugins/` is missing.
 */
const requiredFilesMap = {
  "tianshu-research": [
    "package.json",
    "index.js",
    "mcp-server.js",
    "search.js",
    "figure.js",
    "tool-contracts.js",
    "gateway-query.js",
    "gateway-evidence.js",
    "gateway-document.js",
    "gateway-job.js",
    "document/document-parser.js",
    "jobs/job-manager.js",
    "ledger/evidence-ledger.js",
    "gates/scientific-verifier.js",
    "compute/compute-gateway.js",
    "compute/sympy_runner.py",
    "tools/research-status.js",
    "commands/research.md",
    "commands/research-status.md",
    "figure/journal_palette.py",
    "figure/journal_palette.json",
    "skills/research-flow/SKILL.md",
    "skills/research-flow/references/team-templates.md"
  ]
}

/**
 * Verify that a staged plugin contains all required runtime files.
 */
export function verifyStagedPlugin(pluginDir, pluginName) {
  const required = requiredFilesMap[pluginName] || ['package.json', 'index.js']
  const missing = []
  for (const rel of required) {
    if (!existsSync(join(pluginDir, rel))) {
      missing.push(rel)
    }
  }
  return { ok: missing.length === 0, missing }
}

function isSubdir(parent, child) {
  const pRoot = parse(parent).root.toLowerCase()
  const cRoot = parse(child).root.toLowerCase()
  if (pRoot !== cRoot) return false
  const rel = relative(parent, child)
  return !rel.startsWith('..') && !isAbsolute(rel) && rel !== ''
}

export function validateTargetRoot(targetRoot) {
  if (!targetRoot || typeof targetRoot !== 'string') {
    throw new Error('[stage-plugins] targetRoot must be a non-empty string')
  }
  const resolvedTarget = resolve(targetRoot)
  const resolvedRepo = resolve(repoRoot)
  const resolvedSource = resolve(sourceRoot)

  const root = parse(resolvedTarget).root
  if (resolvedTarget === root) {
    throw new Error(`[stage-plugins] targetRoot cannot be filesystem root: ${resolvedTarget}`)
  }
  if (resolvedTarget === resolvedRepo) {
    throw new Error(`[stage-plugins] targetRoot cannot be repo root: ${resolvedTarget}`)
  }
  if (resolvedTarget === resolvedSource) {
    throw new Error(`[stage-plugins] targetRoot cannot be source plugins dir: ${resolvedTarget}`)
  }
  if (isSubdir(resolvedTarget, resolvedRepo)) {
    throw new Error(`[stage-plugins] targetRoot cannot be ancestor of repo root: ${resolvedTarget}`)
  }
  if (isSubdir(resolvedTarget, resolvedSource)) {
    throw new Error(`[stage-plugins] targetRoot cannot be ancestor of source plugins dir: ${resolvedTarget}`)
  }
  if (isSubdir(resolvedSource, resolvedTarget)) {
    throw new Error(`[stage-plugins] targetRoot cannot be inside source plugins dir: ${resolvedTarget}`)
  }
  return resolvedTarget
}

export function stagePluginsTo(targetRoot) {
  const safeTarget = validateTargetRoot(targetRoot)
  if (!existsSync(sourceRoot)) {
    console.warn('[stage-plugins] plugins/ directory not found; nothing to stage')
    return 0
  }

  if (existsSync(safeTarget)) {
    rmSync(safeTarget, { recursive: true, force: true })
  }
  mkdirSync(safeTarget, { recursive: true })

  const entries = readdirSync(sourceRoot, { withFileTypes: true })
    .filter(e => e.isDirectory() && !shouldExclude(e.name))

  let staged = 0
  for (const entry of entries) {
    const sourceDir = join(sourceRoot, entry.name)
    const destDir = join(safeTarget, entry.name)
    copyPlugin(sourceDir, destDir)
    const verification = verifyStagedPlugin(destDir, entry.name)
    if (!verification.ok) {
      throw new Error(`[stage-plugins] ${entry.name} is missing required staged files: ${verification.missing.join(', ')}`)
    }
    staged++
  }

  console.log(`[stage-plugins] staged ${staged} plugin(s) → ${safeTarget}`)
  return staged
}

function main() {
  stagePluginsTo(desktopTargetRoot)
}

const invokedDirectly = Boolean(process.argv[1])
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (invokedDirectly) main()
