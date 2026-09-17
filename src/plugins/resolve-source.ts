/**
 * Resolve first-party plugin sources for marketplace install.
 *
 * Desktop Settings and TUI `/plugin install` must share this: relative
 * `plugins/<id>` paths are not cwd-relative in a packaged app.
 */
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLUGIN_PRESETS } from './plugin-presets.js'

/**
 * The project root in dev: the parent of dist/ (where main.js is emitted).
 * Packaged installs resolve first-party presets via `bundledPluginsDir()` —
 * `projectRoot()` alone lands on the install root (tsup flat chunks → three
 * dirnames), which does not contain `plugins/`.
 */
export function projectRoot(): string {
  // In dev, process.env.RIVET_SIDECAR_ENTRY points to repo's dist/main.js.
  const entry = process.env.RIVET_SIDECAR_ENTRY
  if (entry) return dirname(dirname(entry))
  // Otherwise: module lives under dist/ (or a flat chunk next to main.js);
  // project root is parent of dist/. From src/plugins/*.ts under tsx, three
  // dirnames still land on the repo root.
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))))
}

/**
 * Locate the packaged `plugins/` tree.
 *
 * - CLI/npm: `dist/plugins` next to `main.js` (staged at build)
 * - Desktop: tauri maps `resources/plugins-staged` → sibling `plugins`
 *   beside `rivet-runtime/`
 * Prefer the explicit override from the desktop shell; then probe siblings
 * of this module.
 */
export function bundledPluginsDir(): string | null {
  const override = process.env.RIVET_BUNDLED_PLUGINS_DIR
  if (override) {
    try {
      if (existsSync(override)) return override
    } catch {
      /* fall through */
    }
  }
  let base: string
  try {
    base = dirname(fileURLToPath(import.meta.url))
  } catch {
    return null
  }
  // dist/main.js → dist/plugins (npm CLI)
  // rivet-runtime/main.js → ../plugins (desktop)
  // Nested chunk layout (if any) → ../../plugins
  for (const candidate of [
    join(base, 'plugins'),
    join(base, '..', 'plugins'),
    join(base, '..', '..', 'plugins'),
  ]) {
    try {
      if (existsSync(candidate)) return candidate
    } catch {
      /* ignore */
    }
  }
  return null
}

/**
 * Resolve a possibly-relative plugin source path to an absolute path.
 * Relative paths prefer the repo project root (dev); packaged presets under
 * `plugins/<id>` fall back to the bundled resources tree.
 */
export function resolveSourcePath(inputPath: string): string {
  if (isAbsolute(inputPath)) return inputPath
  const fromRoot = join(projectRoot(), inputPath)
  if (existsSync(fromRoot)) return fromRoot

  const normalized = normalize(inputPath)
  const pluginsPrefix = `plugins${sep}`
  const pluginsPrefixPosix = 'plugins/'
  if (
    normalized === 'plugins'
    || normalized.startsWith(pluginsPrefix)
    || normalized.startsWith(pluginsPrefixPosix)
  ) {
    const bundled = bundledPluginsDir()
    if (bundled) {
      const rest = normalized === 'plugins'
        ? ''
        : normalized.slice(normalized.startsWith(pluginsPrefix) ? pluginsPrefix.length : pluginsPrefixPosix.length)
      const candidate = rest ? join(bundled, rest) : bundled
      if (existsSync(candidate)) return candidate
    }
  }
  return fromRoot
}

/** Map a marketplace id (`tianshu-research`) to its `plugins/<id>` install path. */
export function marketplaceInstallPath(spec: string): string {
  const trimmed = spec.trim()
  if (!trimmed) return trimmed
  const preset = PLUGIN_PRESETS.find((p) => p.id === trimmed)
  return preset ? preset.installPath : trimmed
}

/** Parse `/plugin install …` tokens after the subcommand. `--confirm` is its own argv token. */
export function parsePluginInstallTokens(tokens: string[]): { spec: string; confirm: boolean } {
  const confirm = tokens.includes('--confirm')
  const spec = tokens.filter((t) => t !== '--confirm').join(' ').trim()
  return { spec, confirm }
}

/** Resolve a marketplace id or local path to an absolute source directory. */
export function resolveMarketplacePluginPath(spec: string): string {
  return resolveSourcePath(marketplaceInstallPath(spec))
}
