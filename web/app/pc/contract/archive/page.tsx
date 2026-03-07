"use client"

import { useState, useEffect, useCallback } from "react"
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
import { api, downloadContractPdf } from "@/lib/api"

interface ContractArchiveItem {
  id: number
  title?: string
  person_name?: string
  work_no?: string
  signed_at?: string
  status?: string
  person_org_id?: number
  org_name?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  已签署: { label: "有效", color: "bg-accent/10 text-accent border-accent/20" },
  已作废: { label: "已作废", color: "bg-muted text-muted-foreground border-muted" },
}

export default function ContractArchivePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState("all")
  const [list, setList] = useState<ContractArchiveItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([])

  const fetchList = useCallback(async () => {
    try {
      const q: Record<string, string> = { page: String(page), pageSize: "20" }
      if (selectedProject !== "all") q.org_id = selectedProject
      if (searchTerm.trim()) q.title = searchTerm.trim()
      const res = await api<{ list: ContractArchiveItem[]; total: number }>("/api/contract/archive", { query: q })
      setList(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch { setList([]); setTotal(0) }
  }, [page, selectedProject, searchTerm])

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

  const filteredContracts = list

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
                <p className="text-2xl font-bold">{total.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{total.toLocaleString()}</p>
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
                <p className="text-sm font-medium text-muted-foreground">已签署</p>
                <p className="text-2xl font-bold">{total.toLocaleString()}</p>
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
                <p className="text-sm font-medium text-muted-foreground">合同数</p>
                <p className="text-2xl font-bold">{list.length}</p>
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
            <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setPage(1) }}>
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
            <Select value="all">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
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
                <TableHead>合同ID</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>签约人</TableHead>
                <TableHead>工号</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>签署时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-mono text-sm">{contract.id}</TableCell>
                  <TableCell className="font-medium">{contract.title ?? "-"}</TableCell>
                  <TableCell>{contract.person_name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{contract.work_no ?? "-"}</TableCell>
                  <TableCell>{contract.org_name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{contract.signed_at ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={(statusLabels[contract.status ?? "已签署"] ?? statusLabels["已签署"]).color}>
                      {statusLabels[contract.status ?? "已签署"]?.label ?? "有效"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => downloadContractPdf(String(contract.id))}>
                          <Download className="h-4 w-4" />
                          下载PDF
                        </DropdownMenuItem>
                        {contract.status === "已签署" && (
                          <DropdownMenuItem
                            className="gap-2 text-destructive"
                            onClick={async () => {
                              try {
                                await api(`/api/contract/${contract.id}/invalidate`, { method: "PUT" })
                                fetchList()
                              } catch (e) { console.error(e) }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            作废
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
              显示 1-{filteredContracts.length} 条，共 {total} 条
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
