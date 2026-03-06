"use client"

import { useState } from "react"
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

const users = [
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
  "系统管理员": "bg-red-100 text-red-700",
  "项目经理": "bg-blue-100 text-blue-700",
  "人事主管": "bg-green-100 text-green-700",
  "财务人员": "bg-yellow-100 text-yellow-700",
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewDialog, setShowNewDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户账号及权限</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增用户
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增用户</DialogTitle>
              <DialogDescription>
                创建新的系统用户账号
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>姓名</Label>
                  <Input placeholder="请输入姓名" />
                </div>
                <div className="grid gap-2">
                  <Label>用户名</Label>
                  <Input placeholder="请输入用户名" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>邮箱</Label>
                  <Input type="email" placeholder="请输入邮箱" />
                </div>
                <div className="grid gap-2">
                  <Label>手机号</Label>
                  <Input placeholder="请输入手机号" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>角色</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">系统管理员</SelectItem>
                      <SelectItem value="manager">项目经理</SelectItem>
                      <SelectItem value="hr">人事主管</SelectItem>
                      <SelectItem value="finance">财务人员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>部门</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hq">总部</SelectItem>
                      <SelectItem value="project_a">项目部A</SelectItem>
                      <SelectItem value="hr">人力资源部</SelectItem>
                      <SelectItem value="finance">财务部</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>初始密码</Label>
                <Input type="password" placeholder="请设置初始密码" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                取消
              </Button>
              <Button onClick={() => setShowNewDialog(false)}>
                创建用户
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
                <p className="text-2xl font-bold">{users.length}</p>
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
                  {users.filter((u) => u.status === "active").length}
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
                  {users.filter((u) => u.status === "inactive").length}
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
                  {users.filter((u) => u.role === "系统管理员").length}
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
              <CardDescription>共 {users.length} 个用户</CardDescription>
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
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue />
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`/placeholder-${user.id}.jpg`} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{user.username}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role] || "bg-gray-100 text-gray-700"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                  <TableCell>
                    <Switch checked={user.status === "active"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Key className="h-4 w-4 mr-2" />
                          重置密码
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
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
