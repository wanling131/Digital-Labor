"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import {
  Activity,
  Database,
  Server,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  HardDrive,
  Cpu,
  MemoryStick,
} from "lucide-react"

interface PerformanceStats {
  totalRequests: number
  recentRequests: number
  averageResponseTime: number
  statusCodes: Record<string, number>
  slowQueriesCount: number
  errorCount: number
  memory: {
    heapUsed: number
    heapTotal: number
    rss: number
  }
  uptime: number
}

interface SystemStats {
  cpus: number
  loadavg: number[]
  totalMemory: string
  freeMemory: string
  platform: string
  release: string
  uptime: string
  nodeVersion: string
  nodeUptime: string
}

interface DatabaseStats {
  fileSize: string
  tables: Array<{ name: string; rowCount: number }>
  indexCount: number
  indexes: string[]
}

interface SlowEndpoint {
  endpoint: string
  count: number
  averageTime: number
  maxTime: number
}

export default function MonitorPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(false)
  const [performance, setPerformance] = useState<PerformanceStats | null>(null)
  const [system, setSystem] = useState<SystemStats | null>(null)
  const [database, setDatabase] = useState<DatabaseStats | null>(null)
  const [slowEndpoints, setSlowEndpoints] = useState<SlowEndpoint[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [perfRes, sysRes, dbRes, slowRes] = await Promise.all([
        api<{ ok: boolean; data: PerformanceStats }>("/api/monitor/performance"),
        api<{ ok: boolean; data: SystemStats }>("/api/monitor/system"),
        api<{ ok: boolean; data: DatabaseStats }>("/api/monitor/database"),
        api<{ ok: boolean; data: SlowEndpoint[] }>("/api/monitor/slow-endpoints"),
      ])

      if (perfRes.ok) setPerformance(perfRes.data)
      if (sysRes.ok) setSystem(sysRes.data)
      if (dbRes.ok) setDatabase(dbRes.data)
      if (slowRes.ok) setSlowEndpoints(slowRes.data)

      setLastUpdate(new Date())
    } catch (error) {
      console.error("获取监控数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
    // 自动刷新（每30秒）
    const interval = setInterval(fetchAllData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统监控</h1>
          <p className="text-muted-foreground">
            实时监控服务器性能、数据库状态和API请求情况
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            最后更新: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="performance">性能</TabsTrigger>
          <TabsTrigger value="database">数据库</TabsTrigger>
          <TabsTrigger value="system">系统</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总请求数</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance?.totalRequests.toLocaleString() || "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  近1小时: {performance?.recentRequests.toLocaleString() || "-"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance?.averageResponseTime
                    ? formatDuration(performance.averageResponseTime)
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  目标: &lt; 500ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">慢查询</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance?.slowQueriesCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  错误: {performance?.errorCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">内存使用</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance?.memory
                    ? formatBytes(performance.memory.heapUsed)
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  堆内存总量: {performance?.memory
                    ? formatBytes(performance.memory.heapTotal)
                    : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 状态码分布 */}
          <Card>
            <CardHeader>
              <CardTitle>HTTP状态码分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {performance?.statusCodes &&
                  Object.entries(performance.statusCodes).map(([code, count]) => (
                    <Badge
                      key={code}
                      variant={code.startsWith("2") ? "default" : code.startsWith("4") ? "destructive" : "secondary"}
                    >
                      {code}: {count}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* 慢接口排行 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                慢接口排行
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {slowEndpoints.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    暂无慢接口数据
                  </p>
                ) : (
                  slowEndpoints.slice(0, 5).map((endpoint, index) => (
                    <div
                      key={endpoint.endpoint}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-6">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{endpoint.endpoint}</p>
                          <p className="text-sm text-muted-foreground">
                            请求次数: {endpoint.count}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-orange-600">
                          {formatDuration(endpoint.averageTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          最大: {formatDuration(endpoint.maxTime)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 性能详情 */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>请求统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">总请求数</p>
                  <p className="text-2xl font-bold">
                    {performance?.totalRequests.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">近1小时请求</p>
                  <p className="text-2xl font-bold">
                    {performance?.recentRequests.toLocaleString() || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">平均响应时间</p>
                  <p className="text-2xl font-bold">
                    {performance?.averageResponseTime
                      ? formatDuration(performance.averageResponseTime)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">运行时间</p>
                  <p className="text-2xl font-bold">
                    {performance?.uptime
                      ? Math.round(performance.uptime / 3600) + "h"
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>内存详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">堆内存使用</p>
                  <p className="text-lg font-medium">
                    {performance?.memory
                      ? formatBytes(performance.memory.heapUsed)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">堆内存总量</p>
                  <p className="text-lg font-medium">
                    {performance?.memory
                      ? formatBytes(performance.memory.heapTotal)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">RSS内存</p>
                  <p className="text-lg font-medium">
                    {performance?.memory
                      ? formatBytes(performance.memory.rss)
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据库 */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">数据库文件大小</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{database?.fileSize || "-"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">索引数量</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{database?.indexCount || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>表统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {database?.tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded"
                  >
                    <span className="font-medium">{table.name}</span>
                    <Badge variant="secondary">
                      {table.rowCount.toLocaleString()} 行
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 系统 */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU核心</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{system?.cpus || "-"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统内存</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{system?.totalMemory || "-"}</div>
                <p className="text-xs text-muted-foreground">
                  可用: {system?.freeMemory || "-"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统运行时间</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{system?.uptime || "-"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Node.js版本</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{system?.nodeVersion || "-"}</div>
                <p className="text-xs text-muted-foreground">
                  运行: {system?.nodeUptime || "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">平台</p>
                  <p className="font-medium">{system?.platform || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">系统版本</p>
                  <p className="font-medium">{system?.release || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">负载平均</p>
                  <p className="font-medium">
                    {system?.loadavg?.map((l) => l.toFixed(2)).join(", ") || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
