"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/h5/page-header"
import { BottomNav } from "@/components/h5/bottom-nav"
import { CreditCard } from "lucide-react"
import { getWorkerToken } from "@/lib/api"

export default function ProfileBankPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!getWorkerToken()) {
      router.replace("/h5/login")
      return
    }
  }, [router])

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-24">
      <PageHeader title="银行卡管理" backHref="/h5/profile" />

      <div className="px-4 pt-4">
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">暂无绑定银行卡</p>
            <p className="text-xs mt-1">绑定后可用于工资发放</p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
