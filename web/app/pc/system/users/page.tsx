"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Key,
  Users,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react"
import { api } from "@/lib/api"

interface UserItem {
  id: number
  username: string
  name?: string
  org_id?: number
  org_name?: string
  role?: string
  enabled?: number
  created_at?: string
}

const usersMock = [
  {
    id: "1",
    name: "张管理",
    username: "admin",
    email: "admin@company.com",
    phone: "138****1234",
    role: "系统管理员",
    department: "总部",
    status: "active",
    lastLogin: "2024-03-15 10:30",
    createdAt: "2023-01-01",
  },
  {
    id: "2",
    name: "李经理",
    username: "manager_li",
    email: "li@company.com",
    phone: "139****5678",
    role: "项目经理",
    department: "项目部A",
    status: "active",
    lastLogin: "2024-03-15 09:15",
    createdAt: "2023-03-15",
  },
  {
    id: "3",
    name: "王主管",
    username: "wang_hr",
    email: "wang@company.com",
    phone: "137****9012",
    role: "人事主管",
    department: "人力资源部",
    status: "active",
    lastLogin: "2024-03-14 18:20",
    createdAt: "2023-05-20",
  },
  {
    id: "4",
    name: "赵财务",
    username: "zhao_fin",
    email: "zhao@company.com",
    phone: "136****3456",
    role: "财务人员",
    department: "财务部",
    status: "inactive",
    lastLogin: "2024-02-28 14:30",
    createdAt: "2023-06-01",
  },
]

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  user: "bg-blue-100 text-blue-700",
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [list, setList] = useState<UserItem[]>([])
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([])
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [formUsername, setFormUsername] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formName, setFormName] = useState("")
  const [formOrgId, setFormOrgId] = useState<string>("none")
  const [formRole, setFormRole] = useState("admin")
  const [formEnabled, setFormEnabled] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchList = useCallback(async () => {
    try {
      const res = await api<{ list: UserItem[] }>("/api/sys/user")
      setList(res.list ?? [])
    } catch { setList([]) }
  }, [])

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

  const filtered = list.filter((u) => {
    const matchesSearch = (u.username ?? "").includes(searchTerm) || (u.name ?? "").includes(searchTerm) || (u.org_name ?? "").includes(searchTerm)
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && (u.enabled ?? 1)) || 
      (statusFilter === "inactive" && !(u.enabled ?? 1))
    return matchesSearch && matchesStatus
  })

  const handleCreate = async () => {
    if (!formUsername || !formPassword) return
    setIsSubmitting(true)
    try {
      await api("/api/sys/user", {
        method: "POST",
        body: { username: formUsername, password: formPassword, name: formName || undefined, org_id: formOrgId && formOrgId !== "none" ? parseInt(formOrgId, 10) : undefined, role: formRole },
      })
      setShowNewDialog(false)
      setFormUsername("")
      setFormPassword("")
      setFormName("")
      setFormOrgId("none")
      fetchList()
    } catch (e) { console.error(e) }
    setIsSubmitting(false)
  }

  const handleUpdate = async () => {
    if (!editUser) return
    setIsSubmitting(true)
    try {
      await api(`/api/sys/user/${editUser.id}`, {
        method: "PUT",
        body: { name: formName || undefined, org_id: formOrgId && formOrgId !== "none" ? parseInt(formOrgId, 10) : undefined, role: formRole, enabled: formEnabled ? 1 : 0, password: formPassword || undefined },
      })
      setEditUser(null)
      setFormPassword("")
      fetchList()
    } catch (e) { console.error(e) }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户账号及权限</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={(o) => { setShowNewDialog(o); if (!o) { setEditUser(null); setFormUsername(""); setFormPassword(""); setFormName(""); setFormOrgId("none") } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { setEditUser(null); setFormUsername(""); setFormPassword(""); setFormName(""); setFormOrgId("none"); setFormRole("admin") }}>
              <Plus className="h-4 w-4" />
              新增用户
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editUser ? "编辑用户" : "新增用户"}</DialogTitle>
              <DialogDescription>
                {editUser ? "修改用户信息" : "创建新的系统用户账号"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>用户名 *</Label>
                  <Input placeholder="请输入用户名" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} disabled={!!editUser} />
                </div>
                <div className="grid gap-2">
                  <Label>密码 {editUser ? "（留空不修改）" : "*"}</Label>
                  <Input type="password" placeholder="请输入密码" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>姓名</Label>
                  <Input placeholder="请输入姓名" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>组织</Label>
                  <Select value={formOrgId} onValueChange={setFormOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择组织" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {orgList.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>角色</Label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="user">普通用户</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editUser && (
                  <div className="grid gap-2">
                    <Label>启用</Label>
                    <div className="flex items-center h-10">
                      <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowNewDialog(false); setEditUser(null); setFormUsername(""); setFormPassword(""); setFormName(""); setFormOrgId("") }}>
                取消
              </Button>
              <Button onClick={editUser ? handleUpdate : handleCreate} disabled={(!editUser && (!formUsername || !formPassword)) || isSubmitting}>
                {isSubmitting ? "提交中..." : editUser ? "保存" : "创建用户"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总用户数</p>
                <p className="text-2xl font-bold">{list.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃用户</p>
                <p className="text-2xl font-bold text-green-500">
                  {list.filter((u) => (u.enabled ?? 1)).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">禁用用户</p>
                <p className="text-2xl font-bold text-destructive">
                  {list.filter((u) => !(u.enabled ?? 1)).length}
                </p>
              </div>
              <UserX className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">管理员</p>
                <p className="text-2xl font-bold text-primary">
                  {list.filter((u) => u.role === "admin").length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>用户列表</CardTitle>
              <CardDescription>共 {list.length} 个用户</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索用户..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>最后登录</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(user.name ?? user.username).slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name ?? user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{user.username}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role ?? ""] || "bg-gray-100 text-gray-700"}>
                      {user.role === "admin" ? "管理员" : "普通用户"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.org_name ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">-</TableCell>
                  <TableCell>
                    <Badge variant={user.enabled ? "default" : "secondary"}>{user.enabled ? "启用" : "禁用"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditUser(user)
                            setFormUsername(user.username)
                            setFormName(user.name ?? "")
                            setFormOrgId(user.org_id ? String(user.org_id) : "")
                            setFormRole(user.role ?? "admin")
                            setFormEnabled(!!(user.enabled ?? 1))
                            setFormPassword("")
                            setShowNewDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
