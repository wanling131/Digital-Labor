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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Filter,
  ArrowRight,
  AlertTriangle,
  UserX,
  UserCheck,
  FileText,
  Building2,
  Clock,
} from "lucide-react"
import { api } from "@/lib/api"

const statusFlow = [
  { key: "预注册", label: "预注册", color: "bg-muted" },
  { key: "已实名", label: "已实名", color: "bg-chart-3/20" },
  { key: "已签约", label: "已签约", color: "bg-primary/20" },
  { key: "已进场", label: "已进场", color: "bg-accent/20" },
  { key: "已离场", label: "已离场", color: "bg-chart-5/20" },
]

interface PersonItem {
  id: number
  work_no?: string
  name: string
  org_name?: string
  status: string
  updated_at?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  预注册: { label: "预注册", color: "bg-muted text-muted-foreground" },
  已实名: { label: "已实名", color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  已签约: { label: "已签约", color: "bg-primary/10 text-primary border-primary/20" },
  已进场: { label: "已进场", color: "bg-accent/10 text-accent border-accent/20" },
  已离场: { label: "已离场", color: "bg-chart-5/10 text-chart-5 border-chart-5/20" },
  黑名单: { label: "黑名单", color: "bg-destructive/10 text-destructive border-destructive/20" },
}

const statusKeys = ["预注册", "已实名", "已签约", "已进场", "已离场", "黑名单"]

export default function StatusManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false)
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [personList, setPersonList] = useState<PersonItem[]>([])
  const [editPerson, setEditPerson] = useState<PersonItem | null>(null)
  const [editStatus, setEditStatus] = useState("")
  const [page, setPage] = useState(1)

  const fetchStatusCounts = useCallback(async () => {
    try {
      const res = await api<{ list: { status: string; count: number }[] }>("/api/person/status")
      const map: Record<string, number> = {}
      res.list?.forEach((r) => { map[r.status] = r.count })
      setStatusCounts(map)
    } catch { setStatusCounts({}) }
  }, [])

  const fetchList = useCallback(async () => {
    try {
      const query: Record<string, string> = { page: String(page), pageSize: "50" }
      if (activeTab !== "all") query.status = activeTab
      const res = await api<{ list: PersonItem[] }>("/api/person/archive", { query })
      setPersonList(res.list ?? [])
    } catch { setPersonList([]) }
  }, [activeTab, page])

  useEffect(() => { fetchStatusCounts() }, [fetchStatusCounts])
  useEffect(() => { fetchList() }, [fetchList])

  const filteredData = personList.filter((p) =>
    (p.name ?? "").includes(searchTerm) || (p.work_no ?? "").includes(searchTerm)
  )

  const handleChangeStatus = async () => {
    if (!editPerson || !editStatus) return
    try {
      await api("/api/person/status/batch", { method: "POST", body: { ids: [editPerson.id], status: editStatus } })
      setEditPerson(null)
      setIsChangeStatusOpen(false)
      fetchStatusCounts()
      fetchList()
    } catch (e) { console.error(e) }
  }

  const stats = statusKeys.map((k) => ({ key: k, label: statusLabels[k]?.label ?? k, count: statusCounts[k] ?? 0 }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">状态管理</h1>
          <p className="text-muted-foreground">管理人员状态流转及黑名单</p>
        </div>
      </div>

      {/* 状态流程图 */}
      <Card>
        <CardHeader>
          <CardTitle>人员状态流程</CardTitle>
          <CardDescription>标准状态流转路径：预注册 - 已实名 - 已签约 - 已进场 - 已离场</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between px-8">
            {statusFlow.map((status, index) => (
              <div key={status.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${status.color} border-2 border-border`}
                  >
                    {status.key === "pre_register" && <Clock className="h-7 w-7 text-muted-foreground" />}
                    {status.key === "real_name" && <UserCheck className="h-7 w-7 text-chart-3" />}
                    {status.key === "signed" && <FileText className="h-7 w-7 text-primary" />}
                    {status.key === "on_site" && <Building2 className="h-7 w-7 text-accent" />}
                    {status.key === "off_site" && <UserX className="h-7 w-7 text-chart-5" />}
                  </div>
                  <p className="mt-2 text-sm font-medium">{status.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {(statusCounts[status.key] ?? 0).toLocaleString()}人
                  </p>
                </div>
                {index < statusFlow.length - 1 && (
                  <ArrowRight className="mx-4 h-6 w-6 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 状态统计 */}
      <div className="grid gap-4 md:grid-cols-6">
        {stats.map((item) => (
          <Card
            key={item.key}
            className={`cursor-pointer transition-colors hover:border-primary ${
              activeTab === item.key ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setActiveTab(item.key)}
          >
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{item.count.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 人员列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>人员状态列表</CardTitle>
              <CardDescription>管理人员状态变更</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isBlacklistOpen} onOpenChange={setIsBlacklistOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    黑名单管理
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加黑名单</DialogTitle>
                    <DialogDescription>将人员加入黑名单，限制其后续入场</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>选择人员</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="搜索并选择人员" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emp001">张三 (EMP001)</SelectItem>
                          <SelectItem value="emp002">李四 (EMP002)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>加入原因</Label>
                      <Textarea placeholder="请输入加入黑名单的原因" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBlacklistOpen(false)}>
                      取消
                    </Button>
                    <Button variant="destructive" onClick={() => setIsBlacklistOpen(false)}>
                      确认添加
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、工号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>班组</TableHead>
                <TableHead>当前状态</TableHead>
                <TableHead>状态历史</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((person) => (
                <TableRow key={person.id} className={person.status === "黑名单" ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium">{person.work_no ?? person.id}</TableCell>
                  <TableCell>{person.name}</TableCell>
                  <TableCell>{person.org_name ?? "-"}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={(statusLabels[person.status] ?? statusLabels["预注册"]).color}>
                      {statusLabels[person.status]?.label ?? person.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{person.updated_at ?? "-"}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {person.status !== "黑名单" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditPerson(person)
                          setEditStatus("")
                          setIsChangeStatusOpen(true)
                        }}
                      >
                        变更状态
                      </Button>
                    )}
                    {person.status === "黑名单" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent"
                        onClick={() => {
                          setEditPerson(person)
                          setEditStatus("已离场")
                          setIsChangeStatusOpen(true)
                        }}
                      >
                        移出黑名单
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isChangeStatusOpen} onOpenChange={(o) => { if (!o) setEditPerson(null); setIsChangeStatusOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>变更状态{editPerson ? ` - ${editPerson.name}` : ""}</DialogTitle>
            <DialogDescription>选择新的状态并确认变更</DialogDescription>
          </DialogHeader>
          {editPerson && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>当前状态</Label>
                <Badge variant="outline" className={(statusLabels[editPerson.status] ?? statusLabels["预注册"]).color}>
                  {statusLabels[editPerson.status]?.label ?? editPerson.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>变更为</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue placeholder="选择新状态" /></SelectTrigger>
                  <SelectContent>
                    {statusKeys.filter((k) => k !== editPerson.status).map((k) => (
                      <SelectItem key={k} value={k}>{statusLabels[k]?.label ?? k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeStatusOpen(false)}>取消</Button>
            <Button onClick={handleChangeStatus} disabled={!editStatus}>确认变更</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
