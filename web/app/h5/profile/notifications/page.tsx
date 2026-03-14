"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/h5/page-header"
import { BottomNav } from "@/components/h5/bottom-nav"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { apiWorker, getWorkerToken } from "@/lib/api"
import { Bell } from "lucide-react"

export default function ProfileNotificationsPage() {
  const router = useRouter()
  const [pushEnabled, setPushEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!getWorkerToken()) {
      router.replace("/h5/login")
      return
    }
    apiWorker<{ push_enabled?: boolean }>("/api/worker/notification-settings")
      .then((data) => {
        setPushEnabled(data?.push_enabled !== false)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [router])

  const handlePushToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      await apiWorker("/api/worker/notification-settings", {
        method: "PUT",
        body: { push_enabled: checked },
      })
      setPushEnabled(checked)
    } catch {
      // 保持原状态
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-24">
      <PageHeader title="消息设置" backHref="/h5/profile" />

      <div className="px-4 pt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              通知提醒
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fetching ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : (
              <div className="flex items-center justify-between">
                <Label htmlFor="push_enabled" className="flex-1">
                  推送通知
                </Label>
                <Switch
                  id="push_enabled"
                  checked={pushEnabled}
                  onCheckedChange={handlePushToggle}
                  disabled={loading}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              开启后，合同待签、结算待确认、工资发放等站内消息将进行推送提醒。
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
