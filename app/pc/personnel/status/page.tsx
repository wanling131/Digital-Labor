"use client"

import { useState } from "react"
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

const statusFlow = [
  { key: "pre_register", label: "预注册", color: "bg-muted" },
  { key: "real_name", label: "已实名", color: "bg-chart-3/20" },
  { key: "signed", label: "已签约", color: "bg-primary/20" },
  { key: "on_site", label: "已进场", color: "bg-accent/20" },
  { key: "off_site", label: "已离场", color: "bg-chart-5/20" },
]

const personnelStatus = [
  {
    id: "EMP001",
    name: "张三",
    project: "项目A-主体工程",
    team: "钢筋班组",
    currentStatus: "on_site",
    statusHistory: [
      { status: "pre_register", date: "2024-01-10" },
      { status: "real_name", date: "2024-01-12" },
      { status: "signed", date: "2024-01-15" },
      { status: "on_site", date: "2024-01-16" },
    ],
    isBlacklist: false,
  },
  {
    id: "EMP002",
    name: "李四",
    project: "项目A-主体工程",
    team: "木工班组",
    currentStatus: "signed",
    statusHistory: [
      { status: "pre_register", date: "2024-02-15" },
      { status: "real_name", date: "2024-02-18" },
      { status: "signed", date: "2024-02-20" },
    ],
    isBlacklist: false,
  },
  {
    id: "EMP003",
    name: "王五",
    project: "项目B-装修工程",
    team: "抹灰班组",
    currentStatus: "real_name",
    statusHistory: [
      { status: "pre_register", date: "2024-02-28" },
      { status: "real_name", date: "2024-03-01" },
    ],
    isBlacklist: false,
  },
  {
    id: "EMP004",
    name: "赵六",
    project: "-",
    team: "-",
    currentStatus: "blacklist",
    statusHistory: [
      { status: "pre_register", date: "2024-01-05" },
      { status: "real_name", date: "2024-01-08" },
      { status: "blacklist", date: "2024-01-10" },
    ],
    isBlacklist: true,
    blacklistReason: "多次违规操作，安全意识薄弱",
  },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  pre_register: { label: "预注册", color: "bg-muted text-muted-foreground" },
  real_name: { label: "已实名", color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  signed: { label: "已签约", color: "bg-primary/10 text-primary border-primary/20" },
  on_site: { label: "已进场", color: "bg-accent/10 text-accent border-accent/20" },
  off_site: { label: "已离场", color: "bg-chart-5/10 text-chart-5 border-chart-5/20" },
  blacklist: { label: "黑名单", color: "bg-destructive/10 text-destructive border-destructive/20" },
}

export default function StatusManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false)
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false)

  const filteredData = personnelStatus.filter((person) => {
    const matchesSearch = person.name.includes(searchTerm) || person.id.includes(searchTerm)
    if (activeTab === "all") return matchesSearch
    if (activeTab === "blacklist") return matchesSearch && person.isBlacklist
    return matchesSearch && person.currentStatus === activeTab && !person.isBlacklist
  })

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
                    {status.key === "pre_register" && "124人"}
                    {status.key === "real_name" && "156人"}
                    {status.key === "signed" && "212人"}
                    {status.key === "on_site" && "3,350人"}
                    {status.key === "off_site" && "892人"}
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
        {[
          { key: "pre_register", label: "预注册", count: 124 },
          { key: "real_name", label: "已实名", count: 156 },
          { key: "signed", label: "已签约", count: 212 },
          { key: "on_site", label: "已进场", count: 3350 },
          { key: "off_site", label: "已离场", count: 892 },
          { key: "blacklist", label: "黑名单", count: 23 },
        ].map((item) => (
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
                <TableRow key={person.id} className={person.isBlacklist ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium">{person.id}</TableCell>
                  <TableCell>{person.name}</TableCell>
                  <TableCell>{person.project}</TableCell>
                  <TableCell>{person.team}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusLabels[person.currentStatus].color}
                    >
                      {statusLabels[person.currentStatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {person.statusHistory.slice(-3).map((history, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          {statusLabels[history.status]?.label || history.status}
                        </Badge>
                      ))}
                      {person.statusHistory.length > 3 && (
                        <span className="text-xs text-muted-foreground">...</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {!person.isBlacklist && (
                      <Dialog open={isChangeStatusOpen} onOpenChange={setIsChangeStatusOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            变更状态
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>变更状态 - {person.name}</DialogTitle>
                            <DialogDescription>选择新的状态并确认变更</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>当前状态</Label>
                              <Badge variant="outline" className={statusLabels[person.currentStatus].color}>
                                {statusLabels[person.currentStatus].label}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <Label>变更为</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="选择新状态" />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusFlow.map((status) => (
                                    <SelectItem key={status.key} value={status.key}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>变更说明</Label>
                              <Textarea placeholder="请输入变更原因（选填）" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsChangeStatusOpen(false)}>
                              取消
                            </Button>
                            <Button onClick={() => setIsChangeStatusOpen(false)}>确认变更</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    {person.isBlacklist && (
                      <Button variant="ghost" size="sm" className="text-accent">
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
    </div>
  )
}
