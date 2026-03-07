/**
 * 敏感数据加密模块
 * 提供身份证、手机号等敏感信息的加密存储和解密读取
 */

import crypto from 'crypto'

// 加密配置
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// 从环境变量获取密钥，如果没有则生成一个（仅开发环境）
const MASTER_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

/**
 * 生成加密密钥
 */
function getKey() {
  return crypto.scryptSync(MASTER_KEY, 'salt', KEY_LENGTH)
}

/**
 * 加密敏感数据
 * @param {string} text 明文
 * @returns {string} 密文（base64格式）
 */
export function encrypt(text) {
  if (!text) return text
  
  try {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(String(text), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // 组合: iv + authTag + encrypted
    const result = iv.toString('hex') + authTag.toString('hex') + encrypted
    return Buffer.from(result, 'hex').toString('base64')
  } catch (error) {
    console.error('[加密] 失败:', error)
    throw new Error('加密失败')
  }
}

/**
 * 解密敏感数据
 * @param {string} encryptedData 密文（base64格式）
 * @returns {string} 明文
 */
export function decrypt(encryptedData) {
  if (!encryptedData) return encryptedData
  
  try {
    const key = getKey()
    const hexData = Buffer.from(encryptedData, 'base64').toString('hex')
    
    // 分离: iv + authTag + encrypted
    const iv = Buffer.from(hexData.slice(0, IV_LENGTH * 2), 'hex')
    const authTag = Buffer.from(hexData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex')
    const encrypted = hexData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    if (process.env.DEBUG_CRYPTO) console.error('[解密] 失败:', error)
    throw new Error('解密失败')
  }
}

/**
 * 部分脱敏显示
 * @param {string} data 原始数据
 * @param {string} type 数据类型: idCard, mobile, name, bankCard
 * @returns {string} 脱敏后的数据
 */
export function maskSensitiveData(data, type) {
  if (!data) return data
  
  const str = String(data)
  
  switch (type) {
    case 'idCard':
      // 身份证号: 显示前3位和后4位
      if (str.length === 18) {
        return str.slice(0, 3) + '**********' + str.slice(-4)
      }
      return str.slice(0, 2) + '****' + str.slice(-2)
      
    case 'mobile':
      // 手机号: 显示前3位和后4位
      if (str.length === 11) {
        return str.slice(0, 3) + '****' + str.slice(-4)
      }
      return str
      
    case 'name':
      // 姓名: 只显示姓氏
      if (str.length <= 1) return str
      return str[0] + '*'.repeat(str.length - 1)
      
    case 'bankCard':
      // 银行卡: 显示后4位
      if (str.length > 4) {
        return '*'.repeat(str.length - 4) + str.slice(-4)
      }
      return str
      
    default:
      // 默认: 显示前2位和后2位
      if (str.length <= 4) return str
      return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2)
  }
}

/**
 * 批量加密对象中的敏感字段
 * @param {object} obj 数据对象
 * @param {Array<string>} fields 需要加密的字段名
 * @returns {object} 加密后的对象
 */
export function encryptFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj
  
  const result = { ...obj }
  fields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field])
      result[`${field}_encrypted`] = true
    }
  })
  
  return result
}

/**
 * 批量解密对象中的敏感字段
 * @param {object} obj 数据对象
 * @param {Array<string>} fields 需要解密的字段名
 * @param {boolean} masked 是否脱敏显示
 * @returns {object} 解密后的对象
 */
export function decryptFields(obj, fields, masked = false) {
  if (!obj || typeof obj !== 'object') return obj
  
  const result = { ...obj }
  fields.forEach(field => {
    if (result[field] && result[`${field}_encrypted`]) {
      try {
        const decrypted = decrypt(result[field])
        result[field] = masked ? maskSensitiveData(decrypted, field) : decrypted
        delete result[`${field}_encrypted`]
      } catch (error) {
        console.error(`[解密] 字段 ${field} 失败:`, error)
      }
    }
  })
  
  return result
}

/**
 * 生成安全的随机Token
 * @param {number} length 长度
 * @returns {string} 随机Token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * 计算数据哈希（用于完整性校验）
 * @param {string} data 数据
 * @returns {string} 哈希值
 */
export function hashData(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex')
}

/**
 * 安全比较（防止时序攻击）
 * @param {string} a 字符串a
 * @param {string} b 字符串b
 * @returns {boolean} 是否相等
 */
export function secureCompare(a, b) {
  try {
    return crypto.timingSafeEqual(Buffer.from(String(a)), Buffer.from(String(b)))
  } catch {
    return false
  }
}

// 需要加密的敏感字段列表
export const SENSITIVE_FIELDS = {
  person: ['id_card', 'mobile', 'bank_card'],
  user: ['password_hash'],
  contract: [],
  settlement: []
}

export default {
  encrypt,
  decrypt,
  maskSensitiveData,
  encryptFields,
  decryptFields,
  generateSecureToken,
  hashData,
  secureCompare,
  SENSITIVE_FIELDS
}
