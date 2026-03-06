"use client"

import { useState } from "react"
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

const unsignedPersonnel = [
  {
    id: "EMP003",
    name: "王五",
    project: "项目B-装修工程",
    team: "抹灰班组",
    position: "抹灰工",
    status: "已实名",
    entryDate: "2024-03-01",
  },
  {
    id: "EMP006",
    name: "孙八",
    project: "项目A-主体工程",
    team: "钢筋班组",
    position: "钢筋工",
    status: "已实名",
    entryDate: "2024-03-02",
  },
  {
    id: "EMP007",
    name: "周九",
    project: "项目C-基建工程",
    team: "混凝土班组",
    position: "混凝土工",
    status: "已实名",
    entryDate: "2024-03-03",
  },
  {
    id: "EMP008",
    name: "吴十",
    project: "项目A-主体工程",
    team: "木工班组",
    position: "木工",
    status: "已实名",
    entryDate: "2024-03-04",
  },
  {
    id: "EMP009",
    name: "郑十一",
    project: "项目B-装修工程",
    team: "水电班组",
    position: "电工",
    status: "已实名",
    entryDate: "2024-03-05",
  },
]

const pendingTasks = [
  {
    id: "TASK001",
    template: "劳动合同-标准版",
    targetType: "batch",
    targetCount: 15,
    project: "项目A-主体工程",
    deadline: "2024-03-15",
    status: "pending",
    createTime: "2024-03-01",
  },
  {
    id: "TASK002",
    template: "安全责任书",
    targetType: "project",
    targetCount: 856,
    project: "项目A-主体工程",
    deadline: "2024-03-20",
    status: "in_progress",
    createTime: "2024-02-28",
  },
]

export default function ContractInitiatePage() {
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([])
  const [isInitiateOpen, setIsInitiateOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPersonnel = unsignedPersonnel.filter(
    (person) =>
      person.name.includes(searchTerm) ||
      person.id.includes(searchTerm) ||
      person.project.includes(searchTerm)
  )

  const toggleSelectAll = () => {
    if (selectedPersonnel.length === filteredPersonnel.length) {
      setSelectedPersonnel([])
    } else {
      setSelectedPersonnel(filteredPersonnel.map((p) => p.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedPersonnel((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">合同发起</h1>
          <p className="text-muted-foreground">按项目、班组、个人批量发起签约任务</p>
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
                <p className="text-2xl font-bold">212</p>
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
                <p className="text-2xl font-bold">8</p>
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
                <p className="text-sm font-medium text-muted-foreground">本月已发起</p>
                <p className="text-2xl font-bold">156</p>
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
                <p className="text-2xl font-bold">32</p>
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
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部项目</SelectItem>
                    <SelectItem value="projectA">项目A-主体工程</SelectItem>
                    <SelectItem value="projectB">项目B-装修工程</SelectItem>
                    <SelectItem value="projectC">项目C-基建工程</SelectItem>
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
                      <TableCell className="font-medium">{person.id}</TableCell>
                      <TableCell>{person.name}</TableCell>
                      <TableCell>{person.project}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{person.team}</p>
                          <p className="text-xs text-muted-foreground">{person.position}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                          {person.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{person.entryDate}</TableCell>
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
                    <TableHead>任务ID</TableHead>
                    <TableHead>合同模板</TableHead>
                    <TableHead>发起类型</TableHead>
                    <TableHead>目标人数</TableHead>
                    <TableHead>所属项目</TableHead>
                    <TableHead>截止日期</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.id}</TableCell>
                      <TableCell>{task.template}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {task.targetType === "batch" ? (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{task.targetType === "batch" ? "批量发起" : "按项目"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{task.targetCount}人</TableCell>
                      <TableCell>{task.project}</TableCell>
                      <TableCell>{task.deadline}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            task.status === "in_progress"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {task.status === "in_progress" ? "进行中" : "待处理"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          查看详情
                        </Button>
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
              <Label>合同模板</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择合同模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">劳动合同-标准版</SelectItem>
                  <SelectItem value="dispatch">劳务派遣合同</SelectItem>
                  <SelectItem value="temporary">临时用工协议</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>签约截止日期</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>逾期提醒</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择提醒时间" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">提前1天提醒</SelectItem>
                  <SelectItem value="3">提前3天提醒</SelectItem>
                  <SelectItem value="7">提前7天提醒</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                签约任务将通过短信和微信推送通知相关人员，请确保人员手机号信息准确。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitiateOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setIsInitiateOpen(false)}>确认发起</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
