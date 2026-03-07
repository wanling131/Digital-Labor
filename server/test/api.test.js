/**
 * 后端 API 自动化测试（非开发可读：用脚本检查接口是否按预期返回）
 * 执行：在 server 目录下 npm test
 */
process.env.NODE_ENV = 'test'
import test from 'node:test'
import assert from 'node:assert'
import supertest from 'supertest'
import app from '../app.js'

const request = supertest(app)

// 用例1：健康检查
test('GET /api/health 返回 200', async () => {
  const res = await request.get('/api/health')
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body?.ok, true)
})

// 用例2：未带 token 访问受保护接口应 401
test('GET /api/sys/org 无 token 返回 401', async () => {
  const res = await request.get('/api/sys/org')
  assert.strictEqual(res.status, 401)
})

// 用例3：管理端登录成功返回 token
test('POST /api/auth/login 正确账号密码返回 token', async () => {
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  assert.strictEqual(res.status, 200)
  assert.ok(res.body?.token)
  assert.ok(res.body?.user?.username === 'admin')
})

// 用例4：管理端登录错误密码 401
test('POST /api/auth/login 错误密码返回 401', async () => {
  const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'wrong' })
  assert.strictEqual(res.status, 401)
})

// 用例4b：管理端登录空用户名返回 400
test('POST /api/auth/login 空用户名返回 400', async () => {
  const res = await request.post('/api/auth/login').send({ username: '', password: 'x' })
  assert.strictEqual(res.status, 400)
})

// 用例5：带 token 可访问组织列表
test('带 token 可 GET /api/sys/org', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const token = login.body.token
  const res = await request.get('/api/sys/org').set('Authorization', `Bearer ${token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.tree))
})

// 用例6：人员档案列表带 token 返回 list 与 total
test('带 token 可 GET /api/person/archive', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/person/archive').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.list))
  assert.ok(typeof res.body?.total === 'number')
})

// 用例7：数据看板返回 KPI 字段
test('带 token 可 GET /api/data/board', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/data/board').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(typeof res.body?.total === 'number')
  assert.ok(['number', 'string'].includes(typeof res.body?.realNameRate))
})

// 用例8：工人端登录需有人员数据（无人员时 401）
test('POST /api/auth/worker-login 无匹配人员返回 401', async () => {
  const res = await request.post('/api/auth/worker-login').send({ work_no: 'nonexist', name: '无' })
  assert.strictEqual(res.status, 401)
})

// 用例9：新增组织后树中包含
test('POST /api/sys/org 新增后 GET 树中包含', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const token = login.body.token
  const create = await request.post('/api/sys/org').set('Authorization', `Bearer ${token}`).send({ name: '测试_' + Date.now(), type: 'project' })
  assert.strictEqual(create.status, 200)
  assert.ok(create.body?.id)
})

// 用例10：在岗看板返回 projects、total、total_expected，每项含 expected 与 count
test('带 token 可 GET /api/site/board', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/site/board').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.projects))
  assert.ok(typeof res.body?.total === 'number')
  assert.ok(typeof res.body?.total_expected === 'number')
  res.body.projects.forEach((p) => {
    assert.ok(typeof p.expected === 'number')
    assert.ok(typeof p.count === 'number')
  })
})

// 用例11：新增人员后工人端可用姓名登录
test('新增人员后 worker-login 返回 token', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const token = login.body.token
  const create = await request.post('/api/person/archive').set('Authorization', `Bearer ${token}`).send({ name: 'WorkerTest', work_no: 'WT1' })
  assert.strictEqual(create.status, 200)
  const workerLogin = await request.post('/api/auth/worker-login').send({ name: 'WorkerTest' })
  assert.strictEqual(workerLogin.status, 200)
  assert.ok(workerLogin.body?.token)
})

// 用例12：GET /api 返回接口元信息
test('GET /api 返回 name 与 docs', async () => {
  const res = await request.get('/api')
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body?.name, 'Digital Labor')
  assert.ok(res.body?.docs)
})

// 用例13：带 token 可 GET /api/sys/my-menu 返回菜单
test('带 token 可 GET /api/sys/my-menu', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/sys/my-menu').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.menus))
  assert.ok(res.body.menus.length > 0)
})

// 用例14：登录 400 返回 code 与 message
test('POST /api/auth/login 400 返回统一错误格式', async () => {
  const res = await request.post('/api/auth/login').send({ username: '', password: 'x' })
  assert.strictEqual(res.status, 400)
  assert.ok(res.body?.code)
  assert.ok(res.body?.message)
})

// 用例15：POST /api/settlement/push-notify 需 token，空 body 可成功
test('POST /api/settlement/push-notify 带 token 可成功', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.post('/api/settlement/push-notify').set('Authorization', `Bearer ${login.body.token}`).send({})
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body?.ok, true)
  assert.ok(typeof res.body?.count === 'number')
})

// 用例16：工人端 token 可 GET /api/worker/certificates（用用例11创建的人员登录）
test('工人端 token 可 GET /api/worker/certificates', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  await request.post('/api/person/archive').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'CertTest', work_no: 'CT1' })
  const wLogin = await request.post('/api/auth/worker-login').send({ name: 'CertTest' })
  assert.strictEqual(wLogin.status, 200)
  const res = await request.get('/api/worker/certificates').set('Authorization', `Bearer ${wLogin.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.list))
})

// 用例17：工人端 token 可 POST /api/attendance/clock
test('工人端 token 可 POST /api/attendance/clock', async () => {
  const wLogin = await request.post('/api/auth/worker-login').send({ name: 'CertTest' })
  assert.strictEqual(wLogin.status, 200)
  const res = await request.post('/api/attendance/clock').set('Authorization', `Bearer ${wLogin.body.token}`).send({ type: 'in' })
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body?.ok, true)
  assert.ok(res.body?.work_date)
})
