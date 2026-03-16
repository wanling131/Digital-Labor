/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    domains: [],
  },
  // 避免多 lockfile 导致的工作目录推断错误，开发/构建更稳定
  outputFileTracingRoot: path.join(__dirname),
  // 开发时把 /api 代理到后端（后端默认 3000），避免跨域
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ]
  },
  // 构建优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 缓存配置
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // 代码分割
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  // Turbopack 配置
  turbopack: {},

}

export default nextConfig
