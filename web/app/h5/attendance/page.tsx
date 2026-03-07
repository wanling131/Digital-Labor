"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BottomNav } from "@/components/h5/bottom-nav"
import { PageHeader } from "@/components/h5/page-header"
import { PullRefresh } from "@/components/h5/pull-refresh"
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Camera,
  Navigation,
  Loader2,
} from "lucide-react"
import Link from "next/link"
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
  const [clockedIn, setClockedIn] = useState(true)
  const [clockedOut, setClockedOut] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [location, setLocation] = useState("上海市浦东新区张江高科技园区")
  const [clockInTime, setClockInTime] = useState("08:32")
  const [clockOutTime, setClockOutTime] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
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
    } catch {
      setAttendanceRecords([])
    }
  }, [yearMonth.year, yearMonth.month])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleRefresh = useCallback(async () => {
    await loadAttendance()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }, [loadAttendance])

  const handleClockIn = () => {
    setIsLocating(true)
    setTimeout(() => {
      setIsLocating(false)
      setClockedIn(true)
      setClockInTime(currentTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    }, 1500)
  }

  const handleClockOut = () => {
    setIsLocating(true)
    setTimeout(() => {
      setIsLocating(false)
      setClockedOut(true)
      setClockOutTime(currentTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }))
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    }, 1500)
  }

  const handleRelocate = () => {
    setIsLocating(true)
    setTimeout(() => {
      setIsLocating(false)
    }, 1000)
  }

  return (
    <PullRefresh onRefresh={handleRefresh} className="pb-24 min-h-screen">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">打卡成功</span>
        </div>
      )}
      
      {/* Header */}
      <PageHeader title="考勤打卡" backHref="/h5" />

      {/* Clock Section */}
      <div className="px-4 -mt-4">
        <Card>
          <CardContent className="p-6">
            {/* Current Time */}
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-1">
                {currentTime.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
              <p className="text-4xl font-bold font-mono">
                {currentTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>

            {/* Location */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <MapPin className="h-4 w-4" />
              <span className="max-w-[200px] truncate">{location}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={handleRelocate}
                disabled={isLocating}
              >
                {isLocating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Navigation className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Clock In/Out Status */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={cn(
                "rounded-xl p-4 text-center transition-all duration-300",
                clockedIn ? "bg-accent/10 border border-accent/20" : "bg-muted/50"
              )}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {clockedIn ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">上班打卡</span>
                </div>
                <p className="text-2xl font-bold font-mono">{clockedIn ? clockInTime : "--:--"}</p>
                {clockedIn && <p className="text-xs text-accent mt-1">正常</p>}
              </div>
              <div className={cn(
                "rounded-xl p-4 text-center transition-all duration-300",
                clockedOut ? "bg-accent/10 border border-accent/20" : "bg-muted/50"
              )}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {clockedOut ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">下班打卡</span>
                </div>
                <p className="text-2xl font-bold font-mono">{clockedOut ? clockOutTime : "--:--"}</p>
                {clockedOut && <p className="text-xs text-accent mt-1">正常</p>}
              </div>
            </div>

            {/* Clock Button */}
            <div className="flex flex-col items-center">
              <button
                className={cn(
                  "w-32 h-32 rounded-full text-lg font-semibold shadow-xl transition-all duration-300 flex flex-col items-center justify-center",
                  "active:scale-95 active:shadow-md",
                  clockedIn && clockedOut 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-primary text-primary-foreground hover:shadow-2xl hover:scale-105",
                  (isLocating || (clockedIn && clockedOut)) && "opacity-80 cursor-not-allowed"
                )}
                onClick={clockedIn && !clockedOut ? handleClockOut : handleClockIn}
                disabled={isLocating || (clockedIn && clockedOut)}
              >
                {isLocating ? (
                  <>
                    <Loader2 className="h-8 w-8 mb-1 animate-spin" />
                    <span className="text-sm">定位中</span>
                  </>
                ) : clockedIn && clockedOut ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 mb-1" />
                    <span>已完成</span>
                  </>
                ) : clockedIn ? (
                  <>
                    <Clock className="h-8 w-8 mb-1" />
                    <span>下班打卡</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-8 w-8 mb-1" />
                    <span>上班打卡</span>
                  </>
                )}
              </button>
              <p className="text-sm text-muted-foreground mt-4">
                {clockedIn && clockedOut ? "今日考勤已完成" : "点击按钮进行打卡"}
              </p>
            </div>

            {/* Face Recognition Hint */}
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <Camera className="h-4 w-4" />
              <span>支持人脸识别打卡</span>
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">2024年3月</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Monthly Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4 py-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">22</p>
                <p className="text-xs text-muted-foreground">出勤</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-500">1</p>
                <p className="text-xs text-muted-foreground">迟到</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-500">1</p>
                <p className="text-xs text-muted-foreground">早退</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-500">0</p>
                <p className="text-xs text-muted-foreground">缺勤</p>
              </div>
            </div>

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
