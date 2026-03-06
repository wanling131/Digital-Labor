"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Search,
  Download,
  Filter,
  Clock,
  Users,
  Building2,
  TrendingUp,
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
} from "recharts"

const personnelWorkHours = [
  {
    id: "EMP001",
    name: "张三",
    project: "项目A-主体工程",
    team: "钢筋班组",
    workDays: 26,
    totalHours: 234,
    avgHours: 9.0,
    overtime: 26,
  },
  {
    id: "EMP002",
    name: "李四",
    project: "项目A-主体工程",
    team: "木工班组",
    workDays: 25,
    totalHours: 225,
    avgHours: 9.0,
    overtime: 25,
  },
  {
    id: "EMP003",
    name: "王五",
    project: "项目B-装修工程",
    team: "抹灰班组",
    workDays: 24,
    totalHours: 192,
    avgHours: 8.0,
    overtime: 0,
  },
  {
    id: "EMP004",
    name: "赵六",
    project: "项目B-装修工程",
    team: "水电班组",
    workDays: 22,
    totalHours: 176,
    avgHours: 8.0,
    overtime: 0,
  },
  {
    id: "EMP005",
    name: "钱七",
    project: "项目C-基建工程",
    team: "混凝土班组",
    workDays: 27,
    totalHours: 270,
    avgHours: 10.0,
    overtime: 54,
  },
]

const teamWorkHours = [
  { team: "钢筋班组", personnel: 245, totalHours: 52920, avgHours: 216 },
  { team: "木工班组", personnel: 198, totalHours: 42768, avgHours: 216 },
  { team: "混凝土班组", personnel: 176, totalHours: 38016, avgHours: 216 },
  { team: "架子班组", personnel: 156, totalHours: 33696, avgHours: 216 },
  { team: "水电班组", personnel: 134, totalHours: 28944, avgHours: 216 },
  { team: "抹灰班组", personnel: 112, totalHours: 24192, avgHours: 216 },
]

const trendData = [
  { date: "03-01", hours: 28560 },
  { date: "03-02", hours: 27890 },
  { date: "03-03", hours: 12450 },
  { date: "03-04", hours: 28120 },
  { date: "03-05", hours: 27650 },
  { date: "03-06", hours: 28340 },
  { date: "03-07", hours: 27980 },
]

export default function AttendanceReportPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState("all")

  const filteredData = personnelWorkHours.filter((person) => {
    const matchesSearch = person.name.includes(searchTerm) || person.id.includes(searchTerm)
    const matchesProject = selectedProject === "all" || person.project.includes(selectedProject)
    return matchesSearch && matchesProject
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">工时报表</h1>
          <p className="text-muted-foreground">多维度工时汇总统计与导出</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="2024-03">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择周期" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-03">2024年3月</SelectItem>
              <SelectItem value="2024-02">2024年2月</SelectItem>
              <SelectItem value="2024-01">2024年1月</SelectItem>
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
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">本月总工时</p>
                <p className="text-2xl font-bold">220,536</p>
                <p className="text-xs text-muted-foreground">小时</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">出勤人数</p>
                <p className="text-2xl font-bold">3,350</p>
                <p className="text-xs text-muted-foreground">人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-chart-3/10 p-3">
                <Building2 className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">人均工时</p>
                <p className="text-2xl font-bold">65.8</p>
                <p className="text-xs text-muted-foreground">小时/人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-chart-5/10 p-3">
                <TrendingUp className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">加班工时</p>
                <p className="text-2xl font-bold">18,245</p>
                <p className="text-xs text-muted-foreground">小时</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>每日工时趋势</CardTitle>
            <CardDescription>近7天工时变化趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${value}小时`, "总工时"]}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="oklch(0.55 0.18 250)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.55 0.18 250)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>班组工时排行</CardTitle>
            <CardDescription>各班组本月工时统计</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={teamWorkHours} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="team" type="category" className="text-xs" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${value}小时`, "总工时"]}
                />
                <Bar dataKey="totalHours" fill="oklch(0.55 0.18 250)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 详细报表 */}
      <Card>
        <CardHeader>
          <Tabs defaultValue="personal" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="personal">个人工时</TabsTrigger>
                <TabsTrigger value="team">班组汇总</TabsTrigger>
                <TabsTrigger value="project">项目汇总</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名、工号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-60 pl-9"
                  />
                </div>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部项目</SelectItem>
                    <SelectItem value="项目A">项目A-主体工程</SelectItem>
                    <SelectItem value="项目B">项目B-装修工程</SelectItem>
                    <SelectItem value="项目C">项目C-基建工程</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="personal" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>所属项目</TableHead>
                    <TableHead>班组</TableHead>
                    <TableHead>出勤天数</TableHead>
                    <TableHead>总工时</TableHead>
                    <TableHead>日均工时</TableHead>
                    <TableHead>加班时长</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.id}</TableCell>
                      <TableCell>{person.name}</TableCell>
                      <TableCell>{person.project}</TableCell>
                      <TableCell>{person.team}</TableCell>
                      <TableCell>{person.workDays}天</TableCell>
                      <TableCell className="font-medium">{person.totalHours}小时</TableCell>
                      <TableCell>{person.avgHours}小时</TableCell>
                      <TableCell>
                        {person.overtime > 0 ? (
                          <Badge variant="outline" className="bg-chart-5/10 text-chart-5 border-chart-5/20">
                            {person.overtime}小时
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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

            <TabsContent value="team" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>班组名称</TableHead>
                    <TableHead>在岗人数</TableHead>
                    <TableHead>总工时</TableHead>
                    <TableHead>人均工时</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamWorkHours.map((team) => (
                    <TableRow key={team.team}>
                      <TableCell className="font-medium">{team.team}</TableCell>
                      <TableCell>{team.personnel}人</TableCell>
                      <TableCell className="font-medium">
                        {team.totalHours.toLocaleString()}小时
                      </TableCell>
                      <TableCell>{team.avgHours}小时</TableCell>
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

            <TabsContent value="project" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目名称</TableHead>
                    <TableHead>在岗人数</TableHead>
                    <TableHead>总工时</TableHead>
                    <TableHead>人均工时</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { project: "项目A-主体工程", personnel: 856, totalHours: 184896, avgHours: 216 },
                    { project: "项目B-装修工程", personnel: 642, totalHours: 138672, avgHours: 216 },
                    { project: "项目C-基建工程", personnel: 534, totalHours: 115344, avgHours: 216 },
                  ].map((project) => (
                    <TableRow key={project.project}>
                      <TableCell className="font-medium">{project.project}</TableCell>
                      <TableCell>{project.personnel}人</TableCell>
                      <TableCell className="font-medium">
                        {project.totalHours.toLocaleString()}小时
                      </TableCell>
                      <TableCell>{project.avgHours}小时</TableCell>
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
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  )
}
