/**
 * 合同相关接口（非开发可读：模板、发起签约、查看进度、归档、工人端待签与签署）
 */
import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { db } from '../db/index.js'
import { err } from '../lib/response.js'
import { requireNonEmptyString, requirePositiveIntArray } from '../lib/validate.js'
import esignService from '../lib/esign.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()
const uploadDir = path.join(__dirname, '..', 'uploads', 'templates')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, Date.now() + '_' + (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')),
  }),
})

router.get('/template', (_, res) => {
  const list = db.prepare('SELECT id, name, file_path, version, is_visual, created_at FROM contract_template ORDER BY id DESC').all()
  res.json({ list })
})

router.get('/template/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ message: '无效 id' })
  
  const template = db.prepare('SELECT * FROM contract_template WHERE id = ?').get(id)
  if (!template) return res.status(404).json({ message: '模板不存在' })
  
  // 获取模板变量
  const variables = db.prepare('SELECT * FROM template_variable WHERE template_id = ?').all(id)
  template.variables = variables
  
  res.json(template)
})

router.post('/template', (req, res) => {
  const { name, file_path, content, variables = [] } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name 必填' })
  
  // 开始事务
  db.transaction(() => {
    const r = db.prepare('INSERT INTO contract_template (name, file_path, content, is_visual) VALUES (?, ?, ?, ?)').run(name, file_path || null, content || null, content ? 1 : 0)
    const templateId = r.lastInsertRowid
    
    // 插入变量
    if (variables.length > 0) {
      const ins = db.prepare('INSERT INTO template_variable (template_id, name, label, type, options, required) VALUES (?, ?, ?, ?, ?, ?)')
      variables.forEach(v => {
        ins.run(templateId, v.name, v.label, v.type || 'text', JSON.stringify(v.options || []), v.required ? 1 : 0)
      })
    }
    
    res.json({ id: templateId })
  })()
})

router.put('/template/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  const { name, file_path, content, variables = [] } = req.body || {}
  
  if (!id || !name) return res.status(400).json({ message: '参数无效' })
  
  // 开始事务
  db.transaction(() => {
    // 更新模板
    db.prepare('UPDATE contract_template SET name = ?, file_path = ?, content = ?, is_visual = ? WHERE id = ?').run(name, file_path || null, content || null, content ? 1 : 0, id)
    
    // 删除旧变量
    db.prepare('DELETE FROM template_variable WHERE template_id = ?').run(id)
    
    // 插入新变量
    if (variables.length > 0) {
      const ins = db.prepare('INSERT INTO template_variable (template_id, name, label, type, options, required) VALUES (?, ?, ?, ?, ?, ?)')
      variables.forEach(v => {
        ins.run(id, v.name, v.label, v.type || 'text', JSON.stringify(v.options || []), v.required ? 1 : 0)
      })
    }
    
    res.json({ id })
  })()
})

router.post('/template/:id/render', (req, res) => {
  const id = parseInt(req.params.id, 10)
  const data = req.body
  
  if (!id) return res.status(400).json({ message: '无效 id' })
  
  const template = db.prepare('SELECT content FROM contract_template WHERE id = ?').get(id)
  if (!template) return res.status(404).json({ message: '模板不存在' })
  
  // 替换变量
  let renderedContent = template.content
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    renderedContent = renderedContent.replace(regex, data[key])
  })
  
  res.json({ content: renderedContent })
})

router.post('/template/upload', upload.single('file'), (req, res) => {
  const name = (req.body && req.body.name && String(req.body.name).trim()) || req.file?.originalname || '未命名模板'
  const file_path = req.file ? path.relative(path.join(__dirname, '..'), req.file.path) : null
  const r = db.prepare('INSERT INTO contract_template (name, file_path) VALUES (?, ?)').run(name, file_path)
  res.json({ id: r.lastInsertRowid })
})

/** 模板文件下载/预览：有 file_path 时返回文件流，需登录 */
router.get('/template/:id/file', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ message: '无效 id' })
  const row = db.prepare('SELECT file_path FROM contract_template WHERE id = ?').get(id)
  if (!row || !row.file_path) return res.status(404).json({ message: '模板无文件' })
  const serverRoot = path.join(__dirname, '..')
  const absPath = path.resolve(serverRoot, row.file_path)
  const templatesDir = path.resolve(serverRoot, 'uploads', 'templates')
  if (!absPath.startsWith(templatesDir) || !fs.existsSync(absPath)) return res.status(404).json({ message: '文件不存在' })
  const name = path.basename(absPath)
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.sendFile(absPath)
})

router.get('/status', (req, res) => {
  const { page = 1, pageSize = 20, status } = req.query
  const where = status ? ' WHERE ci.status = ?' : ''
  const params = status ? [status] : []
  const total = db.prepare('SELECT COUNT(*) as n FROM contract_instance ci' + where).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT ci.*, p.name as person_name, p.work_no
    FROM contract_instance ci
    JOIN person p ON ci.person_id = p.id
    ${where}
    ORDER BY ci.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total })
})

router.post('/launch', async (req, res) => {
  const { template_id, title, person_ids, deadline } = req.body || {}
  const t = requireNonEmptyString(title, 'title')
  if (!t.ok) return err(res, 400, t.message)
  const p = requirePositiveIntArray(person_ids, 'person_ids')
  if (!p.ok) return err(res, 400, p.message)

  try {
    const insert = db.prepare('INSERT INTO contract_instance (template_id, title, person_id, status, deadline, flow_id) VALUES (?, ?, ?, \'待签署\', ?, ?)')
    const notifInsert = db.prepare('INSERT INTO notification (person_id, type, title, body) VALUES (?, ?, ?, ?)')

    for (const pid of p.value) {
      // 获取人员信息
      const person = db.prepare('SELECT id, name, mobile, id_card FROM person WHERE id = ?').get(pid)
      if (!person) {
        console.warn(`人员不存在: ${pid}`)
        continue
      }

      let flowId = null

      // 如果有模板，使用e签宝创建签署流程
      if (template_id) {
        try {
          const template = db.prepare('SELECT * FROM contract_template WHERE id = ?').get(template_id)
          if (template && template.file_path) {
            // 上传模板文件到e签宝
            const templatePath = path.resolve(__dirname, '..', template.file_path)
            if (fs.existsSync(templatePath)) {
              const fileInfo = await esignService.uploadContractFile(templatePath)
              
              // 创建签署流程
              const flowResult = await esignService.createSignFlowByFile({
                title: title,
                fileId: fileInfo.fileId,
                signers: [{
                  type: 'PERSON',
                  name: person.name,
                  mobile: person.mobile || '',
                  idCard: person.id_card || ''
                }],
                deadline: deadline || null
              })

              flowId = flowResult.flowId
            }
          }
        } catch (esignError) {
          console.error('e签宝创建签署流程失败:', esignError)
          // 失败时继续创建本地记录，但不关联flowId
        }
      }

      // 创建合同实例记录
      insert.run(template_id ?? null, title, pid, deadline || null, flowId)
      notifInsert.run(pid, '合同待签', title, deadline ? `截止：${deadline}` : null)
    }

    res.json({ ok: true, count: p.value.length })
  } catch (error) {
    console.error('合同发起失败:', error)
    err(res, 500, '合同发起失败')
  }
})

router.get('/archive', (req, res) => {
  const { page = 1, pageSize = 20, person_id, org_id, title, date_from, date_to } = req.query
  const where = ["ci.status = '已签署'"]
  const params = []
  if (person_id) { where.push('ci.person_id = ?'); params.push(person_id) }
  if (org_id) { where.push('p.org_id = ?'); params.push(org_id) }
  if (title) { where.push('ci.title LIKE ?'); params.push('%' + title + '%') }
  if (date_from) { where.push('date(ci.signed_at) >= ?'); params.push(date_from) }
  if (date_to) { where.push('date(ci.signed_at) <= ?'); params.push(date_to) }
  const whereStr = ' WHERE ' + where.join(' AND ')
  const total = db.prepare('SELECT COUNT(*) as n FROM contract_instance ci JOIN person p ON ci.person_id = p.id' + whereStr).get(...params).n
  const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
  const offset = (Math.max(1, parseInt(page)) - 1) * limit
  const list = db.prepare(`
    SELECT ci.*, p.name as person_name, p.work_no, p.org_id as person_org_id, o.name as org_name
    FROM contract_instance ci
    JOIN person p ON ci.person_id = p.id
    LEFT JOIN org o ON p.org_id = o.id
    ${whereStr}
    ORDER BY ci.signed_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
  res.json({ list, total })
})

router.get('/my-pending', (req, res) => {
  const person_id = req.query.person_id || req.user?.workerId
  if (!person_id) return res.status(400).json({ message: 'person_id 必填或请登录' })
  const list = db.prepare(`
    SELECT ci.* FROM contract_instance ci
    WHERE ci.person_id = ? AND ci.status = '待签署'
    ORDER BY ci.id DESC
  `).all(person_id)
  res.json({ list })
})

router.get('/my-signed', (req, res) => {
  const person_id = req.query.person_id || req.user?.workerId
  if (!person_id) return res.status(400).json({ message: 'person_id 必填或请登录' })
  const list = db.prepare(`
    SELECT ci.id, ci.title, ci.signed_at, ci.status, ci.deadline, ci.sign_image_snapshot,
           p.signature_image as person_signature_image
    FROM contract_instance ci
    JOIN person p ON ci.person_id = p.id
    WHERE ci.person_id = ? AND ci.status = '已签署'
    ORDER BY ci.signed_at DESC
  `).all(person_id)
  res.json({ list })
})

router.post('/sign/:id', async (req, res) => {
  const { id } = req.params
  const person_id = req.body?.person_id ?? req.user?.workerId
  const row = db.prepare('SELECT * FROM contract_instance WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (row.status !== '待签署') return res.status(400).json({ message: '合同已签署或已作废' })
  const pid = person_id != null ? parseInt(person_id, 10) : null
  if (pid != null && row.person_id !== pid) return res.status(403).json({ message: '无权签署' })

  try {
    // 如果有flow_id，查询e签宝签署状态
    if (row.flow_id) {
      try {
        const flowStatus = await esignService.getSignFlowStatus(row.flow_id)
        
        // 如果e签宝已完成签署，下载PDF
        if (flowStatus.status === 'COMPLETED') {
          const pdfDir = path.join(__dirname, '..', 'uploads', 'contracts')
          if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
          
          const pdfPath = path.join(pdfDir, `contract_${id}.pdf`)
          await esignService.downloadSignedPdf(row.flow_id, pdfPath)
          
          // 更新数据库记录
          db.prepare(`
            UPDATE contract_instance 
            SET status = '已签署', 
                signed_at = datetime('now'),
                pdf_path = ?
            WHERE id = ?
          `).run(path.relative(path.join(__dirname, '..'), pdfPath), id)
        } else {
          // e签宝未完成，只更新本地状态
          db.prepare("UPDATE contract_instance SET status = '已签署', signed_at = datetime('now') WHERE id = ?").run(id)
        }
      } catch (esignError) {
        console.error('e签宝查询失败:', esignError)
        // e签宝查询失败，只更新本地状态
        db.prepare("UPDATE contract_instance SET status = '已签署', signed_at = datetime('now') WHERE id = ?").run(id)
      }
    } else {
      // 没有flow_id，只更新本地状态
      db.prepare("UPDATE contract_instance SET status = '已签署', signed_at = datetime('now') WHERE id = ?").run(id)
    }

    // 更新人员合同签署状态
    db.prepare('UPDATE person SET contract_signed = 1 WHERE id = ?').run(row.person_id)

    // 写入签名快照：从 person.signature_image 复制一份到合同专用目录
    try {
      const person = db.prepare('SELECT signature_image FROM person WHERE id = ?').get(row.person_id)
      const sigPath = person?.signature_image && String(person.signature_image).trim()
      if (sigPath && !String(sigPath).startsWith('data:image')) {
        const serverRoot = path.join(__dirname, '..')
        const srcAbs = path.resolve(serverRoot, sigPath)
        if (fs.existsSync(srcAbs)) {
          const snapDir = path.join(serverRoot, 'uploads', 'signatures', 'contracts')
          if (!fs.existsSync(snapDir)) fs.mkdirSync(snapDir, { recursive: true })
          const filename = `contract_${id}_person_${row.person_id}.png`
          const dstAbs = path.join(snapDir, filename)
          fs.copyFileSync(srcAbs, dstAbs)
          const rel = path.relative(serverRoot, dstAbs)
          db.prepare('UPDATE contract_instance SET sign_image_snapshot = ? WHERE id = ?').run(rel, id)
        }
      }
    } catch (e) {
      console.error('保存合同签名快照失败:', e)
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('合同签署失败:', error)
    err(res, 500, '合同签署失败')
  }
})

router.put('/:id/invalidate', (req, res) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM contract_instance WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (row.status !== '已签署') return res.status(400).json({ message: '仅已签署合同可作废' })
  db.prepare("UPDATE contract_instance SET status = '已作废' WHERE id = ?").run(id)
  res.json({ ok: true })
})

router.get('/:id/pdf', async (req, res) => {
  const row = db.prepare('SELECT person_id, pdf_path, flow_id, status FROM contract_instance WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (req.user?.workerId && row.person_id !== req.user.workerId) return err(res, 403, '无权查看该合同')
  
  try {
    // 如果有flow_id且状态为已签署，尝试从e签宝下载PDF
    if (row.flow_id && row.status === '已签署') {
      try {
        const pdfDir = path.join(__dirname, '..', 'uploads', 'contracts')
        if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
        
        const pdfPath = path.join(pdfDir, `contract_${req.params.id}.pdf`)
        
        // 如果本地没有PDF，从e签宝下载
        if (!fs.existsSync(pdfPath)) {
          await esignService.downloadSignedPdf(row.flow_id, pdfPath)
          
          // 更新数据库记录
          db.prepare('UPDATE contract_instance SET pdf_path = ? WHERE id = ?')
            .run(path.relative(path.join(__dirname, '..'), pdfPath), req.params.id)
        }
        
        return res.sendFile(pdfPath)
      } catch (esignError) {
        console.error('从e签宝下载PDF失败:', esignError)
        // 继续尝试本地PDF
      }
    }
    
    // 使用本地PDF
    if (!row.pdf_path) return res.status(404).json({ message: '暂无 PDF 文件', noFile: true })
    const full = path.resolve(__dirname, '..', row.pdf_path)
    if (!fs.existsSync(full)) return res.status(404).json({ message: '文件不存在', noFile: true })
    res.sendFile(full)
  } catch (error) {
    console.error('PDF下载失败:', error)
    err(res, 500, 'PDF下载失败')
  }
})
router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT 
      ci.*,
      p.name as person_name,
      p.work_no,
      p.signature_image as person_signature_image
    FROM contract_instance ci 
    JOIN person p ON ci.person_id = p.id
    WHERE ci.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ message: '不存在' })
  res.json(row)
})

/**
 * 获取合同存证信息
 */
router.get('/:id/evidence', async (req, res) => {
  const { id } = req.params
  const row = db.prepare('SELECT person_id, flow_id, status FROM contract_instance WHERE id = ?').get(id)
  
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (req.user?.workerId && row.person_id !== req.user.workerId) return err(res, 403, '无权查看该合同')
  if (row.status !== '已签署') return res.status(400).json({ message: '合同未签署，无存证信息' })
  
  try {
    // 如果有flow_id，从e签宝获取存证信息
    if (row.flow_id) {
      try {
        const evidence = await esignService.getEvidenceReport(row.flow_id)
        return res.json({
          ok: true,
          evidence: {
            type: 'e签宝',
            evidenceNo: evidence.evidenceNo,
            evidenceTime: evidence.evidenceTime,
            hash: evidence.hash,
            reportUrl: evidence.reportUrl
          }
        })
      } catch (esignError) {
        console.error('获取e签宝存证信息失败:', esignError)
        // 返回本地存证占位信息
      }
    }
    
    // 返回本地存证占位信息
    res.json({
      ok: true,
      evidence: {
        type: '本地存证',
        message: '电子签章服务对接后可获取完整存证信息',
        signedAt: row.signed_at
      }
    })
  } catch (error) {
    console.error('获取存证信息失败:', error)
    err(res, 500, '获取存证信息失败')
  }
})

/**
 * 获取签署链接（用于H5页面嵌入签署）
 */
router.get('/:id/sign-url', async (req, res) => {
  const { id } = req.params
  const person_id = req.query.person_id || req.user?.workerId
  
  const row = db.prepare('SELECT person_id, flow_id, status FROM contract_instance WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ message: '合同不存在' })
  if (row.person_id !== parseInt(person_id)) return err(res, 403, '无权签署该合同')
  if (row.status !== '待签署') return res.status(400).json({ message: '合同已签署或已作废' })
  
  try {
    // 如果有flow_id，从e签宝获取签署链接
    if (row.flow_id) {
      try {
        // 获取签署人ID（这里简化处理，实际应该查询签署流程详情）
        const signUrlResult = await esignService.getSignUrl(row.flow_id, 'signer_1')
        return res.json({
          ok: true,
          signUrl: signUrlResult.signUrl,
          expireTime: signUrlResult.expireTime
        })
      } catch (esignError) {
        console.error('获取e签宝签署链接失败:', esignError)
      }
    }
    
    // 返回本地签署流程
    res.json({
      ok: true,
      local: true,
      message: '使用本地签署流程'
    })
  } catch (error) {
    console.error('获取签署链接失败:', error)
    err(res, 500, '获取签署链接失败')
  }
})

export default router
