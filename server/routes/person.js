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
import multer from 'multer'
import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.join(__dirname, '..')

// 配置文件上传
const upload = multer({ dest: path.join(SERVER_ROOT, 'uploads') })

const router = Router()

router.get('/archive', (req, res) => {
  const { status, org_id, on_site, filled, contract_signed, keyword, job_title } = req.query
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
  if (job_title) { where.push('p.job_title = ?'); params.push(job_title) }
  const kw = typeof keyword === 'string' ? keyword.trim() : ''
  if (kw) {
    where.push('(p.name LIKE ? OR p.work_no LIKE ? OR o.name LIKE ?)')
    const like = '%' + kw + '%'
    params.push(like, like, like)
  }
  const whereStr = where.length ? ' AND ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE 1=1' + whereStr).get(...params).n
  const list = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE 1=1' + whereStr + ' ORDER BY p.id DESC LIMIT ? OFFSET ?').all(...params, limit, offset)

  const maskedList = list.map(person => ({
    ...person,
    id_card: person.id_card ? safeDecryptThenMask(person.id_card, 'idCard') : person.id_card,
    mobile: person.mobile ? safeDecryptThenMask(person.mobile, 'mobile') : person.mobile,
    bank_card: person.bank_card ? safeDecryptThenMask(person.bank_card, 'bankCard') : person.bank_card
  }))

  res.json({ list: maskedList, total: Number(total), page, pageSize })
})

router.get('/archive/:id', (req, res) => {
  const row = db.prepare('SELECT p.*, o.name as org_name FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE p.id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: '不存在' })
  res.json(row)
})

router.post('/archive', (req, res) => {
  const { org_id, work_no, name, id_card, mobile, bank_card, status = '预注册', job_title } = req.body || {}
  if (!name) return res.status(400).json({ message: '姓名必填' })

  // 加密敏感数据
  const encryptedIdCard = id_card ? encrypt(id_card) : null
  const encryptedMobile = mobile ? encrypt(mobile) : null
  const encryptedBankCard = bank_card ? encrypt(bank_card) : null

  const r = db.prepare(`
    INSERT INTO person (org_id, work_no, name, id_card, mobile, bank_card, status, job_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(org_id ?? null, work_no ?? null, name, encryptedIdCard, encryptedMobile, encryptedBankCard, status, job_title ?? null)
  res.json({ id: r.lastInsertRowid })
})

router.put('/archive/:id', (req, res) => {
  const { id } = req.params
  const exists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!exists) return res.status(404).json({ message: '人员不存在' })
  const { org_id, work_no, name, id_card, mobile, bank_card, status, job_title, work_address, signature_image } = req.body || {}
  const updates = ['updated_at = datetime(\'now\')']
  const values = []
  if (org_id !== undefined) { updates.push('org_id = ?'); values.push(org_id) }
  if (work_no !== undefined) { updates.push('work_no = ?'); values.push(work_no) }
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (id_card !== undefined) { updates.push('id_card = ?'); values.push(id_card ? encrypt(id_card) : null) }
  if (mobile !== undefined) { updates.push('mobile = ?'); values.push(mobile ? encrypt(mobile) : null) }
  if (bank_card !== undefined) { updates.push('bank_card = ?'); values.push(bank_card ? encrypt(bank_card) : null) }
  if (status !== undefined) { updates.push('status = ?'); values.push(status) }
  if (job_title !== undefined) { updates.push('job_title = ?'); values.push(job_title) }
  if (work_address !== undefined) { updates.push('work_address = ?'); values.push(work_address) }
  if (signature_image !== undefined) { updates.push('signature_image = ?'); values.push(signature_image) }
  if (values.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(id)
  db.prepare(`UPDATE person SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

/**
 * H5 激活信息补全（身份证、手机号、手写签名）
 * - 仅允许当前登录工人（workerId）更新自己的记录
 */
router.post('/me/activation', (req, res) => {
  const workerId = req.user?.workerId
  if (!workerId) return res.status(401).json({ message: '请以工人身份登录' })
  const { id_card, mobile, signature_image } = req.body || {}
  const exists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(workerId)
  if (!exists) return res.status(404).json({ message: '人员不存在' })

  const updates = ["updated_at = datetime('now')"]
  const values = []
  if (id_card !== undefined) { updates.push('id_card = ?'); values.push(id_card ? encrypt(String(id_card)) : null) }
  if (mobile !== undefined) { updates.push('mobile = ?'); values.push(mobile ? encrypt(String(mobile)) : null) }
  if (signature_image !== undefined) {
    let storedPath = null

    // 显式传入 null / 空字符串，视为清空签名
    if (signature_image === null || signature_image === '') {
      storedPath = null
    } else {
      const sig = String(signature_image)
      // dataURL -> 文件
      if (sig.startsWith('data:image')) {
        const commaIndex = sig.indexOf(',')
        if (commaIndex > 0) {
          const base64 = sig.slice(commaIndex + 1)
          try {
            const buffer = Buffer.from(base64, 'base64')
            const dir = path.join(SERVER_ROOT, 'uploads', 'signatures')
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            const filename = `person_${workerId}_${Date.now()}.png`
            const absPath = path.join(dir, filename)
            fs.writeFileSync(absPath, buffer)
            storedPath = path.relative(SERVER_ROOT, absPath)
          } catch (e) {
            console.error('保存签名图片失败:', e)
            storedPath = null
          }
        }
      } else {
        // 已是相对路径或其他字符串，直接存库，方便后续迁移
        storedPath = sig
      }
    }

    updates.push('signature_image = ?')
    values.push(storedPath)
  }
  if (values.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(workerId)
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

/** 工种列表：从人员表中提取非空工种，供前端筛选使用 */
router.get('/job-titles', (_, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT job_title 
    FROM person 
    WHERE TRIM(COALESCE(job_title, '')) != ''
    ORDER BY job_title
  `).all()
  const list = rows.map((r) => r.job_title)
  res.json({ list })
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

/** 解密并脱敏（与 archive 一致：历史明文则直接脱敏） */
function safeDecryptThenMask(value, type) {
  if (!value) return value
  try {
    const decrypted = decrypt(value)
    return maskSensitiveData(decrypted, type)
  } catch {
    return maskSensitiveData(String(value), type)
  }
}

/** 认证管理列表：人员身份证/手机/签名补全状态，支持按已补全及组织/工种等筛选；与人员档案同源 person 表，敏感字段脱敏一致 */
router.get('/auth', (req, res) => {
  const { filled, page = 1, pageSize = 20, keyword, org_id, status, job_title } = req.query
  const { limit, offset } = parsePagination(req.query)
  const where = []
  const params = []
  if (filled === '1') { where.push("TRIM(COALESCE(p.id_card,'')) != '' AND TRIM(COALESCE(p.mobile,'')) != ''"); }
  if (filled === '0') { where.push("(TRIM(COALESCE(p.id_card,'')) = '' OR TRIM(COALESCE(p.mobile,'')) = '')"); }
  if (status) { where.push('p.status = ?'); params.push(status) }
  if (org_id) { where.push('p.org_id = ?'); params.push(org_id) }
  if (job_title) { where.push('p.job_title = ?'); params.push(job_title) }
  const kw = typeof keyword === 'string' ? keyword.trim() : ''
  if (kw) {
    where.push('(p.name LIKE ? OR p.work_no LIKE ? OR o.name LIKE ?)')
    const like = '%' + kw + '%'
    params.push(like, like, like)
  }
  const whereStr = where.length ? ' AND ' + where.join(' AND ') : ''
  const total = db.prepare('SELECT COUNT(*) as n FROM person p LEFT JOIN org o ON p.org_id = o.id WHERE 1=1' + whereStr).get(...params).n
  const list = db.prepare(`
    SELECT p.id, p.work_no, p.name, p.id_card, p.mobile, p.status, p.updated_at, p.auth_review_status, p.face_verified, p.face_verified_at, o.name as org_name
    FROM person p LEFT JOIN org o ON p.org_id = o.id
    WHERE 1=1 ${whereStr}
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  const withFlags = list.map((r) => {
    const idFilled = !!(r.id_card && String(r.id_card).trim())
    const mobileFilled = !!(r.mobile && String(r.mobile).trim())
    return {
      ...r,
      id_card: r.id_card ? safeDecryptThenMask(r.id_card, 'idCard') : r.id_card,
      mobile: r.mobile ? safeDecryptThenMask(r.mobile, 'mobile') : r.mobile,
      id_filled: idFilled,
      mobile_filled: mobileFilled,
      filled: idFilled && mobileFilled,
      face_verified: !!r.face_verified,
    }
  })
  res.json({ list: withFlags, total: Number(total), page: Math.max(1, parseInt(page) || 1), pageSize: Math.min(100, Math.max(1, parseInt(pageSize) || 20)) })
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
        // 活体检测（阿里云等，配置 ALIYUN_ACCESS_KEY_* 后生效）
        result = await faceVerifyService.detectLivingFace({ image })
        if (result.passed && person_id) {
          db.prepare(`
            UPDATE person SET face_verified = 1, face_verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
          `).run(person_id)
        }
        break

      case 'compare':
        // 人脸比对
        result = await faceVerifyService.compareFaces({ 
          sourceImage: image, 
          targetImage: target_image 
        })
        if (result.passed && person_id) {
          db.prepare(`
            UPDATE person SET face_verified = 1, face_verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
          `).run(person_id)
        }
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

/**
 * 批量导入人员信息
 * 支持Excel文件上传，解析后批量插入
 */
router.post('/batch-import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传文件' })
    }

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    // 清理临时文件
    fs.unlinkSync(req.file.path)

    if (!data || data.length === 0) {
      return res.status(400).json({ message: '文件无数据' })
    }

    // 验证数据
    const errors = []
    const validData = []

    data.forEach((item, index) => {
      const rowErrors = []
      
      // 验证必填字段
      let name = item.name || item['姓名'] || ''
      if (String(name).trim() === '') {
        rowErrors.push('姓名不能为空')
      }

      // 验证手机号（如果提供）
      let mobile = item.mobile || item['手机号'] || item['电话'] || ''
      if (mobile && !/^1[3-9]\d{9}$/.test(String(mobile).trim())) {
        rowErrors.push('手机号格式不正确')
      }

      // 验证身份证号（如果提供）
      let id_card = item.id_card || item['身份证号'] || item['身份证'] || ''
      if (id_card && !/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/.test(String(id_card).trim())) {
        rowErrors.push('身份证号格式不正确')
      }

      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors })
      } else {
        validData.push({
          org_id: item.org_id || item['组织ID'] || item['所属组织'] || null,
          work_no: item.work_no || item['工号'] || null,
          name: String(name).trim(),
          id_card: id_card ? encrypt(String(id_card).trim()) : null,
          mobile: mobile ? encrypt(String(mobile).trim()) : null,
          bank_card: item.bank_card || item['银行卡号'] || null,
          status: item.status || item['状态'] || '预注册',
          job_title: item.job_title || item['工种'] || item['job_type'] || null // 工种信息
        })
      }
    })

    if (errors.length > 0) {
      return res.status(400).json({ message: '数据验证失败', errors })
    }

    // 批量插入数据
    const insertStmt = db.prepare(`
      INSERT INTO person (org_id, work_no, name, id_card, mobile, bank_card, status, job_title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)

    const transaction = db.transaction((data) => {
      for (const item of data) {
        insertStmt.run(
          item.org_id,
          item.work_no,
          item.name,
          item.id_card,
          item.mobile,
          item.bank_card,
          item.status,
          item.job_title
        )
      }
    })

    transaction(validData)

    res.json({ 
      ok: true, 
      message: `成功导入 ${validData.length} 条数据`,
      imported: validData.length,
      total: data.length
    })

  } catch (error) {
    console.error('批量导入失败:', error)
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    res.status(500).json({ 
      message: '导入失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 下载导入模板
 */
router.get('/import-template', (req, res) => {
  try {
    // 创建模板数据
    const templateData = [
      {
        name: '姓名',
        work_no: '工号',
        id_card: '身份证号',
        mobile: '手机号',
        org_id: '组织ID',
        status: '状态',
        job_type: '工种'
      },
      {
        name: '张三',
        work_no: 'W001',
        id_card: '110101199001011234',
        mobile: '13800138000',
        org_id: '1',
        status: '预注册',
        job_type: '瓦工'
      }
    ]

    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    XLSX.utils.book_append_sheet(workbook, worksheet, '人员信息')

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=人员信息导入模板.xlsx')

    res.send(buffer)

  } catch (error) {
    console.error('下载模板失败:', error)
    res.status(500).json({ message: '下载模板失败' })
  }
})

// 证书管理接口
router.get('/archive/:id/certificates', (req, res) => {
  const { id } = req.params
  const personExists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!personExists) return res.status(404).json({ message: '人员不存在' })
  const list = db.prepare(
    'SELECT id, name, certificate_no, issue_date, expiry_date, status FROM person_certificate WHERE person_id = ? ORDER BY expiry_date DESC'
  ).all(id)
  res.json({ list })
})

router.post('/archive/:id/certificates', (req, res) => {
  const { id } = req.params
  const personExists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!personExists) return res.status(404).json({ message: '人员不存在' })
  const { name, certificate_no, issue_date, expiry_date, status = 'valid' } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name 必填' })
  const r = db.prepare(
    'INSERT INTO person_certificate (person_id, name, certificate_no, issue_date, expiry_date, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, certificate_no || null, issue_date || null, expiry_date || null, status)
  res.json({ id: r.lastInsertRowid })
})

router.put('/archive/:id/certificates/:certId', (req, res) => {
  const { id, certId } = req.params
  const personExists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!personExists) return res.status(404).json({ message: '人员不存在' })
  const certExists = db.prepare('SELECT 1 FROM person_certificate WHERE id = ? AND person_id = ?').get(certId, id)
  if (!certExists) return res.status(404).json({ message: '证书不存在' })
  const { name, certificate_no, issue_date, expiry_date, status } = req.body || {}
  const updates = []
  const values = []
  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (certificate_no !== undefined) { updates.push('certificate_no = ?'); values.push(certificate_no) }
  if (issue_date !== undefined) { updates.push('issue_date = ?'); values.push(issue_date) }
  if (expiry_date !== undefined) { updates.push('expiry_date = ?'); values.push(expiry_date) }
  if (status !== undefined) { updates.push('status = ?'); values.push(status) }
  if (updates.length === 0) return res.status(400).json({ message: '无有效字段' })
  values.push(certId)
  db.prepare(`UPDATE person_certificate SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

router.delete('/archive/:id/certificates/:certId', (req, res) => {
  const { id, certId } = req.params
  const personExists = db.prepare('SELECT 1 FROM person WHERE id = ?').get(id)
  if (!personExists) return res.status(404).json({ message: '人员不存在' })
  const certExists = db.prepare('SELECT 1 FROM person_certificate WHERE id = ? AND person_id = ?').get(certId, id)
  if (!certExists) return res.status(404).json({ message: '证书不存在' })
  db.prepare('DELETE FROM person_certificate WHERE id = ?').run(certId)
  res.json({ ok: true })
})

export default router
