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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  Archive,
  MoreHorizontal,
  Eye,
  Trash2,
  FileText,
  Calendar,
  Building2,
} from "lucide-react"

const archivedContracts = [
  {
    id: "ARC20240301001",
    contractId: "CON001",
    name: "张三",
    template: "劳动合同-标准版",
    project: "项目A-主体工程",
    team: "钢筋班组",
    signTime: "2024-03-01 14:32:15",
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    status: "valid",
    fileSize: "256KB",
  },
  {
    id: "ARC20240302002",
    contractId: "CON002",
    name: "李四",
    template: "劳动合同-标准版",
    project: "项目A-主体工程",
    team: "木工班组",
    signTime: "2024-03-02 10:15:42",
    startDate: "2024-03-02",
    endDate: "2025-03-01",
    status: "valid",
    fileSize: "248KB",
  },
  {
    id: "ARC20240215003",
    contractId: "CON010",
    name: "周九",
    template: "临时用工协议",
    project: "项目B-装修工程",
    team: "水电班组",
    signTime: "2024-02-15 09:20:33",
    startDate: "2024-02-15",
    endDate: "2024-03-15",
    status: "expired",
    fileSize: "198KB",
  },
  {
    id: "ARC20240110004",
    contractId: "CON015",
    name: "吴十",
    template: "安全责任书",
    project: "项目C-基建工程",
    team: "混凝土班组",
    signTime: "2024-01-10 16:45:20",
    startDate: "2024-01-10",
    endDate: "2025-01-09",
    status: "voided",
    fileSize: "156KB",
  },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  valid: { label: "有效", color: "bg-accent/10 text-accent border-accent/20" },
  expired: { label: "已到期", color: "bg-warning/10 text-warning border-warning/20" },
  voided: { label: "已作废", color: "bg-muted text-muted-foreground border-muted" },
}

export default function ContractArchivePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const filteredContracts = archivedContracts.filter((contract) => {
    const matchesSearch =
      contract.name.includes(searchTerm) ||
      contract.id.includes(searchTerm) ||
      contract.contractId.includes(searchTerm)
    const matchesProject = selectedProject === "all" || contract.project.includes(selectedProject)
    const matchesStatus = selectedStatus === "all" || contract.status === selectedStatus
    return matchesSearch && matchesProject && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">合同归档</h1>
          <p className="text-muted-foreground">多维度检索合同，支持下载及作废操作</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          批量下载
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Archive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">归档总数</p>
                <p className="text-2xl font-bold">3,548</p>
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
                <p className="text-sm font-medium text-muted-foreground">有效合同</p>
                <p className="text-2xl font-bold">3,256</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已到期</p>
                <p className="text-2xl font-bold">245</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-muted p-3">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已作废</p>
                <p className="text-2xl font-bold">47</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 合同列表 */}
      <Card>
        <CardHeader>
          <CardTitle>归档合同列表</CardTitle>
          <CardDescription>按项目、人员、时间等多维度检索合同</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、归档号、合同号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-40">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="选择项目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部项目</SelectItem>
                <SelectItem value="项目A">项目A-主体工程</SelectItem>
                <SelectItem value="项目B">项目B-装修工程</SelectItem>
                <SelectItem value="项目C">项目C-基建工程</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="valid">有效</SelectItem>
                <SelectItem value="expired">已到期</SelectItem>
                <SelectItem value="voided">已作废</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" className="w-36" placeholder="开始日期" />
              <span className="text-muted-foreground">至</span>
              <Input type="date" className="w-36" placeholder="结束日期" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>归档编号</TableHead>
                <TableHead>合同编号</TableHead>
                <TableHead>签约人</TableHead>
                <TableHead>合同类型</TableHead>
                <TableHead>所属项目/班组</TableHead>
                <TableHead>合同期限</TableHead>
                <TableHead>签署时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>文件大小</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-mono text-sm">{contract.id}</TableCell>
                  <TableCell className="font-medium">{contract.contractId}</TableCell>
                  <TableCell>{contract.name}</TableCell>
                  <TableCell>{contract.template}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{contract.project}</p>
                      <p className="text-xs text-muted-foreground">{contract.team}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{contract.startDate}</p>
                      <p className="text-muted-foreground">至 {contract.endDate}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {contract.signTime}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusLabels[contract.status].color}
                    >
                      {statusLabels[contract.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contract.fileSize}</TableCell>
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
                          预览合同
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Download className="h-4 w-4" />
                          下载PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {contract.status === "valid" && (
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            作废合同
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 分页 */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              显示 1-{filteredContracts.length} 条，共 3,548 条
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                上一页
              </Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
              <span className="text-muted-foreground">...</span>
              <Button variant="outline" size="sm">
                178
              </Button>
              <Button variant="outline" size="sm">
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
