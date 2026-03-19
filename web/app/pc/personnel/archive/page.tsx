"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Download,
  Upload,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  FileText,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { api, getToken } from "@/lib/api"
import { usePermissions } from "@/lib/permissions"
import { HomeButton } from "@/components/pc/home-button"
import { JobTitleSelect } from "@/components/pc/job-title-select"

function maskIdCard(s?: string | null) {
  if (!s || s.length < 8) return "—"
  return s.slice(0, 4) + "***********" + s.slice(-4)
}
function maskPhone(s?: string | null) {
  if (!s || s.length < 7) return "—"
  return s.slice(0, 3) + "****" + s.slice(-4)
}

const statusColors: Record<string, string> = {
  已进场: "bg-accent/10 text-accent border-accent/20",
  已签约: "bg-warning/10 text-warning border-warning/20",
  已实名: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  预注册: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  已离场: "bg-muted text-muted-foreground border-muted",
  黑名单: "bg-destructive/10 text-destructive border-destructive/20",
}

function flattenOrg(tree: { id: number; name: string; children?: unknown[] }[]): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = []
  function walk(nodes: { id: number; name: string; children?: unknown[] }[]) {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name })
      if (n.children && n.children.length) walk(n.children as { id: number; name: string; children?: unknown[] }[])
    }
  }
  walk(tree)
  return out
}

export default function PersonnelArchivePage() {
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [list, setList] = useState<{ id: number; work_no?: string; name?: string; id_card?: string; mobile?: string; org_id?: number; org_name?: string; status?: string; contract_signed?: number; on_site?: number; created_at?: string; job_title?: string }[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [orgList, setOrgList] = useState<{ id: number; name: string }[]>([])
  const [jobTitles, setJobTitles] = useState<string[]>([])
  const [statusCounts, setStatusCounts] = useState<{ status: string; count: number }[]>([])
  const [formData, setFormData] = useState({ org_id: "" as string | number, work_no: "", name: "", id_card: "", mobile: "", status: "预注册", job_title: "" })
  const [certFormData, setCertFormData] = useState({ name: "", certificate_no: "", issue_date: "", expiry_date: "" })
  const [editingCertId, setEditingCertId] = useState<number | null>(null)
  const [certSubmitting, setCertSubmitting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<{ row: number; errors: string[] }[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importDefaultJobTitle, setImportDefaultJobTitle] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const hasKeyword = searchTerm.trim().length > 0
      const query: Record<string, string | number> = {
        page: hasKeyword ? 1 : page,
        pageSize,
      }
      if (selectedStatus !== "all") query.status = selectedStatus
      if (selectedOrgId !== "all") query.org_id = selectedOrgId
      if (selectedJobTitle !== "all") query.job_title = selectedJobTitle
      if (hasKeyword) query.keyword = searchTerm.trim()
      const res = await api<{ list: unknown[]; total: number }>("/api/person/archive", { query })
      setList((res.list || []) as typeof list)
      setTotal(res.total ?? 0)
    } catch {
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, selectedStatus, selectedOrgId, selectedJobTitle, searchTerm])

  const loadOrg = useCallback(async () => {
    try {
      const { tree } = await api<{ tree: { id: number; name: string; children?: unknown[] }[] }>("/api/sys/org")
      setOrgList(flattenOrg(tree || []))
    } catch {
      setOrgList([])
    }
  }, [])

  const loadJobTitles = useCallback(async () => {
    try {
      const res = await api<{ list?: unknown[]; flat?: string[] }>("/api/person/job-titles", { query: { flat: "1" } })
      const flat = res.flat ?? (Array.isArray(res.list) ? res.list.filter((x): x is string => typeof x === "string") : [])
      setJobTitles(flat)
    } catch {
      setJobTitles([])
    }
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const res = await api<{ list: { status: string; count: number }[] }>("/api/person/status")
      setStatusCounts(res.list || [])
    } catch {
      setStatusCounts([])
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadOrg()
    loadStatus()
    loadJobTitles()
  }, [loadOrg, loadStatus, loadJobTitles])

  const totalCount = statusCounts.reduce((s, r) => s + r.count, 0)
  const realNameCount = statusCounts.filter((r) => r.status !== "预注册").reduce((s, r) => s + r.count, 0)
  const signedCount = statusCounts.filter((r) => ["已签约", "已进场", "已离场"].includes(r.status)).reduce((s, r) => s + r.count, 0)
  const onSiteCount = statusCounts.find((r) => r.status === "已进场")?.count ?? 0

  const handleAdd = async () => {
    if (!formData.name.trim()) return
    setSubmitting(true)
    try {
      await api("/api/person/archive", {
        method: "POST",
        body: {
          org_id: formData.org_id && formData.org_id !== "all" ? Number(formData.org_id) : undefined,
          work_no: formData.work_no.trim() || undefined,
          name: formData.name.trim(),
          id_card: formData.id_card.trim() || undefined,
          mobile: formData.mobile.trim() || undefined,
          status: formData.status,
          job_title: formData.job_title.trim() || undefined,
        },
      })
      setIsAddDialogOpen(false)
      setFormData({ org_id: "", work_no: "", name: "", id_card: "", mobile: "", status: "预注册", job_title: "" })
      loadList()
      loadStatus()
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (row: (typeof list)[0]) => {
    setEditId(row.id)
    setFormData({
      org_id: row.org_id ?? "",
      work_no: row.work_no ?? "",
      name: row.name ?? "",
      id_card: row.id_card ?? "",
      mobile: row.mobile ?? "",
      status: row.status ?? "预注册",
      job_title: row.job_title ?? "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (editId == null || !formData.name.trim()) return
    setSubmitting(true)
    try {
      await api(`/api/person/archive/${editId}`, {
        method: "PUT",
        body: {
          org_id: formData.org_id && formData.org_id !== "" ? Number(formData.org_id) : null,
          work_no: formData.work_no.trim() || null,
          name: formData.name.trim(),
          id_card: formData.id_card.trim() || null,
          mobile: formData.mobile.trim() || null,
          status: formData.status,
          job_title: formData.job_title.trim() || null,
        },
      })
      setIsEditDialogOpen(false)
      setEditId(null)
      loadList()
      loadStatus()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该人员？")) return
    try {
      await api(`/api/person/archive/${id}`, { method: "DELETE" })
      loadList()
      loadStatus()
    } catch {}
  }

  // 批量导入相关方法
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportError(null)
      setImportSuccess(null)
      setImportErrors([])
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setImportError("请选择要导入的文件")
      return
    }

    setImportLoading(true)
    setImportError(null)
    setImportSuccess(null)
    setImportErrors([])

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (importDefaultJobTitle.trim()) {
        formData.append("default_job_title", importDefaultJobTitle.trim())
      }

      const token = getToken()
      const res = await fetch("/api/person/batch-import", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errors) {
          setImportErrors(data.errors)
          setImportError("导入失败，存在数据验证错误")
        } else {
          setImportError(data.message || "导入失败")
        }
        return
      }

      setImportSuccess(`成功导入 ${data.imported} 条数据`)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      loadList()
      loadStatus()
    } catch (error) {
      setImportError("导入失败，请重试")
    } finally {
      setImportLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    window.open('/api/person/import-template', '_blank')
  }

  const resetImportState = () => {
    setSelectedFile(null)
    setImportDefaultJobTitle("")
    setImportError(null)
    setImportSuccess(null)
    setImportErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    const hasKeyword = searchTerm.trim().length > 0
    if (selectedStatus !== "all") params.set("status", selectedStatus)
    if (selectedOrgId !== "all") params.set("org_id", selectedOrgId)
    if (selectedJobTitle !== "all") params.set("job_title", selectedJobTitle)
    if (hasKeyword) params.set("keyword", searchTerm.trim())
    const qs = params.toString()
    const url = `/api/person/archive/export${qs ? `?${qs}` : ""}`
    if (typeof window !== "undefined") {
      window.open(url, "_blank")
    }
  }

  const hasActiveFilters = selectedStatus !== "all" || selectedOrgId !== "all" || selectedJobTitle !== "all" || searchTerm.trim().length > 0

  const handleResetFilters = () => {
    setSelectedStatus("all")
    setSelectedOrgId("all")
    setSelectedJobTitle("all")
    setSearchTerm("")
    setPage(1)
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
          <HomeButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">人员档案</h1>
            <p className="text-muted-foreground">管理人员基本信息、实名认证及合同状态</p>
          </div>
          </div>
          <div className="flex items-center gap-2">
          {hasPermission("person:import") && (
          <>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                批量导入
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>批量导入人员信息</DialogTitle>
                <DialogDescription>
                  上传Excel文件批量导入人员信息，支持工种信息导入
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* 默认工种（Excel 中工种为空时使用） */}
                <div className="space-y-2">
                  <Label>默认工种（可选）</Label>
                  <JobTitleSelect
                    value={importDefaultJobTitle}
                    onChange={setImportDefaultJobTitle}
                    placeholder="工种为空时使用"
                  />
                </div>
                {/* 文件上传 */}
                <div className="space-y-2">
                  <Label>选择文件</Label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      下载模板
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      已选择：{selectedFile.name}
                    </p>
                  )}
                </div>

                {/* 错误提示 */}
                {importError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{importError}</p>
                        {importErrors.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm">错误详情：</p>
                            <ul className="text-sm space-y-1">
                              {importErrors.map((error, index) => (
                                <li key={index}>
                                  第 {error.row} 行：{error.errors.join('、')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 成功提示 */}
                {importSuccess && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-success">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <p>{importSuccess}</p>
                    </div>
                  </div>
                )}

                {/* 导入说明 */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">导入说明：</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 支持 .xlsx 和 .xls 格式的Excel文件</li>
                    <li>• 请按照模板格式填写数据，确保字段名称一致</li>
                    <li>• 姓名为必填字段，其他字段为选填</li>
                    <li>• 手机号和身份证号会自动加密存储</li>
                    <li>• 工种信息请填写在 job_title 或 job_type 列</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportDialogOpen(false)
                    resetImportState()
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importLoading || !selectedFile}
                >
                  {importLoading ? "导入中..." : "开始导入"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {hasPermission("person:export") && (
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              导出数据
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新增人员
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新增人员</DialogTitle>
                <DialogDescription>填写人员基本信息，完成预注册</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      placeholder="请输入姓名"
                      value={formData.name}
                      onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work_no">工号</Label>
                    <Input
                      id="work_no"
                      placeholder="请输入工号"
                      value={formData.work_no}
                      onChange={(e) => setFormData((d) => ({ ...d, work_no: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idCard">身份证号</Label>
                    <Input
                      id="idCard"
                      placeholder="请输入身份证号"
                      value={formData.id_card}
                      onChange={(e) => setFormData((d) => ({ ...d, id_card: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号码</Label>
                    <Input
                      id="phone"
                      placeholder="请输入手机号码"
                      value={formData.mobile}
                      onChange={(e) => setFormData((d) => ({ ...d, mobile: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>所属组织</Label>
                    <Select
                      value={String(formData.org_id || "all")}
                      onValueChange={(v) => setFormData((d) => ({ ...d, org_id: v === "all" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择组织" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">—</SelectItem>
                        {orgList.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>工种</Label>
                    <JobTitleSelect value={formData.job_title} onChange={(v) => setFormData((d) => ({ ...d, job_title: v }))} placeholder="选择工种" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData((d) => ({ ...d, status: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="预注册">预注册</SelectItem>
                        <SelectItem value="已实名">已实名</SelectItem>
                        <SelectItem value="已签约">已签约</SelectItem>
                        <SelectItem value="已进场">已进场</SelectItem>
                        <SelectItem value="已离场">已离场</SelectItem>
                        <SelectItem value="黑名单">黑名单</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAdd} disabled={submitting || !formData.name.trim()}>
                  {submitting ? "提交中..." : "确认添加"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总人数</p>
                <p className="text-2xl font-bold">{totalCount.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已实名</p>
                <p className="text-2xl font-bold">{realNameCount.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <UserCheck className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已签约</p>
                <p className="text-2xl font-bold">{signedCount.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-chart-3/10 p-3">
                <FileText className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">在岗人数</p>
                <p className="text-2xl font-bold">{onSiteCount.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-chart-5/10 p-3">
                <Building2 className="h-5 w-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名、工号、项目..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80 pl-9"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="预注册">预注册</SelectItem>
                  <SelectItem value="已实名">已实名</SelectItem>
                  <SelectItem value="已签约">已签约</SelectItem>
                  <SelectItem value="已进场">已进场</SelectItem>
                  <SelectItem value="已离场">已离场</SelectItem>
                  <SelectItem value="黑名单">黑名单</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="组织筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部组织</SelectItem>
                  {orgList.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedJobTitle} onValueChange={setSelectedJobTitle}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="工种筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部工种</SelectItem>
                  {jobTitles.map((jt) => (
                    <SelectItem key={jt} value={jt}>
                      {jt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title="筛选">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleResetFilters}
                    disabled={!hasActiveFilters}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters ? "清除筛选" : "暂无筛选"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground">
              共 <span className="font-medium text-foreground">{total}</span> 条记录
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">工号</TableHead>
                <TableHead className="w-24">姓名</TableHead>
                <TableHead className="w-36">身份证号</TableHead>
                <TableHead className="w-28">手机号</TableHead>
                <TableHead className="min-w-[120px]">所属组织</TableHead>
                <TableHead className="w-20">工种</TableHead>
                <TableHead className="w-20">实名</TableHead>
                <TableHead className="w-20">合同</TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead className="w-24">入职日期</TableHead>
                <TableHead className="w-16 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                list.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium align-middle">{person.work_no ?? "—"}</TableCell>
                    <TableCell className="align-middle">{person.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground align-middle">{maskIdCard(person.id_card)}</TableCell>
                    <TableCell className="text-muted-foreground align-middle">{maskPhone(person.mobile)}</TableCell>
                    <TableCell className="align-middle">{person.org_name ?? "—"}</TableCell>
                    <TableCell className="align-middle">{person.job_title ?? "—"}</TableCell>
                    <TableCell className="align-middle">
                      <Badge variant={person.id_card && person.mobile ? "default" : "secondary"}>
                        {person.id_card && person.mobile ? "已认证" : "未认证"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant={person.contract_signed ? "default" : "secondary"}>
                        {person.contract_signed ? "已签约" : "未签约"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Badge variant="outline" className={statusColors[person.status ?? ""] ?? ""}>
                        {person.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground align-middle">{(person.created_at ?? "").slice(0, 10)}</TableCell>
                    <TableCell className="text-right align-middle">
                      <div className="flex gap-2 justify-end">
                        {hasPermission("person:edit") && (
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(person)}>
                          <Edit className="h-4 w-4" />
                          编辑
                        </Button>
                        )}
                        {hasPermission("person:delete") && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(person.id)}>
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {total > pageSize && (
            <div className="flex justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                第 {page} 页，共 {Math.ceil(total / pageSize)} 页
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑人员</DialogTitle>
            <DialogDescription>修改人员基本信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={formData.name} onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))} placeholder="请输入姓名" />
              </div>
              <div className="space-y-2">
                <Label>工号</Label>
                <Input value={formData.work_no} onChange={(e) => setFormData((d) => ({ ...d, work_no: e.target.value }))} placeholder="请输入工号" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>身份证号</Label>
                <Input value={formData.id_card} onChange={(e) => setFormData((d) => ({ ...d, id_card: e.target.value }))} placeholder="请输入身份证号" />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input value={formData.mobile} onChange={(e) => setFormData((d) => ({ ...d, mobile: e.target.value }))} placeholder="请输入手机号" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>所属组织</Label>
                <Select value={String(formData.org_id || "all")} onValueChange={(v) => setFormData((d) => ({ ...d, org_id: v === "all" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择组织" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">—</SelectItem>
                    {orgList.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>工种</Label>
                <JobTitleSelect value={formData.job_title} onChange={(v) => setFormData((d) => ({ ...d, job_title: v }))} placeholder="选择工种" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData((d) => ({ ...d, status: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="预注册">预注册</SelectItem>
                    <SelectItem value="已实名">已实名</SelectItem>
                    <SelectItem value="已签约">已签约</SelectItem>
                    <SelectItem value="已进场">已进场</SelectItem>
                    <SelectItem value="已离场">已离场</SelectItem>
                    <SelectItem value="黑名单">黑名单</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
