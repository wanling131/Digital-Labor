"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import {
  Search,
  Eye,
  Download,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
} from "lucide-react"
import { api, downloadContractPdf } from "@/lib/api"

type ContractItem = {
  id: number
  title: string
  person_id: number
  person_name: string
  work_no: string | null
  status: string
  deadline: string | null
  signed_at: string | null
  pdf_path: string | null
  flow_id?: string | null
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  已签署: { label: "已签署", color: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
  待签署: { label: "待签署", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  已作废: { label: "已作废", color: "bg-muted text-muted-foreground border-muted", icon: XCircle },
}

function isOverdue(deadline: string | null, status: string): boolean {
  if (status !== "待签署" || !deadline) return false
  return new Date(deadline) < new Date()
}

export default function ContractStatusPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [list, setList] = useState<ContractItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [pdfMessage, setPdfMessage] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    params.set("page", String(page))
    params.set("pageSize", "20")
    api<{ list: ContractItem[]; total: number }>(`/api/contract/status?${params}`)
      .then((res) => {
        setList(res.list || [])
        setTotal(res.total || 0)
      })
      .catch(() => {
        setList([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [statusFilter, page])

  const filteredList = list.filter(
    (c) =>
      !searchTerm ||
      (c.person_name || "").includes(searchTerm) ||
      (c.work_no || "").includes(searchTerm) ||
      (c.title || "").includes(searchTerm)
  )

  const signedCount = list.filter((c) => c.status === "已签署").length
  const pendingCount = list.filter((c) => c.status === "待签署").length
  const overdueCount = list.filter((c) => isOverdue(c.deadline, c.status)).length
  const signRate = list.length ? Math.round((signedCount / list.length) * 100) : 0

  const getStatusBadge = (c: ContractItem) => {
    const isOver = isOverdue(c.deadline, c.status)
    const status = isOver ? "待签署" : c.status
    const config = statusConfig[status] || statusConfig.待签署
    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        <config.icon className="h-3 w-3" />
        {isOver ? "即将逾期/已逾期" : config.label}
      </Badge>
    )
  }

  const handleDownloadPdf = async (id: number) => {
    setDownloadingId(id)
    setPdfMessage(null)
    const result = await downloadContractPdf(String(id))
    setDownloadingId(null)
    if (!result.ok) setPdfMessage(result.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">签约状态</h1>
        <p className="text-muted-foreground">实时查看合同签署进度，已签署可下载 PDF</p>
      </div>

      {pdfMessage && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">{pdfMessage}</div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">签约进度</p>
                <p className="text-2xl font-bold">{signRate}%</p>
                <Progress value={signRate} className="mt-2 h-2" />
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已签署</p>
                <p className="text-2xl font-bold">{signedCount}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">待签署</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <div className="rounded-full bg-warning/10 p-3">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已逾期/即将逾期</p>
                <p className="text-2xl font-bold">{overdueCount}</p>
              </div>
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>合同签署列表</CardTitle>
          <CardDescription>共 {total} 条，已签署可下载 PDF（对接电子签后存证）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、工号、合同标题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="已签署">已签署</SelectItem>
                <SelectItem value="待签署">待签署</SelectItem>
                <SelectItem value="已作废">已作废</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>合同标题</TableHead>
                  <TableHead>签约人</TableHead>
                  <TableHead>工号</TableHead>
                  <TableHead>截止日</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>签署时间</TableHead>
                  <TableHead>存证编号</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.person_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.work_no || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.deadline || "—"}</TableCell>
                    <TableCell>{getStatusBadge(c)}</TableCell>
                    <TableCell className="text-muted-foreground">{c.signed_at || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{c.status === "已签署" ? (c.flow_id || "—") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSelectedContract(c); setIsDetailOpen(true) }}>
                          <Eye className="h-4 w-4" />
                          详情
                        </Button>
                        {c.status === "已签署" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            disabled={downloadingId === c.id}
                            onClick={() => handleDownloadPdf(c.id)}
                          >
                            {downloadingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            下载
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && filteredList.length === 0 && <p className="py-8 text-center text-muted-foreground">暂无合同</p>}
          {total > 20 && (
            <div className="mt-4 flex justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground">第 {page} 页，共 {total} 条</span>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
            <DialogDescription>签署信息与存证（对接电子签后存证编号由第三方返回）</DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">签约人</p><p>{selectedContract.person_name}</p></div>
                <div><p className="text-muted-foreground">工号</p><p>{selectedContract.work_no || "—"}</p></div>
                <div><p className="text-muted-foreground">截止日</p><p>{selectedContract.deadline || "—"}</p></div>
                <div><p className="text-muted-foreground">状态</p>{getStatusBadge(selectedContract)}</div>
                <div><p className="text-muted-foreground">签署时间</p><p>{selectedContract.signed_at || "—"}</p></div>
                {selectedContract.status === "已签署" && (
                  <div className="col-span-2"><p className="text-muted-foreground">存证编号</p><p className="font-mono text-xs break-all">{selectedContract.flow_id || "—"}</p></div>
                )}
              </div>
              {selectedContract.status === "已签署" && (
                <Button variant="outline" className="w-full gap-2" disabled={downloadingId === selectedContract.id} onClick={() => handleDownloadPdf(selectedContract.id)}>
                  {downloadingId === selectedContract.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  下载合同 PDF
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
