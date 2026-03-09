"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Filter,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calculator,
  Wallet,
} from "lucide-react"
import { api } from "@/lib/api"
import { HomeButton } from "@/components/pc/home-button"

interface SettlementItem {
  id: number
  person_id: number
  person_name?: string
  work_no?: string
  period_start: string
  period_end: string
  total_hours: number
  amount_due?: number
  amount_paid?: number
  status: string
}

interface ConfirmRes {
  list: SettlementItem[]
  total: number
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  待确认: { label: "待确认", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  已确认: { label: "已确认", color: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle },
  已发放: { label: "已发放", color: "bg-accent/10 text-accent border-accent/20", icon: Wallet },
  已驳回: { label: "已驳回", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
}

export default function SettlementGeneratePage() {
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPushOpen, setIsPushOpen] = useState(false)
  const [list, setList] = useState<SettlementItem[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [page, setPage] = useState(1)
  const [editItem, setEditItem] = useState<SettlementItem | null>(null)
  const [editAmountDue, setEditAmountDue] = useState("")
  const [editAmountPaid, setEditAmountPaid] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [genPeriodStart, setGenPeriodStart] = useState("2024-03-01")
  const [genPeriodEnd, setGenPeriodEnd] = useState("2024-03-31")
  const [stats, setStats] = useState({ total: 0, 待确认: 0, 已确认: 0, 已发放: 0 })

  const fetchList = useCallback(async () => {
    try {
      const listQuery: Record<string, string> = { page: String(page), pageSize: "20" }
      if (statusFilter) listQuery.status = statusFilter
      const [res, allRes, p1Res, p2Res, p3Res] = await Promise.all([
        api<ConfirmRes>("/api/settlement/confirm", { query: listQuery }),
        api<{ total: number }>("/api/settlement/confirm", { query: { pageSize: "1" } }),
        api<{ total: number }>("/api/settlement/confirm", { query: { status: "待确认", pageSize: "1" } }),
        api<{ total: number }>("/api/settlement/confirm", { query: { status: "已确认", pageSize: "1" } }),
        api<{ total: number }>("/api/settlement/confirm", { query: { status: "已发放", pageSize: "1" } }),
      ])
      setList(res.list ?? [])
      setTotal(res.total ?? 0)
      setStats({
        total: allRes.total ?? 0,
        待确认: p1Res.total ?? 0,
        已确认: p2Res.total ?? 0,
        已发放: p3Res.total ?? 0,
      })
    } catch {
      setList([])
      setTotal(0)
      setStats({ total: 0, 待确认: 0, 已确认: 0, 已发放: 0 })
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const filteredData = list.filter(
    (item) =>
      (item.person_name ?? "").includes(searchTerm) ||
      String(item.id).includes(searchTerm) ||
      (item.work_no ?? "").includes(searchTerm)
  )

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredData.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredData.map((d) => d.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await api("/api/settlement/generate", {
        method: "POST",
        body: { period_start: genPeriodStart, period_end: genPeriodEnd },
      })
      await fetchList()
    } finally {
      setIsGenerating(false)
    }
  }

  const openEdit = (item: SettlementItem) => {
    setEditItem(item)
    setEditAmountDue(String(item.amount_due ?? 0))
    setEditAmountPaid(String(item.amount_paid ?? 0))
    setIsEditOpen(true)
  }

  const handleConfirm = async () => {
    if (!editItem) return
    try {
      await api(`/api/settlement/confirm/${editItem.id}`, {
        method: "POST",
        body: { action: "confirm", amount_due: parseFloat(editAmountDue), amount_paid: parseFloat(editAmountPaid) },
      })
      setIsEditOpen(false)
      setEditItem(null)
      await fetchList()
    } catch (e) {
      console.error(e)
    }
  }

  const handleReject = async () => {
    if (!editItem) return
    try {
      await api(`/api/settlement/confirm/${editItem.id}`, { method: "POST", body: { action: "reject" } })
      setIsEditOpen(false)
      setEditItem(null)
      await fetchList()
    } catch (e) {
      console.error(e)
    }
  }

  const handlePush = async () => {
    try {
      await api("/api/settlement/push-notify", {
        method: "POST",
        body: selectedItems.length > 0 ? { ids: selectedItems } : {},
      })
      setIsPushOpen(false)
      setSelectedItems([])
      await fetchList()
    } catch (e) {
      console.error(e)
    }
  }

  const getStatusBadge = (item: { status: string; amount_paid?: number }) => {
    const displayStatus = item.status === "已确认" && (item.amount_paid ?? 0) > 0 ? "已发放" : item.status
    const config = statusConfig[displayStatus as keyof typeof statusConfig]
    return (
      <Badge variant="outline" className={`gap-1 ${config?.color ?? ""}`}>
        {config?.icon && <config.icon className="h-3 w-3" />}
        {config?.label ?? displayStatus}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HomeButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">结算单生成与确认</h1>
            <p className="text-muted-foreground">基于工时生成结算单，在线审核与调整</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-36"
            value={genPeriodStart}
            onChange={(e) => setGenPeriodStart(e.target.value)}
          />
          <span className="text-muted-foreground">～</span>
          <Input
            type="date"
            className="w-36"
            value={genPeriodEnd}
            onChange={(e) => setGenPeriodEnd(e.target.value)}
          />
          <Button variant="outline" className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
            <Calculator className="h-4 w-4" />
            {isGenerating ? "生成中..." : "批量生成"}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">全部结算单</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">待确认</p>
                <p className="text-2xl font-bold">{stats.待确认.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已确认</p>
                <p className="text-2xl font-bold">{stats.已确认.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已发放</p>
                <p className="text-2xl font-bold">{stats.已发放.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 结算单列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>结算单列表</CardTitle>
              <CardDescription>查看和管理结算单</CardDescription>
            </div>
            <Button
              className="gap-2"
              disabled={selectedItems.length === 0}
              onClick={() => setIsPushOpen(true)}
            >
              <Send className="h-4 w-4" />
              批量推送 ({selectedItems.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)} className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="待确认">待确认</TabsTrigger>
                <TabsTrigger value="已确认">已确认</TabsTrigger>
                <TabsTrigger value="已发放">已发放</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名、结算单号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-60 pl-9"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredData.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>结算单号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>结算周期</TableHead>
                    <TableHead>工时</TableHead>
                    <TableHead>应发金额</TableHead>
                    <TableHead>已发金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.person_name ?? "-"}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {item.work_no ?? "-"}
                      </TableCell>
                      <TableCell>{item.period_start}～{item.period_end}</TableCell>
                      <TableCell>{item.total_hours ?? 0} 小时</TableCell>
                      <TableCell className="font-medium text-primary">
                        ¥{(item.amount_due ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-accent">
                        ¥{(item.amount_paid ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === "待确认" && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                              调整
                            </Button>
                          )}
                          {item.status === "待确认" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary"
                              onClick={() => {
                                setSelectedItems([item.id])
                                setIsPushOpen(true)
                              }}
                            >
                              推送
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 调整结算单弹窗 */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setEditItem(null) } setIsEditOpen(open) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>调整结算单</DialogTitle>
            <DialogDescription>修改应发放金额和已发放金额</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>姓名</Label>
                  <Input value={editItem.person_name ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>结算周期</Label>
                  <Input value={`${editItem.period_start}～${editItem.period_end}`} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>总工时</Label>
                <Input value={`${editItem.total_hours ?? 0} 小时`} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>应发金额</Label>
                  <Input
                    type="number"
                    value={editAmountDue}
                    onChange={(e) => setEditAmountDue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>已发金额</Label>
                  <Input
                    type="number"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            {editItem?.status === "待确认" && (
              <Button variant="destructive" onClick={handleReject}>
                驳回
              </Button>
            )}
            <Button onClick={handleConfirm}>确认调整</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量推送弹窗 */}
      <Dialog open={isPushOpen} onOpenChange={setIsPushOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量推送确认</DialogTitle>
            <DialogDescription>
              即将向 {selectedItems.length} 名人员推送结算单确认通知
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                推送后，相关人员将通过短信和微信收到结算单确认通知，请确保信息无误。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPushOpen(false)}>
              取消
            </Button>
            <Button onClick={handlePush}>确认推送</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
