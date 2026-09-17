import { checkResearchSurfaceConflict } from '../plugins/research-conflict.js'
/**
 * Enable / disable curated MCP presets from TUI and from POST /mcp/servers
 * when the client only sends `serverId` (desktop click-enable).
 */
import { existsSync } from 'node:fs'
import { loadConfig, saveConfig } from '../config/manager.js'
import { mcpServerConfigSchema, type McpServerConfig } from './config.js'
import { MCP_PRESETS, findMcpPreset, materializeMcpPreset } from './presets.js'

export type PresetEnableResult =
  | { ok: true; serverId: string; config: McpServerConfig }
  | { ok: false; error: string }

export function presetToServerConfig(serverId: string): PresetEnableResult {
  const preset = findMcpPreset(serverId)
  if (!preset) return { ok: false, error: `Unknown MCP preset: ${serverId}` }
  const live = materializeMcpPreset(preset)
  const parsed = mcpServerConfigSchema.safeParse({
    command: live.command,
    args: live.args,
    url: live.url,
    auth: live.auth,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }
  }
  if (live.bundledScript || preset.bundledScript) {
    const script = parsed.data.args?.[0]
    if (!script || !existsSync(script)) {
      return {
        ok: false,
        error: `Bundled MCP script missing (${script ?? 'no args'}). Rebuild the sidecar so dist/plugins (or repo plugins/) contains ${preset.bundledScript}.`,
      }
    }
  }
  return { ok: true, serverId, config: parsed.data }
}

/** Persist a no-secret preset into config.json. OAuth / requiredEnv presets stay on the desktop form. */
export function enableMcpPreset(serverId: string): PresetEnableResult {
  const preset = findMcpPreset(serverId)
  if (!preset) return { ok: false, error: `Unknown MCP preset: ${serverId}` }
  if ((preset.requiredEnv && preset.requiredEnv.length > 0) || preset.auth) {
    return {
      ok: false,
      error: `"${preset.name}" needs credentials. Enable it in Settings → MCP 服务, or configure env/OAuth first.`,
    }
  }
  if (serverId === 'tianshu-research') {
    const conflict = checkResearchSurfaceConflict('mcp')
    if (conflict.conflict) {
      return { ok: false, error: conflict.error! }
    }
  }
  const built = presetToServerConfig(serverId)
  if (!built.ok) return built
  const cfg = loadConfig()
  cfg.mcp.servers = { ...cfg.mcp.servers, [serverId]: built.config }
  saveConfig(cfg)
  return built
}

export function disableMcpPreset(serverId: string): { ok: true } | { ok: false; error: string } {
  const cfg = loadConfig()
  if (!cfg.mcp.servers[serverId]) {
    return { ok: false, error: `MCP server "${serverId}" is not configured` }
  }
  const next = { ...cfg.mcp.servers }
  delete next[serverId]
  cfg.mcp.servers = next
  saveConfig(cfg)
  return { ok: true }
}

export function formatMcpMarketText(configuredIds: Iterable<string>): string {
  const configured = new Set(configuredIds)
  const lines = [
    'MCP marketplace (Settings → MCP 服务 uses the same list):',
    'Enable: /mcp enable <id>    Disable: /mcp disable <id>',
    '',
  ]
  for (const p of MCP_PRESETS) {
    const on = configured.has(p.id) ? '已启用' : '未启用'
    const cred = (p.requiredEnv && p.requiredEnv.length > 0) || p.auth ? ' · 需密钥/OAuth' : ' · 无需认证'
    lines.push(`  ${p.id} — ${p.name} [${on}${cred}]`)
    lines.push(`    ${p.description}`)
  }
  return lines.join('\n')
}
