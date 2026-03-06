import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "建筑工人服务平台",
  description: "建筑工人自助服务移动端",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "劳务服务",
  },
  formatDetection: {
    telephone: true,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
  ],
  viewportFit: "cover",
}

export default function H5Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative overflow-x-hidden">
      <div className="animate-in fade-in duration-300">
        {children}
      </div>
    </div>
  )
}
