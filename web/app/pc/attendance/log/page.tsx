"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HomeButton } from "@/components/pc/home-button"
import { Label } from "@/components/ui/label"
import { Clock, Search, RefreshCw, Loader2, Download } from "lucide-react"
import { api } from "@/lib/api"

interface LogItem {
  id: number
  person_id: number
  person_name: string
  work_no?: string
  org_name?: string
  punch_at: string
  type: string
  source?: string
  created_at: string
}

export default function AttendanceLogPage() {
  const [list, setList] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([])
  const [orgId, setOrgId] = useState("")
  const [start, setStart] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [keyword, setKeyword] = useState("")

  const flattenOrg = (nodes: { id: number; name: string; children?: unknown[] }[]): { id: number; name: string }[] => {
    const out: { id: number; name: string }[] = []
    nodes.forEach((n) => {
      out.push({ id: n.id, name: n.name })
      if (n.children?.length) out.push(...flattenOrg(n.children as { id: number; name: string; children?: unknown[] }[]))
    })
    return out
  }

  const fetchLog = useCallback(async () => {
    setLoading(true)
    try {
      const q: Record<string, string> = { page: String(page), pageSize: String(pageSize) }
      if (orgId) q.org_id = orgId
      if (start) q.start = start
      if (end) q.end = end
      const res = await api<{ list: LogItem[]; total: number }>("/api/attendance/log", { query: q })
      setList(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, orgId, start, end])

  const fetchOrg = useCallback(async () => {
    try {
      const { tree } = await api<{ tree: { id: number; name: string; children?: unknown[] }[] }>("/api/sys/org")
      setOrgList(flattenOrg(tree ?? []))
    } catch {
      setOrgList([])
    }
  }, [])

  useEffect(() => {
    fetchLog()
  }, [fetchLog])
  useEffect(() => {
    fetchOrg()
  }, [fetchOrg])

  const filteredList = keyword.trim()
    ? list.filter(
        (r) =>
          (r.person_name ?? "").includes(keyword) ||
          (r.work_no ?? "").includes(keyword)
      )
    : list

  const sourceLabel: Record<string, string> = {
    h5: "H5打卡",
    import: "考勤导入",
    app: "APP",
  }

  const handleExport = () => {
    const headers = ["姓名", "工号", "项目", "打卡时间", "类型", "来源"]
    const rows = filteredList.map((r) => [
      r.person_name ?? "",
      r.work_no ?? "",
      r.org_name ?? "",
      r.punch_at ?? "",
      r.type === "in" ? "上班" : "下班",
      sourceLabel[r.source ?? ""] ?? r.source ?? "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `打卡日志_${start}_${end}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HomeButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">打卡日志</h1>
            <p className="text-muted-foreground">查看本地/现场打卡流水，支持考勤导入与 H5 打卡记录</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLog()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">开始日期</Label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">结束日期</Label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-40"
              />
            </div>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="全部项目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部项目</SelectItem>
                {orgList.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、工号..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-48 pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              导出
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>项目</TableHead>
                    <TableHead>打卡时间</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>来源</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        暂无打卡记录。考勤导入或 H5 打卡后将在此显示流水。
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredList.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.person_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.work_no ?? "-"}</TableCell>
                        <TableCell>{r.org_name ?? "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.punch_at}</TableCell>
                        <TableCell>{r.type === "in" ? "上班" : "下班"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {sourceLabel[r.source ?? ""] ?? r.source ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {total > pageSize && (
                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <span>
                    共 {total} 条，当前第 {page} 页
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * pageSize >= total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
