"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { api } from "@/lib/api"

interface SiteBoardProject {
  org_id: number
  org_name: string
  count: number
}

interface SiteBoardRes {
  projects: SiteBoardProject[]
  total: number
}

const realtimeWorkers = [
  { id: "1", name: "李明", team: "钢筋班组", project: "项目A", clockIn: "08:32", location: "A区3楼", status: "working" },
  { id: "2", name: "王建国", team: "木工班组", project: "项目A", clockIn: "08:45", location: "B区1楼", status: "working" },
  { id: "3", name: "张伟", team: "混凝土班组", project: "项目B", clockIn: "08:28", location: "C区外围", status: "working" },
  { id: "4", name: "刘洋", team: "架子班组", project: "项目A", clockIn: "08:55", location: "A区2楼", status: "break" },
  { id: "5", name: "陈刚", team: "水电班组", project: "项目C", clockIn: "08:30", location: "D区地下", status: "working" },
  { id: "6", name: "赵强", team: "抹灰班组", project: "项目B", clockIn: "08:40", location: "B区2楼", status: "working" },
  { id: "7", name: "孙明", team: "钢筋班组", project: "项目A", clockIn: "08:35", location: "A区4楼", status: "working" },
  { id: "8", name: "周伟", team: "木工班组", project: "项目D", clockIn: "08:50", location: "E区1楼", status: "break" },
]

const statusConfig = {
  working: { label: "作业中", color: "bg-green-100 text-green-700" },
  break: { label: "休息中", color: "bg-yellow-100 text-yellow-700" },
  offline: { label: "已离线", color: "bg-gray-100 text-gray-700" },
}

export default function RealtimePage() {
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [board, setBoard] = useState<SiteBoardRes | null>(null)

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api<SiteBoardRes>("/api/site/board")
      setBoard(res)
    } catch {
      setBoard({ projects: [], total: 0 })
    }
  }, [])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchBoard()
    setLastUpdate(new Date())
    setIsRefreshing(false)
  }

  // 自动刷新
  useEffect(() => {
    const timer = setInterval(() => {
      fetchBoard()
      setLastUpdate(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [fetchBoard])

  const projectStats = board
    ? board.projects.map((p) => ({
        id: p.org_id,
        name: p.org_name || `组织${p.org_id}`,
        total: p.count,
        present: p.count,
        absent: 0,
        rate: 100,
      }))
    : []
  const totalPresent = board?.total ?? 0
  const totalWorkers = board?.total ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">在岗人员实时看板</h1>
          <p className="text-muted-foreground">实时监控各项目在岗人员分布</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            实时更新
          </Badge>
          <span className="text-sm text-muted-foreground">
            最后更新: {lastUpdate.toLocaleTimeString("zh-CN")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 总览统计 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">当前在岗</p>
                <p className="text-3xl font-bold text-primary">{totalPresent.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">+3.2% 较昨日</span>
                </div>
              </div>
              <Users className="h-10 w-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总人数</p>
                <p className="text-3xl font-bold">{totalWorkers.toLocaleString()}</p>
              </div>
              <Building2 className="h-10 w-10 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均在岗率</p>
                <p className="text-3xl font-bold text-green-500">
                  {totalWorkers > 0 ? ((totalPresent / totalWorkers) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">缺勤人数</p>
                <p className="text-3xl font-bold text-destructive">
                  {0}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 各项目在岗情况 */}
      <Card>
        <CardHeader>
          <CardTitle>各项目在岗情况</CardTitle>
          <CardDescription>按项目统计当前在岗人员分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectStats.map((project) => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{project.name}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      在岗 <span className="font-semibold text-foreground">{project.present}</span> / {project.total}
                    </span>
                    <Badge variant={project.rate >= 95 ? "default" : project.rate >= 90 ? "secondary" : "destructive"}>
                      {project.rate}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${project.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 实时人员列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>实时在岗人员</CardTitle>
              <CardDescription>当前所有在岗人员实时位置</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="搜索姓名..." className="pl-9" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部项目</SelectItem>
                  {projectStats.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {realtimeWorkers.map((worker) => (
              <Card key={worker.id} className="border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/placeholder-${worker.id}.jpg`} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {worker.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{worker.name}</p>
                        <Badge className={statusConfig[worker.status as keyof typeof statusConfig].color + " text-xs"}>
                          {statusConfig[worker.status as keyof typeof statusConfig].label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{worker.team}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{worker.location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>入场: {worker.clockIn}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
