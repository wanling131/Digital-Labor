/**
 * P2 模块化应用集成：插件注册表、生命周期、事件总线
 * 用于系统嵌入运管平台时的扩展与集成
 */

export type PluginLifecycle = "beforeMount" | "mounted" | "beforeUnmount" | "unmounted"

export interface PluginDescriptor {
  id: string
  name: string
  /** 入口组件或路由路径 */
  entry?: string
  /** 所需权限 key，空则无权限限制 */
  permission?: string
  /** 元数据 */
  meta?: Record<string, unknown>
}

export interface Plugin extends PluginDescriptor {
  beforeMount?(): void | Promise<void>
  mounted?(): void | Promise<void>
  beforeUnmount?(): void | Promise<void>
  unmounted?(): void | Promise<void>
}

type EventHandler = (payload?: unknown) => void

const registry: Map<string, Plugin> = new Map()
const eventBus: Map<string, Set<EventHandler>> = new Map()

/** 注册插件 */
export function registerPlugin(plugin: Plugin): void {
  if (registry.has(plugin.id)) {
    console.warn(`[plugins] Plugin ${plugin.id} already registered, overwriting`)
  }
  registry.set(plugin.id, plugin)
}

/** 注销插件 */
export function unregisterPlugin(id: string): void {
  registry.delete(id)
}

/** 获取所有已注册插件 */
export function getPlugins(): Plugin[] {
  return Array.from(registry.values())
}

/** 根据权限过滤插件 */
export function getPluginsByPermission(permissions: string[]): Plugin[] {
  const hasAll = permissions.includes("*")
  return getPlugins().filter(
    (p) => !p.permission || hasAll || permissions.includes(p.permission)
  )
}

/** 事件总线：订阅 */
export function on(event: string, handler: EventHandler): () => void {
  if (!eventBus.has(event)) eventBus.set(event, new Set())
  eventBus.get(event)!.add(handler)
  return () => eventBus.get(event)?.delete(handler)
}

/** 事件总线：发布 */
export function emit(event: string, payload?: unknown): void {
  eventBus.get(event)?.forEach((h) => {
    try {
      h(payload)
    } catch (e) {
      console.error(`[plugins] Event ${event} handler error:`, e)
    }
  })
}

/** 标准事件名（供对接方使用） */
export const PLUGIN_EVENTS = {
  CONTRACT_SIGNED: "contract:signed",
  SETTLEMENT_CONFIRMED: "settlement:confirmed",
  PERSON_ACTIVATED: "person:activated",
} as const
