import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  marketplaceInstallPath,
  parsePluginInstallTokens,
  resolveMarketplacePluginPath,
  resolveSourcePath,
} from '../resolve-source.js'

describe('plugin marketplace path resolution', () => {
  it('treats --confirm as its own argv token, not a suffix of the path', () => {
    assert.deepEqual(
      parsePluginInstallTokens(['tianshu-research', '--confirm']),
      { spec: 'tianshu-research', confirm: true },
    )
    assert.deepEqual(
      parsePluginInstallTokens(['plugins/tianshu-research']),
      { spec: 'plugins/tianshu-research', confirm: false },
    )
  })

  it('maps a preset id to plugins/<id> and leaves real paths alone', () => {
    assert.equal(marketplaceInstallPath('tianshu-research'), 'plugins/tianshu-research')
    assert.equal(marketplaceInstallPath('plugins/office-pdf'), 'plugins/office-pdf')
    assert.equal(marketplaceInstallPath('/abs/my-plugin'), '/abs/my-plugin')
  })

  it('resolves the first-party tianshu-research tree from the repo', () => {
    const resolved = resolveMarketplacePluginPath('tianshu-research')
    assert.ok(existsSync(join(resolved, 'package.json')), resolved)
    assert.ok(existsSync(join(resolved, 'index.js')), resolved)
    assert.equal(resolveSourcePath('plugins/tianshu-research'), resolved)
  })
})
