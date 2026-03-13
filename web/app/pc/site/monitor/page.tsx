"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Wrench, FileText, Plus, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { HomeButton } from "@/components/pc/home-button"
import { api } from "@/lib/api"

interface BoardRes {
  projects: { org_id: number; org_name: string; expected: number; count: number }[]
  total: number
  total_expected: number
}

interface EquipmentItem {
  id: number
  org_id?: number
  org_name?: string
  name: string
  code?: string
  status: string
  updated_at?: string
}

interface SiteLogItem {
  id: number
  org_id?: number
  org_name?: string
  log_type: string
  content?: string
  user_name?: string
  created_at: string
}

export default function SiteMonitorPage() {
  const [board, setBoard] = useState<BoardRes | null>(null)
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [siteLogs, setSiteLogs] = useState<SiteLogItem[]>([])
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [eqDialogOpen, setEqDialogOpen] = useState(false)
  const [newLog, setNewLog] = useState({ org_id: "none", log_type: "备注", content: "" })
  const [newEq, setNewEq] = useState({ org_id: "none", name: "", code: "", status: "正常" })
  const [submitting, setSubmitting] = useState(false)

  const flattenOrg = (nodes: { id: number; name: string; children?: unknown[] }[]): { id: number; name: string }[] => {
    const out: { id: number; name: string }[] = []
    nodes.forEach((n) => {
      out.push({ id: n.id, name: n.name })
      if (n.children?.length) out.push(...flattenOrg(n.children as { id: number; name: string; children?: unknown[] }[]))
    })
    return out
  }

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api<BoardRes>("/api/site/board")
      setBoard(res)
    } catch {
      setBoard({ projects: [], total: 0, total_expected: 0 })
    }
  }, [])

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await api<{ list: EquipmentItem[] }>("/api/site/equipment", { query: { pageSize: "100" } })
      setEquipment(res.list ?? [])
    } catch {
      setEquipment([])
    }
  }, [])

  const fetchSiteLogs = useCallback(async () => {
    try {
      const res = await api<{ list: SiteLogItem[] }>("/api/site/site-log", { query: { pageSize: "50" } })
      setSiteLogs(res.list ?? [])
    } catch {
      setSiteLogs([])
    }
  }, [])

  const fetchOrg = useCallback(async () => {
    try {
      const { tree } = await api<{ tree: { id: number; name: string; children?: unknown[] }[] }>("/api/sys/org")
      setOrgList(flattenOrg(tree ?? []))
    } catch {
      setOrgList([])
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchBoard(), fetchEquipment(), fetchSiteLogs(), fetchOrg()])
    setLoading(false)
  }, [fetchBoard, fetchEquipment, fetchSiteLogs, fetchOrg])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleAddLog = async () => {
    setSubmitting(true)
    try {
      await api("/api/site/site-log", {
        method: "POST",
        body: {
          org_id: newLog.org_id && newLog.org_id !== "none" ? parseInt(newLog.org_id, 10) : undefined,
          log_type: newLog.log_type,
          content: newLog.content.trim() || undefined,
        },
      })
      setLogDialogOpen(false)
      setNewLog({ org_id: "none", log_type: "备注", content: "" })
      fetchSiteLogs()
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddEquipment = async () => {
    if (!newEq.name.trim()) return
    setSubmitting(true)
    try {
      await api("/api/site/equipment", {
        method: "POST",
        body: {
          org_id: newEq.org_id && newEq.org_id !== "none" ? parseInt(newEq.org_id, 10) : undefined,
          name: newEq.name.trim(),
          code: newEq.code.trim() || undefined,
          status: newEq.status,
        },
      })
      setEqDialogOpen(false)
      setNewEq({ org_id: "none", name: "", code: "", status: "正常" })
      fetchEquipment()
    } finally {
      setSubmitting(false)
    }
  }

  const updateEquipmentStatus = async (id: number, status: string) => {
    try {
      await api(`/api/site/equipment/${id}`, { method: "PUT", body: { status } })
      fetchEquipment()
    } catch (e) {
      console.error(e)
    }
  }

  const normalCount = equipment.filter((e) => e.status === "正常").length
  const maintainCount = equipment.filter((e) => e.status === "维修中").length
  const stoppedCount = equipment.filter((e) => e.status === "停用").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HomeButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">现场监管</h1>
            <p className="text-muted-foreground">实时在岗、机具状态与现场数据录入</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 实时概览 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">当前在岗</p>
                    <p className="text-2xl font-bold text-primary">{board?.total ?? 0}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">应在岗</p>
                    <p className="text-2xl font-bold">{board?.total_expected ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">机具正常</p>
                    <p className="text-2xl font-bold text-green-600">{normalCount}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">机具维修/停用</p>
                    <p className="text-2xl font-bold text-orange-600">{maintainCount + stoppedCount}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="equipment" className="space-y-4">
            <TabsList>
              <TabsTrigger value="equipment" className="gap-2">
                <Wrench className="h-4 w-4" />
                机具状态
              </TabsTrigger>
              <TabsTrigger value="log" className="gap-2">
                <FileText className="h-4 w-4" />
                现场录入
              </TabsTrigger>
            </TabsList>

            <TabsContent value="equipment" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>机具列表</CardTitle>
                      <CardDescription>现场机具状态维护，支持按项目筛选</CardDescription>
                    </div>
                    <Dialog open={eqDialogOpen} onOpenChange={setEqDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          新增机具
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>新增机具</DialogTitle>
                          <DialogDescription>登记现场机具，便于状态监管</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div>
                            <Label>所属项目</Label>
                            <Select value={newEq.org_id} onValueChange={(v) => setNewEq((p) => ({ ...p, org_id: v }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="可选" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">不指定</SelectItem>
                                {orgList.map((o) => (
                                  <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>名称 *</Label>
                            <Input
                              value={newEq.name}
                              onChange={(e) => setNewEq((p) => ({ ...p, name: e.target.value }))}
                              placeholder="如：塔吊A"
                            />
                          </div>
                          <div>
                            <Label>编号</Label>
                            <Input
                              value={newEq.code}
                              onChange={(e) => setNewEq((p) => ({ ...p, code: e.target.value }))}
                              placeholder="可选"
                            />
                          </div>
                          <div>
                            <Label>状态</Label>
                            <Select value={newEq.status} onValueChange={(v) => setNewEq((p) => ({ ...p, status: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="正常">正常</SelectItem>
                                <SelectItem value="维修中">维修中</SelectItem>
                                <SelectItem value="停用">停用</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEqDialogOpen(false)}>取消</Button>
                          <Button onClick={handleAddEquipment} disabled={submitting || !newEq.name.trim()}>
                            {submitting ? "提交中..." : "确定"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>编号</TableHead>
                        <TableHead>项目</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            暂无机具，点击「新增机具」登记
                          </TableCell>
                        </TableRow>
                      ) : (
                        equipment.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">{e.name}</TableCell>
                            <TableCell>{e.code ?? "-"}</TableCell>
                            <TableCell>{e.org_name ?? "-"}</TableCell>
                            <TableCell>
                              <Select
                                value={e.status}
                                onValueChange={(v) => updateEquipmentStatus(e.id, v)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="正常">正常</SelectItem>
                                  <SelectItem value="维修中">维修中</SelectItem>
                                  <SelectItem value="停用">停用</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">—</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="log" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>现场录入日志</CardTitle>
                      <CardDescription>现场情况、进场离场备注等录入记录</CardDescription>
                    </div>
                    <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          新增录入
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>现场数据录入</DialogTitle>
                          <DialogDescription>记录现场情况，便于监管与追溯</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div>
                            <Label>类型</Label>
                            <Select value={newLog.log_type} onValueChange={(v) => setNewLog((p) => ({ ...p, log_type: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="进场">进场</SelectItem>
                                <SelectItem value="离场">离场</SelectItem>
                                <SelectItem value="备注">备注</SelectItem>
                                <SelectItem value="异常">异常</SelectItem>
                                <SelectItem value="机具">机具</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>项目</Label>
                            <Select value={newLog.org_id} onValueChange={(v) => setNewLog((p) => ({ ...p, org_id: v }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="可选" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">不指定</SelectItem>
                                {orgList.map((o) => (
                                  <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>内容</Label>
                            <Textarea
                              value={newLog.content}
                              onChange={(e) => setNewLog((p) => ({ ...p, content: e.target.value }))}
                              placeholder="简要描述..."
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setLogDialogOpen(false)}>取消</Button>
                          <Button onClick={handleAddLog} disabled={submitting}>
                            {submitting ? "提交中..." : "确定"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>项目</TableHead>
                        <TableHead>内容</TableHead>
                        <TableHead>录入人</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siteLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            暂无录入记录
                          </TableCell>
                        </TableRow>
                      ) : (
                        siteLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-muted-foreground text-sm">{log.created_at}</TableCell>
                            <TableCell><Badge variant="outline">{log.log_type}</Badge></TableCell>
                            <TableCell>{log.org_name ?? "-"}</TableCell>
                            <TableCell>{log.content ?? "-"}</TableCell>
                            <TableCell>{log.user_name ?? "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
