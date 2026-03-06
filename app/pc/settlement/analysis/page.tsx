"use client"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Building2,
  PieChart as PieChartIcon,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const monthlyCostData = [
  { month: "1月", cost: 1250000 },
  { month: "2月", cost: 1180000 },
  { month: "3月", cost: 1520000 },
  { month: "4月", cost: 1380000 },
  { month: "5月", cost: 1620000 },
  { month: "6月", cost: 1750000 },
]

const projectCostData = [
  { name: "项目A-主体工程", value: 2850000, percentage: 42.5 },
  { name: "项目B-装修工程", value: 1920000, percentage: 28.6 },
  { name: "项目C-基建工程", value: 1230000, percentage: 18.3 },
  { name: "其他项目", value: 700000, percentage: 10.6 },
]

const COLORS = [
  "oklch(0.55 0.18 250)",
  "oklch(0.65 0.16 165)",
  "oklch(0.7 0.15 85)",
  "oklch(0.6 0.18 330)",
]

const salaryHistory = [
  {
    id: "EMP001",
    name: "张三",
    project: "项目A-主体工程",
    team: "钢筋班组",
    records: [
      { month: "2024-03", amount: 5850, status: "paid" },
      { month: "2024-02", amount: 5620, status: "paid" },
      { month: "2024-01", amount: 5480, status: "paid" },
    ],
    totalAmount: 16950,
  },
  {
    id: "EMP002",
    name: "李四",
    project: "项目A-主体工程",
    team: "木工班组",
    records: [
      { month: "2024-03", amount: 6300, status: "paid" },
      { month: "2024-02", amount: 6120, status: "paid" },
      { month: "2024-01", amount: 5980, status: "paid" },
    ],
    totalAmount: 18400,
  },
  {
    id: "EMP003",
    name: "王五",
    project: "项目B-装修工程",
    team: "抹灰班组",
    records: [
      { month: "2024-03", amount: 4224, status: "paid" },
      { month: "2024-02", amount: 4100, status: "paid" },
      { month: "2024-01", amount: 3980, status: "paid" },
    ],
    totalAmount: 12304,
  },
]

export default function SettlementAnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">薪资报表与成本分析</h1>
          <p className="text-muted-foreground">项目人力成本分析与个人薪资历史查询</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="2024">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="选择年度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024年</SelectItem>
              <SelectItem value="2023">2023年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            导出报表
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">本月人力成本</p>
                <p className="text-2xl font-bold">¥1,750,000</p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">+8.2%</span>
                  <span className="text-sm text-muted-foreground">较上月</span>
                </div>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">累计发放</p>
                <p className="text-2xl font-bold">¥8,700,000</p>
                <p className="text-sm text-muted-foreground">本年度</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">人均薪资</p>
                <p className="text-2xl font-bold">¥5,224</p>
                <div className="mt-1 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-accent" />
                  <span className="text-sm text-accent">-2.1%</span>
                  <span className="text-sm text-muted-foreground">较上月</span>
                </div>
              </div>
              <div className="rounded-full bg-chart-3/10 p-3">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">发薪人数</p>
                <p className="text-2xl font-bold">3,350</p>
                <p className="text-sm text-muted-foreground">本月</p>
              </div>
              <div className="rounded-full bg-chart-5/10 p-3">
                <Building2 className="h-5 w-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 月度成本趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>月度人力成本趋势</CardTitle>
            <CardDescription>近6个月人力成本变化</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyCostData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(value) => `${value / 10000}万`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, "人力成本"]}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="oklch(0.55 0.18 250)"
                  strokeWidth={3}
                  dot={{ fill: "oklch(0.55 0.18 250)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 项目成本分布 */}
        <Card>
          <CardHeader>
            <CardTitle>项目成本分布</CardTitle>
            <CardDescription>各项目人力成本占比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={projectCostData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {projectCostData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name) => [`¥${value.toLocaleString()}`, name]}
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
      </div>

      {/* 详细数据 */}
      <Card>
        <CardHeader>
          <Tabs defaultValue="project" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="project">项目成本</TabsTrigger>
                <TabsTrigger value="personal">个人薪资</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="搜索..." className="w-60 pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="project" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目名称</TableHead>
                    <TableHead>在岗人数</TableHead>
                    <TableHead>本月成本</TableHead>
                    <TableHead>累计成本</TableHead>
                    <TableHead>人均成本</TableHead>
                    <TableHead>环比</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectCostData.slice(0, 3).map((project, index) => (
                    <TableRow key={project.name}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{[856, 642, 534][index]}人</TableCell>
                      <TableCell className="font-medium text-primary">
                        ¥{(project.value / 3).toLocaleString()}
                      </TableCell>
                      <TableCell>¥{project.value.toLocaleString()}</TableCell>
                      <TableCell>¥{Math.round(project.value / ([856, 642, 534][index] * 3)).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {index === 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-destructive" />
                              <span className="text-destructive">+5.2%</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4 text-accent" />
                              <span className="text-accent">-2.8%</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="personal" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>项目/班组</TableHead>
                    <TableHead>近3月薪资</TableHead>
                    <TableHead>累计薪资</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryHistory.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.id}</TableCell>
                      <TableCell>{person.name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{person.project}</p>
                          <p className="text-xs text-muted-foreground">{person.team}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {person.records.map((record, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {record.month.slice(5)}: ¥{record.amount}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        ¥{person.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          查看明细
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  )
}
