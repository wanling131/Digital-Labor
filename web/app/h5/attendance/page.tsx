"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomNav } from "@/components/h5/bottom-nav"
import { PageHeader } from "@/components/h5/page-header"
import { PullRefresh } from "@/components/h5/pull-refresh"
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiWorker } from "@/lib/api"

interface AttRecord {
  date: string
  weekday: string
  clockIn: string
  clockOut: string
  status: string
  hours: string
}

const statusConfig = {
  normal: { label: "正常", color: "bg-green-100 text-green-700" },
  late: { label: "迟到", color: "bg-orange-100 text-orange-700" },
  early: { label: "早退", color: "bg-yellow-100 text-yellow-700" },
  absent: { label: "缺勤", color: "bg-red-100 text-red-700" },
}

export default function AttendancePage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clockInTime, setClockInTime] = useState("")
  const [clockOutTime, setClockOutTime] = useState("")
  const [hasTodayRecord, setHasTodayRecord] = useState(false)
  const [location, setLocation] = useState("")
  const [attendanceRecords, setAttendanceRecords] = useState<AttRecord[]>([])
  const [yearMonth, setYearMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })

  const loadAttendance = useCallback(async () => {
    try {
      const res = await apiWorker<{ list: { work_date?: string; clock_in?: string; clock_out?: string; hours?: number }[] }>("/api/attendance/my", {
        query: { year: yearMonth.year, month: yearMonth.month },
      })
      const list = (res.list || []).map((a) => {
        const d = a.work_date ? new Date(a.work_date + "T00:00:00") : new Date()
        const weekdays = "周日周一周二周三周四周五周六"
        const w = weekdays.slice(d.getDay() * 2, d.getDay() * 2 + 2)
        return {
          date: a.work_date?.slice(5).replace("-", "/") ?? "",
          weekday: w,
          clockIn: a.clock_in ?? "--:--",
          clockOut: a.clock_out ?? "--:--",
          status: "normal",
          hours: String(a.hours ?? 0),
        }
      })
      setAttendanceRecords(list)
      const todayStr = new Date().toISOString().slice(0, 10)
      const todayRecord = (res.list || []).find((a) => a.work_date === todayStr)
      setHasTodayRecord(!!(todayRecord?.clock_in || todayRecord?.clock_out))
      setClockInTime(todayRecord?.clock_in ?? "")
      setClockOutTime(todayRecord?.clock_out ?? "")
    } catch {
      setAttendanceRecords([])
    }
  }, [yearMonth.year, yearMonth.month])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleRefresh = useCallback(async () => {
    await loadAttendance()
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [loadAttendance])

  return (
    <PullRefresh onRefresh={handleRefresh} className="pb-24 flex-1 min-h-0">
      {/* Header */}
      <PageHeader title="考勤" backHref="/h5" />

      {/* 今日考勤展示（仅查看，数据来自实名制平台导入） */}
      <div className="px-4 -mt-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">
                {currentTime.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
              <p className="text-2xl font-bold font-mono">
                {currentTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>

            {location && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="max-w-[240px] truncate">{location}</span>
              </div>
            )}

            {/* 今日上下班时间（只读展示） */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={cn(
                "rounded-xl p-4 text-center",
                clockInTime ? "bg-accent/10 border border-accent/20" : "bg-muted/50"
              )}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {clockInTime ? <CheckCircle2 className="h-5 w-5 text-accent" /> : <AlertCircle className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">上班</span>
                </div>
                <p className="text-xl font-bold font-mono">{clockInTime || "--:--"}</p>
                {clockInTime && <p className="text-xs text-accent mt-1">正常</p>}
              </div>
              <div className={cn(
                "rounded-xl p-4 text-center",
                clockOutTime ? "bg-accent/10 border border-accent/20" : "bg-muted/50"
              )}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {clockOutTime ? <CheckCircle2 className="h-5 w-5 text-accent" /> : <AlertCircle className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">下班</span>
                </div>
                <p className="text-xl font-bold font-mono">{clockOutTime || "--:--"}</p>
                {clockOutTime && <p className="text-xs text-accent mt-1">正常</p>}
              </div>
            </div>

            {hasTodayRecord && (
              <p className="text-center text-sm text-muted-foreground">今日考勤已记录</p>
            )}

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>考勤数据来源于实名制平台导入，仅支持查看</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <div className="px-4 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">考勤记录</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setYearMonth((prev) => (prev.month <= 1 ? { year: prev.year - 1, month: 12 } : { ...prev, month: prev.month - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{yearMonth.year}年{yearMonth.month}月</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setYearMonth((prev) => (prev.month >= 12 ? { year: prev.year + 1, month: 1 } : { ...prev, month: prev.month + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Monthly Stats: 根据当月记录计算 */}
            {(() => {
              const present = attendanceRecords.filter((r) => r.clockIn !== "--:--").length
              const late = attendanceRecords.filter((r) => r.status === "late").length
              const early = attendanceRecords.filter((r) => r.status === "early").length
              const absent = attendanceRecords.filter((r) => r.status === "absent").length
              return (
                <div className="grid grid-cols-4 gap-2 mb-4 py-3 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{present}</p>
                    <p className="text-xs text-muted-foreground">出勤</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-500">{late}</p>
                    <p className="text-xs text-muted-foreground">迟到</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-500">{early}</p>
                    <p className="text-xs text-muted-foreground">早退</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-500">{absent}</p>
                    <p className="text-xs text-muted-foreground">缺勤</p>
                  </div>
                </div>
              )
            })()}

            {/* Records List */}
            <div className="space-y-2">
              {attendanceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无考勤记录</p>
              ) : (
              attendanceRecords.map((record, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-sm font-medium">{record.date}</p>
                      <p className="text-xs text-muted-foreground">{record.weekday}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">上班</p>
                      <p className="font-medium">{record.clockIn}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">下班</p>
                      <p className="font-medium">{record.clockOut}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">工时</p>
                      <p className="font-medium">{record.hours}h</p>
                    </div>
                    <Badge className={statusConfig[record.status as keyof typeof statusConfig].color}>
                      {statusConfig[record.status as keyof typeof statusConfig].label}
                    </Badge>
                  </div>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </PullRefresh>
  )
}
