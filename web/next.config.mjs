/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 避免多 lockfile 导致的工作目录推断错误，开发/构建更稳定
  outputFileTracingRoot: path.join(__dirname),
  // 开发时把 /api 代理到后端（后端默认 3000），避免跨域
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' },
    ]
  },
}

export default nextConfig
