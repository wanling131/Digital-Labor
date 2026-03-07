"use client"

import { useState, useEffect, useCallback } from "react"
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
import { api } from "@/lib/api"

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

function mapLogRow(row: { id: number; username?: string; module?: string; action?: string; detail?: string; result?: string; created_at?: string }): LogEntry {
  return {
    id: String(row.id),
    user: row.username ?? "-",
    role: "",
    action: row.action ?? "-",
    module: row.module ?? "-",
    target: (row.detail ?? "").slice(0, 80) || "-",
    ip: "-",
    timestamp: row.created_at ?? "-",
    status: (row.result === "success" ? "success" : "failed") as "success" | "failed",
    details: row.detail,
  }
}

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
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ list: unknown[]; total: number }>("/api/sys/log", {
        query: { page, pageSize },
      })
      setLogs((res.list || []).map((row: Record<string, unknown>) => mapLogRow(row as Parameters<typeof mapLogRow>[0])))
      setTotal(res.total ?? 0)
    } catch {
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const filteredLogs = logs.filter((log) => {
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无日志
                  </TableCell>
                </TableRow>
              ) : (
              filteredLogs.map((log) => (
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
              ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              共 {total} 条记录{filteredLogs.length < total && `，当前页 ${filteredLogs.length} 条`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
