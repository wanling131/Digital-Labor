/**
 * 后端 API 请求封装（管理端）
 * 开发时通过 next.config 的 rewrites 将 /api 代理到 http://localhost:3000
 * 生产环境需配置同源或 NEXT_PUBLIC_API_BASE
 */

const API_BASE = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'
const TOKEN_KEY = 'labor_token'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { body?: object } = {}
): Promise<T> {
  const { body, ...rest } = options
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const headers: HeadersInit = {
    ...(rest.headers as HeadersInit),
  }
  if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body != null ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setToken(null)
    if (typeof window !== 'undefined') window.location.href = '/pc/dashboard' // 可改为登录页路径
    throw new Error((data as { message?: string }).message ?? '未登录')
  }
  if (!res.ok) throw new Error((data as { message?: string }).message ?? res.statusText)
  return data as T
}
