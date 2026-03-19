"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("全局错误:", error)
  }, [error])

  const isAuthError = error.message.includes("未登录") || error.message.includes("401")
  const isNetworkError = error.message.includes("网络") || error.message.includes("fetch")

  return (
    <html lang="zh-CN">
      <body style={{ 
        fontFamily: 'system-ui, sans-serif', 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
        <div style={{ maxWidth: '400px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertCircle style={{ width: '32px', height: '32px', color: '#dc2626' }} />
          </div>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827' }}>
            {isAuthError ? "登录已过期" : isNetworkError ? "网络连接失败" : "页面出错了"}
          </h1>
          
          <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.6' }}>
            {isAuthError 
              ? "您的登录状态已过期，请重新登录。" 
              : isNetworkError 
              ? "网络连接出现问题，请检查网络后重试。" 
              : error.message || "抱歉，页面遇到了一些问题。"}
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              重试
            </button>
            
            <a
              href={isAuthError ? "/login" : "/"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              <Home style={{ width: '16px', height: '16px' }} />
              {isAuthError ? "重新登录" : "返回首页"}
            </a>
          </div>
          
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              错误ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
