"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Shield, Save, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"

type MenuNode = { path: string; label: string; children?: MenuNode[] }
type RoleItem = { code: string; name: string; desc: string }
type PermissionGroup = { name: string; keys: string[] }
type OrgScope = { org_id: number; scope_type: string }
type OrgNode = { id: number; name: string; parent_id: number; children?: OrgNode[] }

const PERMISSION_LABELS: Record<string, string> = {
  'person:view': '查看人员',
  'person:add': '新增人员',
  'person:edit': '编辑人员',
  'person:delete': '删除人员',
  'person:export': '导出人员',
  'person:import': '批量导入',
  'person:batch_status': '批量状态变更',
  'contract:view': '查看合同',
  'contract:add': '新增合同',
  'contract:edit': '编辑合同',
  'settlement:view': '查看结算',
  'settlement:generate': '生成结算单',
  'settlement:confirm': '确认结算',
  'attendance:view': '查看考勤',
  'attendance:import': '导入考勤',
  'attendance:log': '考勤日志',
  'site:view': '查看现场',
  'site:edit': '编辑现场',
  'data:view': '查看报表',
  'system:user': '用户管理',
  'system:org': '组织管理',
  'system:permission': '权限分配',
  'system:log': '操作日志',
}

function collectPaths(nodes: MenuNode[], out: string[] = []): string[] {
  for (const n of nodes) {
    if (n.path) out.push(n.path)
    if (n.children?.length) collectPaths(n.children, out)
  }
  return out
}

function MenuTree({
  nodes,
  selectedPaths,
  onToggle,
}: {
  nodes: MenuNode[]
  selectedPaths: Set<string>
  onToggle: (path: string, checked: boolean) => void
}) {
  return (
    <ul className="space-y-1 pl-4 border-l border-border">
      {nodes.map((n) => (
        <li key={n.path}>
          <div className="flex items-center gap-2 py-1.5">
            <Checkbox
              id={n.path}
              checked={selectedPaths.has(n.path)}
              onCheckedChange={(c) => onToggle(n.path, c === true)}
            />
            <label htmlFor={n.path} className="text-sm cursor-pointer">
              {n.label}
            </label>
          </div>
          {n.children && n.children.length > 0 && (
            <MenuTree nodes={n.children} selectedPaths={selectedPaths} onToggle={onToggle} />
          )}
        </li>
      ))}
    </ul>
  )
}

function OrgTree({
  nodes,
  selectedScopes,
  onAddScope,
  onRemoveScope,
  onUpdateScopeType,
}: {
  nodes: OrgNode[]
  selectedScopes: OrgScope[]
  onAddScope: (orgId: number) => void
  onRemoveScope: (orgId: number) => void
  onUpdateScopeType: (orgId: number, scopeType: string) => void
}) {
  return (
    <ul className="space-y-1 pl-4 border-l border-border">
      {nodes.map((node) => {
        const isSelected = selectedScopes.some(scope => scope.org_id === node.id)
        const scope = selectedScopes.find(s => s.org_id === node.id)
        
        return (
          <li key={node.id}>
            <div className="flex items-center gap-2 py-1.5">
              {isSelected ? (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => onRemoveScope(node.id)}
                  >
                    移除
                  </Button>
                  <Select 
                    value={scope?.scope_type || "self"}
                    onValueChange={(value) => onUpdateScopeType(node.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="选择范围" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">仅当前组织</SelectItem>
                      <SelectItem value="descendant">当前及子组织</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm">{node.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onAddScope(node.id)}
                  >
                    添加
                  </Button>
                  <span className="text-sm">{node.name}</span>
                </div>
              )}
            </div>
            {node.children && node.children.length > 0 && (
              <OrgTree 
                nodes={node.children} 
                selectedScopes={selectedScopes}
                onAddScope={onAddScope}
                onRemoveScope={onRemoveScope}
                onUpdateScopeType={onUpdateScopeType}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [allMenus, setAllMenus] = useState<MenuNode[]>([])
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([])
  const [orgTree, setOrgTree] = useState<OrgNode[]>([])
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [selectedScopes, setSelectedScopes] = useState<OrgScope[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const allPaths = useMemo(() => collectPaths(allMenus), [allMenus])
  const allPermissionKeys = useMemo(() => {
    const keys: string[] = []
    permissionGroups.forEach(g => keys.push(...g.keys))
    return keys
  }, [permissionGroups])

  useEffect(() => {
    Promise.all([
      api<{ list: RoleItem[] }>("/api/sys/role"),
      api<{ menus: MenuNode[] }>("/api/sys/all-menus"),
      api<{ groups: PermissionGroup[] }>("/api/sys/all-permissions"),
      api<{ tree: OrgNode[] }>("/api/sys/org"),
    ])
      .then(([roleRes, menuRes, permRes, orgRes]) => {
        setRoles(roleRes.list || [])
        setAllMenus(menuRes.menus || [])
        setPermissionGroups(permRes.groups || [])
        setOrgTree(orgRes.tree || [])
        if (roleRes.list?.length && !selectedRole) setSelectedRole(roleRes.list[0].code)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedRole) return
    Promise.all([
      api<{ paths: string[] }>(`/api/sys/role/${selectedRole}/menus`),
      api<{ keys: string[] }>(`/api/sys/role/${selectedRole}/permissions`),
      api<{ scopes: OrgScope[] }>(`/api/sys/role/${selectedRole}/org-scopes`),
    ])
      .then(([menuRes, permRes, scopeRes]) => {
        setSelectedPaths(new Set(menuRes.paths || []))
        setSelectedPermissions(new Set(permRes.keys || []))
        setSelectedScopes(scopeRes.scopes || [])
      })
      .catch(() => {
        setSelectedPaths(new Set())
        setSelectedPermissions(new Set())
        setSelectedScopes([])
      })
  }, [selectedRole])

  const handleToggleMenu = (path: string, checked: boolean) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (checked) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const handleTogglePermission = (key: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const handleSelectAllMenus = () => setSelectedPaths(new Set(allPaths))
  const handleSelectNoneMenus = () => setSelectedPaths(new Set())
  const handleSelectAllPermissions = () => setSelectedPermissions(new Set(allPermissionKeys))
  const handleSelectNonePermissions = () => setSelectedPermissions(new Set())

  const handleAddScope = (orgId: number) => {
    if (selectedScopes.some(scope => scope.org_id === orgId)) return
    setSelectedScopes([...selectedScopes, { org_id: orgId, scope_type: "self" }])
  }

  const handleRemoveScope = (orgId: number) => {
    setSelectedScopes(selectedScopes.filter(scope => scope.org_id !== orgId))
  }

  const handleUpdateScopeType = (orgId: number, scopeType: string) => {
    setSelectedScopes(selectedScopes.map(scope => 
      scope.org_id === orgId ? { ...scope, scope_type: scopeType } : scope
    ))
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      await Promise.all([
        api(`/api/sys/role/${selectedRole}/menus`, {
          method: "PUT",
          body: { paths: Array.from(selectedPaths) },
        }),
        api(`/api/sys/role/${selectedRole}/permissions`, {
          method: "PUT",
          body: { keys: Array.from(selectedPermissions) },
        }),
        api(`/api/sys/role/${selectedRole}/org-scopes`, {
          method: "PUT",
          body: { scopes: selectedScopes },
        }),
      ])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">权限分配</h1>
          <p className="text-muted-foreground">配置各角色的菜单访问权限、按钮操作权限和数据范围权限</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            保存
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {roles.map((r) => (
          <Card
            key={r.code}
            className={`cursor-pointer transition-all ${
              selectedRole === r.code ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedRole(r.code)}
          >
            <CardContent className="pt-4">
              <div className="text-center">
                <Shield
                  className={`h-8 w-8 mx-auto mb-2 ${
                    selectedRole === r.code ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="menus" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="menus">菜单权限</TabsTrigger>
          <TabsTrigger value="permissions">按钮权限</TabsTrigger>
          <TabsTrigger value="data-scope">数据范围</TabsTrigger>
        </TabsList>
        <TabsContent value="menus">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {roles.find((r) => r.code === selectedRole)?.name ?? selectedRole} - 菜单权限
                  </CardTitle>
                  <CardDescription>勾选该角色可访问的菜单项</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAllMenus}>
                    全选
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectNoneMenus}>
                    取消全选
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  已选 {selectedPaths.size} / {allPaths.length} 项
                </Badge>
              </div>
              <MenuTree nodes={allMenus} selectedPaths={selectedPaths} onToggle={handleToggleMenu} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {roles.find((r) => r.code === selectedRole)?.name ?? selectedRole} - 按钮权限
                  </CardTitle>
                  <CardDescription>勾选该角色可执行的操作按钮</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAllPermissions}>
                    全选
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectNonePermissions}>
                    取消全选
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  已选 {selectedPermissions.size} / {allPermissionKeys.length} 项
                </Badge>
              </div>
              <div className="space-y-4">
                {permissionGroups.map((group) => (
                  <div key={group.name} className="border-l-2 border-primary/20 pl-4">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">{group.name}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {group.keys.map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`perm-${key}`}
                            checked={selectedPermissions.has(key)}
                            onCheckedChange={(c) => handleTogglePermission(key, c === true)}
                          />
                          <label htmlFor={`perm-${key}`} className="text-sm cursor-pointer">
                            {PERMISSION_LABELS[key] || key}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="data-scope">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  {roles.find((r) => r.code === selectedRole)?.name ?? selectedRole} - 数据范围权限
                </CardTitle>
                <CardDescription>配置该角色可访问的组织数据范围</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>说明：</strong>
                  为角色选择可访问的组织及其数据范围类型。管理员角色默认拥有全部组织的访问权限。
                </p>
                {orgTree.length > 0 ? (
                  <OrgTree 
                    nodes={orgTree} 
                    selectedScopes={selectedScopes}
                    onAddScope={handleAddScope}
                    onRemoveScope={handleRemoveScope}
                    onUpdateScopeType={handleUpdateScopeType}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无组织数据，请先在组织管理中创建组织
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
