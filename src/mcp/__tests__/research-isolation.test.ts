/**
 * Isolation lock: Tianshu-Research is catalog-only until the user enables it.
 * These assertions fail if research tools/skills/MCP servers leak into the
 * default coding-agent path (AgentLoop tool table, default config, bundled skills).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_CONFIG } from '../../config/default.js'
import { createDefaultToolRegistry } from '../../tools/default-registry.js'
import { PLUGIN_TOOL_SUPPRESS_MAP } from '../../plugins/plugin-loader.js'
import { MCP_PRESETS } from '../presets.js'

export const RESEARCH_TOOL_NAMES = [
  'research_query',
  'research_evidence',
  'journal_palette',
  'research_status',
  'paper_search',
  'paper_lookup',
  'research_compute',
  'research_document',
  'research_job',
  'mcp__tianshu-research__research_query',
  'mcp__tianshu-research__research_evidence',
  'mcp__tianshu-research__journal_palette',
  'mcp__tianshu-research__research_status',
  'mcp__tianshu-research__paper_search',
  'mcp__tianshu-research__paper_lookup',
  'mcp__tianshu-research__research_compute',
  'mcp__tianshu-research__research_document',
  'mcp__tianshu-research__research_job',
]

test('default config does not pre-enable research MCP servers', () => {
  assert.deepEqual(DEFAULT_CONFIG.mcp.servers, {})
  assert.equal(DEFAULT_CONFIG.mcp.servers['tianshu-research'], undefined)
  assert.equal(DEFAULT_CONFIG.mcp.servers['paper-search'], undefined)
})

test('research MCP presets exist in the catalog but stay default-off', () => {
  assert.ok(MCP_PRESETS.some((p) => p.id === 'tianshu-research'))
  assert.ok(MCP_PRESETS.some((p) => p.id === 'paper-search'))
})

test('default tool registry does not include research paper tools', () => {
  const names = createDefaultToolRegistry().getDefinitions().map((t) => t.name)
  for (const name of RESEARCH_TOOL_NAMES) {
    assert.equal(names.includes(name), false, `${name} leaked into default registry`)
  }
})

test('research plugin does not suppress coding tools', () => {
  assert.equal(PLUGIN_TOOL_SUPPRESS_MAP['tianshu-research'], undefined)
  assert.ok(PLUGIN_TOOL_SUPPRESS_MAP['office-pdf']?.includes('create_pdf'))
})

test('bundled default skills do not include research-flow', () => {
  const dir = join(process.cwd(), 'runtime-assets', 'bundled-skills')
  const names = readdirSync(dir).filter((n) => !n.startsWith('_') && !n.startsWith('.'))
  assert.equal(names.includes('research-flow'), false, `bundled skills leaked research-flow: ${names.join(',')}`)
})

test('journal palettes stay in the research plugin, not TUI themes', () => {
  const theme = join(process.cwd(), 'src', 'tui', 'theme-palettes.ts')
  const src = readFileSync(theme, 'utf8')
  assert.equal(src.includes('TheBestColor'), false)
  assert.equal(src.includes('thebestcolor'), false)
  assert.equal(src.includes('okabe_ito'), false)
  const json = join(process.cwd(), 'plugins', 'tianshu-research', 'figure', 'journal_palette.json')
  assert.equal(existsSync(json), true, 'palette JSON must live under the opt-in plugin')
})
