"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/h5/page-header"
import { BottomNav } from "@/components/h5/bottom-nav"
import { Shield } from "lucide-react"
import { getWorkerToken } from "@/lib/api"

export default function ProfileSecurityPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!getWorkerToken()) {
      router.replace("/h5/login")
      return
    }
  }, [router])

  return (
    <div className="pb-24 min-h-screen">
      <PageHeader title="安全设置" backHref="/h5/profile" />

      <div className="px-4 pt-4">
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Shield className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">修改密码、手机绑定</p>
            <p className="text-xs mt-1">敬请期待</p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
