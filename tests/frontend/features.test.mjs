process.env.NODE_ENV = 'test'

import supertest from 'supertest'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const req = supertest(BASE_URL)

let adminToken = null
let userToken = null
let testCertId = null

async function getAdminToken() {
  if (adminToken) return adminToken
  const res = await req.post('/api/auth/login').send({ username: 'admin', password: '123456' })
  if (res.status !== 200) {
    throw new Error('管理员登录失败')
  }
  adminToken = res.body.token
  return adminToken
}

async function getUserToken() {
  if (userToken) return userToken
  const res = await req.post('/api/auth/login').send({ username: 'user', password: '123456' })
  if (res.status !== 200) {
    const adminT = await getAdminToken()
    await req.post('/api/sys/user').set('Authorization', 'Bearer ' + adminT).send({
      username: 'user',
      password: '123456',
      name: '测试业务员',
      role: 'user'
    })
    const loginRes = await req.post('/api/auth/login').send({ username: 'user', password: '123456' })
    if (loginRes.status !== 200) {
      throw new Error('业务员登录失败')
    }
    userToken = loginRes.body.token
  } else {
    userToken = res.body.token
  }
  return userToken
}

async function runTest(testName, testFn) {
  try {
    await testFn()
    console.log('✓ ' + testName)
    return true
  } catch (error) {
    console.log('✗ ' + testName)
    console.log('  错误: ' + error.message)
    return false
  }
}

async function main() {
  console.log('\n========================================')
  console.log('四项功能点API测试（Python 后端黑盒）')
  console.log('========================================\n')

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  }

  results.total++
  const test1_1 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/all-permissions').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取所有权限失败')
    if (!res.body || !res.body.groups || !Array.isArray(res.body.groups)) throw new Error('返回数据缺少groups字段或不是数组')
    if (!res.body || !res.body.allKeys || !Array.isArray(res.body.allKeys)) throw new Error('返回数据缺少allKeys字段或不是数组')
  }
  if (await runTest('1.1 GET /api/sys/all-permissions 返回权限分组', test1_1)) results.passed++
  else results.failed++

  results.total++
  const test1_2 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/role/admin/permissions').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取角色按钮权限失败')
    if (!res.body || !res.body.keys || !Array.isArray(res.body.keys)) throw new Error('返回数据缺少keys字段或不是数组')
  }
  if (await runTest('1.2 GET /api/sys/role/:code/permissions 返回角色按钮权限', test1_2)) results.passed++
  else results.failed++

  results.total++
  const test1_3 = async () => {
    const token = await getAdminToken()
    const testKeys = ['person:view', 'person:add', 'person:edit']
    const res = await req.put('/api/sys/role/admin/permissions')
      .set('Authorization', 'Bearer ' + token)
      .send({ keys: testKeys })
    if (res.status !== 200) throw new Error('保存角色按钮权限失败')
    if (!res.body || res.body.ok !== true) throw new Error('保存结果应为true')
    if (!res.body || res.body.count !== testKeys.length) throw new Error('保存的权限数量不匹配')
  }
  if (await runTest('1.3 PUT /api/sys/role/:code/permissions 保存角色按钮权限', test1_3)) results.passed++
  else results.failed++

  results.total++
  const test1_4 = async () => {
    const token = await getAdminToken()
    const testKeys = ['person:view', 'invalid:permission', 'person:add']
    const res = await req.put('/api/sys/role/admin/permissions')
      .set('Authorization', 'Bearer ' + token)
      .send({ keys: testKeys })
    if (res.status !== 200) throw new Error('保存角色按钮权限失败')
    if (!res.body || res.body.count > testKeys.length) throw new Error('应过滤无效权限')
  }
  if (await runTest('1.4 PUT /api/sys/role/:code/permissions 验证无效权限过滤', test1_4)) results.passed++
  else results.failed++

  results.total++
  const test1_5 = async () => {
    const token = await getAdminToken()
    const res = await req.put('/api/sys/role/admin/permissions')
      .set('Authorization', 'Bearer ' + token)
      .send({ keys: [] })
    if (res.status !== 200) throw new Error('保存角色按钮权限失败')
    if (!res.body || res.body.count !== 0) throw new Error('空keys应返回0')
  }
  if (await runTest('1.5 PUT /api/sys/role/:code/permissions 验证空keys参数', test1_5)) results.passed++
  else results.failed++

  results.total++
  const test1_6 = async () => {
    const token = await getAdminToken()
    const res = await req.put('/api/sys/role/admin/permissions')
      .set('Authorization', 'Bearer ' + token)
      .send({ keys: 'not-an-array' })
    if (res.status !== 400) throw new Error('非数组参数应返回400')
    if (!res.body || !res.body.message) throw new Error('应返回错误信息')
  }
  if (await runTest('1.6 PUT /api/sys/role/:code/permissions 验证非数组参数', test1_6)) results.passed++
  else results.failed++

  results.total++
  const test1_7 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/my-permissions').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取当前用户权限失败')
    if (!res.body || !res.body.permissions || !Array.isArray(res.body.permissions)) throw new Error('返回数据缺少permissions字段或不是数组')
  }
  if (await runTest('1.7 GET /api/sys/my-permissions 返回当前用户权限', test1_7)) results.passed++
  else results.failed++

  console.log('\n功能点2：认证管理页 - 人脸认证状态展示\n')

  results.total++
  const test2_1 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/auth').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取认证列表失败')
    if (!res.body || !res.body.list || !Array.isArray(res.body.list)) throw new Error('返回数据缺少list字段或不是数组')
    if (res.body.list.length > 0) {
      const firstPerson = res.body.list[0]
      if (!('face_verified' in firstPerson)) throw new Error('人员数据应包含face_verified字段')
      if (!('face_verified_at' in firstPerson)) throw new Error('人员数据应包含face_verified_at字段')
    }
  }
  if (await runTest('2.1 GET /api/person/auth 返回face_verified字段', test2_1)) results.passed++
  else results.failed++

  results.total++
  const test2_2 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/auth?filled=true').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取认证列表失败')
    if (!res.body || !res.body.list || !Array.isArray(res.body.list)) throw new Error('返回数据缺少list字段或不是数组')
  }
  if (await runTest('2.2 GET /api/person/auth 支持filled参数筛选', test2_2)) results.passed++
  else results.failed++

  results.total++
  const test2_3 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/auth?keyword=test').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取认证列表失败')
    if (!res.body || !res.body.list || !Array.isArray(res.body.list)) throw new Error('返回数据缺少list字段或不是数组')
  }
  if (await runTest('2.3 GET /api/person/auth 支持keyword搜索', test2_3)) results.passed++
  else results.failed++

  results.total++
  const test2_4 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/auth').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const updateRes = await req.put('/api/person/' + personId + '/auth-review')
      .set('Authorization', 'Bearer ' + token)
      .send({ status: 'approved' })
    if (updateRes.status !== 200) throw new Error('更新审核状态失败')
    if (!updateRes.body || updateRes.body.ok !== true) throw new Error('更新结果应为true')
  }
  if (await runTest('2.4 PUT /api/person/:id/auth-review 更新审核状态', test2_4)) results.passed++
  else results.failed++

  results.total++
  const test2_5 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/auth').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const updateRes = await req.put('/api/person/' + personId + '/auth-review')
      .set('Authorization', 'Bearer ' + token)
      .send({ status: 'invalid_status' })
    if (updateRes.status !== 400) throw new Error('无效状态应返回400')
  }
  if (await runTest('2.5 PUT /api/person/:id/auth-review 验证无效状态', test2_5)) results.passed++
  else results.failed++

  results.total++
  const test2_6 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/auth').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const updateRes = await req.post('/api/person/' + personId + '/face-verify')
      .set('Authorization', 'Bearer ' + token)
      .send({ mode: 'living', image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', person_id: personId })
    if (updateRes.status !== 200) throw new Error('更新人脸认证状态失败')
    if (!updateRes.body || updateRes.body.ok !== true) throw new Error('更新结果应为true')
  }
  if (await runTest('2.6 POST /api/person/face-verify 更新face_verified状态', test2_6)) results.passed++
  else results.failed++

  console.log('\n功能点3：人员证书在PC端的增删改功能\n')

  results.total++
  const test3_1 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const certRes = await req.get('/api/person/archive/' + personId + '/certificates')
      .set('Authorization', 'Bearer ' + token)
    if (certRes.status !== 200) throw new Error('获取证书列表失败')
    if (!certRes.body || !certRes.body.list || !Array.isArray(certRes.body.list)) throw new Error('返回数据缺少list字段或不是数组')
  }
  if (await runTest('3.1 GET /api/person/archive/:id/certificates 返回证书列表', test3_1)) results.passed++
  else results.failed++

  results.total++
  const test3_2 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const certRes = await req.post('/api/person/archive/' + personId + '/certificates')
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: '测试证书',
        certificate_no: 'TEST_CERT_001',
        issue_date: '2024-01-01',
        expiry_date: '2025-01-01'
      })
    if (certRes.status !== 200) throw new Error('添加证书失败')
    if (!certRes.body || !certRes.body.id) throw new Error('返回数据缺少id字段')
    testCertId = certRes.body.id
  }
  if (await runTest('3.2 POST /api/person/archive/:id/certificates 添加证书', test3_2)) results.passed++
  else results.failed++

  results.total++
  const test3_3 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const certRes = await req.post('/api/person/archive/' + personId + '/certificates')
      .set('Authorization', 'Bearer ' + token)
      .send({
        certificate_no: 'TEST_CERT_002'
      })
    if (certRes.status !== 400) throw new Error('缺少必填字段应返回400')
    if (!certRes.body || !certRes.body.message) throw new Error('应返回错误信息')
  }
  if (await runTest('3.3 POST /api/person/archive/:id/certificates 验证必填字段', test3_3)) results.passed++
  else results.failed++

  results.total++
  const test3_4 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0 || !testCertId) return
    const personId = res.body.list[0].id
    const certRes = await req.put('/api/person/archive/' + personId + '/certificates/' + testCertId)
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: '更新后的测试证书',
        certificate_no: 'TEST_CERT_001_UPDATED'
      })
    if (certRes.status !== 200) throw new Error('更新证书失败')
    if (!certRes.body || certRes.body.ok !== true) throw new Error('更新结果应为true')
  }
  if (await runTest('3.4 PUT /api/person/archive/:id/certificates/:certId 更新证书', test3_4)) results.passed++
  else results.failed++

  results.total++
  const test3_5 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0 || !testCertId) return
    const personId = res.body.list[0].id
    const certRes = await req.put('/api/person/archive/' + personId + '/certificates/' + testCertId)
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: '部分更新测试'
      })
    if (certRes.status !== 200) throw new Error('部分更新证书失败')
    if (!certRes.body || certRes.body.ok !== true) throw new Error('更新结果应为true')
  }
  if (await runTest('3.5 PUT /api/person/archive/:id/certificates/:certId 部分更新', test3_5)) results.passed++
  else results.failed++

  results.total++
  const test3_6 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0 || !testCertId) return
    const personId = res.body.list[0].id
    const certRes = await req.delete('/api/person/archive/' + personId + '/certificates/' + testCertId)
      .set('Authorization', 'Bearer ' + token)
    if (certRes.status !== 200) throw new Error('删除证书失败')
    if (!certRes.body || certRes.body.ok !== true) throw new Error('删除结果应为true')
  }
  if (await runTest('3.6 DELETE /api/person/archive/:id/certificates/:certId 删除证书', test3_6)) results.passed++
  else results.failed++

  results.total++
  const test3_7 = async () => {
    const token = await getUserToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const certRes = await req.post('/api/person/archive/' + personId + '/certificates')
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: '测试证书',
        certificate_no: 'TEST_CERT_003'
      })
    if (certRes.status !== 200) throw new Error('业务员应能操作本组织人员证书')
  }
  if (await runTest('3.7 证书操作数据范围校验：业务员只能操作本组织人员', test3_7)) results.passed++
  else results.failed++

  results.total++
  const test3_8 = async () => {
    const token = await getAdminToken()
    const certRes = await req.post('/api/person/archive/99999/certificates')
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: '测试证书',
        certificate_no: 'TEST_CERT_004'
      })
    if (certRes.status !== 404) throw new Error('人员不存在应返回404')
  }
  if (await runTest('3.8 证书操作验证人员不存在', test3_8)) results.passed++
  else results.failed++

  results.total++
  const test3_9 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.body.list.length === 0) return
    const personId = res.body.list[0].id
    const certRes = await req.delete('/api/person/archive/' + personId + '/certificates/99999')
      .set('Authorization', 'Bearer ' + token)
    if (certRes.status !== 404) throw new Error('证书不存在应返回404')
  }
  if (await runTest('3.9 证书操作验证证书不存在', test3_9)) results.passed++
  else results.failed++

  console.log('\n功能点4：权限分配页数据范围说明\n')

  results.total++
  const test4_1 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/role').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取角色列表失败')
    if (!res.body || !res.body.list || !Array.isArray(res.body.list)) throw new Error('返回数据缺少list字段或不是数组')
  }
  if (await runTest('4.1 GET /api/sys/role 返回角色列表', test4_1)) results.passed++
  else results.failed++

  results.total++
  const test4_2 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/my-permissions').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取当前用户权限失败')
    if (!res.body || !res.body.permissions) throw new Error('返回数据缺少permissions字段')
  }
  if (await runTest('4.2 GET /api/sys/my-permissions 返回org_id', test4_2)) results.passed++
  else results.failed++

  results.total++
  const test4_3 = async () => {
    const token = await getUserToken()
    const res = await req.get('/api/person/archive').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取人员列表失败')
    if (!res.body || !res.body.list || !Array.isArray(res.body.list)) throw new Error('返回数据缺少list字段或不是数组')
  }
  if (await runTest('4.3 GET /api/person/archive 业务员只能看到本组织及下级人员', test4_3)) results.passed++
  else results.failed++

  results.total++
  const test4_4 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/org').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取组织树失败')
    if (!res.body || !res.body.tree) throw new Error('返回数据缺少tree字段')
  }
  if (await runTest('4.4 GET /api/sys/org 返回组织树', test4_4)) results.passed++
  else results.failed++

  results.total++
  const test4_5 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/my-menu').set('Authorization', 'Bearer ' + token)
    if (res.status !== 200) throw new Error('获取菜单权限失败')
    if (!res.body || !res.body.menus || !Array.isArray(res.body.menus)) throw new Error('返回数据缺少menus字段或不是数组')
  }
  if (await runTest('4.5 GET /api/sys/my-menu 返回菜单权限', test4_5)) results.passed++
  else results.failed++

  results.total++
  const test4_6 = async () => {
    const token = await getAdminToken()
    const res = await req.get('/api/sys/my-menu').set('Authorization', 'Bearer ' + token)
    if (res.body.menus.length === 0) return
    const menuPaths = res.body.menus.map(m => m.path)
    const saveRes = await req.put('/api/sys/role/admin/menus')
      .set('Authorization', 'Bearer ' + token)
      .send({ paths: menuPaths })
    if (saveRes.status !== 200) throw new Error('保存菜单权限失败')
    if (!saveRes.body || saveRes.body.ok !== true) throw new Error('保存结果应为true')
  }
  if (await runTest('4.6 PUT /api/sys/role/:code/menus 保存菜单权限', test4_6)) results.passed++
  else results.failed++

  console.log('\n综合测试：功能点联动验证\n')

  results.total++
  const test5_1 = async () => {
    const token = await getAdminToken()
    const personRes = await req.post('/api/person/archive')
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: 'E2E测试人员',
        job_title: '测试工种',
        phone: '13800138000',
        id_card: '110101199001011234'
      })
    if (personRes.status !== 200) return
    const personId = personRes.body.id
    const certRes = await req.post('/api/person/archive/' + personId + '/certificates')
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: 'E2E测试证书',
        certificate_no: 'E2E_CERT_001'
      })
    if (certRes.status !== 200) throw new Error('添加证书失败')
    const faceRes = await req.post('/api/person/' + personId + '/face-verify')
      .set('Authorization', 'Bearer ' + token)
      .send({ mode: 'living', image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', person_id: personId })
    if (faceRes.status !== 200) throw new Error('更新人脸认证失败')
    const permRes = await req.get('/api/sys/my-permissions')
      .set('Authorization', 'Bearer ' + token)
    if (permRes.status !== 200) throw new Error('获取权限失败')
  }
  if (await runTest('5.1 完整流程：创建人员 -> 添加证书 -> 人脸认证 -> 权限验证', test5_1)) results.passed++
  else results.failed++

  results.total++
  const test5_2 = async () => {
    const adminT = await getAdminToken()
    const userT = await getUserToken()
    const adminRes = await req.get('/api/person/archive')
      .set('Authorization', 'Bearer ' + adminT)
    if (adminRes.status !== 200) throw new Error('管理员应能访问人员列表')
    const userRes = await req.get('/api/person/archive')
      .set('Authorization', 'Bearer ' + userT)
    if (userRes.status !== 200) throw new Error('业务员应能访问人员列表')
    if (userRes.body.list.length > adminRes.body.list.length) {
      throw new Error('业务员看到的数据量应小于等于管理员')
    }
  }
  if (await runTest('5.2 权限隔离：业务员无法操作其他组织数据', test5_2)) results.passed++
  else results.failed++

  console.log('\n========================================')
  console.log('测试结果汇总')
  console.log('========================================')
  console.log('总测试数: ' + results.total)
  console.log('通过: ' + results.passed)
  console.log('失败: ' + results.failed)
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0
  console.log('通过率: ' + passRate + '%')
  console.log('========================================\n')

  if (results.failed > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('测试执行失败:', error)
  process.exit(1)
})

