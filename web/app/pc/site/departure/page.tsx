"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Search,
  Plus,
  LogOut,
  Calendar,
  User,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { api } from "@/lib/api"
import { HomeButton } from "@/components/pc/home-button"

interface PersonOnSite {
  id: number
  work_no?: string
  name: string
  org_name?: string
}

const departureRecordsMock = [
  {
    id: "1",
    name: "李明",
    idCard: "310***********1234",
    project: "项目A-主体工程",
    team: "钢筋班组",
    entryDate: "2024-01-15",
    departureDate: "2024-03-14",
    reason: "项目完工",
    status: "completed",
    handler: "张经理",
  },
  {
    id: "2",
    name: "王建国",
    idCard: "310***********5678",
    project: "项目B-装修工程",
    team: "木工班组",
    entryDate: "2024-02-01",
    departureDate: "2024-03-13",
    reason: "个人原因",
    status: "completed",
    handler: "李主管",
  },
  {
    id: "3",
    name: "张伟",
    idCard: "310***********9012",
    project: "项目C-基建工程",
    team: "混凝土班组",
    entryDate: "2023-12-01",
    departureDate: "2024-03-12",
    reason: "合同到期",
    status: "pending",
    handler: "王经理",
  },
]

const statusConfig = {
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  pending: { label: "待处理", color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-700" },
}

export default function DeparturePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [onSiteList, setOnSiteList] = useState<PersonOnSite[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchOnSite = useCallback(async () => {
    try {
      const res = await api<{ list: PersonOnSite[] }>("/api/person/archive", { query: { on_site: "1", pageSize: "200" } })
      setOnSiteList(res.list ?? [])
    } catch { setOnSiteList([]) }
  }, [])

  useEffect(() => { fetchOnSite() }, [fetchOnSite])

  const handleLeave = async () => {
    if (!selectedPersonId) return
    setIsSubmitting(true)
    try {
      await api("/api/site/leave", { method: "POST", body: { person_id: parseInt(selectedPersonId, 10) } })
      setShowNewDialog(false)
      setSelectedPersonId("")
      fetchOnSite()
    } catch (e) { console.error(e) }
    setIsSubmitting(false)
  }

  const filtered = onSiteList.filter((p) =>
    (p.name ?? "").includes(searchTerm) || (p.work_no ?? "").includes(searchTerm) || (p.org_name ?? "").includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HomeButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">离场登记</h1>
            <p className="text-muted-foreground">管理人员离场手续办理与记录</p>
          </div>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增离场登记
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新增离场登记</DialogTitle>
              <DialogDescription>
                请填写人员离场信息，系统将自动处理相关手续
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>选择人员</Label>
                <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择离场人员" />
                  </SelectTrigger>
                  <SelectContent>
                    {onSiteList.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.org_name ?? p.work_no ?? "-"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>离场日期</Label>
                <Input type="date" />
              </div>
              <div className="grid gap-2">
                <Label>离场原因</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择离场原因" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project_complete">项目完工</SelectItem>
                    <SelectItem value="contract_expire">合同到期</SelectItem>
                    <SelectItem value="personal">个人原因</SelectItem>
                    <SelectItem value="dismiss">辞退</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>备注说明</Label>
                <Textarea placeholder="请输入备注信息..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>取消</Button>
              <Button onClick={handleLeave} disabled={!selectedPersonId || isSubmitting}>
                {isSubmitting ? "提交中..." : "确认离场"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">在岗人数</p>
                <p className="text-2xl font-bold">{onSiteList.length}</p>
              </div>
              <LogOut className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">可离场</p>
                <p className="text-2xl font-bold text-orange-500">{onSiteList.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-green-500">37</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待结算</p>
                <p className="text-2xl font-bold text-primary">12</p>
              </div>
              <FileText className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、身份证号..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="项目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部项目</SelectItem>
                  <SelectItem value="a">项目A-主体工程</SelectItem>
                  <SelectItem value="b">项目B-装修工程</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 离场记录表格 */}
      <Card>
        <CardHeader>
          <CardTitle>当前在岗人员</CardTitle>
          <CardDescription>共 {filtered.length} 人，点击「办理离场」或使用上方按钮登记</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.work_no ?? record.id}</TableCell>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>{record.org_name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await api("/api/site/leave", { method: "POST", body: { person_id: record.id } })
                          fetchOnSite()
                        } catch (e) { console.error(e) }
                      }}
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      办理离场
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
