"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Shield, Save, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

type MenuNode = { path: string; label: string; children?: MenuNode[] }
type RoleItem = { code: string; name: string; desc: string }

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

export default function PermissionsPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [allMenus, setAllMenus] = useState<MenuNode[]>([])
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const allPaths = useMemo(() => collectPaths(allMenus), [allMenus])
  const hasChanges = useMemo(() => {
    if (!selectedRole) return false
    return true
  }, [selectedRole, selectedPaths])

  useEffect(() => {
    Promise.all([
      api<{ list: RoleItem[] }>("/api/sys/role"),
      api<{ menus: MenuNode[] }>("/api/sys/all-menus"),
    ])
      .then(([roleRes, menuRes]) => {
        setRoles(roleRes.list || [])
        setAllMenus(menuRes.menus || [])
        if (roleRes.list?.length && !selectedRole) setSelectedRole(roleRes.list[0].code)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedRole) return
    api<{ paths: string[] }>(`/api/sys/role/${selectedRole}/menus`)
      .then((res) => setSelectedPaths(new Set(res.paths || [])))
      .catch(() => setSelectedPaths(new Set()))
  }, [selectedRole])

  const handleToggle = (path: string, checked: boolean) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (checked) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const handleSelectAll = () => setSelectedPaths(new Set(allPaths))
  const handleSelectNone = () => setSelectedPaths(new Set())

  const handleSave = () => {
    if (!selectedRole) return
    setSaving(true)
    api(`/api/sys/role/${selectedRole}/menus`, {
      method: "PUT",
      body: { paths: Array.from(selectedPaths) },
    })
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "保存失败"))
      .finally(() => setSaving(false))
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
          <p className="text-muted-foreground">配置各角色的可见菜单（与侧栏一致）</p>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {roles.find((r) => r.code === selectedRole)?.name ?? selectedRole} - 菜单权限
              </CardTitle>
              <CardDescription>勾选该角色可访问的菜单项，保存后立即生效</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                全选
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNone}>
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
          <MenuTree nodes={allMenus} selectedPaths={selectedPaths} onToggle={handleToggle} />
          <p className="mt-4 text-sm text-muted-foreground">数据范围：全部（占位，后续按组织树配置数据可见范围）</p>
        </CardContent>
      </Card>
    </div>
  )
}
