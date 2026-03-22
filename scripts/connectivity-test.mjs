#!/usr/bin/env node
/**
 * 前后端连通性测试（需先启动后端，可选启动前端）
 * 用法：先执行 npm run dev:api（后端 3000），再在另一终端执行 node scripts/connectivity-test.mjs
 * 或：npm run test:connectivity
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000'
const WEB_BASE = process.env.WEB_BASE || 'http://localhost:3002'

async function check(name, url, checkBody = null) {
  try {
    const res = await fetch(url)
    const text = await res.text()
    let data = null
    try {
      data = JSON.parse(text)
    } catch (_) {}
    const ok = res.ok && (!checkBody || checkBody(data))
    console.log(ok ? `✓ ${name}` : `✗ ${name} (${res.status})`)
    if (!ok && data?.message) console.log('  ', data.message)
    return ok
  } catch (e) {
    console.log(`✗ ${name} (${e.message})`)
    return false
  }
}

async function main() {
  console.log('API_BASE =', API_BASE)
  console.log('WEB_BASE =', WEB_BASE)
  console.log('')

  const apiHealth = await check('后端健康检查 GET /api/health', `${API_BASE}/api/health`, (d) => d?.ok === true)
  const apiMeta = await check('后端元信息 GET /api', `${API_BASE}/api`, (d) => d?.name != null)

  let loginOk = false
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    })
    const data = await res.json()
    loginOk = res.ok && data?.token
    console.log(loginOk ? '✓ 管理端登录 POST /api/auth/login' : '✗ 管理端登录 (账号 admin / 123456)')
  } catch (e) {
    console.log('✗ 管理端登录', e.message)
  }

  let webOk = false
  try {
    const res = await fetch(WEB_BASE, { redirect: 'manual' })
    webOk = res.status === 200 || res.status === 307 || res.status === 308
    console.log(webOk ? '✓ 前端首页可访问' : `✗ 前端首页 (${res.status})`)
  } catch (e) {
    console.log('✗ 前端首页 (未启动或与 WEB_BASE 端口不一致，开发默认 3002)', e.message)
  }

  console.log('')
  const apiOk = apiHealth && apiMeta && loginOk
  if (apiOk) {
    console.log('后端连通性: 通过')
  } else {
    console.log('后端连通性: 未通过，请先执行 npm run dev:api（或 cd server && python -m digital_labor.run）')
    process.exit(1)
  }
  if (webOk) {
    console.log('前端连通性: 通过')
  } else {
    console.log('前端连通性: 未通过（可选，需执行 npm run dev:web）')
  }
  process.exit(apiOk ? 0 : 1)
}

main()
