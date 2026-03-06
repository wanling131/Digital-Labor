"use client"

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

const stats = [
  {
    title: "总人数",
    value: "3,842",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "实名认证率",
    value: "96.8%",
    change: "+2.3%",
    trend: "up",
    icon: UserCheck,
    color: "bg-accent/10 text-accent",
  },
  {
    title: "合同签约率",
    value: "92.4%",
    change: "+5.1%",
    trend: "up",
    icon: FileCheck,
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    title: "今日在岗率",
    value: "87.2%",
    change: "-1.2%",
    trend: "down",
    icon: Clock,
    color: "bg-chart-5/10 text-chart-5",
  },
]

const trendData = [
  { month: "1月", 入职: 120, 离职: 45, 在岗: 2800 },
  { month: "2月", 入职: 180, 离职: 62, 在岗: 2918 },
  { month: "3月", 入职: 220, 离职: 78, 在岗: 3060 },
  { month: "4月", 入职: 150, 离职: 55, 在岗: 3155 },
  { month: "5月", 入职: 280, 离职: 92, 在岗: 3343 },
  { month: "6月", 入职: 310, 离职: 110, 在岗: 3543 },
  { month: "7月", 入职: 245, 离职: 88, 在岗: 3700 },
  { month: "8月", 入职: 198, 离职: 56, 在岗: 3842 },
]

const projectData = [
  { name: "项目A-主体工程", value: 856, percentage: 22.3 },
  { name: "项目B-装修工程", value: 642, percentage: 16.7 },
  { name: "项目C-基建工程", value: 534, percentage: 13.9 },
  { name: "项目D-市政工程", value: 489, percentage: 12.7 },
  { name: "项目E-园林工程", value: 421, percentage: 11.0 },
  { name: "其他项目", value: 900, percentage: 23.4 },
]

const COLORS = [
  "oklch(0.55 0.18 250)",
  "oklch(0.65 0.16 165)",
  "oklch(0.7 0.15 85)",
  "oklch(0.6 0.18 330)",
  "oklch(0.65 0.2 30)",
  "oklch(0.5 0.1 250)",
]

const recentActivities = [
  { type: "入职", name: "李明", project: "项目A-主体工程", time: "10分钟前" },
  { type: "签约", name: "王建国", project: "项目B-装修工程", time: "25分钟前" },
  { type: "离场", name: "张伟", project: "项目C-基建工程", time: "1小时前" },
  { type: "认证", name: "刘洋", project: "项目A-主体工程", time: "2小时前" },
  { type: "入职", name: "陈刚", project: "项目D-市政工程", time: "3小时前" },
]

const alerts = [
  { level: "warning", message: "32份合同即将到期，请及时处理", count: 32 },
  { level: "info", message: "本月有156人待实名认证", count: 156 },
  { level: "error", message: "5人黑名单预警匹配", count: 5 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">综合数据看板</h1>
          <p className="text-muted-foreground">实时监控核心业务指标</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            实时更新
          </Badge>
          <span className="text-sm text-muted-foreground">
            最后更新: {new Date().toLocaleString("zh-CN")}
          </span>
        </div>
      </div>

      {/* 告警提示 */}
      <div className="grid gap-3 md:grid-cols-3">
        {alerts.map((alert, index) => (
          <Card
            key={index}
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
            <CardDescription>近8个月人员入职、离职及在岗人数统计</CardDescription>
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
                  dataKey="在岗"
                  stroke="oklch(0.55 0.18 250)"
                  fill="url(#colorOnsite)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="入职"
                  stroke="oklch(0.65 0.16 165)"
                  fill="oklch(0.65 0.16 165 / 0.2)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="离职"
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
                data={[
                  { name: "钢筋班组", count: 245 },
                  { name: "木工班组", count: 198 },
                  { name: "混凝土班组", count: 176 },
                  { name: "架子班组", count: 156 },
                  { name: "水电班组", count: 134 },
                  { name: "抹灰班组", count: 112 },
                ]}
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
              {recentActivities.map((activity, index) => (
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
              {[
                { title: "待审批合同", count: 28, urgent: true },
                { title: "待确认结算单", count: 15, urgent: true },
                { title: "待认证人员", count: 156, urgent: false },
                { title: "即将到期合同", count: 32, urgent: false },
                { title: "考勤异常待处理", count: 8, urgent: true },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.urgent && (
                      <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    )}
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <Badge variant={item.urgent ? "destructive" : "secondary"}>{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
