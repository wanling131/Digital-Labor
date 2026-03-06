"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BottomNav } from "@/components/h5/bottom-nav"
import { PageHeader } from "@/components/h5/page-header"
import { PullRefresh } from "@/components/h5/pull-refresh"
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Download,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SalaryRecord {
  id: string
  month: string
  baseSalary: number
  overtimePay: number
  bonus: number
  deductions: number
  total: number
  status: "paid" | "pending" | "processing"
  paidAt?: string
  workDays: number
  workHours: number
}

const salaryRecords: SalaryRecord[] = [
  {
    id: "1",
    month: "2024年3月",
    baseSalary: 6000,
    overtimePay: 2000,
    bonus: 800,
    deductions: 300,
    total: 8500,
    status: "pending",
    workDays: 22,
    workHours: 176,
  },
  {
    id: "2",
    month: "2024年2月",
    baseSalary: 6000,
    overtimePay: 1800,
    bonus: 500,
    deductions: 280,
    total: 8020,
    status: "paid",
    paidAt: "2024-03-05",
    workDays: 20,
    workHours: 160,
  },
  {
    id: "3",
    month: "2024年1月",
    baseSalary: 6000,
    overtimePay: 2200,
    bonus: 1200,
    deductions: 320,
    total: 9080,
    status: "paid",
    paidAt: "2024-02-05",
    workDays: 23,
    workHours: 184,
  },
  {
    id: "4",
    month: "2023年12月",
    baseSalary: 5500,
    overtimePay: 1500,
    bonus: 2000,
    deductions: 260,
    total: 8740,
    status: "paid",
    paidAt: "2024-01-05",
    workDays: 21,
    workHours: 168,
  },
  {
    id: "5",
    month: "2023年11月",
    baseSalary: 5500,
    overtimePay: 1600,
    bonus: 400,
    deductions: 250,
    total: 7250,
    status: "paid",
    paidAt: "2023-12-05",
    workDays: 22,
    workHours: 176,
  },
]

const statusConfig = {
  paid: { label: "已发放", color: "bg-green-100 text-green-700" },
  pending: { label: "待发放", color: "bg-orange-100 text-orange-700" },
  processing: { label: "发放中", color: "bg-blue-100 text-blue-700" },
}

export default function SalaryPage() {
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
  }, [])

  const handleDownload = () => {
    setIsDownloading(true)
    setTimeout(() => {
      setIsDownloading(false)
    }, 1500)
  }

  const currentMonthSalary = salaryRecords[0]
  const lastMonthSalary = salaryRecords[1]
  const totalThisYear = salaryRecords.reduce((acc, record) => acc + record.total, 0)
  const avgSalary = Math.round(totalThisYear / salaryRecords.length)

  const salaryChange = currentMonthSalary.total - lastMonthSalary.total
  const changePercent = ((salaryChange / lastMonthSalary.total) * 100).toFixed(1)

  return (
    <PullRefresh onRefresh={handleRefresh} className="pb-24 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 px-4 pt-4 pb-16 text-primary-foreground">
        <PageHeader title="工资查询" backHref="/h5" transparent />

        {/* Current Month */}
        <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm mt-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-80">{currentMonthSalary.month}（预计）</span>
              <Badge className={statusConfig[currentMonthSalary.status].color}>
                {statusConfig[currentMonthSalary.status].label}
              </Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-sm">¥</span>
              <span className="text-4xl font-bold">{currentMonthSalary.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {salaryChange >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-300" />
                  <span className="text-green-300">较上月 +¥{salaryChange} ({changePercent}%)</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-300" />
                  <span className="text-red-300">较上月 ¥{salaryChange} ({changePercent}%)</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">本月出勤</p>
                <p className="text-xl font-bold">{currentMonthSalary.workDays}<span className="text-sm font-normal">天</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">工作时长</p>
                <p className="text-xl font-bold">{currentMonthSalary.workHours}<span className="text-sm font-normal">h</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">月均工资</p>
                <p className="text-xl font-bold">¥{(avgSalary / 1000).toFixed(1)}<span className="text-sm font-normal">k</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Breakdown */}
      <div className="px-4 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">本月工资构成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">基本工资</span>
                <span className="font-medium">¥{currentMonthSalary.baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">加班费</span>
                <span className="font-medium text-green-600">+¥{currentMonthSalary.overtimePay.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">奖金/补贴</span>
                <span className="font-medium text-green-600">+¥{currentMonthSalary.bonus.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">扣款</span>
                <span className="font-medium text-red-500">-¥{currentMonthSalary.deductions.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 font-semibold">
                <span>实发金额</span>
                <span className="text-primary text-lg">¥{currentMonthSalary.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <div className="px-4 mt-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">历史工资</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {salaryRecords.map((record) => (
                <div
                  key={record.id}
                  className={cn(
                    "flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer -mx-2 px-2 rounded-lg transition-all duration-150",
                    "active:scale-[0.98] active:bg-muted/50"
                  )}
                  onClick={() => {
                    setSelectedRecord(record)
                    setShowDetail(true)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      record.status === "paid" ? "bg-accent/10" : "bg-chart-5/10"
                    )}>
                      {record.status === "paid" ? (
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                      ) : (
                        <Clock className="h-5 w-5 text-chart-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{record.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.status === "paid" ? `${record.paidAt} 发放` : "预计下月5日发放"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">¥{record.total.toLocaleString()}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.month} 工资明细</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="text-center py-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">实发工资</p>
                <p className="text-3xl font-bold text-primary">¥{selectedRecord.total.toLocaleString()}</p>
                <Badge className={statusConfig[selectedRecord.status].color + " mt-2"}>
                  {statusConfig[selectedRecord.status].label}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">出勤天数</span>
                  <span>{selectedRecord.workDays}天</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">工作时长</span>
                  <span>{selectedRecord.workHours}小时</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">基本工资</span>
                  <span>¥{selectedRecord.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">加班费</span>
                  <span className="text-green-600">+¥{selectedRecord.overtimePay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">奖金/补贴</span>
                  <span className="text-green-600">+¥{selectedRecord.bonus.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">扣款</span>
                  <span className="text-red-500">-¥{selectedRecord.deductions.toLocaleString()}</span>
                </div>
              </div>

              <Button 
                className="w-full active:scale-95 transition-transform" 
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    下载中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    下载工资条
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </PullRefresh>
  )
}
