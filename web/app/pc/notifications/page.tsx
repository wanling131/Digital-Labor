"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bell } from "lucide-react"

export default function PcNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">通知中心</h1>
        <p className="text-muted-foreground">查看系统通知的统一入口（当前为占位实现）。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            全部通知
          </CardTitle>
          <CardDescription>后续可接入管理端或工人端的真实通知数据。</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            当前版本仅提供入口展示，未请求任何接口，因此不会触发跳转到 H5 登录页。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


