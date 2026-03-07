"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Settings,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { api } from "@/lib/api"

interface Role {
  id: string
  name: string
  description: string
  userCount: number
  permissions: string[]
  createdAt: string
  status: "active" | "inactive"
}

const permissionModules = [
  {
    id: "dashboard",
    name: "综合看板",
    permissions: [
      { id: "dashboard.view", name: "查看看板" },
      { id: "dashboard.export", name: "导出数据" },
    ],
  },
  {
    id: "personnel",
    name: "人员档案",
    permissions: [
      { id: "personnel.view", name: "查看人员" },
      { id: "personnel.create", name: "新增人员" },
      { id: "personnel.edit", name: "编辑人员" },
      { id: "personnel.delete", name: "删除人员" },
      { id: "personnel.export", name: "导出数据" },
    ],
  },
  {
    id: "contract",
    name: "电子合同",
    permissions: [
      { id: "contract.view", name: "查看合同" },
      { id: "contract.create", name: "发起合同" },
      { id: "contract.template", name: "管理模板" },
      { id: "contract.archive", name: "归档管理" },
    ],
  },
  {
    id: "attendance",
    name: "考勤管理",
    permissions: [
      { id: "attendance.view", name: "查看考勤" },
      { id: "attendance.import", name: "导入数据" },
      { id: "attendance.audit", name: "审核考勤" },
      { id: "attendance.export", name: "导出报表" },
    ],
  },
  {
    id: "settlement",
    name: "智能结算",
    permissions: [
      { id: "settlement.view", name: "查看结算" },
      { id: "settlement.create", name: "生成结算单" },
      { id: "settlement.audit", name: "审核结算" },
      { id: "settlement.export", name: "导出报表" },
    ],
  },
  {
    id: "system",
    name: "系统管理",
    permissions: [
      { id: "system.org", name: "组织架构" },
      { id: "system.role", name: "角色权限" },
      { id: "system.user", name: "用户管理" },
      { id: "system.log", name: "操作日志" },
    ],
  },
]

export default function RolesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ list: { code: string; name: string; desc: string; userCount: number }[] }>("/api/sys/role")
      .then((res) => {
        setRoles(
          (res.list || []).map((r) => ({
            id: r.code,
            name: r.name,
            description: r.desc || "",
            userCount: r.userCount ?? 0,
            permissions: [],
            createdAt: "",
            status: "active" as const,
          }))
        )
      })
      .catch(() => setRoles([]))
      .finally(() => setLoading(false))
  }, [])

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const toggleModuleAll = (moduleId: string, permissions: { id: string; name: string }[]) => {
    const permissionIds = permissions.map((p) => p.id)
    const allSelected = permissionIds.every((id) => selectedPermissions.includes(id))
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !permissionIds.includes(id)))
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...permissionIds])])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">角色权限管理</h1>
          <p className="text-muted-foreground">配置系统角色和功能权限</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建角色
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建角色</DialogTitle>
              <DialogDescription>创建新的系统角色并配置相应权限</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>角色名称</Label>
                <Input placeholder="请输入角色名称" />
              </div>
              <div className="grid gap-2">
                <Label>角色描述</Label>
                <Textarea placeholder="请输入角色描述" />
              </div>
              <div className="grid gap-2">
                <Label>功能权限</Label>
                <div className="border rounded-lg">
                  <Accordion type="multiple" className="w-full">
                    {permissionModules.map((module) => (
                      <AccordionItem key={module.id} value={module.id}>
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={module.permissions.every((p) =>
                                selectedPermissions.includes(p.id)
                              )}
                              onCheckedChange={() =>
                                toggleModuleAll(module.id, module.permissions)
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span>{module.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {
                                module.permissions.filter((p) =>
                                  selectedPermissions.includes(p.id)
                                ).length
                              }
                              /{module.permissions.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="grid grid-cols-2 gap-3 pl-7">
                            {module.permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={permission.id}
                                  checked={selectedPermissions.includes(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                />
                                <Label
                                  htmlFor={permission.id}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {permission.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
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
            <CardTitle className="text-sm font-medium">角色总数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">系统角色</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用户总数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.reduce((acc, role) => acc + role.userCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">已分配角色</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">权限模块</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissionModules.length}</div>
            <p className="text-xs text-muted-foreground">功能模块</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">权限项</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissionModules.reduce((acc, m) => acc + m.permissions.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">细分权限</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>角色列表</CardTitle>
              <CardDescription>管理系统中的所有角色</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索角色..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="text-center">用户数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {role.description}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{role.userCount}人</Badge>
                  </TableCell>
                  <TableCell>{role.createdAt}</TableCell>
                  <TableCell>
                    <Badge
                      variant={role.status === "active" ? "default" : "secondary"}
                    >
                      {role.status === "active" ? "启用" : "禁用"}
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
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          查看权限
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑角色
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" />
                          分配用户
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除角色
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
