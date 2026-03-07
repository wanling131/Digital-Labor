"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-CN">
      <body style={{ fontFamily: 'system-ui', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>页面出错</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error.message || '未知错误'}</p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          重试
        </button>
        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <a href="/" style={{ color: '#2563eb' }}>返回首页</a>
        </p>
      </body>
    </html>
  )
}
