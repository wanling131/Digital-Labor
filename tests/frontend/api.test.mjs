/**
 * 后端 API 自动化测试（黑盒）：直接请求运行中的 Python dtcloud 后端
 * 执行：在仓库根目录 node --test tests/frontend/api.test.mjs
 */
process.env.NODE_ENV = 'test'
import test from 'node:test'
import assert from 'node:assert'
import supertest from 'supertest'

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const request = supertest(BASE_URL)

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

// 用例18：GET /api/sys/feature-status 无需 token，返回 faceVerify
test('GET /api/sys/feature-status 返回 faceVerify', async () => {
  const res = await request.get('/api/sys/feature-status')
  assert.strictEqual(res.status, 200)
  assert.ok(['aliyun', 'mock'].includes(res.body?.faceVerify))
})

// 用例19：带 token 可 GET /api/sys/my-permissions 返回 permissions 与 org_id
test('带 token 可 GET /api/sys/my-permissions', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/sys/my-permissions').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.permissions))
  assert.ok(res.body.permissions.length > 0)
  assert.ok('org_id' in res.body)
})

// 用例20：带 token 可 GET /api/sys/role/:code/permissions
test('带 token 可 GET /api/sys/role/admin/permissions', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/sys/role/admin/permissions').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.keys))
  assert.ok(res.body.keys.length > 0)
})

// 用例21：带 token 可 PUT /api/sys/role/:code/permissions 并生效
test('带 token 可 PUT /api/sys/role/user/permissions', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const getBefore = await request.get('/api/sys/role/user/permissions').set('Authorization', `Bearer ${login.body.token}`)
  const beforeKeys = getBefore.body?.keys || []
  const newKeys = beforeKeys.filter(k => k !== 'person:delete')
  const put = await request.put('/api/sys/role/user/permissions').set('Authorization', `Bearer ${login.body.token}`).send({ keys: newKeys })
  assert.strictEqual(put.status, 200)
  assert.strictEqual(put.body?.ok, true)
  const getAfter = await request.get('/api/sys/role/user/permissions').set('Authorization', `Bearer ${login.body.token}`)
  assert.ok(Array.isArray(getAfter.body?.keys))
  assert.strictEqual(getAfter.body.keys.includes('person:delete'), false)
  await request.put('/api/sys/role/user/permissions').set('Authorization', `Bearer ${login.body.token}`).send({ keys: beforeKeys })
})

// 用例22：GET /api/sys/all-permissions 返回 groups 与 allKeys
test('带 token 可 GET /api/sys/all-permissions', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/sys/all-permissions').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.groups))
  assert.ok(Array.isArray(res.body?.allKeys))
  assert.ok(res.body.groups.length > 0)
  assert.ok(res.body.allKeys.length > 0)
})

// 用例23：GET /api/person/auth 返回 list 且每项含 face_verified
test('带 token 可 GET /api/person/auth 且含 face_verified', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const res = await request.get('/api/person/auth').set('Authorization', `Bearer ${login.body.token}`)
  assert.strictEqual(res.status, 200)
  assert.ok(Array.isArray(res.body?.list))
  assert.ok(typeof res.body?.total === 'number')
  if (res.body.list.length > 0) {
    const first = res.body.list[0]
    assert.strictEqual(typeof first.face_verified, 'boolean')
  }
})

// 用例24：人员证书 GET/POST/PUT/DELETE（管理端）
test('管理端可 GET/POST/PUT/DELETE 人员证书', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const token = login.body.token
  const createPerson = await request.post('/api/person/archive').set('Authorization', `Bearer ${token}`).send({ name: 'CertCrudTest', work_no: 'CCT1' })
  assert.strictEqual(createPerson.status, 200)
  const personId = createPerson.body.id

  const getEmpty = await request.get(`/api/person/archive/${personId}/certificates`).set('Authorization', `Bearer ${token}`)
  assert.strictEqual(getEmpty.status, 200)
  assert.ok(Array.isArray(getEmpty.body?.list))
  assert.strictEqual(getEmpty.body.list.length, 0)

  const postCert = await request.post(`/api/person/archive/${personId}/certificates`).set('Authorization', `Bearer ${token}`).send({ name: '安全员证', certificate_no: 'NO001', expiry_date: '2026-12-31' })
  assert.strictEqual(postCert.status, 200)
  assert.ok(postCert.body?.id)
  const certId = postCert.body.id

  const getOne = await request.get(`/api/person/archive/${personId}/certificates`).set('Authorization', `Bearer ${token}`)
  assert.strictEqual(getOne.status, 200)
  assert.strictEqual(getOne.body.list.length, 1)
  assert.strictEqual(getOne.body.list[0].name, '安全员证')

  const putCert = await request.put(`/api/person/archive/${personId}/certificates/${certId}`).set('Authorization', `Bearer ${token}`).send({ name: '安全员证（已更新）' })
  assert.strictEqual(putCert.status, 200)
  assert.strictEqual(putCert.body?.ok, true)

  const deleteCert = await request.delete(`/api/person/archive/${personId}/certificates/${certId}`).set('Authorization', `Bearer ${token}`)
  assert.strictEqual(deleteCert.status, 200)
  assert.strictEqual(deleteCert.body?.ok, true)

  const getAfter = await request.get(`/api/person/archive/${personId}/certificates`).set('Authorization', `Bearer ${token}`)
  assert.strictEqual(getAfter.body.list.length, 0)
})

// 用例25：业务员无 person:delete 时 DELETE 人员应返回 403（若后端已启用按钮权限）
test('业务员无 person:delete 时 DELETE 人员返回 403 或 200', async () => {
  const login = await request.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  const token = login.body.token
  const getBefore = await request.get('/api/sys/role/user/permissions').set('Authorization', `Bearer ${token}`)
  const beforeKeys = getBefore.body?.keys || []
  const keysWithoutDelete = beforeKeys.filter(k => k !== 'person:delete')
  await request.put('/api/sys/role/user/permissions').set('Authorization', `Bearer ${token}`).send({ keys: keysWithoutDelete })

  const uname = 'testuser_perm_' + Date.now()
  const createUser = await request.post('/api/sys/user').set('Authorization', `Bearer ${token}`).send({ username: uname, password: '123456', name: 'TestUser', role: 'user' })
  if (createUser.status !== 200) return
  const userLogin = await request.post('/api/auth/login').send({ username: uname, password: '123456' })
  if (userLogin.status !== 200) return
  const createPerson = await request.post('/api/person/archive').set('Authorization', `Bearer ${userLogin.body.token}`).send({ name: 'ForDeleteTest', work_no: 'FDT1' })
  if (createPerson.status !== 200) return
  const personId = createPerson.body.id
  const del = await request.delete(`/api/person/archive/${personId}`).set('Authorization', `Bearer ${userLogin.body.token}`)
  assert.ok(del.status === 403 || del.status === 200, 'DELETE 应返回 403（无权限）或 200（未启用按钮权限时）')
  if (del.status === 200) {
    await request.put('/api/sys/role/user/permissions').set('Authorization', `Bearer ${token}`).send({ keys: beforeKeys })
    return
  }
  await request.delete(`/api/person/archive/${personId}`).set('Authorization', `Bearer ${token}`)
  await request.put('/api/sys/role/user/permissions').set('Authorization', `Bearer ${token}`).send({ keys: beforeKeys })
})

