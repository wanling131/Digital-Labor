"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Users,
  Edit,
  Trash2,
  MoreHorizontal,
  FolderTree,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"

interface OrgNode {
  id: string
  name: string
  type: "company" | "department" | "team" | "project"
  manager: string
  memberCount: number
  children?: OrgNode[]
  expanded?: boolean
}

function mapApiTree(node: { id: number; name: string; type: string; manager?: string; memberCount: number; children?: unknown[] }): OrgNode {
  return {
    id: String(node.id),
    name: node.name,
    type: (node.type === "segment" ? "department" : node.type) as OrgNode["type"],
    manager: node.manager ?? "",
    memberCount: node.memberCount ?? 0,
    expanded: true,
    children: Array.isArray(node.children) && node.children.length > 0
      ? (node.children as typeof node[]).map(mapApiTree)
      : undefined,
  }
}

const typeConfig = {
  company: { label: "公司", color: "bg-primary text-primary-foreground" },
  department: { label: "分公司", color: "bg-chart-2 text-foreground" },
  project: { label: "项目部", color: "bg-chart-3 text-foreground" },
  team: { label: "班组", color: "bg-chart-4 text-foreground" },
}

function OrgTreeNode({ node, level = 0 }: { node: OrgNode; level?: number }) {
  const [expanded, setExpanded] = useState(node.expanded ?? false)
  const hasChildren = node.children && node.children.length > 0
  const config = typeConfig[node.type]

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
        </div>
        <div className="flex-1 flex items-center gap-3">
          <Badge variant="secondary" className={config.color}>
            {config.label}
          </Badge>
          <span className="font-medium">{node.name}</span>
          <span className="text-sm text-muted-foreground">负责人: {node.manager}</span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{node.memberCount}人</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className="h-4 w-4 mr-2" />
              添加下级
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <OrgTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrganizationPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [orgTree, setOrgTree] = useState<OrgNode[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrg = useCallback(async () => {
    try {
      const { tree } = await api<{ tree: unknown[] }>("/api/sys/org")
      setOrgTree((tree || []).map((n: { id: number; name: string; type: string; manager?: string; memberCount: number; children?: unknown[] }) => mapApiTree(n)))
    } catch {
      setOrgTree([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrg()
  }, [loadOrg])

  const stats = {
    company: orgTree.reduce((acc, n) => acc + countByType(n, "company"), 0),
    department: orgTree.reduce((acc, n) => acc + countByType(n, "department"), 0),
    project: orgTree.reduce((acc, n) => acc + countByType(n, "project"), 0),
    team: orgTree.reduce((acc, n) => acc + countByType(n, "team"), 0),
  }
  function countByType(node: OrgNode, type: string): number {
    let c = node.type === type ? 1 : 0
    ;(node.children || []).forEach((ch) => { c += countByType(ch, type) })
    return c
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">组织架构管理</h1>
          <p className="text-muted-foreground">管理公司、分公司、项目部和班组的层级结构</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建组织
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建组织</DialogTitle>
              <DialogDescription>创建新的组织节点，可以是公司、分公司、项目部或班组</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>组织名称</Label>
                <Input placeholder="请输入组织名称" />
              </div>
              <div className="grid gap-2">
                <Label>组织类型</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择组织类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">公司</SelectItem>
                    <SelectItem value="department">分公司</SelectItem>
                    <SelectItem value="project">项目部</SelectItem>
                    <SelectItem value="team">班组</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>上级组织</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择上级组织" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">无（作为顶级组织）</SelectItem>
                    <SelectItem value="1">建筑集团总公司</SelectItem>
                    <SelectItem value="1-1">华东分公司</SelectItem>
                    <SelectItem value="1-2">华北分公司</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>负责人</Label>
                <Input placeholder="请输入负责人姓名" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">取消</Button>
              <Button>确认创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总公司数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.company}</div>
            <p className="text-xs text-muted-foreground">集团总部</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分公司/标段数</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.department}</div>
            <p className="text-xs text-muted-foreground">分公司或标段</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">项目部数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.project}</div>
            <p className="text-xs text-muted-foreground">在建项目</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">班组数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.team}</div>
            <p className="text-xs text-muted-foreground">施工班组</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>组织架构树</CardTitle>
              <CardDescription>点击节点展开或收起下级组织</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索组织..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-2">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">加载中...</p>
            ) : orgTree.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无组织数据，请先执行种子或创建组织</p>
            ) : (
              orgTree.map((node) => (
                <OrgTreeNode key={node.id} node={node} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
