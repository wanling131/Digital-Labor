/**
 * 后端 API 请求封装（管理端）
 * 开发时通过 next.config 的 rewrites 将 /api 代理到 http://localhost:3000
 * 生产环境需配置 NEXT_PUBLIC_API_BASE 环境变量，确保 API 指向正确
 *
 * 令牌存储：支持两种模式
 * - localStorage（默认）：NEXT_PUBLIC_USE_COOKIE_AUTH 未设置时
 * - httpOnly cookie：NEXT_PUBLIC_USE_COOKIE_AUTH=true 且后端 USE_HTTPONLY_COOKIE=true 时
 */

const USE_COOKIE_AUTH = process.env.NEXT_PUBLIC_USE_COOKIE_AUTH === "true"

// 在浏览器端使用相对路径（交给 next.config rewrites 代理），在服务端默认走环境变量或本地 3000
const API_BASE =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'
    : ''
const TOKEN_KEY = 'labor_token'
const WORKER_TOKEN_KEY = 'labor_worker_token'

// 请求配置
const DEFAULT_TIMEOUT = 30000 // 30秒超时
const MAX_RETRIES = 2 // 最大重试次数
const RETRY_DELAY = 1000 // 重试延迟（毫秒）

/** P2 系统嵌入：租户 ID，通过 NEXT_PUBLIC_TENANT_ID 注入 */
export function getTenantId(): string | null {
  return process.env.NEXT_PUBLIC_TENANT_ID ?? null
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/** 工人端 token（H5 登录后存储） */
export function getWorkerToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(WORKER_TOKEN_KEY)
}

export function setWorkerToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(WORKER_TOKEN_KEY, token)
  else localStorage.removeItem(WORKER_TOKEN_KEY)
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: object | FormData
  query?: Record<string, string | number>
  timeout?: number // 请求超时时间（毫秒）
  retries?: number // 重试次数
}

type TokenConfig = {
  getToken: () => string | null
  setToken: (t: string | null) => void
  loginRedirect: string
  unauthMessage: string
}

/** 延迟函数 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 带超时的 fetch */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/** 内部通用请求逻辑，减少 api 与 apiWorker 的重复代码 */
async function requestWithToken<T>(path: string, options: ApiOptions, config: TokenConfig): Promise<T> {
  const { body, query, timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES, ...rest } = options
  let url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => qs.set(k, String(v)))
    url += (url.includes('?') ? '&' : '?') + qs.toString()
  }
  const headers: HeadersInit = { ...(rest.headers as HeadersInit) }
  if (!(body instanceof FormData)) (headers as Record<string, string>)['Content-Type'] = 'application/json'
  const token = USE_COOKIE_AUTH ? null : config.getToken()
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const fetchOptions: RequestInit = {
    ...rest,
    headers,
    credentials: USE_COOKIE_AUTH ? 'include' : 'same-origin',
    body: body != null ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  }

  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= retries) {
    try {
      const res = await fetchWithTimeout(url, fetchOptions, timeout)

      const newToken = res.headers.get('X-Token-Refresh')
      if (newToken) config.setToken(newToken)

      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        config.setToken(null)
        if (typeof window !== 'undefined') window.location.href = config.loginRedirect
        throw new Error((data as { message?: string }).message ?? config.unauthMessage)
      }
      if (!res.ok) throw new Error((data as { message?: string }).message ?? res.statusText)
      return data as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 401 不重试
      if (lastError.message.includes('未登录') || lastError.message.includes('请重新登录')) {
        throw lastError
      }

      // 网络错误或超时，尝试重试
      const isNetworkError = lastError.name === 'AbortError' ||
        lastError.message.includes('network') ||
        lastError.message.includes('fetch')

      if (isNetworkError && attempt < retries) {
        attempt++
        await delay(RETRY_DELAY * attempt) // 递增延迟
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? new Error('请求失败')
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  return requestWithToken<T>(path, options, {
    getToken,
    setToken,
    loginRedirect: '/login',
    unauthMessage: '未登录',
  })
}

// ==================== 缓存机制 ====================

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  lastAccess: number // LRU 最后访问时间
}

const cache = new Map<string, CacheItem<unknown>>()

// LRU 配置
const MAX_CACHE_SIZE = 100 // 最大缓存条目数

/** 清理过期缓存 */
function cleanupCache(): void {
  const now = Date.now()
  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > item.ttl) {
      cache.delete(key)
    }
  }
}

/** LRU 淘汰：当缓存超过最大条目数时，删除最久未访问的条目 */
function evictLRU(): void {
  if (cache.size <= MAX_CACHE_SIZE) return

  // 找出最久未访问的条目
  let oldestKey: string | null = null
  let oldestAccess = Infinity

  for (const [key, item] of cache.entries()) {
    if (item.lastAccess < oldestAccess) {
      oldestAccess = item.lastAccess
      oldestKey = key
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey)
  }
}

/** 生成缓存键 */
function getCacheKey(path: string, query?: Record<string, string | number>): string {
  const queryStr = query ? JSON.stringify(query) : ''
  return `${path}:${queryStr}`
}

/**
 * 带缓存的 GET 请求
 * @param path API 路径
 * @param query 查询参数
 * @param ttl 缓存时间（毫秒），默认 60 秒
 */
export async function apiWithCache<T = unknown>(
  path: string,
  query?: Record<string, string | number>,
  ttl: number = 60000
): Promise<T> {
  // 只在浏览器端使用缓存
  if (typeof window === 'undefined') {
    return api<T>(path, { query })
  }

  const cacheKey = getCacheKey(path, query)

  // 清理过期缓存
  cleanupCache()

  // 检查缓存
  const cached = cache.get(cacheKey) as CacheItem<T> | undefined
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    // 更新最后访问时间（LRU）
    cached.lastAccess = Date.now()
    return cached.data
  }

  // 发起请求
  const data = await api<T>(path, { query })

  // 存入缓存前检查 LRU 限制
  evictLRU()

  // 存入缓存
  const now = Date.now()
  cache.set(cacheKey, {
    data,
    timestamp: now,
    ttl,
    lastAccess: now,
  })

  return data
}

/** 清除指定路径的缓存 */
export function clearApiCache(path?: string): void {
  if (path) {
    // 清除匹配路径的所有缓存
    for (const key of cache.keys()) {
      if (key.startsWith(path)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}

/** 工人端带缓存的 GET 请求 */
export async function apiWorkerWithCache<T = unknown>(
  path: string,
  query?: Record<string, string | number>,
  ttl: number = 60000
): Promise<T> {
  // 工人端请求不使用缓存，因为数据可能更频繁变化
  return apiWorker<T>(path, { query })
}

/** 构造后端静态文件访问 URL（如签名图片），优先使用 NEXT_PUBLIC_API_BASE */
export function buildFileUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return ''
  const clean = String(relativePath).replace(/^\/+/, '')
  if (!clean) return ''
  // 文件访问统一使用 NEXT_PUBLIC_API_BASE，浏览器端会在构建时被内联为常量
  const envBase = process.env.NEXT_PUBLIC_API_BASE ?? ''
  const base = envBase ? envBase.replace(/\/+$/, '') : ''
  return base ? `${base}/${clean}` : `/${clean}`
}

/** 工人端 API（H5）：使用 labor_worker_token，401 时跳转 /h5/login */
export async function apiWorker<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  return requestWithToken<T>(path, options, {
    getToken: getWorkerToken,
    setToken: setWorkerToken,
    loginRedirect: '/h5/login',
    unauthMessage: '请重新登录',
  })
}

/** 工人端下载工资条 HTML：GET /api/settlement/:id/slip，带 worker token */
export async function downloadSettlementSlip(settlementId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = `${API_BASE}/api/settlement/${settlementId}/slip`
  const token = USE_COOKIE_AUTH ? null : getWorkerToken()
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: USE_COOKIE_AUTH ? "include" : "same-origin",
  })
  if (res.status === 401) {
    setWorkerToken(null)
    if (typeof window !== 'undefined') window.location.href = '/h5/login'
    return { ok: false, message: '请重新登录' }
  }
  if (res.status === 404 || res.status === 403) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, message: (data as { message?: string }).message ?? '无法下载工资条' }
  }
  if (!res.ok) return { ok: false, message: res.statusText }
  const blob = await res.blob()
  let filename = `工资条_${settlementId}.html`
  const cd = res.headers.get('Content-Disposition')
  const m = cd && /filename\*=UTF-8''([^;]+)/.exec(cd)
  if (m) filename = decodeURIComponent(m[1])
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
  return { ok: true }
}

/** 下载合同 PDF（管理端用 getToken，工人端可传 useWorkerToken: true） */
export async function downloadContractPdf(contractId: string, useWorkerToken = false): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = API_BASE && !API_BASE.endsWith('/') ? API_BASE : API_BASE
  const url = base ? `${base}/api/contract/${contractId}/pdf` : `/api/contract/${contractId}/pdf`
  const token = USE_COOKIE_AUTH ? null : (useWorkerToken ? getWorkerToken() : getToken())
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: USE_COOKIE_AUTH ? "include" : "same-origin",
  })
  if (res.status === 404) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, message: (data as { noFile?: boolean; message?: string }).noFile ? '暂无 PDF 文件。请联系管理员获取合同文件，或待系统对接电子签后即可下载。' : (data as { message?: string }).message ?? '合同不存在' }
  }
  if (res.status === 403) return { ok: false, message: '无权查看该合同' }
  if (!res.ok) return { ok: false, message: res.statusText }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `合同-${contractId}.pdf`
  a.click()
  URL.revokeObjectURL(a.href)
  return { ok: true }
}
