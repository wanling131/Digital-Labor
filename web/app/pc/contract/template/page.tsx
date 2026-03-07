"use client"

import { useState, useEffect } from "react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Upload,
  FileText,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { api, getToken } from "@/lib/api"

type TemplateItem = {
  id: number
  name: string
  file_path: string | null
  version: number
  created_at: string
}

export default function ContractTemplatePage() {
  const [list, setList] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadName, setUploadName] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<number | null>(null)

  const handlePreview = async (t: TemplateItem) => {
    if (!t.file_path) return
    const token = getToken()
    const url = `/api/contract/template/${t.id}/file`
    setPreviewingId(t.id)
    try {
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { message?: string }).message || "预览失败")
      }
      const blob = await res.blob()
      const u = URL.createObjectURL(blob)
      window.open(u, "_blank")
      setTimeout(() => URL.revokeObjectURL(u), 60000)
    } catch (e) {
      alert(e instanceof Error ? e.message : "预览失败")
    } finally {
      setPreviewingId(null)
    }
  }

  const loadList = () => {
    setLoading(true)
    api<{ list: TemplateItem[] }>("/api/contract/template")
      .then((res) => setList(res.list || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadList()
  }, [])

  const handleUpload = async () => {
    if (!uploadName.trim()) {
      setUploadError("请输入模板名称")
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      if (uploadFile) {
        const form = new FormData()
        form.append("name", uploadName.trim())
        form.append("file", uploadFile)
        await api("/api/contract/template/upload", {
          method: "POST",
          body: form,
        })
      } else {
        await api("/api/contract/template", {
          method: "POST",
          body: { name: uploadName.trim() },
        })
      }
      setIsUploadOpen(false)
      setUploadName("")
      setUploadFile(null)
      loadList()
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "上传失败")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">合同模板</h1>
          <p className="text-muted-foreground">管理合同模板，支持版本控制；可视化编辑对接电子签后开放</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) setUploadError(null) }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              上传模板
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>上传合同模板</DialogTitle>
              <DialogDescription>支持上传文件或仅填写名称（后续可补传）</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
              <div className="space-y-2">
                <Label>模板名称</Label>
                <Input placeholder="请输入模板名称" value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>上传文件（可选）</Label>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6">
                  <input
                    type="file"
                    className="hidden"
                    id="template-file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <label htmlFor="template-file" className="cursor-pointer text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">{uploadFile ? uploadFile.name : "点击选择 PDF、DOC、DOCX"}</p>
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>取消</Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                确认
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">模板总数</p>
                <p className="text-2xl font-bold">{list.length}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已上传文件</p>
                <p className="text-2xl font-bold">{list.filter((t) => t.file_path).length}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">可视化编辑</p>
                <p className="text-xs text-muted-foreground">对接后开放</p>
              </div>
              <div className="rounded-full bg-muted p-3">
                <Edit className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <Card key={t.id} className="group hover:border-primary transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">v{t.version}</Badge>
                        {t.file_path ? <span className="text-xs text-accent">已上传</span> : <span className="text-xs text-muted-foreground">未上传</span>}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="gap-2"
                        disabled={!t.file_path || previewingId === t.id}
                        onClick={() => t.file_path && handlePreview(t)}
                      >
                        {previewingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        {t.file_path ? "预览" : "预览（需先上传文件）"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" disabled>
                        <Edit className="h-4 w-4" />
                        可视化编辑（占位，后续实现）
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" disabled>
                        <Copy className="h-4 w-4" />
                        复制
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive" disabled>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>创建时间</span>
                  <span>{t.created_at}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && list.length === 0 && <p className="py-8 text-center text-muted-foreground">暂无模板，请上传</p>}
    </div>
  )
}