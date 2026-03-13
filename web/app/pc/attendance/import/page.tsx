"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { api } from "@/lib/api"
import { HomeButton } from "@/components/pc/home-button"

/** 文件大小限制，与后端保持一致（50MB） */
const MAX_FILE_SIZE = 50 * 1024 * 1024

interface ImportHistoryItem {
  id: string
  fileName: string
  project: string
  period: string
  totalRecords: number
  validRecords: number
  duplicateRecords: number
  errorRecords: number
  status: string
  importTime: string
  operator: string
}

const statusConfig = {
  completed: { label: "已完成", color: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
  failed: { label: "失败", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
  processing: { label: "处理中", color: "bg-primary/10 text-primary border-primary/20", icon: Clock },
}

export default function AttendanceImportPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; count?: number; message?: string } | null>(null)
  const [formErrors, setFormErrors] = useState<{ project?: string; period?: string; file?: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const fetchImportHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await api<{ list: ImportHistoryItem[]; total: number }>("/api/attendance/import/history", {
        query: { page: 1, pageSize: 50 },
      })
      setImportHistory(
        (res.list || []).map((r) => ({
          id: r.id,
          fileName: r.fileName ?? r.file_name ?? "",
          project: r.project ?? "-",
          period: r.period ?? "-",
          totalRecords: r.totalRecords ?? r.total_records ?? 0,
          validRecords: r.validRecords ?? r.valid_records ?? 0,
          duplicateRecords: r.duplicateRecords ?? r.duplicate_records ?? 0,
          errorRecords: r.errorRecords ?? r.error_records ?? 0,
          status: r.status ?? "completed",
          importTime: r.importTime ?? r.import_time ?? "-",
          operator: r.operator ?? "管理员",
        }))
      )
    } catch {
      setImportHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchImportHistory()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setUploadResult(null)
    setFormErrors((prev) => ({ ...prev, file: undefined }))
    if (!f) {
      setSelectedFile(null)
      e.target.value = ""
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setFormErrors((prev) => ({ ...prev, file: `文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB` }))
      setSelectedFile(null)
      e.target.value = ""
      return
    }
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."))
    if (![".xls", ".xlsx"].includes(ext)) {
      setFormErrors((prev) => ({ ...prev, file: "仅支持 .xls、.xlsx 格式" }))
      setSelectedFile(null)
      e.target.value = ""
      return
    }
    setSelectedFile(f)
    e.target.value = ""
  }

  const handleUpload = async () => {
    setFormErrors({})
    const errs: { project?: string; period?: string; file?: string } = {}
    if (!selectedProject) errs.project = "请选择项目"
    if (!selectedPeriod) errs.period = "请选择考勤周期"
    if (!selectedFile) errs.file = "请选择要上传的文件"
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }
    if (!selectedFile) return
    setIsUploading(true)
    setUploadProgress(20)
    setUploadResult(null)
    try {
      const fd = new FormData()
      fd.append("file", selectedFile)
      if (selectedProject) fd.append("project_id", selectedProject)
      if (selectedPeriod) fd.append("period", selectedPeriod)
      setUploadProgress(50)
      const res = await api<{ ok: boolean; count?: number; message?: string }>("/api/attendance/import", {
        method: "POST",
        body: fd,
      })
      setUploadProgress(100)
      setUploadResult(res)
      if (res.ok) {
        setSelectedFile(null)
        fetchImportHistory()
        setTimeout(() => {
          setIsUploadOpen(false)
          setUploadProgress(0)
          setIsUploading(false)
        }, 800)
      } else {
        setIsUploading(false)
      }
    } catch (err) {
      setUploadResult({ ok: false, message: (err as Error).message })
      setUploadProgress(0)
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HomeButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">考勤数据接入</h1>
            <p className="text-muted-foreground">支持Excel批量导入，数据自动清洗与排重</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            下载模板
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                导入数据
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>导入考勤数据</DialogTitle>
                <DialogDescription>上传Excel文件，系统将自动清洗和排重</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>选择项目 *</Label>
                  <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setFormErrors((p) => ({ ...p, project: undefined })) }}>
                    <SelectTrigger className={formErrors.project ? "border-destructive" : ""}>
                      <SelectValue placeholder="选择目标项目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="projectA">项目A-主体工程</SelectItem>
                      <SelectItem value="projectB">项目B-装修工程</SelectItem>
                      <SelectItem value="projectC">项目C-基建工程</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.project && <p className="text-xs text-destructive">{formErrors.project}</p>}
                </div>
                <div className="space-y-2">
                  <Label>考勤周期 *</Label>
                  <Select value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v); setFormErrors((p) => ({ ...p, period: undefined })) }}>
                    <SelectTrigger className={formErrors.period ? "border-destructive" : ""}>
                      <SelectValue placeholder="选择考勤月份" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-03">2024年3月</SelectItem>
                      <SelectItem value="2024-02">2024年2月</SelectItem>
                      <SelectItem value="2024-01">2024年1月</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.period && <p className="text-xs text-destructive">{formErrors.period}</p>}
                </div>
                <div className="space-y-2">
                  <Label>上传文件</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="text-center">
                      <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : "点击或拖拽文件到此处上传"}
                      </p>
                      <p className="text-xs text-muted-foreground">支持 XLS、XLSX 格式，最大 50MB</p>
                    </div>
                  </div>
                  {formErrors.file && <p className="text-xs text-destructive">{formErrors.file}</p>}
                  {uploadResult && (
                    <p className={`text-sm ${uploadResult.ok ? "text-accent" : "text-destructive"}`}>
                      {uploadResult.ok
                        ? `导入成功，共 ${uploadResult.count ?? 0} 条记录`
                        : uploadResult.message ?? "导入失败"}
                    </p>
                  )}
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>处理进度</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      正在清洗数据并检查重复记录...
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1">导入说明：</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>文件需包含：工号、姓名、日期、上班时间、下班时间</li>
                    <li>系统将自动识别并过滤重复记录</li>
                    <li>异常数据将标记并提示人工处理</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !selectedProject || !selectedPeriod}>
                  {isUploading ? "处理中..." : "开始导入"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">本月导入</p>
                <p className="text-2xl font-bold">28,120</p>
                <p className="text-xs text-muted-foreground">条记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">有效记录</p>
                <p className="text-2xl font-bold">27,918</p>
                <p className="text-xs text-muted-foreground">99.3%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <RefreshCw className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">重复过滤</p>
                <p className="text-2xl font-bold">155</p>
                <p className="text-xs text-muted-foreground">0.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">异常记录</p>
                <p className="text-2xl font-bold">47</p>
                <p className="text-xs text-muted-foreground">0.2%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 导入历史 */}
      <Card>
        <CardHeader>
          <CardTitle>导入历史</CardTitle>
          <CardDescription>查看历史导入记录及处理结果</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>导入ID</TableHead>
                <TableHead>文件名称</TableHead>
                <TableHead>目标项目</TableHead>
                <TableHead>考勤周期</TableHead>
                <TableHead>记录统计</TableHead>
                <TableHead>处理结果</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>导入时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : importHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无导入记录
                  </TableCell>
                </TableRow>
              ) : (
                importHistory.map((record) => {
                const config = statusConfig[record.status as keyof typeof statusConfig]
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        {record.fileName}
                      </div>
                    </TableCell>
                    <TableCell>{record.project}</TableCell>
                    <TableCell>{record.period}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>总计: {record.totalRecords.toLocaleString()}</p>
                        <p className="text-muted-foreground">
                          有效: {record.validRecords.toLocaleString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {record.duplicateRecords > 0 && (
                          <Badge variant="outline" className="text-xs">
                            重复 {record.duplicateRecords}
                          </Badge>
                        )}
                        {record.errorRecords > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-destructive/10 text-destructive border-destructive/20"
                          >
                            异常 {record.errorRecords}
                          </Badge>
                        )}
                        {record.duplicateRecords === 0 && record.errorRecords === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${config.color}`}>
                        <config.icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {record.importTime}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          详情
                        </Button>
                        {record.status === "failed" && (
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
