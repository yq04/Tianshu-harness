import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { shouldExclude, stagePluginsTo, validateTargetRoot } from '../stage-plugins.js'

test('shouldExclude drops tests, lockfiles, and node_modules', () => {
  assert.equal(shouldExclude('test'), true)
  assert.equal(shouldExclude('__tests__'), true)
  assert.equal(shouldExclude('search.test.js'), true)
  assert.equal(shouldExclude('package-lock.json'), true)
  assert.equal(shouldExclude('index.js'), false)
  assert.equal(shouldExclude('SKILL.md'), false)
})

test('stagePluginsTo copies tianshu-research source and strips tests', () => {
  const dest = mkdtempSync(join(tmpdir(), 'rivet-stage-plugins-'))
  try {
    const n = stagePluginsTo(dest)
    assert.ok(n >= 1, `expected to stage plugins, got ${n}`)
    const pkg = join(dest, 'tianshu-research', 'package.json')
    assert.ok(existsSync(pkg), 'marketplace plugin must be staged for click-install')
    const raw = JSON.parse(readFileSync(pkg, 'utf8')) as { name: string }
    assert.equal(raw.name, 'tianshu-research')
    assert.ok(existsSync(join(dest, 'tianshu-research', 'index.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'skills', 'research-flow', 'SKILL.md')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'figure', 'journal_palette.json')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'figure', 'journal_palette.py')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'mcp-server.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'tool-contracts.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'gateway-query.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'gateway-evidence.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'gateway-document.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'gateway-job.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'document', 'document-parser.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'jobs', 'job-manager.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'ledger', 'evidence-ledger.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'gates', 'scientific-verifier.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'compute', 'compute-gateway.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'compute', 'sympy_runner.py')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'tools', 'research-status.js')))
    assert.ok(existsSync(join(dest, 'tianshu-research', 'skills', 'research-flow', 'references', 'team-templates.md')))
    assert.equal(existsSync(join(dest, 'tianshu-research', 'test')), false)
    assert.equal(existsSync(join(dest, 'tianshu-research', 'test', 'search.test.js')), false)
  } finally {
    rmSync(dest, { recursive: true, force: true })
  }
})

test('validateTargetRoot rejects dangerous destinations', () => {
  assert.throws(() => validateTargetRoot(''), /non-empty/)
  assert.throws(() => validateTargetRoot('D:\\1_Research\\Develop_Research'), /repo root/)
  assert.throws(() => validateTargetRoot('D:\\1_Research\\Develop_Research\\plugins'), /source plugins dir/)
  assert.throws(() => validateTargetRoot('D:\\1_Research\\Develop_Research\\plugins\\nested'), /inside source plugins dir/)
  assert.throws(() => validateTargetRoot('D:\\'), /filesystem root/)
})

test('staged tianshu-research can initialize and list tools independently', async () => {
  const dest = mkdtempSync(join(tmpdir(), 'rivet-stage-mcp-'))
  try {
    stagePluginsTo(dest)
    const stagedServerPath = join(dest, 'tianshu-research', 'mcp-server.js')
    const { pathToFileURL } = await import('node:url')
    const mod = await import(pathToFileURL(stagedServerPath).href)
    const res = await mod.handleMcpMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' },
    })
    assert.equal(res.result.serverInfo.name, 'tianshu-research')

    const listRes = await mod.handleMcpMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    })
    assert.equal(listRes.result.tools.length, 4)
    assert.deepEqual(listRes.result.tools.map((t: { name: string }) => t.name), [
      'research_query',
      'research_evidence',
      'journal_palette',
      'research_status',
    ])
  } finally {
    rmSync(dest, { recursive: true, force: true })
  }
})
