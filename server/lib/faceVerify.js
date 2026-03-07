/**
 * 阿里云人脸验证服务封装
 * 提供人脸比对、活体检测等功能
 */

import axios from 'axios'
import crypto from 'crypto'

// 阿里云人脸验证配置
const ALIYUN_CONFIG = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: 'https://cloudauth.aliyuncs.com',
  apiVersion: '2019-03-07'
}

/**
 * 生成阿里云请求签名
 * @param {Object} params 请求参数
 * @param {string} accessKeySecret 访问密钥
 * @returns {string} 签名
 */
function generateSignature(params, accessKeySecret) {
  // 1. 参数排序
  const sortedParams = Object.keys(params)
    .filter(key => key !== 'Signature')
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key]
      return acc
    }, {})

  // 2. 构造待签名字符串
  const canonicalQueryString = Object.entries(sortedParams)
    .map(([key, value]) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  // 3. 构造签名字符串
  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQueryString)}`

  // 4. 计算签名
  const signature = crypto
    .createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64')

  return signature
}

/**
 * 发起阿里云API请求
 * @param {string} action API动作
 * @param {Object} params 请求参数
 * @returns {Promise<Object>} API响应
 */
async function callAliyunAPI(action, params = {}) {
  const timestamp = new Date().toISOString()
  const nonce = Math.random().toString(36).substring(2)

  const commonParams = {
    Format: 'JSON',
    Version: ALIYUN_CONFIG.apiVersion,
    AccessKeyId: ALIYUN_CONFIG.accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: timestamp,
    SignatureVersion: '1.0',
    SignatureNonce: nonce,
    Action: action
  }

  const allParams = { ...commonParams, ...params }
  allParams.Signature = generateSignature(allParams, ALIYUN_CONFIG.accessKeySecret)

  try {
    const response = await axios.get(ALIYUN_CONFIG.endpoint, {
      params: allParams,
      timeout: 30000
    })

    if (response.data.Code && response.data.Code !== '200') {
      throw new Error(response.data.Message || '阿里云API调用失败')
    }

    return response.data
  } catch (error) {
    console.error('阿里云API调用失败:', error.message)
    throw error
  }
}

/**
 * 人脸验证服务
 */
export const faceVerifyService = {
  /**
   * 发起实人认证请求
   * @param {Object} params 认证参数
   * @param {string} params.certName 真实姓名
   * @param {string} params.certNo 身份证号
   * @param {string} params.metaInfo 设备环境信息
   * @returns {Promise<Object>} 认证结果
   */
  async initiateVerify(params) {
    const { certName, certNo, metaInfo } = params

    if (!certName || !certNo || !metaInfo) {
      throw new Error('缺少必要参数：certName, certNo, metaInfo')
    }

    const result = await callAliyunAPI('InitiateVerify', {
      ProductCode: 'ID_PRO',
      CertName: certName,
      CertNo: certNo,
      MetaInfo: metaInfo
    })

    return {
      verifyId: result.VerifyId,
      certifyId: result.CertifyId,
      status: result.Status
    }
  },

  /**
   * 查询认证结果
   * @param {string} certifyId 认证ID
   * @returns {Promise<Object>} 认证结果
   */
  async describeVerifyResult(certifyId) {
    if (!certifyId) {
      throw new Error('缺少必要参数：certifyId')
    }

    const result = await callAliyunAPI('DescribeVerifyResult', {
      CertifyId: certifyId
    })

    return {
      passed: result.Passed === 'T',
      reason: result.Reason,
      identityInfo: result.IdentityInfo,
      materialInfo: result.MaterialInfo
    }
  },

  /**
   * 人脸比对验证（1:1比对）
   * @param {Object} params 比对参数
   * @param {string} params.sourceImage 源图片Base64
   * @param {string} params.targetImage 目标图片Base64
   * @returns {Promise<Object>} 比对结果
   */
  async compareFaces(params) {
    const { sourceImage, targetImage } = params

    if (!sourceImage || !targetImage) {
      throw new Error('缺少必要参数：sourceImage, targetImage')
    }

    const result = await callAliyunAPI('CompareFaces', {
      SourceImage: sourceImage,
      TargetImage: targetImage
    })

    return {
      similarity: result.Similarity,
      passed: result.Similarity >= 80 // 阈值80%
    }
  },

  /**
   * 活体检测
   * @param {Object} params 检测参数
   * @param {string} params.image 图片Base64
   * @returns {Promise<Object>} 检测结果
   */
  async detectLivingFace(params) {
    const { image } = params

    if (!image) {
      throw new Error('缺少必要参数：image')
    }

    const result = await callAliyunAPI('DetectLivingFace', {
      Image: image
    })

    return {
      passed: result.Passed === 'T',
      score: result.Score,
      actions: result.Actions
    }
  }
}

/**
 * 本地模拟人脸验证（开发测试用）
 * 实际对接时替换为真实API调用
 */
export const mockFaceVerifyService = {
  async initiateVerify(params) {
    console.log('[Mock] 发起人脸验证:', params.certName)
    return {
      verifyId: `verify_${Date.now()}`,
      certifyId: `certify_${Date.now()}`,
      status: 'INIT'
    }
  },

  async describeVerifyResult(certifyId) {
    console.log('[Mock] 查询验证结果:', certifyId)
    // 模拟延迟后返回成功
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      passed: true,
      reason: '认证通过',
      identityInfo: {},
      materialInfo: {}
    }
  },

  async compareFaces(params) {
    console.log('[Mock] 人脸比对')
    return {
      similarity: 95.5,
      passed: true
    }
  },

  async detectLivingFace(params) {
    console.log('[Mock] 活体检测')
    return {
      passed: true,
      score: 99.8,
      actions: ['blink', 'mouth']
    }
  }
}

// 根据环境选择服务
const faceVerifyEnabled = process.env.FACE_VERIFY_ENABLED !== 'false'
const hasAliyunConfig = ALIYUN_CONFIG.accessKeyId && ALIYUN_CONFIG.accessKeySecret

// 优先使用真实服务（只要配置了密钥），否则使用模拟服务
const useRealService = faceVerifyEnabled && hasAliyunConfig

if (useRealService) {
  console.log('[FaceVerify] 使用阿里云人脸验证服务')
} else {
  console.log('[FaceVerify] 使用模拟人脸验证服务（开发测试用）')
}

export default useRealService ? faceVerifyService : mockFaceVerifyService
