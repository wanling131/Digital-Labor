"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNav } from "@/components/h5/bottom-nav"
import { PullRefresh } from "@/components/h5/pull-refresh"
import {
  Clock,
  FileText,
  Wallet,
  Bell,
  ChevronRight,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getWorkerToken, apiWorker } from "@/lib/api"

const quickActions = [
  { icon: Clock, label: "考勤打卡", href: "/h5/attendance", color: "bg-primary" },
  { icon: FileText, label: "我的合同", href: "/h5/contract", color: "bg-accent" },
  { icon: Wallet, label: "工资查询", href: "/h5/salary", color: "bg-chart-5" },
  { icon: Bell, label: "消息通知", href: "/h5/notifications", color: "bg-chart-4" },
]

interface NotifItem {
  id: number
  type: string
  title: string
  body?: string
  created_at?: string
  read_at?: string | null
}

export default function H5HomePage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isRefreshing, setRefreshing] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [notifications, setNotifications] = useState<NotifItem[]>([])
  const [workerName, setWorkerName] = useState<string>("")
  const [orgName, setOrgName] = useState<string>("")
  const [workNo, setWorkNo] = useState<string>("")
  const [jobTitle, setJobTitle] = useState<string>("")
  const [workAddress, setWorkAddress] = useState<string>("")
  const [todayClockIn, setTodayClockIn] = useState<string>("")
  const [todayClockOut, setTodayClockOut] = useState<string>("")
  const [monthStats, setMonthStats] = useState<{ workDays: number; workHours: number; salary: number }>({ workDays: 0, workHours: 0, salary: 0 })
  const greeting = currentTime.getHours() < 12 ? "上午好" : currentTime.getHours() < 18 ? "下午好" : "晚上好"

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!getWorkerToken()) {
      router.replace("/h5/login")
      return
    }
    setAuthChecked(true)
  }, [router])

  const loadData = useCallback(async () => {
    if (!getWorkerToken()) return
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const [notifRes, meRes, attRes] = await Promise.all([
        apiWorker<{ list: NotifItem[] }>("/api/notify/list", { query: { pageSize: 5 } }),
        apiWorker<{ name?: string; org_name?: string; work_no?: string; job_title?: string; work_address?: string }>("/api/worker/me"),
        apiWorker<{ list: { work_date?: string; clock_in?: string; clock_out?: string }[] }>("/api/attendance/my", {
          query: { year, month },
        }),
      ])
      setNotifications(notifRes.list || [])
      setWorkerName(meRes.name ?? "")
      setOrgName(meRes.org_name ?? "")
      setWorkNo(meRes.work_no ?? "")
      setJobTitle(meRes.job_title ?? "")
      setWorkAddress(meRes.work_address ?? "")
      const todayStr = now.toISOString().slice(0, 10)
      const todayRecord = (attRes.list || []).find((a) => a.work_date === todayStr)
      setTodayClockIn(todayRecord?.clock_in ?? "")
      setTodayClockOut(todayRecord?.clock_out ?? "")
      const list = attRes.list || []
      const workDays = list.filter((a: { clock_in?: string }) => a.clock_in).length
      const workHours = Math.round(list.reduce((s: number, a: { hours?: number }) => s + (Number(a.hours) || 0), 0) * 10) / 10
      let salary = 0
      try {
        const settleRes = await apiWorker<{ list: { amount_due?: number; amount_paid?: number; period_start?: string }[] }>("/api/settlement/my", { query: { pageSize: 12 } })
        const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        const cur = (settleRes.list || []).find((s) => s.period_start?.slice(0, 7) === currentYm)
        if (cur) salary = Math.round((Number(cur.amount_paid) || Number(cur.amount_due) || 0) * 100) / 100
      } catch {}
      setMonthStats({ workDays, workHours, salary })
    } catch {
      setNotifications([])
      setWorkNo("")
      setJobTitle("")
      setWorkAddress("")
      setTodayClockIn("")
      setTodayClockOut("")
      setMonthStats({ workDays: 0, workHours: 0, salary: 0 })
    }
  }, [])

  useEffect(() => {
    if (authChecked) loadData()
  }, [authChecked, loadData])
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setCurrentTime(new Date())
    await new Promise(resolve => setTimeout(resolve, 300))
    setRefreshing(false)
  }, [loadData])

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <PullRefresh onRefresh={handleRefresh} className="pb-24 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 px-4 pt-12 pb-16 text-primary-foreground">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary-foreground/20">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">{workerName ? workerName.slice(0, 1) : "工"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm opacity-80">{greeting}</p>
              <h1 className="text-lg font-semibold">{workerName || "工人"}</h1>
            </div>
          </div>
          <Link href="/h5/notifications">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
            </Button>
          </Link>
        </div>

        {/* Work Info */}
        <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm mb-2">
              <Building2 className="h-4 w-4" />
              <span>{orgName || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm mb-2">
              <Briefcase className="h-4 w-4" />
              <span>{jobTitle && workNo ? `${jobTitle} | 工号: ${workNo}` : workNo ? `工号: ${workNo}` : jobTitle || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
              <MapPin className="h-4 w-4" />
              <span>{workAddress || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-8">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-transform duration-150"
                >
                  <div className={`${action.color} h-12 w-12 rounded-xl flex items-center justify-center shadow-md group-active:shadow-sm transition-shadow`}>
                    <action.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Status */}
      <div className="px-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">今日考勤</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{currentTime.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {todayClockIn ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">上班打卡</span>
                </div>
                <p className="text-xl font-bold">{todayClockIn || "--:--"}</p>
                <p className={cn("text-xs mt-1", todayClockIn ? "text-green-500" : "text-muted-foreground")}>
                  {todayClockIn ? "正常" : "未打卡"}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {todayClockOut ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">下班打卡</span>
                </div>
                <p className={cn("text-xl font-bold", todayClockOut ? "" : "text-muted-foreground")}>
                  {todayClockOut || "--:--"}
                </p>
                <p className={cn("text-xs mt-1", todayClockOut ? "text-green-500" : "text-muted-foreground")}>
                  {todayClockOut ? "正常" : "未打卡"}
                </p>
              </div>
            </div>
            <Link href="/h5/attendance">
              <Button className="w-full mt-4" size="lg">
                <Clock className="h-4 w-4 mr-2" />
                立即打卡
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <div className="px-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">本月统计</h2>
              <Link href="/h5/salary" className="text-sm text-primary flex items-center">
                详情 <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{monthStats.workDays}</p>
                <p className="text-xs text-muted-foreground">出勤天数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{monthStats.workHours}</p>
                <p className="text-xs text-muted-foreground">工时(小时)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{monthStats.salary > 0 ? monthStats.salary.toLocaleString() : "—"}</p>
                <p className="text-xs text-muted-foreground">预计工资</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <div className="px-4 mt-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">最新消息</h2>
              <Link href="/h5/notifications" className="text-sm text-primary flex items-center active:opacity-70 transition-opacity">
                全部 <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {notifications.map((notification) => {
                const unread = !notification.read_at
                const timeStr = notification.created_at
                  ? (() => {
                      const d = new Date(notification.created_at)
                      const now = new Date()
                      const diff = (now.getTime() - d.getTime()) / 60000
                      if (diff < 60) return "刚刚"
                      if (diff < 1440) return `${Math.floor(diff / 60)}分钟前`
                      if (diff < 2880) return "昨天"
                      return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
                    })()
                  : ""
                return (
                <Link key={notification.id} href="/h5/notifications">
                <div
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg active:bg-muted/50 transition-colors cursor-pointer relative"
                >
                  {unread && (
                    <span className="absolute top-3 right-3 h-2 w-2 bg-destructive rounded-full" />
                  )}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.type === "合同待签" || notification.type === "contract" ? "bg-accent/20 text-accent" :
                    notification.type === "工资发放" || notification.type === "salary" ? "bg-chart-5/20 text-chart-5" :
                    "bg-primary/20 text-primary"
                  }`}>
                    {(notification.type === "合同待签" || notification.type === "contract") && <FileText className="h-4 w-4" />}
                    {(notification.type === "工资发放" || notification.type === "salary") && <Wallet className="h-4 w-4" />}
                    {(notification.type === "考勤" || notification.type === "attendance" || notification.type === "结算待确认") && <Clock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between pr-4">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <span className="text-xs text-muted-foreground">{timeStr}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{notification.body || ""}</p>
                  </div>
                </div>
                </Link>
              )})}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </PullRefresh>
  )
}
