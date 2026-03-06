"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Shield,
  Users,
  FileText,
  Clock,
  CreditCard,
  Building2,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
} from "lucide-react"

const roles = [
  { id: "admin", name: "系统管理员", description: "拥有所有权限", users: 2 },
  { id: "manager", name: "项目经理", description: "项目管理相关权限", users: 5 },
  { id: "hr", name: "人事主管", description: "人员档案相关权限", users: 3 },
  { id: "finance", name: "财务人员", description: "结算相关权限", users: 4 },
  { id: "viewer", name: "普通用户", description: "只读权限", users: 10 },
]

const permissionModules = [
  {
    id: "dashboard",
    name: "综合数据看板",
    icon: Settings,
    permissions: [
      { id: "dashboard.view", name: "查看看板", admin: true, manager: true, hr: true, finance: true, viewer: true },
      { id: "dashboard.export", name: "导出数据", admin: true, manager: true, hr: false, finance: true, viewer: false },
    ],
  },
  {
    id: "personnel",
    name: "人员档案管理",
    icon: Users,
    permissions: [
      { id: "personnel.view", name: "查看档案", admin: true, manager: true, hr: true, finance: false, viewer: true },
      { id: "personnel.create", name: "新增档案", admin: true, manager: false, hr: true, finance: false, viewer: false },
      { id: "personnel.edit", name: "编辑档案", admin: true, manager: false, hr: true, finance: false, viewer: false },
      { id: "personnel.delete", name: "删除档案", admin: true, manager: false, hr: false, finance: false, viewer: false },
      { id: "personnel.export", name: "导出档案", admin: true, manager: true, hr: true, finance: false, viewer: false },
    ],
  },
  {
    id: "contract",
    name: "电子合同管理",
    icon: FileText,
    permissions: [
      { id: "contract.view", name: "查看合同", admin: true, manager: true, hr: true, finance: true, viewer: true },
      { id: "contract.create", name: "发起合同", admin: true, manager: true, hr: true, finance: false, viewer: false },
      { id: "contract.approve", name: "审批合同", admin: true, manager: true, hr: false, finance: false, viewer: false },
      { id: "contract.delete", name: "删除合同", admin: true, manager: false, hr: false, finance: false, viewer: false },
    ],
  },
  {
    id: "attendance",
    name: "考勤管理",
    icon: Clock,
    permissions: [
      { id: "attendance.view", name: "查看考勤", admin: true, manager: true, hr: true, finance: true, viewer: true },
      { id: "attendance.import", name: "导入数据", admin: true, manager: true, hr: true, finance: false, viewer: false },
      { id: "attendance.edit", name: "修改记录", admin: true, manager: true, hr: true, finance: false, viewer: false },
      { id: "attendance.export", name: "导出报表", admin: true, manager: true, hr: true, finance: true, viewer: false },
    ],
  },
  {
    id: "settlement",
    name: "智能结算",
    icon: CreditCard,
    permissions: [
      { id: "settlement.view", name: "查看结算", admin: true, manager: true, hr: false, finance: true, viewer: false },
      { id: "settlement.create", name: "生成结算", admin: true, manager: false, hr: false, finance: true, viewer: false },
      { id: "settlement.approve", name: "审批结算", admin: true, manager: true, hr: false, finance: false, viewer: false },
      { id: "settlement.export", name: "导出报表", admin: true, manager: true, hr: false, finance: true, viewer: false },
    ],
  },
  {
    id: "site",
    name: "项目现场管理",
    icon: Building2,
    permissions: [
      { id: "site.view", name: "查看看板", admin: true, manager: true, hr: true, finance: false, viewer: true },
      { id: "site.departure", name: "离场登记", admin: true, manager: true, hr: true, finance: false, viewer: false },
    ],
  },
  {
    id: "system",
    name: "系统管理",
    icon: Shield,
    permissions: [
      { id: "system.users", name: "用户管理", admin: true, manager: false, hr: false, finance: false, viewer: false },
      { id: "system.roles", name: "角色管理", admin: true, manager: false, hr: false, finance: false, viewer: false },
      { id: "system.logs", name: "操作日志", admin: true, manager: true, hr: false, finance: false, viewer: false },
    ],
  },
]

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState("admin")
  const [hasChanges, setHasChanges] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">权限分配</h1>
          <p className="text-muted-foreground">配置各角色的系统操作权限</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button onClick={() => setHasChanges(false)}>
              <Save className="h-4 w-4 mr-1" />
              保存更改
            </Button>
          )}
        </div>
      </div>

      {/* 角色列表 */}
      <div className="grid gap-4 md:grid-cols-5">
        {roles.map((role) => (
          <Card
            key={role.id}
            className={`cursor-pointer transition-all ${
              selectedRole === role.id
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedRole(role.id)}
          >
            <CardContent className="pt-4">
              <div className="text-center">
                <Shield className={`h-8 w-8 mx-auto mb-2 ${selectedRole === role.id ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium">{role.name}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
                <Badge variant="secondary" className="mt-2">
                  {role.users} 用户
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 权限配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {roles.find((r) => r.id === selectedRole)?.name} - 权限配置
              </CardTitle>
              <CardDescription>
                勾选以授予该角色对应的操作权限
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                全选
              </Button>
              <Button variant="outline" size="sm">
                取消全选
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["dashboard", "personnel"]} className="w-full">
            {permissionModules.map((module) => (
              <AccordionItem key={module.id} value={module.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <module.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{module.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {module.permissions.filter((p) => p[selectedRole as keyof typeof p]).length}/{module.permissions.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 pl-8 pt-2">
                    {module.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center gap-3">
                        <Checkbox
                          id={permission.id}
                          checked={permission[selectedRole as keyof typeof permission] as boolean}
                          onCheckedChange={() => setHasChanges(true)}
                        />
                        <label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* 权限矩阵 */}
      <Card>
        <CardHeader>
          <CardTitle>权限矩阵概览</CardTitle>
          <CardDescription>各角色权限对比一览表</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">功能模块</TableHead>
                  <TableHead className="w-32">权限项</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.id} className="text-center w-24">
                      {role.name.replace("系统", "").replace("人员", "")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionModules.flatMap((module) =>
                  module.permissions.map((permission, index) => (
                    <TableRow key={permission.id}>
                      {index === 0 && (
                        <TableCell
                          rowSpan={module.permissions.length}
                          className="font-medium bg-muted/30"
                        >
                          {module.name}
                        </TableCell>
                      )}
                      <TableCell>{permission.name}</TableCell>
                      {roles.map((role) => (
                        <TableCell key={role.id} className="text-center">
                          {permission[role.id as keyof typeof permission] ? (
                            <Badge className="bg-green-100 text-green-700">
                              <Eye className="h-3 w-3" />
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
