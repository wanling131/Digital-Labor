/**
 * 异步路由包装器：将 async (req, res) => {} 中未捕获的 Promise 拒绝传给 errorHandler
 * 用法：router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
