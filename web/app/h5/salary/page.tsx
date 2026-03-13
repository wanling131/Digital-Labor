"use client"

import { useState, useCallback, useEffect } from "react"
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
import { apiWorker, downloadSettlementSlip, buildFileUrl } from "@/lib/api"

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

function mapSettlement(s: { id: number; period_start?: string; period_end?: string; total_hours?: number; amount_due?: number; amount_paid?: number; status?: string }): SalaryRecord {
  const monthStr = s.period_start ? `${s.period_start.slice(0, 4)}年${parseInt(s.period_start.slice(5, 7), 10)}月` : ""
  const total = Number(s.amount_paid ?? s.amount_due ?? 0)
  const status = s.status === "已发放" ? "paid" : s.status === "待确认" ? "pending" : "processing"
  const hours = Number(s.total_hours ?? 0)
  return {
    id: String(s.id),
    month: monthStr,
    baseSalary: total,
    overtimePay: 0,
    bonus: 0,
    deductions: 0,
    total,
    status,
    paidAt: status === "paid" ? s.period_end : undefined,
    workDays: Math.round(hours / 8),
    workHours: hours,
  }
}

const statusConfig = {
  paid: { label: "已发放", color: "bg-green-100 text-green-700" },
  pending: { label: "待发放", color: "bg-orange-100 text-orange-700" },
  processing: { label: "发放中", color: "bg-blue-100 text-blue-700" },
}

type PendingSettlement = { id: number; period_start: string; period_end: string; amount_due: number; status: string; sign_image_snapshot?: string | null }

export default function SalaryPage() {
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [pendingList, setPendingList] = useState<PendingSettlement[]>([])
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [faceStep, setFaceStep] = useState<number | null>(null)
  const [workerId, setWorkerId] = useState<number | null>(null)
  const [previewSettlement, setPreviewSettlement] = useState<PendingSettlement | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [pendingRes, myRes] = await Promise.all([
        apiWorker<{ list: PendingSettlement[] }>("/api/settlement/my-pending"),
        apiWorker<{ list: unknown[] }>("/api/settlement/my"),
      ])
      setPendingList(pendingRes.list || [])
      setSalaryRecords((myRes.list || []).map((s: Record<string, unknown>) => mapSettlement(s as Parameters<typeof mapSettlement>[0])))
      if (typeof window !== "undefined") {
        window.localStorage.setItem("h5_pending_settlement_cache", JSON.stringify(pendingRes.list || []))
        window.localStorage.setItem("h5_salary_records_cache", JSON.stringify(myRes.list || []))
      }
    } catch {
      // 网络异常时优先尝试使用本地缓存，保证弱网环境下的基本可读性
      if (typeof window !== "undefined") {
        try {
          const cachedPending = window.localStorage.getItem("h5_pending_settlement_cache")
          const cachedSalary = window.localStorage.getItem("h5_salary_records_cache")
          if (cachedPending) {
            const list = JSON.parse(cachedPending) as PendingSettlement[]
            setPendingList(list)
          } else {
            setPendingList([])
          }
          if (cachedSalary) {
            const list = JSON.parse(cachedSalary) as unknown[]
            setSalaryRecords(list.map((s) => mapSettlement(s as Parameters<typeof mapSettlement>[0])))
          } else {
            setSalaryRecords([])
          }
        } catch {
          setPendingList([])
          setSalaryRecords([])
        }
      } else {
        setPendingList([])
        setSalaryRecords([])
      }
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    apiWorker<{ id?: number }>("/api/worker/me").then((me) => setWorkerId(me.id ?? null)).catch(() => setWorkerId(null))
  }, [])

  const handleConfirmSettlement = useCallback(async (id: number) => {
    setConfirmingId(id)
    setFaceStep(id)
    try {
      if (workerId != null) {
        await apiWorker("/api/person/face-verify", { method: "POST", body: { person_id: workerId } })
      }
      setFaceStep(null)
      await apiWorker(`/api/settlement/confirm/${id}`, { method: "POST", body: { action: "confirm" } })
      setPendingList((prev) => prev.filter((s) => s.id !== id))
      await loadData()
    } catch {
      setFaceStep(null)
    } finally {
      setConfirmingId(null)
    }
  }, [workerId, loadData])

  const handleRejectSettlement = useCallback(async (id: number) => {
    setConfirmingId(id)
    try {
      await apiWorker(`/api/settlement/confirm/${id}`, { method: "POST", body: { action: "reject" } })
      setPendingList((prev) => prev.filter((s) => s.id !== id))
      await loadData()
    } finally {
      setConfirmingId(null)
    }
  }, [loadData])

  const handleRefresh = useCallback(async () => {
    await loadData()
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [loadData])

  const handleDownload = async (id: string) => {
    setDownloadMessage(null)
    setIsDownloading(true)
    try {
      const result = await downloadSettlementSlip(id)
      if (result.ok) {
        setDownloadMessage({ type: "success", text: "工资条已下载" })
        setTimeout(() => setDownloadMessage(null), 2000)
      } else {
        setDownloadMessage({ type: "error", text: result.message })
      }
    } catch (e) {
      setDownloadMessage({ type: "error", text: (e as Error).message || "下载失败，请稍后重试" })
    } finally {
      setIsDownloading(false)
    }
  }

  const currentMonthSalary = salaryRecords[0]
  const lastMonthSalary = salaryRecords[1]
  const totalThisYear = salaryRecords.reduce((acc, record) => acc + record.total, 0)
  const avgSalary = salaryRecords.length > 0 ? Math.round(totalThisYear / salaryRecords.length) : 0

  const salaryChange = currentMonthSalary && lastMonthSalary ? currentMonthSalary.total - lastMonthSalary.total : 0
  const changePercent = lastMonthSalary && lastMonthSalary.total ? ((salaryChange / lastMonthSalary.total) * 100).toFixed(1) : "0"

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PullRefresh onRefresh={handleRefresh} className="pb-24 flex-1 min-h-0">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 px-4 pt-4 pb-16 text-primary-foreground">
        <PageHeader title="工资查询" backHref="/h5" transparent />

        {/* Current Month */}
        <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm mt-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-80">{currentMonthSalary?.month ?? "本月"}（预计）</span>
              <Badge className={currentMonthSalary ? statusConfig[currentMonthSalary.status].color : "bg-muted"}>
                {currentMonthSalary ? statusConfig[currentMonthSalary.status].label : "—"}
              </Badge>
            </div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-sm">¥</span>
              <span className="text-4xl font-bold">{(currentMonthSalary?.total ?? 0).toLocaleString()}</span>
            </div>
            {currentMonthSalary && lastMonthSalary && (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* 待确认结算单 */}
      {pendingList.length > 0 && (
        <div className="px-4 -mt-8 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">待确认结算单</CardTitle>
              <p className="text-xs text-muted-foreground">人脸验证（占位）通过后可确认</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div
                      className="flex flex-col cursor-pointer"
                      onClick={() => {
                        setPreviewSettlement(s)
                        setPreviewOpen(true)
                      }}
                    >
                      <p className="font-medium text-sm">{s.period_start} ～ {s.period_end}</p>
                      <p className="text-lg font-semibold text-primary">¥{(s.amount_due ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">点击查看详细考勤与结算信息</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={confirmingId !== null}
                        onClick={() => handleRejectSettlement(s.id)}
                      >
                        驳回
                      </Button>
                      <Button
                        size="sm"
                        disabled={confirmingId !== null}
                        onClick={() => handleConfirmSettlement(s.id!)}
                      >
                        {faceStep === s.id ? "验证中..." : confirmingId === s.id ? "提交中..." : "确认"}
                      </Button>
                    </div>
                  </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 -mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">本月出勤</p>
                <p className="text-xl font-bold">{currentMonthSalary?.workDays ?? 0}<span className="text-sm font-normal">天</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">工作时长</p>
                <p className="text-xl font-bold">{currentMonthSalary?.workHours ?? 0}<span className="text-sm font-normal">h</span></p>
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
                <span className="font-medium">¥{(currentMonthSalary?.baseSalary ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">加班费</span>
                <span className="font-medium text-green-600">+¥{(currentMonthSalary?.overtimePay ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">奖金/补贴</span>
                <span className="font-medium text-green-600">+¥{(currentMonthSalary?.bonus ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">扣款</span>
                <span className="font-medium text-red-500">-¥{(currentMonthSalary?.deductions ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 font-semibold">
                <span>实发金额</span>
                <span className="text-primary text-lg">¥{(currentMonthSalary?.total ?? 0).toLocaleString()}</span>
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
                    setDownloadMessage(null)
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
      <Dialog open={showDetail} onOpenChange={(open) => { setShowDetail(open); if (!open) setDownloadMessage(null) }}>
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

              {downloadMessage && (
                <p className={cn(
                  "text-sm text-center py-2 rounded-md",
                  downloadMessage.type === "success" ? "text-green-600 bg-green-50" : "text-destructive bg-destructive/10"
                )}>
                  {downloadMessage.text}
                </p>
              )}
              <Button 
                className="w-full active:scale-95 transition-transform" 
                variant="outline"
                onClick={() => selectedRecord && handleDownload(selectedRecord.id)}
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

      {/* 结算单详情预览（考勤+确认提示） */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>结算单详情</DialogTitle>
          </DialogHeader>
          {previewSettlement && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <p>结算周期：{previewSettlement.period_start} ～ {previewSettlement.period_end}</p>
                <p>应发金额：<span className="font-semibold text-primary">¥{(previewSettlement.amount_due ?? 0).toLocaleString()}</span></p>
              </div>
              {(() => {
                const raw = previewSettlement.sign_image_snapshot
                const url = buildFileUrl(raw)
                return url
                  ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">签名预览：</p>
                  <div className="border rounded-md p-2 inline-flex bg-white">
                    <img
                      src={url}
                      alt="签名"
                      className="h-16 w-auto object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                    />
                  </div>
                </div>
                  ) : null
              })()}
              <p className="text-xs text-muted-foreground">
                详细考勤明细可在「考勤」和「工资查询」中查看。本次确认将作为电子结算记录存档，不可随意篡改。
              </p>
              <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                电子签名：确认即视为已在结算单上进行电子签名
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPreviewOpen(false)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1"
                  disabled={confirmingId !== null}
                  onClick={() => {
                    setPreviewOpen(false)
                    if (previewSettlement?.id) {
                      handleConfirmSettlement(previewSettlement.id)
                    }
                  }}
                >
                  {confirmingId === previewSettlement.id ? "提交中..." : "确认结算"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </PullRefresh>
      <BottomNav />
    </div>
  )
}
