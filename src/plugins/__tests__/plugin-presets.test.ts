import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PLUGIN_PRESETS } from '../plugin-presets.js'

describe('PLUGIN_PRESETS', () => {
  it('has unique ids', () => {
    const ids = PLUGIN_PRESETS.map((p) => p.id)
    assert.equal(new Set(ids).size, ids.length)
  })

  it('lists tianshu-research as a click-to-install OA literature plugin', () => {
    const p = PLUGIN_PRESETS.find((x) => x.id === 'tianshu-research')
    assert.ok(p)
    assert.equal(p.installPath, 'plugins/tianshu-research')
    assert.ok(p.tools.includes('research_query'))
    assert.ok(p.tools.includes('research_evidence'))
    assert.ok(p.tools.includes('journal_palette'))
    assert.ok(p.tools.includes('research_status'))
    assert.equal(p.permissions.net, true)
    assert.equal(p.permissions.fs, true)
    assert.match(p.description, /MCP/)
  })
})
