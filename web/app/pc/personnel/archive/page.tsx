"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  MoreHorizontal,
  Download,
  Upload,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  FileText,
  Building2,
} from "lucide-react"

const personnelData = [
  {
    id: "EMP001",
    name: "张三",
    idCard: "3201***********1234",
    phone: "138****5678",
    project: "项目A-主体工程",
    team: "钢筋班组",
    position: "钢筋工",
    realName: true,
    contract: true,
    status: "在岗",
    entryDate: "2024-01-15",
  },
  {
    id: "EMP002",
    name: "李四",
    idCard: "3202***********5678",
    phone: "139****1234",
    project: "项目A-主体工程",
    team: "木工班组",
    position: "木工",
    realName: true,
    contract: true,
    status: "在岗",
    entryDate: "2024-02-20",
  },
  {
    id: "EMP003",
    name: "王五",
    idCard: "3203***********9012",
    phone: "137****9876",
    project: "项目B-装修工程",
    team: "抹灰班组",
    position: "抹灰工",
    realName: true,
    contract: false,
    status: "待签约",
    entryDate: "2024-03-01",
  },
  {
    id: "EMP004",
    name: "赵六",
    idCard: "3204***********3456",
    phone: "136****5432",
    project: "项目B-装修工程",
    team: "水电班组",
    position: "电工",
    realName: false,
    contract: false,
    status: "待实名",
    entryDate: "2024-03-05",
  },
  {
    id: "EMP005",
    name: "钱七",
    idCard: "3205***********7890",
    phone: "135****1111",
    project: "项目C-基建工程",
    team: "混凝土班组",
    position: "混凝土工",
    realName: true,
    contract: true,
    status: "已离场",
    entryDate: "2023-06-10",
  },
]

const statusColors: Record<string, string> = {
  "在岗": "bg-accent/10 text-accent border-accent/20",
  "待签约": "bg-warning/10 text-warning border-warning/20",
  "待实名": "bg-chart-5/10 text-chart-5 border-chart-5/20",
  "已离场": "bg-muted text-muted-foreground border-muted",
}

export default function PersonnelArchivePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredData = personnelData.filter((person) => {
    const matchesSearch =
      person.name.includes(searchTerm) ||
      person.id.includes(searchTerm) ||
      person.project.includes(searchTerm)
    const matchesStatus = selectedStatus === "all" || person.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">人员档案</h1>
          <p className="text-muted-foreground">管理人员基本信息、实名认证及合同状态</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            批量导入
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            导出数据
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新增人员
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新增人员</DialogTitle>
                <DialogDescription>填写人员基本信息，完成预注册</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input id="name" placeholder="请输入姓名" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idCard">身份证号</Label>
                    <Input id="idCard" placeholder="请输入身份证号" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号码</Label>
                    <Input id="phone" placeholder="请输入手机号码" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">所属项目</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择项目" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="projectA">项目A-主体工程</SelectItem>
                        <SelectItem value="projectB">项目B-装修工程</SelectItem>
                        <SelectItem value="projectC">项目C-基建工程</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team">所属班组</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择班组" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="steel">钢筋班组</SelectItem>
                        <SelectItem value="wood">木工班组</SelectItem>
                        <SelectItem value="concrete">混凝土班组</SelectItem>
                        <SelectItem value="electric">水电班组</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">工种</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="选择工种" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="steelWorker">钢筋工</SelectItem>
                        <SelectItem value="woodWorker">木工</SelectItem>
                        <SelectItem value="concreteWorker">混凝土工</SelectItem>
                        <SelectItem value="electrician">电工</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>确认添加</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总人数</p>
                <p className="text-2xl font-bold">3,842</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已实名</p>
                <p className="text-2xl font-bold">3,718</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <UserCheck className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已签约</p>
                <p className="text-2xl font-bold">3,548</p>
              </div>
              <div className="rounded-full bg-chart-3/10 p-3">
                <FileText className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">在岗人数</p>
                <p className="text-2xl font-bold">3,350</p>
              </div>
              <div className="rounded-full bg-chart-5/10 p-3">
                <Building2 className="h-5 w-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名、工号、项目..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80 pl-9"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="在岗">在岗</SelectItem>
                  <SelectItem value="待签约">待签约</SelectItem>
                  <SelectItem value="待实名">待实名</SelectItem>
                  <SelectItem value="已离场">已离场</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              共 <span className="font-medium text-foreground">{filteredData.length}</span> 条记录
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>身份证号</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>班组/工种</TableHead>
                <TableHead>实名</TableHead>
                <TableHead>合同</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>入职日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.id}</TableCell>
                  <TableCell>{person.name}</TableCell>
                  <TableCell className="text-muted-foreground">{person.idCard}</TableCell>
                  <TableCell className="text-muted-foreground">{person.phone}</TableCell>
                  <TableCell>{person.project}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{person.team}</p>
                      <p className="text-xs text-muted-foreground">{person.position}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={person.realName ? "default" : "secondary"}>
                      {person.realName ? "已认证" : "未认证"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={person.contract ? "default" : "secondary"}>
                      {person.contract ? "已签约" : "未签约"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[person.status]}>
                      {person.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{person.entryDate}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="h-4 w-4" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          编辑信息
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <Trash2 className="h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
