"use client"

import { useState } from "react"
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
} from "lucide-react"

const templates = [
  {
    id: "TPL001",
    name: "劳动合同-标准版",
    type: "labor",
    version: "v2.3",
    status: "active",
    createTime: "2024-01-15",
    updateTime: "2024-02-20",
    usageCount: 1256,
  },
  {
    id: "TPL002",
    name: "劳务派遣合同",
    type: "dispatch",
    version: "v1.5",
    status: "active",
    createTime: "2024-01-20",
    updateTime: "2024-03-01",
    usageCount: 856,
  },
  {
    id: "TPL003",
    name: "临时用工协议",
    type: "temporary",
    version: "v1.2",
    status: "active",
    createTime: "2024-02-01",
    updateTime: "2024-02-15",
    usageCount: 432,
  },
  {
    id: "TPL004",
    name: "安全责任书",
    type: "safety",
    version: "v3.0",
    status: "active",
    createTime: "2023-12-01",
    updateTime: "2024-01-10",
    usageCount: 2100,
  },
  {
    id: "TPL005",
    name: "保密协议",
    type: "nda",
    version: "v1.0",
    status: "draft",
    createTime: "2024-03-01",
    updateTime: "2024-03-01",
    usageCount: 0,
  },
]

const typeLabels: Record<string, string> = {
  labor: "劳动合同",
  dispatch: "派遣合同",
  temporary: "临时协议",
  safety: "安全责任书",
  nda: "保密协议",
}

export default function ContractTemplatePage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">合同模板</h1>
          <p className="text-muted-foreground">管理合同模板，支持版本控制</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              上传模板
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>上传合同模板</DialogTitle>
              <DialogDescription>支持PDF、Word格式的合同模板文件</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>模板名称</Label>
                <Input placeholder="请输入模板名称" />
              </div>
              <div className="space-y-2">
                <Label>模板类型</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">劳动合同</SelectItem>
                    <SelectItem value="dispatch">派遣合同</SelectItem>
                    <SelectItem value="temporary">临时协议</SelectItem>
                    <SelectItem value="safety">安全责任书</SelectItem>
                    <SelectItem value="nda">保密协议</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>上传文件</Label>
                <div className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      点击或拖拽文件到此处上传
                    </p>
                    <p className="text-xs text-muted-foreground">支持 PDF、DOC、DOCX 格式</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                取消
              </Button>
              <Button onClick={() => setIsUploadOpen(false)}>确认上传</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 模板统计 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">模板总数</p>
                <p className="text-2xl font-bold">{templates.length}</p>
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
                <p className="text-sm font-medium text-muted-foreground">启用中</p>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.status === "active").length}
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">草稿</p>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.status === "draft").length}
                </p>
              </div>
              <div className="rounded-full bg-muted p-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">本月使用</p>
                <p className="text-2xl font-bold">328</p>
              </div>
              <div className="rounded-full bg-chart-5/10 p-3">
                <FileText className="h-5 w-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 模板列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="group hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {typeLabels[template.type]}
                      </Badge>
                      <span className="text-xs">{template.version}</span>
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
                    <DropdownMenuItem className="gap-2">
                      <Eye className="h-4 w-4" />
                      预览
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Edit className="h-4 w-4" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Copy className="h-4 w-4" />
                      复制
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">使用次数</span>
                  <span className="font-medium">{template.usageCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">状态</span>
                  <Badge
                    variant={template.status === "active" ? "default" : "secondary"}
                  >
                    {template.status === "active" ? "启用中" : "草稿"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">更新时间</span>
                  <span>{template.updateTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
