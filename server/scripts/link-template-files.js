/**
 * 将项目根目录下的三份合同模板 docx 复制到 server/uploads/templates 并写入 contract_template.file_path
 * 运行：cd server && node scripts/link-template-files.js
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { db, initDb } from '../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.join(__dirname, '..')
const projectRoot = path.join(serverRoot, '..')
const uploadDir = path.join(serverRoot, 'uploads', 'templates')

const mapping = [
  { sourceName: '安全责任书.docx', templateName: '安全责任书', filePath: 'uploads/templates/安全责任书.docx' },
  { sourceName: '短期项目协议.docx', templateName: '短期项目协议', filePath: 'uploads/templates/短期项目协议.docx' },
  { sourceName: '劳务用工合同(标准版).docx', templateName: '劳务用工合同（标准版）', filePath: 'uploads/templates/劳务用工合同(标准版).docx' },
]

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

initDb()

for (const { sourceName, templateName, filePath } of mapping) {
  const src = path.join(projectRoot, sourceName)
  const dest = path.join(serverRoot, filePath)
  if (!fs.existsSync(src)) {
    console.warn('跳过（文件不存在）:', sourceName)
    continue
  }
  fs.copyFileSync(src, dest)
  console.log('已复制:', sourceName, '->', filePath)
  const r = db.prepare('UPDATE contract_template SET file_path = ? WHERE name = ?').run(filePath, templateName)
  if (r.changes > 0) {
    console.log('已关联模板:', templateName)
  } else {
    console.warn('未找到对应模板记录:', templateName)
  }
}

console.log('完成.')
