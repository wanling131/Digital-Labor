"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FileText,
  Search,
  CalendarIcon,
  Download,
  Filter,
  Activity,
  UserCheck,
  FileEdit,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  Eye,
} from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

interface LogEntry {
  id: string
  user: string
  role: string
  action: string
  module: string
  target: string
  ip: string
  timestamp: string
  status: "success" | "failed"
  details?: string
}

const mockLogs: LogEntry[] = [
  {
    id: "1",
    user: "张三",
    role: "超级管理员",
    action: "登录",
    module: "系统",
    target: "后台管理系统",
    ip: "192.168.1.100",
    timestamp: "2024-03-15 09:00:15",
    status: "success",
  },
  {
    id: "2",
    user: "李明",
    role: "项目经理",
    action: "新增",
    module: "人员档案",
    target: "工人-王建国",
    ip: "192.168.1.105",
    timestamp: "2024-03-15 09:15:32",
    status: "success",
    details: "新增工人信息，工种：木工",
  },
  {
    id: "3",
    user: "王芳",
    role: "人事专员",
    action: "编辑",
    module: "人员档案",
    target: "工人-刘强",
    ip: "192.168.1.110",
    timestamp: "2024-03-15 09:30:45",
    status: "success",
    details: "更新联系电话",
  },
  {
    id: "4",
    user: "陈刚",
    role: "财务人员",
    action: "导出",
    module: "结算管理",
    target: "2024年3月结算单",
    ip: "192.168.1.115",
    timestamp: "2024-03-15 10:00:00",
    status: "success",
  },
  {
    id: "5",
    user: "赵磊",
    role: "考勤员",
    action: "导入",
    module: "考勤管理",
    target: "3月考勤数据",
    ip: "192.168.1.120",
    timestamp: "2024-03-15 10:15:20",
    status: "failed",
    details: "文件格式错误",
  },
  {
    id: "6",
    user: "张三",
    role: "超级管理员",
    action: "删除",
    module: "合同管理",
    target: "合同模板-临时用工协议",
    ip: "192.168.1.100",
    timestamp: "2024-03-15 10:30:00",
    status: "success",
  },
  {
    id: "7",
    user: "李明",
    role: "项目经理",
    action: "审核",
    module: "考勤管理",
    target: "华东项目部-2024年3月考勤",
    ip: "192.168.1.105",
    timestamp: "2024-03-15 11:00:00",
    status: "success",
  },
  {
    id: "8",
    user: "王芳",
    role: "人事专员",
    action: "发起",
    module: "合同管理",
    target: "批量签约-15人",
    ip: "192.168.1.110",
    timestamp: "2024-03-15 11:30:00",
    status: "success",
  },
  {
    id: "9",
    user: "张三",
    role: "超级管理员",
    action: "配置",
    module: "系统管理",
    target: "角色权限-项目经理",
    ip: "192.168.1.100",
    timestamp: "2024-03-15 14:00:00",
    status: "success",
    details: "新增考勤审核权限",
  },
  {
    id: "10",
    user: "陈刚",
    role: "财务人员",
    action: "退出",
    module: "系统",
    target: "后台管理系统",
    ip: "192.168.1.115",
    timestamp: "2024-03-15 18:00:00",
    status: "success",
  },
]

const actionIcons: Record<string, React.ReactNode> = {
  "登录": <LogIn className="h-4 w-4 text-primary" />,
  "退出": <LogOut className="h-4 w-4 text-muted-foreground" />,
  "新增": <UserCheck className="h-4 w-4 text-green-500" />,
  "编辑": <FileEdit className="h-4 w-4 text-blue-500" />,
  "删除": <Trash2 className="h-4 w-4 text-destructive" />,
  "导出": <Download className="h-4 w-4 text-orange-500" />,
  "导入": <Activity className="h-4 w-4 text-purple-500" />,
  "审核": <Eye className="h-4 w-4 text-cyan-500" />,
  "发起": <FileText className="h-4 w-4 text-indigo-500" />,
  "配置": <Settings className="h-4 w-4 text-gray-500" />,
}

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<Date>()
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.user.includes(searchQuery) ||
      log.target.includes(searchQuery) ||
      log.action.includes(searchQuery)
    const matchesModule = moduleFilter === "all" || log.module === moduleFilter
    const matchesAction = actionFilter === "all" || log.action === actionFilter
    return matchesSearch && matchesModule && matchesAction
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">操作日志</h1>
          <p className="text-muted-foreground">查看系统操作记录和安全审计日志</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出日志
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日操作</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">较昨日 +12%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">今日登录</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功操作</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">152</div>
            <p className="text-xs text-muted-foreground">成功率 97.4%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败操作</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">4</div>
            <p className="text-xs text-muted-foreground">需要关注</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>日志记录</CardTitle>
              <CardDescription>系统所有操作的详细记录</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索用户、操作、目标..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-48 justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange ? format(dateRange, "PPP", { locale: zhCN }) : "选择日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                <SelectItem value="系统">系统</SelectItem>
                <SelectItem value="人员档案">人员档案</SelectItem>
                <SelectItem value="合同管理">合同管理</SelectItem>
                <SelectItem value="考勤管理">考勤管理</SelectItem>
                <SelectItem value="结算管理">结算管理</SelectItem>
                <SelectItem value="系统管理">系统管理</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="操作" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部操作</SelectItem>
                <SelectItem value="登录">登录</SelectItem>
                <SelectItem value="退出">退出</SelectItem>
                <SelectItem value="新增">新增</SelectItem>
                <SelectItem value="编辑">编辑</SelectItem>
                <SelectItem value="删除">删除</SelectItem>
                <SelectItem value="导出">导出</SelectItem>
                <SelectItem value="导入">导入</SelectItem>
                <SelectItem value="审核">审核</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>模块</TableHead>
                <TableHead>操作对象</TableHead>
                <TableHead>IP地址</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.timestamp}
                  </TableCell>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {actionIcons[log.action]}
                      <span>{log.action}</span>
                    </div>
                  </TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell className="max-w-48 truncate" title={log.target}>
                    {log.target}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {log.ip}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={log.status === "success" ? "default" : "destructive"}
                    >
                      {log.status === "success" ? "成功" : "失败"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              共 {filteredLogs.length} 条记录
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                上一页
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
