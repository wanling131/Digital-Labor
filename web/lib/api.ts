/**
 * 后端 API 请求封装（管理端）
 * 开发时通过 next.config 的 rewrites 将 /api 代理到 http://localhost:3000
 * 生产环境需配置同源或 NEXT_PUBLIC_API_BASE
 */

// 在浏览器端使用相对路径（交给 next.config rewrites 代理），在服务端默认走环境变量或本地 3000
const API_BASE =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'
    : ''
const TOKEN_KEY = 'labor_token'
const WORKER_TOKEN_KEY = 'labor_worker_token'

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

export async function api<T = unknown>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: object | FormData; query?: Record<string, string | number> } = {}
): Promise<T> {
  const { body, query, ...rest } = options
  let url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => qs.set(k, String(v)))
    url += (url.includes('?') ? '&' : '?') + qs.toString()
  }
  const headers: HeadersInit = {
    ...(rest.headers as HeadersInit),
  }
  if (!(body instanceof FormData)) (headers as Record<string, string>)['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body != null ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })

  // 处理Token刷新
  const newToken = res.headers.get('X-Token-Refresh')
  if (newToken) {
    setToken(newToken)
  }

  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setToken(null)
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error((data as { message?: string }).message ?? '未登录')
  }
  if (!res.ok) throw new Error((data as { message?: string }).message ?? res.statusText)
  return data as T
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
export async function apiWorker<T = unknown>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: object | FormData; query?: Record<string, string | number> } = {}
): Promise<T> {
  const { body, query, ...rest } = options
  let url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => qs.set(k, String(v)))
    url += (url.includes('?') ? '&' : '?') + qs.toString()
  }
  const headers: HeadersInit = { ...(rest.headers as HeadersInit) }
  if (!(body instanceof FormData)) (headers as Record<string, string>)['Content-Type'] = 'application/json'
  const token = getWorkerToken()
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body != null ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })

  // 处理Token刷新
  const newToken = res.headers.get('X-Token-Refresh')
  if (newToken) {
    setWorkerToken(newToken)
  }

  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setWorkerToken(null)
    if (typeof window !== 'undefined') window.location.href = '/h5/login'
    throw new Error((data as { message?: string }).message ?? '请重新登录')
  }
  if (!res.ok) throw new Error((data as { message?: string }).message ?? res.statusText)
  return data as T
}

/** 工人端下载工资条 HTML：GET /api/settlement/:id/slip，带 worker token */
export async function downloadSettlementSlip(settlementId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = `${API_BASE}/api/settlement/${settlementId}/slip`
  const token = getWorkerToken()
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
  const token = useWorkerToken ? getWorkerToken() : getToken()
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (res.status === 404) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, message: (data as { noFile?: boolean; message?: string }).noFile ? '暂无 PDF 文件，对接电子签后可下载' : (data as { message?: string }).message ?? '合同不存在' }
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
