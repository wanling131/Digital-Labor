"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  UserCheck,
  FileCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  AlertCircle,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { api } from "@/lib/api"

type TrendItem = { date: string; personCount: number; signedCount: number; attendanceCount: number; totalHours: number }
type BoardData = {
  total?: number
  realNameRate?: string
  signRate?: string
  onSiteRate?: string
  totalChangePercent?: string
  realNameRateChange?: string
  signRateChange?: string
  onSiteRateChange?: string
  pendingRealName?: number
  contractExpiring?: number
  blacklistMatch?: number
  teamRank?: { name: string; count: number }[]
  recentActivities?: { type: string; name: string; project: string; time: string }[]
  todos?: { title: string; count: number; urgent: boolean }[]
}
type SiteBoardRes = { projects: { org_id: number; org_name: string; count: number }[]; total: number }

export default function DashboardPage() {
  const [board, setBoard] = useState<BoardData | null>(null)
  const [trend, setTrend] = useState<TrendItem[]>([])
  const [siteBoard, setSiteBoard] = useState<SiteBoardRes | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api<BoardData>("/api/data/board"),
      api<{ trend?: TrendItem[] }>("/api/data/board/trend", { query: { days: 30 } }),
      api<SiteBoardRes>("/api/site/board"),
    ])
      .then(([b, t, s]) => {
        setBoard(b)
        setTrend(t.trend ?? [])
        setSiteBoard(s)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalChange = board?.totalChangePercent ?? "0"
  const realNameChange = board?.realNameRateChange ?? "0"
  const signChange = board?.signRateChange ?? "0"
  const onSiteChange = board?.onSiteRateChange ?? "0"
  const stats = [
    { title: "总人数", value: loading ? "—" : (board?.total ?? 0).toLocaleString(), change: `${Number(totalChange) >= 0 ? "+" : ""}${totalChange}%`, trend: Number(totalChange) >= 0 ? "up" : "down", icon: Users, color: "bg-primary/10 text-primary" },
    { title: "实名认证率", value: loading ? "—" : `${board?.realNameRate ?? 0}%`, change: `${Number(realNameChange) >= 0 ? "+" : ""}${realNameChange}%`, trend: Number(realNameChange) >= 0 ? "up" : "down", icon: UserCheck, color: "bg-accent/10 text-accent" },
    { title: "合同签约率", value: loading ? "—" : `${board?.signRate ?? 0}%`, change: `${Number(signChange) >= 0 ? "+" : ""}${signChange}%`, trend: Number(signChange) >= 0 ? "up" : "down", icon: FileCheck, color: "bg-chart-3/10 text-chart-3" },
    { title: "今日在岗率", value: loading ? "—" : `${board?.onSiteRate ?? 0}%`, change: `${Number(onSiteChange) >= 0 ? "+" : ""}${onSiteChange}%`, trend: Number(onSiteChange) >= 0 ? "up" : "down", icon: Clock, color: "bg-chart-5/10 text-chart-5" },
  ]

  const alerts = [
    {
      level: "warning" as const,
      message: `${board?.contractExpiring ?? 0}份合同即将到期，请及时处理`,
      count: board?.contractExpiring ?? 0,
      key: "contract",
    },
    {
      level: "info" as const,
      message: `本月有${board?.pendingRealName ?? 0}人待实名认证`,
      count: board?.pendingRealName ?? 0,
      key: "realname",
    },
    {
      level: "error" as const,
      message: `${board?.blacklistMatch ?? 0}人黑名单预警匹配`,
      count: board?.blacklistMatch ?? 0,
      key: "blacklist",
    },
  ]

  const trendData =
    trend.length > 0
      ? trend.map((t) => ({
          month: t.date.slice(5).replace("-", "/"),
          新增: t.personCount,
          签约: t.signedCount,
          考勤: t.attendanceCount,
        }))
      : []

  const projectTotal = siteBoard?.total ?? 0
  const projectData = (siteBoard?.projects ?? []).map((p) => ({
    name: p.org_name || "未分配",
    value: p.count,
    percentage: projectTotal ? ((p.count / projectTotal) * 100).toFixed(1) : "0",
  }))
  const teamRankData = board?.teamRank ?? []
  const recentActivitiesList = board?.recentActivities ?? []
  const todosList = board?.todos ?? []

  const COLORS = [
    "oklch(0.55 0.18 250)",
    "oklch(0.65 0.16 165)",
    "oklch(0.7 0.15 85)",
    "oklch(0.6 0.18 330)",
    "oklch(0.65 0.2 30)",
    "oklch(0.5 0.1 250)",
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">综合数据看板</h1>
          <p className="text-muted-foreground">实时监控核心业务指标</p>
        </div>
      </div>

      {/* 告警提示 */}
      <div className="grid gap-3 md:grid-cols-3">
        {alerts.map((alert) => (
          <Card
            key={alert.key}
            className={`border-l-4 ${
              alert.level === "error"
                ? "border-l-destructive bg-destructive/5"
                : alert.level === "warning"
                ? "border-l-warning bg-warning/5"
                : "border-l-primary bg-primary/5"
            }`}
          >
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle
                className={`h-5 w-5 ${
                  alert.level === "error"
                    ? "text-destructive"
                    : alert.level === "warning"
                    ? "text-warning"
                    : "text-primary"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
              <Badge variant="secondary">{alert.count}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 核心指标 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <div className="mt-1 flex items-center gap-1">
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-accent" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        stat.trend === "up" ? "text-accent" : "text-destructive"
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-sm text-muted-foreground">较上月</span>
                  </div>
                </div>
                <div className={`rounded-full p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 人员趋势图 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>人员变动趋势</CardTitle>
            <CardDescription>近30天每日新增人员、签约数与考勤人次统计</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorOnsite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.18 250)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.55 0.18 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="考勤"
                  stroke="oklch(0.55 0.18 250)"
                  fill="url(#colorOnsite)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="新增"
                  stroke="oklch(0.65 0.16 165)"
                  fill="oklch(0.65 0.16 165 / 0.2)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="签约"
                  stroke="oklch(0.55 0.2 25)"
                  fill="oklch(0.55 0.2 25 / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 项目人员分布 */}
        <Card>
          <CardHeader>
            <CardTitle>项目人员分布</CardTitle>
            <CardDescription>各项目在岗人员占比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {projectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value}人`, name]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            {projectData.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">暂无在岗人员分布数据</p>
            )}
          </CardContent>
        </Card>

        {/* 班组人员排行 */}
        <Card>
          <CardHeader>
            <CardTitle>班组人员排行</CardTitle>
            <CardDescription>在岗人数TOP 6班组</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={teamRankData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="oklch(0.55 0.18 250)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {teamRankData.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">暂无班组在岗数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最新动态和快捷操作 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 最新动态 */}
        <Card>
          <CardHeader>
            <CardTitle>最新动态</CardTitle>
            <CardDescription>系统实时业务动态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivitiesList.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">暂无动态</p>
              )}
              {recentActivitiesList.map((activity, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      activity.type === "入职"
                        ? "bg-accent/10 text-accent"
                        : activity.type === "签约"
                        ? "bg-primary/10 text-primary"
                        : activity.type === "离场"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-chart-3/10 text-chart-3"
                    }`}
                  >
                    {activity.type === "入职" ? (
                      <Users className="h-5 w-5" />
                    ) : activity.type === "签约" ? (
                      <FileCheck className="h-5 w-5" />
                    ) : activity.type === "离场" ? (
                      <Building2 className="h-5 w-5" />
                    ) : (
                      <UserCheck className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      <span className="text-foreground">{activity.name}</span>
                      <span className="text-muted-foreground"> - {activity.type}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.project}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 待办事项 */}
        <Card>
          <CardHeader>
            <CardTitle>待办事项</CardTitle>
            <CardDescription>需要您处理的工作</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todosList.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <Badge variant="destructive">{item.count}</Badge>
                </div>
              ))}
              {todosList.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">暂无待办</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
