"use client"

import { useState, useEffect, useCallback } from "react"
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
import { api } from "@/lib/api"

interface AttendanceItem {
  id: number
  person_id: number
  person_name?: string
  work_no?: string
  org_name?: string
  work_date?: string
  clock_in?: string
  clock_out?: string
  hours?: number
  overtime_hours?: number
  standard_hours?: number
}

const personnelWorkHoursMock = [
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

const teamWorkHoursMock = [
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
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [list, setList] = useState<AttendanceItem[]>([])
  const [total, setTotal] = useState(0)
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([])
  const [backfillLoading, setBackfillLoading] = useState(false)

  const fetchList = useCallback(async () => {
    try {
      let start = ""
      let end = ""
      if (month) {
        start = `${month}-01`
        const [y, m] = month.split("-").map(Number)
        const lastDay = new Date(y, m, 0).getDate()
        end = `${month}-${String(lastDay).padStart(2, "0")}`
      }
      const q: Record<string, string> = { pageSize: "100" }
      if (start) q.start = start
      if (end) q.end = end
      if (selectedProject !== "all") q.org_id = selectedProject
      const res = await api<{ list: AttendanceItem[]; total: number }>("/api/attendance/report", { query: q })
      setList(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch { setList([]); setTotal(0) }
  }, [month, selectedProject])

  const fetchOrg = useCallback(async () => {
    try {
      const { tree } = await api<{ tree: { id: number; name: string; children?: unknown[] }[] }>("/api/sys/org")
      const flatten = (n: { id: number; name: string; children?: unknown[] }[]): { id: number; name: string }[] => {
        const out: { id: number; name: string }[] = []
        n.forEach((x) => { out.push({ id: x.id, name: x.name }); if (x.children?.length) out.push(...flatten(x.children as { id: number; name: string; children?: unknown[] }[])) })
        return out
      }
      setOrgList(flatten(tree ?? []))
    } catch { setOrgList([]) }
  }, [])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { fetchOrg() }, [fetchOrg])

  const handleBackfillOvertime = async () => {
    if (!month) return
    setBackfillLoading(true)
    try {
      const [y, m] = month.split("-").map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      const start = `${month}-01`
      const end = `${month}-${String(lastDay).padStart(2, "0")}`
      const res = await api<{ ok: boolean; count?: number }>("/api/attendance/backfill-overtime", {
        method: "POST",
        body: { start, end },
      })
      if (res.ok) {
        alert(`补全成功，共更新 ${res.count ?? 0} 条记录`)
        fetchList()
      }
    } catch (e) {
      alert((e as Error).message || "补全失败")
    } finally {
      setBackfillLoading(false)
    }
  }

  const filteredData = list.filter((p) =>
    (p.person_name ?? "").includes(searchTerm) || (p.work_no ?? "").includes(searchTerm)
  )

  const workDaysByPerson = filteredData.reduce((acc, r) => {
    const k = r.person_id
    if (!acc[k]) acc[k] = { name: r.person_name ?? "-", work_no: r.work_no ?? "-", org: r.org_name ?? "-", days: 0, hours: 0, overtime: 0 }
    acc[k].days++
    acc[k].hours += r.hours ?? 0
    acc[k].overtime += r.overtime_hours ?? 0
    return acc
  }, {} as Record<number, { name: string; work_no: string; org: string; days: number; hours: number; overtime: number }>)
  const personList = Object.entries(workDaysByPerson).map(([id, v]) => ({ id: Number(id), ...v })) as { id: number; name: string; work_no: string; org: string; days: number; hours: number; overtime: number }[]
  const totalHours = personList.reduce((s, p) => s + p.hours, 0)

  const handleExportCsv = () => {
    const headers = ["工号", "姓名", "组织", "日期", "上班", "下班", "工时", "加班"]
    const rows = filteredData.map((r) => [
      r.work_no ?? "",
      r.person_name ?? "",
      r.org_name ?? "",
      r.work_date ?? "",
      r.clock_in ?? "",
      r.clock_out ?? "",
      String(r.hours ?? 0),
      String(r.overtime_hours ?? 0),
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `工时报表_${month}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const teamHours = Object.entries(
    filteredData.reduce((acc, r) => {
      const org = r.org_name ?? "其他"
      if (!acc[org]) acc[org] = { personnel: 0, totalHours: 0 }
      acc[org].totalHours += r.hours ?? 0
      return acc
    }, {} as Record<string, { personnel: number; totalHours: number }>)
  ).map(([team, v]) => ({ team, personnel: v.personnel || 1, totalHours: v.totalHours, avgHours: v.totalHours }))
  const trendData = Object.entries(
    filteredData.reduce((acc, r) => {
      const d = (r.work_date ?? "").slice(5)
      if (!d) return acc
      if (!acc[d]) acc[d] = 0
      acc[d] += r.hours ?? 0
      return acc
    }, {} as Record<string, number>)
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, hours]) => ({ date, hours }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">工时报表</h1>
          <p className="text-muted-foreground">多维度工时汇总统计与导出</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={(v) => { setMonth(v) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择周期" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const y = new Date().getFullYear()
                const m = i + 1
                const v = `${y}-${String(m).padStart(2, "0")}`
                return <SelectItem key={v} value={v}>{y}年{m}月</SelectItem>
              })}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleBackfillOvertime}
            disabled={backfillLoading}
          >
            {backfillLoading ? "补全中..." : "批量补全加班"}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
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
                <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{personList.length}</p>
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
                <p className="text-2xl font-bold">{personList.length ? (totalHours / personList.length).toFixed(1) : 0}</p>
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
                <p className="text-sm font-medium text-muted-foreground">记录数</p>
                <p className="text-2xl font-bold">{filteredData.length}</p>
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
              <BarChart data={teamHours.length ? teamHours : [{ team: "-", totalHours: 0 }]} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="team" type="category" width={80} className="text-xs" />
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
                    {orgList.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
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
                  {personList.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.work_no}</TableCell>
                      <TableCell>{person.name}</TableCell>
                      <TableCell>{person.org}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{person.days}天</TableCell>
                      <TableCell className="font-medium">{person.hours.toFixed(1)}小时</TableCell>
                      <TableCell>{(person.days ? person.hours / person.days : 0).toFixed(1)}小时</TableCell>
                      <TableCell>{person.overtime != null && person.overtime > 0 ? `${person.overtime.toFixed(1)}小时` : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">详情</Button>
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
                  {teamHours.map((team) => (
                    <TableRow key={team.team}>
                      <TableCell className="font-medium">{team.team}</TableCell>
                      <TableCell>{team.personnel}人</TableCell>
                      <TableCell className="font-medium">
                        {team.totalHours.toLocaleString()}小时
                      </TableCell>
                      <TableCell>{team.avgHours.toFixed(0)}小时</TableCell>
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
                  {teamHours.map((project) => (
                    <TableRow key={project.team}>
                      <TableCell className="font-medium">{project.team}</TableCell>
                      <TableCell>{project.personnel}人</TableCell>
                      <TableCell className="font-medium">
                        {project.totalHours.toLocaleString()}小时
                      </TableCell>
                      <TableCell>{project.avgHours.toFixed(0)}小时</TableCell>
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
