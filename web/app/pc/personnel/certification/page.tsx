"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Camera,
  Smartphone,
  CreditCard,
  PenTool,
  Clock,
  Loader2,
} from "lucide-react"
import { api } from "@/lib/api"

type AuthRecord = {
  id: number
  work_no: string | null
  name: string
  id_card: string | null
  mobile: string | null
  status: string
  updated_at: string
  org_name: string | null
  id_filled: boolean
  mobile_filled: boolean
  filled: boolean
  auth_review_status?: "pending" | "approved" | "rejected"
}

const statusConfig = {
  passed: { label: "已通过", color: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
  failed: { label: "未通过", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  pending: { label: "待认证", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
}

const reviewConfig = {
  pending: { label: "待审核", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
  approved: { label: "已通过", color: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
  rejected: { label: "已驳回", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
} as const

export default function CertificationPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filledTab, setFilledTab] = useState<"all" | "1" | "0">("all")
  const [list, setList] = useState<AuthRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<AuthRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [reviewingId, setReviewingId] = useState<number | null>(null)

  const loadList = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filledTab === "1") params.set("filled", "1")
    if (filledTab === "0") params.set("filled", "0")
    params.set("pageSize", "50")
    api<{ list: AuthRecord[]; total: number }>(`/api/person/auth?${params}`)
      .then((res) => {
        setList(res.list || [])
        setTotal(res.total || 0)
        setSelectedRecord((prev) => {
          if (!prev) return null
          const next = (res.list || []).find((r) => r.id === prev.id)
          return next ?? prev
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filledTab])

  const handleAuthReview = useCallback(async (personId: number, status: "approved" | "rejected") => {
    setReviewingId(personId)
    try {
      await api(`/api/person/${personId}/auth-review`, { method: "PUT", body: { status } })
      loadList()
    } finally {
      setReviewingId(null)
    }
  }, [loadList])

  useEffect(() => {
    loadList()
  }, [loadList])

  const filteredRecords = list.filter(
    (r) =>
      !searchTerm ||
      (r.name || "").includes(searchTerm) ||
      (r.work_no || "").includes(searchTerm) ||
      (r.id_card || "").includes(searchTerm)
  )

  const filledCount = list.filter((r) => r.filled).length
  const getStatusBadge = (filled: boolean) => (
    <Badge variant="outline" className={filled ? statusConfig.passed.color : statusConfig.pending.color}>
      {filled ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {filled ? "已补全" : "待补全"}
    </Badge>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">认证管理</h1>
        <p className="text-muted-foreground">查看人员身份证、手机号登记及补全状态；人脸/电子签对接后可在此展示</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">身份证登记</p>
                <p className="text-2xl font-bold">{list.filter((r) => r.id_filled).length}</p>
                <p className="text-xs text-muted-foreground">共 {total} 人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <Smartphone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">手机绑定</p>
                <p className="text-2xl font-bold">{list.filter((r) => r.mobile_filled).length}</p>
                <p className="text-xs text-muted-foreground">共 {total} 人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-chart-3/10 p-3">
                <Camera className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">人脸采集</p>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">对接后展示</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-chart-5/10 p-3">
                <PenTool className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已补全（身份证+手机）</p>
                <p className="text-2xl font-bold">{filledCount}</p>
                <p className="text-xs text-muted-foreground">共 {total} 人</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>认证记录</CardTitle>
              <CardDescription>按身份证/手机是否已登记筛选</CardDescription>
            </div>
            <Tabs value={filledTab} onValueChange={(v) => setFilledTab(v as "all" | "1" | "0")}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="1">已补全</TabsTrigger>
                <TabsTrigger value="0">未补全</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、工号、身份证号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>人员信息</TableHead>
                  <TableHead>身份证号</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>身份证</TableHead>
                  <TableHead>手机绑定</TableHead>
                  <TableHead>综合</TableHead>
                  <TableHead>审核状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{record.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{record.name}</p>
                          <p className="text-xs text-muted-foreground">{record.work_no || record.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{record.id_card || "—"}</TableCell>
                    <TableCell className="text-sm">{record.mobile || "—"}</TableCell>
                    <TableCell>{getStatusBadge(record.id_filled)}</TableCell>
                    <TableCell>{getStatusBadge(record.mobile_filled)}</TableCell>
                    <TableCell>{getStatusBadge(record.filled)}</TableCell>
                    <TableCell>
                      {(() => {
                        const s = record.auth_review_status || "pending"
                        const cfg = reviewConfig[s] || reviewConfig.pending
                        const Icon = cfg.icon
                        return (
                          <Badge variant="outline" className={cfg.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setSelectedRecord(record)
                          setIsDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && filteredRecords.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">暂无记录</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>认证详情 - {selectedRecord?.name}</DialogTitle>
            <DialogDescription>身份证/手机登记状态；人脸与电子签对接后可在此审核</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">姓名</p>
                  <p className="font-medium">{selectedRecord.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">工号</p>
                  <p className="font-medium">{selectedRecord.work_no || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">身份证号</p>
                  <p className="font-mono text-sm">{selectedRecord.id_card || "未登记"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">手机号</p>
                  <p className="text-sm">{selectedRecord.mobile || "未登记"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  {getStatusBadge(selectedRecord.filled)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">审核状态</p>
                  {(() => {
                    const s = selectedRecord.auth_review_status || "pending"
                    const cfg = reviewConfig[s] || reviewConfig.pending
                    const Icon = cfg.icon
                    return (
                      <Badge variant="outline" className={cfg.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    )
                  })()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">人脸采集、电子签名等对接第三方后在此展示与审核</p>
              {(selectedRecord.auth_review_status === "pending" || !selectedRecord.auth_review_status) && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    disabled={reviewingId === selectedRecord.id}
                    onClick={() => handleAuthReview(selectedRecord.id, "approved")}
                  >
                    {reviewingId === selectedRecord.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    审核通过
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={reviewingId === selectedRecord.id}
                    onClick={() => handleAuthReview(selectedRecord.id, "rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    驳回
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
