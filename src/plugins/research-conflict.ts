/**
 * Shared surface conflict detection for tianshu-research.
 * Prevents running both native plugin and MCP server simultaneously,
 * which would duplicate tool definitions and shatter prefix cache.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { rivetHome } from '../config/paths.js'
import { loadConfig } from '../config/manager.js'

export function isResearchPluginInstalled(): boolean {
  const dir = join(rivetHome(), 'plugins', 'tianshu-research')
  return existsSync(join(dir, 'package.json'))
}

export function checkResearchSurfaceConflict(enablingSurface: 'mcp' | 'plugin'): { conflict: boolean; error?: string } {
  const cfg = loadConfig()
  const mcpServer = cfg.mcp?.servers?.['tianshu-research']
  const isMcpEnabled = Boolean(mcpServer && mcpServer.disabled !== true)
  const isNativeInstalled = isResearchPluginInstalled()
  const isNativeEnabled = isNativeInstalled && cfg.plugins?.enabled?.['tianshu-research'] !== false

  if (enablingSurface === 'mcp') {
    if (isNativeEnabled) {
      return {
        conflict: true,
        error: 'tianshu-research 已作为原生插件启用。同时启用 MCP 会让同一套科研工具出现两份指纹。请先禁用或卸载原生插件，再启用 MCP。',
      }
    }
  } else if (enablingSurface === 'plugin') {
    if (isMcpEnabled) {
      return {
        conflict: true,
        error: 'tianshu-research 已在 MCP 服务中启用。同时启用原生插件会让同一套科研工具出现两份指纹。请先停用 MCP（/mcp disable tianshu-research），再启用原生插件。',
      }
    }
  }
  return { conflict: false }
}
