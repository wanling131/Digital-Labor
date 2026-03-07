/**
 * 人员档案与状态接口（非开发可读：工人名单的增删改查、按状态/组织筛选、批量改状态）
 */
import { Router } from 'express'
import { db } from '../db/index.js'
import { PERSON_STATUS_LIST } from '../lib/constants.js'
import { parsePagination } from '../lib/validate.js'
import faceVerifyService from '../lib/faceVerify.js'
import { encrypt, decrypt, maskSensitiveData } from '../lib/crypto.js'
import { faceVerifyRateLimit } from '../middleware/rateLimit.js'

const router = Router()

router.get('/archive', (req, res) => {
  const { status, org_id, on_site, filled, contract_signed } = req.query
  const { limit, offset, page, pageSize } = parsePagination(req.query)
  const where = []
  const params = []
  if (status) { where.push('p.status = ?'); params.push(status) }
  if (org_id) { where.push('p.org_id = ?'); params.push(org_id) }
  if (on_site === '1') { where.push('p.on_site = 1'); }
  if (on_site === '0') { where.push('p.on_site = 0'); }
  if (filled === '1') { where.push("TRIM(COALESCE(p.id_card,'')) != '' AND TRIM(COALESCE(p.mobile,'')) != ''"); }
  if (filled === '0') { where.push("(TRIM(COALESCE(p.id_card,'')) = '' OR TRIM(COALESCE(p.mobile,'')) = '')"); }
  if (contract_signed === '0') { where.push('p.contract_signed = 0'); }
  if (contract_signed === '1') { where.push('p.contract_signed = 1'); }
  const whereStr = where.length ? ' AND ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM person p WHERE 1=1' + whereStr).get(...params).n
  const list = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE 1=1' + whereStr + ' ORDER BY p.id DESC LIMIT ? OFFSET ?').all(...params, limit, offset)

  // 解密并脱敏敏感数据
  const maskedList = list.map(person => ({
    ...person,
    id_card: person.id_card ? maskSensitiveData(decrypt(person.id_card), 'idCard') : person.id_card,
    mobile: person.mobile ? maskSensitiveData(decrypt(person.mobile), 'mobile') : person.mobile,
    bank_card: person.bank_card ? maskSensitiveData(decrypt(person.bank_card), 'bankCard') : person.bank_card
  }))

  res.json({ list: maskedList, total, page, pageSize })
})

router.get('/archive/:id', (req, res) => {
  const row = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE p.id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: '不存在' })
  res.json(row)
})

router.post('/archive', (req, res) => {
  const { org_id, work_no, name, id_card, mobile, bank_card, status = '预注册' } = req.body || {}
  if (!name) return res.status(400).json({ message: '姓名必填' })

  // 加密敏感数据
  const encryptedIdCard = id_card ? encrypt(id_card) : null
  const encryptedMobile = mobile ? encrypt(mobile) : null
  const encryptedBankCard = bank_card ? encrypt(bank_card) : null

  const r = db.prepare(`
    INSERT INTO person (org_id, work_no, name, id_card, mobile, bank_card, status) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(org_id ?? null, work_no ?? null, name, encryptedIdCard, encryptedMobile, encryptedBankCard, status)
  res.json({ id: r.lastInsertRowid })
})

router.put('/archive/:id', (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '人员不存在' })
  const { org_id, work_no, name, id_card, mobile, bank_card, status } = req.body || {}
  const updates = ['updated_at = datetime(\'now\')']
  const values = []
  if (org_id !== undefined) { updates.push('org_id = ?'); values.push(org_id) }
  if (work_no !== undefined) { updates.push('work_no = ?'); values.push(work_no) }
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (id_card !== undefined) { updates.push('id_card = ?'); values.push(id_card ? encrypt(id_card) : null) }
  if (mobile !== undefined) { updates.push('mobile = ?'); values.push(mobile ? encrypt(mobile) : null) }
  if (bank_card !== undefined) { updates.push('bank_card = ?'); values.push(bank_card ? encrypt(bank_card) : null) }
  if (status !== undefined) { updates.push('status = ?'); values.push(status) }
  if (values.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(id)
  db.prepare(`UPDATE person SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

router.delete('/archive/:id', (req, res) => {
  const id = req.params.id
  const exists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '人员不存在' })
  db.prepare('DELETE FROM person WHERE id = ?').run(id)
  res.json({ ok: true })
})

router.get('/status', (_, res) => {
  const list = db.prepare('SELECT status, COUNT(*) as count FROM person GROUP BY status').all()
  const map = {}
  PERSON_STATUS_LIST.forEach(s => { map[s] = 0 })
  list.forEach(r => { map[r.status] = r.count })
  res.json({ list: PERSON_STATUS_LIST.map(s => ({ status: s, count: map[s] ?? 0 })) })
})

router.post('/status/batch', (req, res) => {
  const { ids, status } = req.body || {}
  if (!Array.isArray(ids) || ids.length === 0 || !status) return res.status(400).json({ message: 'ids 数组和 status 必填' })
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`UPDATE person SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(status, ...ids)
  const onSite = status === '已进场' ? 1 : status === '已离场' ? 0 : null
  if (onSite !== null) db.prepare(`UPDATE person SET on_site = ? WHERE id IN (${placeholders})`).run(onSite, ...ids)
  res.json({ ok: true })
})

/** 认证管理列表：人员身份证/手机/签名补全状态，支持按已补全筛选 */
router.get('/auth', (req, res) => {
  const { filled, page = 1, pageSize = 20 } = req.query
  const { limit, offset } = parsePagination(req.query)
  const where = []
  const params = []
  if (filled === '1') { where.push("TRIM(COALESCE(p.id_card,'')) != '' AND TRIM(COALESCE(p.mobile,'')) != ''"); }
  if (filled === '0') { where.push("(TRIM(COALESCE(p.id_card,'')) = '' OR TRIM(COALESCE(p.mobile,'')) = '')"); }
  const whereStr = where.length ? ' AND ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM person p WHERE 1=1' + whereStr).get(...params).n
  const list = db.prepare(`
    SELECT p.id, p.work_no, p.name, p.id_card, p.mobile, p.status, p.updated_at, p.auth_review_status, o.name as org_name
    FROM person p LEFT JOIN org o ON p.org_id = o.id
    WHERE 1=1 ${whereStr}
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  const withFlags = list.map((r) => ({
    ...r,
    id_filled: !!(r.id_card && String(r.id_card).trim()),
    mobile_filled: !!(r.mobile && String(r.mobile).trim()),
    filled: !!(r.id_card && String(r.id_card).trim() && r.mobile && String(r.mobile).trim()),
  }))
  res.json({ list: withFlags, total, page: Math.max(1, parseInt(page) || 1), pageSize: Math.min(100, Math.max(1, parseInt(pageSize) || 20)) })
})

/** 人工审核：通过/驳回（认证管理） */
router.put('/:id/auth-review', (req, res) => {
  const { status } = req.body || {}
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ message: 'status 须为 approved 或 rejected' })
  }
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ message: '无效 id' })
  const exists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '人员不存在' })
  db.prepare("UPDATE person SET auth_review_status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  res.json({ ok: true, auth_review_status: status })
})

/**
 * 人脸核验接口
 * 支持两种模式：
 * 1. 实人认证模式：提供姓名和身份证号进行完整认证流程
 * 2. 人脸比对模式：提供两张图片进行1:1比对
 * 3. 活体检测模式：提供图片进行活体检测
 */
router.post('/face-verify', faceVerifyRateLimit, async (req, res) => {
  try {
    const { 
      mode = 'living', // 'living' | 'compare' | 'full'
      image, 
      person_id,
      cert_name,
      cert_no,
      target_image,
      meta_info
    } = req.body || {}

    // 参数校验
    if (mode === 'living' && !image) {
      return res.status(400).json({ message: '活体检测模式需要提供 image' })
    }

    if (mode === 'compare' && (!image || !target_image)) {
      return res.status(400).json({ message: '人脸比对模式需要提供 image 和 target_image' })
    }

    if (mode === 'full' && (!cert_name || !cert_no)) {
      return res.status(400).json({ message: '实人认证模式需要提供 cert_name 和 cert_no' })
    }

    let result

    switch (mode) {
      case 'living':
        // 活体检测
        result = await faceVerifyService.detectLivingFace({ image })
        break

      case 'compare':
        // 人脸比对
        result = await faceVerifyService.compareFaces({ 
          sourceImage: image, 
          targetImage: target_image 
        })
        break

      case 'full':
        // 完整实人认证流程
        if (!meta_info) {
          return res.status(400).json({ message: '实人认证需要提供 meta_info（设备环境信息）' })
        }

        // 1. 发起认证
        const initResult = await faceVerifyService.initiateVerify({
          certName: cert_name,
          certNo: cert_no,
          metaInfo: meta_info
        })

        // 2. 查询认证结果（实际场景中应该由前端完成认证后回调查询）
        result = await faceVerifyService.describeVerifyResult(initResult.certifyId)
        
        // 3. 如果认证通过，更新人员状态
        if (result.passed && person_id) {
          db.prepare(`
            UPDATE person 
            SET face_verified = 1, 
                face_verified_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
          `).run(person_id)
        }
        break

      default:
        return res.status(400).json({ message: '不支持的认证模式' })
    }

    res.json({
      ok: result.passed,
      passed: result.passed,
      message: result.passed ? '核验通过' : (result.reason || '核验未通过'),
      details: result
    })

  } catch (error) {
    console.error('人脸验证失败:', error)
    res.status(500).json({ 
      ok: false, 
      message: '人脸验证服务异常',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 查询人脸认证结果
 */
router.get('/:id/face-verify-status', (req, res) => {
  const personId = parseInt(req.params.id, 10)
  if (!personId) {
    return res.status(400).json({ message: '无效的人员ID' })
  }

  const person = db.prepare(`
    SELECT id, name, face_verified, face_verified_at 
    FROM person 
    WHERE id = ?
  `).get(personId)

  if (!person) {
    return res.status(404).json({ message: '人员不存在' })
  }

  res.json({
    person_id: person.id,
    name: person.name,
    face_verified: !!person.face_verified,
    face_verified_at: person.face_verified_at
  })
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM person WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: '不存在' })
  res.json(row)
})

export default router
