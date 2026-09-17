import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  disableMcpPreset,
  enableMcpPreset,
  formatMcpMarketText,
  presetToServerConfig,
} from '../preset-enable.js'
import { checkResearchSurfaceConflict } from '../../plugins/research-conflict.js'
import { mkdirSync, writeFileSync } from 'node:fs'

function withTempHome(fn: () => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-preset-enable-'))
  const prev = process.env.RIVET_HOME
  process.env.RIVET_HOME = dir
  return fn().finally(() => {
    if (prev === undefined) delete process.env.RIVET_HOME
    else process.env.RIVET_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  })
}

test('formatMcpMarketText lists 科研文献 and enable hint', () => {
  const text = formatMcpMarketText([])
  assert.match(text, /tianshu-research/)
  assert.match(text, /科研文献/)
  assert.match(text, /\/mcp enable/)
  assert.match(text, /未启用/)
  assert.match(formatMcpMarketText(['tianshu-research']), /已启用/)
})

test('presetToServerConfig materializes bundled tianshu-research script', () => {
  const built = presetToServerConfig('tianshu-research')
  assert.equal(built.ok, true)
  if (!built.ok) return
  assert.equal(built.config.command, process.execPath)
  assert.ok(built.config.args?.[0])
})

test('enableMcpPreset rejects unknown and credentialed presets', async () => {
  await withTempHome(async () => {
    const unknown = enableMcpPreset('nope')
    assert.equal(unknown.ok, false)
    if (!unknown.ok) assert.match(unknown.error, /Unknown MCP preset/)

    const github = enableMcpPreset('github')
    assert.equal(github.ok, false)
    if (!github.ok) assert.match(github.error, /credentials|OAuth/i)
  })
})

test('enable/disable tianshu-research writes config only on enable', async () => {
  await withTempHome(async () => {
    const { loadConfig } = await import('../../config/manager.js')
    assert.equal(loadConfig().mcp.servers['tianshu-research'], undefined)

    const on = enableMcpPreset('tianshu-research')
    assert.equal(on.ok, true)
    const saved = loadConfig().mcp.servers['tianshu-research']
    assert.ok(saved)
    assert.equal(saved.command, process.execPath)

    const off = disableMcpPreset('tianshu-research')
    assert.equal(off.ok, true)
    assert.equal(loadConfig().mcp.servers['tianshu-research'], undefined)
  })
})

test('tianshu-research surface conflict checks prevent dual activation', async () => {
  await withTempHome(async () => {
    const { loadConfig, saveConfig } = await import('../../config/manager.js')
    const home = process.env.RIVET_HOME!
    const pluginDir = join(home, 'plugins', 'tianshu-research')
    mkdirSync(pluginDir, { recursive: true })
    writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({ name: 'tianshu-research', version: '0.1.0' }))

    // 1. Native plugin is installed and implicitly enabled -> enable MCP must fail
    const conflictMcp = enableMcpPreset('tianshu-research')
    assert.equal(conflictMcp.ok, false)
    if (!conflictMcp.ok) {
      assert.match(conflictMcp.error, /已作为原生插件启用/)
    }

    // 2. Disable native plugin -> enable MCP must succeed
    const cfg = loadConfig()
    cfg.plugins.enabled['tianshu-research'] = false
    saveConfig(cfg)

    const on = enableMcpPreset('tianshu-research')
    assert.equal(on.ok, true)

    // 3. Now MCP is enabled -> enabling plugin must report conflict
    const conflictPlugin = checkResearchSurfaceConflict('plugin')
    assert.equal(conflictPlugin.conflict, true)
    assert.match(conflictPlugin.error!, /已在 MCP 服务中启用/)

    // 4. Disable MCP server -> enabling plugin must be allowed
    const cfgAfter = loadConfig()
    cfgAfter.mcp.servers['tianshu-research'].disabled = true
    saveConfig(cfgAfter)

    const allowedPlugin = checkResearchSurfaceConflict('plugin')
    assert.equal(allowedPlugin.conflict, false)
  })
})
