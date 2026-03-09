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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Filter,
  Send,
  FileText,
  Users,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { HomeButton } from "@/components/pc/home-button"

interface PersonItem {
  id: number
  work_no?: string
  name: string
  org_name?: string
  status?: string
  created_at?: string
}

interface TemplateItem {
  id: number
  name: string
}

interface ContractStatusItem {
  id: number
  title?: string
  person_name?: string
  status?: string
  deadline?: string
}

export default function ContractInitiatePage() {
  const [selectedPersonnel, setSelectedPersonnel] = useState<number[]>([])
  const [isInitiateOpen, setIsInitiateOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [unsignedList, setUnsignedList] = useState<PersonItem[]>([])
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [pendingTasks, setPendingTasks] = useState<ContractStatusItem[]>([])
  const [templateId, setTemplateId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const [orgId, setOrgId] = useState("all")
  const [isLaunching, setIsLaunching] = useState(false)
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([])

  const fetchOrg = useCallback(async () => {
    try {
      const { tree } = await api<{ tree: { id: number; name: string; children?: unknown[] }[] }>("/api/sys/org")
      const flatten = (nodes: { id: number; name: string; children?: unknown[] }[]): { id: number; name: string }[] => {
        const out: { id: number; name: string }[] = []
        nodes.forEach((n) => {
          out.push({ id: n.id, name: n.name })
          if (n.children?.length) out.push(...flatten(n.children as { id: number; name: string; children?: unknown[] }[]))
        })
        return out
      }
      setOrgList(flatten(tree ?? []))
    } catch { setOrgList([]) }
  }, [])

  const fetchUnsigned = useCallback(async () => {
    try {
      const q: Record<string, string> = { contract_signed: "0", pageSize: "100" }
      if (orgId !== "all") q.org_id = orgId
      const res = await api<{ list: PersonItem[] }>("/api/person/archive", { query: q })
      setUnsignedList(res.list ?? [])
    } catch { setUnsignedList([]) }
  }, [orgId])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api<{ list: TemplateItem[] }>("/api/contract/template")
      setTemplates(res.list ?? [])
    } catch { setTemplates([]) }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api<{ list: ContractStatusItem[]; total: number }>("/api/contract/status", {
        query: { status: "待签署", pageSize: "50" },
      })
      setPendingTasks(res.list ?? [])
    } catch { setPendingTasks([]) }
  }, [])

  useEffect(() => { fetchOrg() }, [fetchOrg])
  useEffect(() => { fetchUnsigned() }, [fetchUnsigned])
  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => { fetchStatus() }, [fetchStatus])

  const filteredPersonnel = unsignedList.filter(
    (p) =>
      (p.name ?? "").includes(searchTerm) ||
      String(p.id).includes(searchTerm) ||
      (p.work_no ?? "").includes(searchTerm) ||
      (p.org_name ?? "").includes(searchTerm)
  )

  const toggleSelectAll = () => {
    if (selectedPersonnel.length === filteredPersonnel.length) {
      setSelectedPersonnel([])
    } else {
      setSelectedPersonnel(filteredPersonnel.map((p) => p.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedPersonnel((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleLaunch = async () => {
    if (selectedPersonnel.length === 0) return
    setIsLaunching(true)
    try {
      await api("/api/contract/launch", {
        method: "POST",
        body: {
          template_id: templateId ? parseInt(templateId, 10) : undefined,
          title: title || "合同签约",
          person_ids: selectedPersonnel,
          deadline: deadline || undefined,
        },
      })
      setIsInitiateOpen(false)
      setSelectedPersonnel([])
      setTitle("")
      setDeadline("")
      fetchUnsigned()
      fetchStatus()
    } catch (e) { console.error(e) }
    setIsLaunching(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HomeButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">合同发起</h1>
            <p className="text-muted-foreground">按项目、班组、个人批量发起签约任务</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">待签约人员</p>
                <p className="text-2xl font-bold">{unsignedList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">进行中任务</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">待签合同</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-chart-5/10 p-3">
                <Calendar className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">即将到期</p>
                <p className="text-2xl font-bold">{pendingTasks.filter((t) => t.deadline).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="personnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personnel">待签约人员</TabsTrigger>
          <TabsTrigger value="tasks">签约任务</TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>待签约人员列表</CardTitle>
                  <CardDescription>选择人员批量发起签约</CardDescription>
                </div>
                <Button
                  className="gap-2"
                  disabled={selectedPersonnel.length === 0}
                  onClick={() => setIsInitiateOpen(true)}
                >
                  <Send className="h-4 w-4" />
                  发起签约 ({selectedPersonnel.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名、工号、项目..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部项目</SelectItem>
                    {orgList.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPersonnel.length === filteredPersonnel.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>所属项目</TableHead>
                    <TableHead>班组/工种</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>入职日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPersonnel.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPersonnel.includes(person.id)}
                          onCheckedChange={() => toggleSelect(person.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{person.work_no ?? person.id}</TableCell>
                      <TableCell>{person.name}</TableCell>
                      <TableCell>{person.org_name ?? "-"}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                          {person.status ?? "已实名"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{person.created_at?.slice(0, 10) ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>签约任务列表</CardTitle>
              <CardDescription>查看和管理进行中的签约任务</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>合同ID</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>签约人</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>截止日期</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.id}</TableCell>
                      <TableCell>{task.title ?? "-"}</TableCell>
                      <TableCell>{task.person_name ?? "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">-</TableCell>
                      <TableCell>{task.deadline ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {task.status ?? "待签署"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 发起签约弹窗 */}
      <Dialog open={isInitiateOpen} onOpenChange={setIsInitiateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>发起签约</DialogTitle>
            <DialogDescription>
              已选择 {selectedPersonnel.length} 人，请配置签约信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>合同标题</Label>
              <Input placeholder="合同签约" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>合同模板（选填）</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择合同模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>签约截止日期（选填）</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                签约任务将通过站内通知推送相关人员。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitiateOpen(false)}>取消</Button>
            <Button onClick={handleLaunch} disabled={isLaunching}>{isLaunching ? "发起中..." : "确认发起"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
