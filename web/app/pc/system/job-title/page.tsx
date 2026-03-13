"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, Briefcase } from "lucide-react"
import { HomeButton } from "@/components/pc/home-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"

interface JobTitleNode {
  id: number
  code: string
  name: string
  parent_id: number | null
  sort: number
  children?: JobTitleNode[]
}

function flattenTree(
  nodes: JobTitleNode[],
  expanded: Record<number, boolean>,
  level = 0
): { node: JobTitleNode; level: number }[] {
  const out: { node: JobTitleNode; level: number }[] = []
  for (const n of nodes) {
    out.push({ node: n, level })
    const isExp = expanded[n.id] ?? true
    if (isExp && n.children && n.children.length > 0) {
      out.push(...flattenTree(n.children, expanded, level + 1))
    }
  }
  return out
}

export default function JobTitleConfigPage() {
  const [list, setList] = useState<JobTitleNode[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ code: "", name: "", parent_id: "" as string | number, sort: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ list: JobTitleNode[]; flat: string[] }>("/api/sys/job-title-config")
      setList(res.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  function collectAllNodes(nodes: JobTitleNode[]): { id: number; name: string }[] {
    const out: { id: number; name: string }[] = []
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name })
      if (n.children?.length) out.push(...collectAllNodes(n.children))
    }
    return out
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const allNodes = collectAllNodes(list)
  const parentOptions = [{ id: 0, name: "— 无（顶级）" }, ...allNodes]

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    setSubmitting(true)
    try {
      await api("/api/sys/job-title-config", {
        method: "POST",
        body: {
          code: formData.code.trim() || undefined,
          name: formData.name.trim(),
          parent_id: formData.parent_id && formData.parent_id !== "0" ? Number(formData.parent_id) : null,
          sort: formData.sort,
        },
      })
      setIsCreateOpen(false)
      setFormData({ code: "", name: "", parent_id: "", sort: 0 })
      loadData()
    } catch (e) {
      alert((e as Error).message || "创建失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) return
    setSubmitting(true)
    try {
      await api(`/api/sys/job-title-config/${editingId}`, {
        method: "PUT",
        body: {
          code: formData.code.trim() || undefined,
          name: formData.name.trim(),
          parent_id: formData.parent_id && formData.parent_id !== "0" ? Number(formData.parent_id) : null,
          sort: formData.sort,
        },
      })
      setIsEditOpen(false)
      setEditingId(null)
      setFormData({ code: "", name: "", parent_id: "", sort: 0 })
      loadData()
    } catch (e) {
      alert((e as Error).message || "更新失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该工种配置？若有子节点需先删除子节点。")) return
    try {
      await api(`/api/sys/job-title-config/${id}`, { method: "DELETE" })
      loadData()
    } catch (e) {
      alert((e as Error).message || "删除失败")
    }
  }

  const openEdit = (node: JobTitleNode) => {
    setEditingId(node.id)
    setFormData({
      code: node.code || "",
      name: node.name,
      parent_id: node.parent_id ?? "0",
      sort: node.sort ?? 0,
    })
    setIsEditOpen(true)
  }

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const flatItems = flattenTree(list, expanded)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">工种配置</h1>
          <p className="text-muted-foreground">管理工种层级结构，用于人员档案与导入时的工种选择</p>
        </div>
        <div className="flex items-center gap-2">
          <HomeButton />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建工种
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建工种</DialogTitle>
                <DialogDescription>添加新的工种，可设置上级工种形成层级</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>名称</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                    placeholder="如：木工、电工"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>编码（可选）</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData((d) => ({ ...d, code: e.target.value }))}
                    placeholder="唯一编码，不填则用名称"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>上级工种</Label>
                  <Select
                    value={String(formData.parent_id || "0")}
                    onValueChange={(v) => setFormData((d) => ({ ...d, parent_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择上级" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>排序</Label>
                  <Input
                    type="number"
                    value={formData.sort}
                    onChange={(e) => setFormData((d) => ({ ...d, sort: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={submitting || !formData.name.trim()}>
                  {submitting ? "提交中..." : "确认"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>工种列表</CardTitle>
          <CardDescription>支持层级结构，无配置时人员表单从已有数据中获取工种列表</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">暂无工种配置，点击「新建工种」添加</p>
          ) : (
            <div className="border rounded-lg divide-y">
              {flatItems.map(({ node, level }) => {
                const hasChildren = node.children && node.children.length > 0
                const isExp = expanded[node.id] ?? true
                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 group"
                    style={{ paddingLeft: `${level * 24 + 12}px` }}
                  >
                    <div
                      className="w-6 h-6 flex items-center justify-center cursor-pointer"
                      onClick={() => hasChildren && toggleExpand(node.id)}
                    >
                      {hasChildren ? (
                        isExp ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )
                      ) : (
                        <div className="w-4" />
                      )}
                    </div>
                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium flex-1">{node.name}</span>
                    {node.code && (
                      <span className="text-sm text-muted-foreground">{node.code}</span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          ...
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(node)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(node.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑工种</DialogTitle>
            <DialogDescription>修改工种信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                placeholder="如：木工、电工"
              />
            </div>
            <div className="grid gap-2">
              <Label>编码（可选）</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData((d) => ({ ...d, code: e.target.value }))}
                placeholder="唯一编码"
              />
            </div>
            <div className="grid gap-2">
              <Label>上级工种</Label>
              <Select
                value={String(formData.parent_id || "0")}
                onValueChange={(v) => setFormData((d) => ({ ...d, parent_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择上级" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.filter((o) => o.id !== editingId).map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>排序</Label>
              <Input
                type="number"
                value={formData.sort}
                onChange={(e) => setFormData((d) => ({ ...d, sort: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={submitting || !formData.name.trim()}>
              {submitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
