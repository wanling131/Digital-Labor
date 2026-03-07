/**
 * 缓存服务模块
 * 提供内存缓存和Redis缓存支持
 * 开发环境使用内存缓存，生产环境可配置Redis
 */

import NodeCache from 'node-cache'

// 缓存配置
const CACHE_TTL = {
  SHORT: 60,        // 1分钟
  MEDIUM: 300,      // 5分钟
  LONG: 3600,       // 1小时
  DAY: 86400        // 1天
}

// 内存缓存实例
const memoryCache = new NodeCache({
  stdTTL: CACHE_TTL.MEDIUM,
  checkperiod: 120,
  useClones: true
})

// 缓存键前缀
const KEY_PREFIX = {
  USER: 'user:',
  PERSON: 'person:',
  CONTRACT: 'contract:',
  ATTENDANCE: 'attendance:',
  SETTLEMENT: 'settlement:',
  STATS: 'stats:',
  LIST: 'list:',
  SESSION: 'session:'
}

/**
 * 缓存服务类
 */
class CacheService {
  constructor() {
    this.cache = memoryCache
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }
  }

  /**
   * 获取缓存值
   * @param {string} key 缓存键
   * @returns {any} 缓存值或undefined
   */
  get(key) {
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.stats.hits++
      return value
    }
    this.stats.misses++
    return undefined
  }

  /**
   * 设置缓存值
   * @param {string} key 缓存键
   * @param {any} value 缓存值
   * @param {number} ttl 过期时间（秒）
   * @returns {boolean} 是否成功
   */
  set(key, value, ttl = CACHE_TTL.MEDIUM) {
    const success = this.cache.set(key, value, ttl)
    if (success) {
      this.stats.sets++
    }
    return success
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   * @returns {number} 删除的键数量
   */
  del(key) {
    const count = this.cache.del(key)
    if (count > 0) {
      this.stats.deletes++
    }
    return count
  }

  /**
   * 删除匹配模式的缓存
   * @param {string} pattern 匹配模式（支持通配符*）
   * @returns {number} 删除的键数量
   */
  delPattern(pattern) {
    const keys = this.cache.keys()
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    const matchedKeys = keys.filter(key => regex.test(key))
    let count = 0
    matchedKeys.forEach(key => {
      count += this.cache.del(key)
    })
    if (count > 0) {
      this.stats.deletes += count
    }
    return count
  }

  /**
   * 清空所有缓存
   * @returns {void}
   */
  flush() {
    this.cache.flushAll()
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 }
  }

  /**
   * 获取缓存统计
   * @returns {object} 统计信息
   */
  getStats() {
    const keys = this.cache.keys()
    return {
      ...this.stats,
      keyCount: keys.length,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%',
      keys: keys.slice(0, 20) // 只返回前20个键
    }
  }

  /**
   * 获取或设置缓存（如果不存在则执行函数获取）
   * @param {string} key 缓存键
   * @param {Function} fetchFn 获取数据的函数
   * @param {number} ttl 过期时间（秒）
   * @returns {any} 缓存值
   */
  async getOrSet(key, fetchFn, ttl = CACHE_TTL.MEDIUM) {
    const cached = this.get(key)
    if (cached !== undefined) {
      return cached
    }

    try {
      const value = await fetchFn()
      if (value !== undefined && value !== null) {
        this.set(key, value, ttl)
      }
      return value
    } catch (error) {
      console.error(`[缓存] 获取数据失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 生成缓存键
   * @param {string} prefix 前缀
   * @param {string|number} id 标识
   * @returns {string} 完整缓存键
   */
  key(prefix, id) {
    return `${prefix}${id}`
  }

  /**
   * 生成列表缓存键
   * @param {string} prefix 前缀
   * @param {object} params 查询参数
   * @returns {string} 完整缓存键
   */
  listKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&')
    return `${prefix}list:${sortedParams}`
  }
}

// 创建单例实例
const cacheService = new CacheService()

// 便捷函数
export const cache = {
  get: (key) => cacheService.get(key),
  set: (key, value, ttl) => cacheService.set(key, value, ttl),
  del: (key) => cacheService.del(key),
  delPattern: (pattern) => cacheService.delPattern(pattern),
  flush: () => cacheService.flush(),
  getStats: () => cacheService.getStats(),
  getOrSet: (key, fetchFn, ttl) => cacheService.getOrSet(key, fetchFn, ttl),
  key: (prefix, id) => cacheService.key(prefix, id),
  listKey: (prefix, params) => cacheService.listKey(prefix, params),
  
  // 常用缓存键生成器
  keys: KEY_PREFIX,
  ttl: CACHE_TTL
}

export default cacheService
