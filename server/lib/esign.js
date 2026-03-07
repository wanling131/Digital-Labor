/**
 * e签宝电子签章服务封装
 * 提供合同创建、签署、PDF生成、存证查询等功能
 */

import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// e签宝配置
const ESIGN_CONFIG = {
  appId: process.env.ESIGN_APP_ID,
  appSecret: process.env.ESIGN_APP_SECRET,
  endpoint: process.env.ESIGN_ENDPOINT || 'https://openapi.esign.cn',
  apiVersion: 'v3'
}

/**
 * 生成e签宝请求签名
 * @param {string} method 请求方法
 * @param {string} url 请求路径
 * @param {string} body 请求体
 * @returns {string} 签名
 */
function generateSignature(method, url, body = '') {
  const timestamp = new Date().toISOString()
  const nonce = Math.random().toString(36).substring(2, 15)
  
  // 构造签名字符串
  const signString = [
    method.toUpperCase(),
    url,
    timestamp,
    nonce,
    body
  ].join('\n')
  
  // HMAC-SHA256签名
  const signature = crypto
    .createHmac('sha256', ESIGN_CONFIG.appSecret)
    .update(signString)
    .digest('base64')
  
  return { signature, timestamp, nonce }
}

/**
 * 发起e签宝API请求
 * @param {string} method 请求方法
 * @param {string} path 请求路径
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} API响应
 */
async function callEsignAPI(method, path, data = null) {
  const url = `${ESIGN_CONFIG.endpoint}/${ESIGN_CONFIG.apiVersion}${path}`
  const body = data ? JSON.stringify(data) : ''
  const { signature, timestamp, nonce } = generateSignature(method, path, body)
  
  try {
    const response = await axios({
      method,
      url,
      data: data || undefined,
      headers: {
        'Content-Type': 'application/json',
        'X-Tsign-Open-App-Id': ESIGN_CONFIG.appId,
        'X-Tsign-Open-Timestamp': timestamp,
        'X-Tsign-Open-Nonce': nonce,
        'X-Tsign-Open-Signature': signature
      },
      timeout: 30000
    })
    
    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'e签宝API调用失败')
    }
    
    return response.data.data
  } catch (error) {
    console.error('e签宝API调用失败:', error.message)
    throw error
  }
}

/**
 * 电子签章服务
 */
export const esignService = {
  /**
   * 创建签署流程
   * @param {Object} params 签署参数
   * @param {string} params.title 合同标题
   * @param {string} params.templateId 模板ID（可选）
   * @param {Array} params.signers 签署人列表
   * @param {string} params.deadline 签署截止时间
   * @returns {Promise<Object>} 签署流程信息
   */
  async createSignFlow(params) {
    const { title, templateId, signers, deadline } = params
    
    const requestBody = {
      signFlowConfig: {
        signFlowTitle: title,
        autoFinish: true,
        deadline: deadline || undefined
      },
      signers: signers.map((signer, index) => ({
        signerConfig: {
          signerOrder: index + 1,
          required: true
        },
        signerInfo: {
          signerType: signer.type || 'PERSON',
          name: signer.name,
          mobile: signer.mobile,
          idCardNum: signer.idCard
        }
      }))
    }
    
    // 如果有模板ID，使用模板创建
    if (templateId) {
      requestBody.docs = [{
        templateId,
        templateEditParams: params.templateParams || {}
      }]
    }
    
    const result = await callEsignAPI('POST', '/sign-flow/create', requestBody)
    
    return {
      flowId: result.signFlowId,
      flowUrl: result.signFlowUrl,
      status: result.signFlowStatus
    }
  },

  /**
   * 上传合同文件
   * @param {string} filePath 文件路径
   * @returns {Promise<Object>} 文件信息
   */
  async uploadContractFile(filePath) {
    const fileContent = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)
    const fileSize = fs.statSync(filePath).size
    const contentMd5 = crypto.createHash('md5').update(fileContent).digest('base64')
    
    // 1. 获取文件上传URL
    const uploadUrlResult = await callEsignAPI('POST', '/files/file-upload-url', {
      contentMd5,
      contentType: 'application/pdf',
      fileName,
      fileSize
    })
    
    // 2. 上传文件到OSS
    await axios.put(uploadUrlResult.fileUploadUrl, fileContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-MD5': contentMd5
      }
    })
    
    return {
      fileId: uploadUrlResult.fileId,
      fileName,
      fileSize
    }
  },

  /**
   * 基于文件创建签署流程
   * @param {Object} params 签署参数
   * @returns {Promise<Object>} 签署流程信息
   */
  async createSignFlowByFile(params) {
    const { title, fileId, signers, deadline } = params
    
    const requestBody = {
      docs: [{
        fileId
      }],
      signFlowConfig: {
        signFlowTitle: title,
        autoFinish: true,
        deadline: deadline || undefined
      },
      signers: signers.map((signer, index) => ({
        signerConfig: {
          signerOrder: index + 1,
          required: true
        },
        signerInfo: {
          signerType: signer.type || 'PERSON',
          name: signer.name,
          mobile: signer.mobile,
          idCardNum: signer.idCard
        },
        signFields: signer.signFields || [{
          fieldType: 'SIGN_SEAL',
          fieldPosition: {
            page: 1,
            x: 100,
            y: 100
          }
        }]
      }))
    }
    
    const result = await callEsignAPI('POST', '/sign-flow/create-by-file', requestBody)
    
    return {
      flowId: result.signFlowId,
      flowUrl: result.signFlowUrl,
      status: result.signFlowStatus
    }
  },

  /**
   * 查询签署流程状态
   * @param {string} flowId 签署流程ID
   * @returns {Promise<Object>} 签署状态
   */
  async getSignFlowStatus(flowId) {
    const result = await callEsignAPI('GET', `/sign-flow/${flowId}/detail`)
    
    return {
      flowId: result.signFlowId,
      status: result.signFlowStatus,
      title: result.signFlowTitle,
      createTime: result.createTime,
      updateTime: result.updateTime,
      signers: result.signers?.map(signer => ({
        signerId: signer.signerId,
        name: signer.signerName,
        status: signer.signerStatus,
        signTime: signer.signTime
      })) || []
    }
  },

  /**
   * 下载签署后的PDF文件
   * @param {string} flowId 签署流程ID
   * @param {string} savePath 保存路径
   * @returns {Promise<string>} 保存的文件路径
   */
  async downloadSignedPdf(flowId, savePath) {
    // 1. 获取文件下载URL
    const result = await callEsignAPI('GET', `/sign-flow/${flowId}/file-download-url`)
    
    // 2. 下载PDF文件
    const response = await axios.get(result.fileDownloadUrl, {
      responseType: 'arraybuffer'
    })
    
    // 3. 保存文件
    fs.writeFileSync(savePath, response.data)
    
    return savePath
  },

  /**
   * 获取签署链接（用于H5页面嵌入）
   * @param {string} flowId 签署流程ID
   * @param {string} signerId 签署人ID
   * @returns {Promise<Object>} 签署链接
   */
  async getSignUrl(flowId, signerId) {
    const result = await callEsignAPI('POST', `/sign-flow/${flowId}/sign-url`, {
      signerId,
      clientType: 'H5',
      urlType: 2 // 签署链接
    })
    
    return {
      signUrl: result.signUrl,
      expireTime: result.expireTime
    }
  },

  /**
   * 撤销签署流程
   * @param {string} flowId 签署流程ID
   * @param {string} reason 撤销原因
   * @returns {Promise<boolean>} 是否成功
   */
  async revokeSignFlow(flowId, reason = '') {
    await callEsignAPI('PUT', `/sign-flow/${flowId}/revoke`, {
      revokeReason: reason
    })
    
    return true
  },

  /**
   * 获取存证报告
   * @param {string} flowId 签署流程ID
   * @returns {Promise<Object>} 存证信息
   */
  async getEvidenceReport(flowId) {
    const result = await callEsignAPI('GET', `/sign-flow/${flowId}/evidence-report`)
    
    return {
      reportUrl: result.reportDownloadUrl,
      evidenceNo: result.evidenceNo,
      evidenceTime: result.evidenceTime,
      hash: result.fileHash
    }
  }
}

/**
 * 本地模拟电子签服务（开发测试用）
 */
export const mockEsignService = {
  async createSignFlow(params) {
    console.log('[Mock] 创建签署流程:', params.title)
    const flowId = `flow_${Date.now()}`
    return {
      flowId,
      flowUrl: `https://mock.esign.cn/sign/${flowId}`,
      status: 'INIT'
    }
  },

  async uploadContractFile(filePath) {
    console.log('[Mock] 上传合同文件:', filePath)
    return {
      fileId: `file_${Date.now()}`,
      fileName: path.basename(filePath),
      fileSize: fs.statSync(filePath).size
    }
  },

  async createSignFlowByFile(params) {
    console.log('[Mock] 基于文件创建签署流程:', params.title)
    const flowId = `flow_${Date.now()}`
    return {
      flowId,
      flowUrl: `https://mock.esign.cn/sign/${flowId}`,
      status: 'INIT'
    }
  },

  async getSignFlowStatus(flowId) {
    console.log('[Mock] 查询签署状态:', flowId)
    return {
      flowId,
      status: 'COMPLETED',
      title: '测试合同',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      signers: [{
        signerId: 'signer_1',
        name: '张三',
        status: 'SIGNED',
        signTime: new Date().toISOString()
      }]
    }
  },

  async downloadSignedPdf(flowId, savePath) {
    console.log('[Mock] 下载签署后PDF:', flowId)
    // 创建一个模拟的PDF文件
    const mockPdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000214 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n308\n%%EOF'
    fs.writeFileSync(savePath, mockPdfContent)
    return savePath
  },

  async getSignUrl(flowId, signerId) {
    console.log('[Mock] 获取签署链接:', flowId, signerId)
    return {
      signUrl: `https://mock.esign.cn/sign/${flowId}?signer=${signerId}`,
      expireTime: new Date(Date.now() + 3600000).toISOString()
    }
  },

  async revokeSignFlow(flowId, reason = '') {
    console.log('[Mock] 撤销签署流程:', flowId, reason)
    return true
  },

  async getEvidenceReport(flowId) {
    console.log('[Mock] 获取存证报告:', flowId)
    return {
      reportUrl: 'https://mock.esign.cn/evidence/report.pdf',
      evidenceNo: `EVIDENCE_${Date.now()}`,
      evidenceTime: new Date().toISOString(),
      hash: crypto.createHash('sha256').update(flowId).digest('hex')
    }
  }
}

// 根据环境选择服务
const isProduction = process.env.NODE_ENV === 'production'
const hasEsignConfig = ESIGN_CONFIG.appId && ESIGN_CONFIG.appSecret

export default (isProduction && hasEsignConfig) ? esignService : mockEsignService
