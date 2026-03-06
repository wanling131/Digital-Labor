"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Camera,
  Smartphone,
  CreditCard,
  PenTool,
  Clock,
} from "lucide-react"

const certificationRecords = [
  {
    id: "CERT001",
    name: "张三",
    idCard: "320102199001011234",
    faceImage: "/placeholder.svg",
    faceStatus: "passed",
    faceTime: "2024-03-01 10:30:25",
    idStatus: "passed",
    phoneStatus: "passed",
    signatureStatus: "passed",
    overallStatus: "passed",
  },
  {
    id: "CERT002",
    name: "李四",
    idCard: "320103199202025678",
    faceImage: "/placeholder.svg",
    faceStatus: "passed",
    faceTime: "2024-03-02 14:15:30",
    idStatus: "passed",
    phoneStatus: "passed",
    signatureStatus: "pending",
    overallStatus: "pending",
  },
  {
    id: "CERT003",
    name: "王五",
    idCard: "320104199303039012",
    faceImage: "/placeholder.svg",
    faceStatus: "failed",
    faceTime: "2024-03-03 09:45:12",
    idStatus: "passed",
    phoneStatus: "passed",
    signatureStatus: "pending",
    overallStatus: "review",
  },
  {
    id: "CERT004",
    name: "赵六",
    idCard: "320105199404043456",
    faceImage: "/placeholder.svg",
    faceStatus: "pending",
    faceTime: "-",
    idStatus: "pending",
    phoneStatus: "pending",
    signatureStatus: "pending",
    overallStatus: "pending",
  },
]

const statusConfig = {
  passed: { label: "已通过", color: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
  failed: { label: "未通过", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  pending: { label: "待认证", color: "bg-muted text-muted-foreground border-muted", icon: Clock },
  review: { label: "待审核", color: "bg-warning/10 text-warning border-warning/20", icon: AlertCircle },
}

export default function CertificationPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<typeof certificationRecords[0] | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const filteredRecords = certificationRecords.filter(
    (record) =>
      record.name.includes(searchTerm) ||
      record.id.includes(searchTerm) ||
      record.idCard.includes(searchTerm)
  )

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">认证管理</h1>
          <p className="text-muted-foreground">管理人脸采集、活体检测、身份证信息及电子签名</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">人脸采集</p>
                <p className="text-2xl font-bold">3,686</p>
                <p className="text-xs text-muted-foreground">已完成 95.9%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <CreditCard className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">身份证登记</p>
                <p className="text-2xl font-bold">3,718</p>
                <p className="text-xs text-muted-foreground">已完成 96.8%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-chart-3/10 p-3">
                <Smartphone className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">手机绑定</p>
                <p className="text-2xl font-bold">3,702</p>
                <p className="text-xs text-muted-foreground">已完成 96.4%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-chart-5/10 p-3">
                <PenTool className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">电子签名</p>
                <p className="text-2xl font-bold">3,548</p>
                <p className="text-xs text-muted-foreground">已完成 92.4%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 认证记录 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>认证记录</CardTitle>
              <CardDescription>查看和审核人员认证信息</CardDescription>
            </div>
            <Tabs defaultValue="all" className="w-auto">
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="review">待审核</TabsTrigger>
                <TabsTrigger value="pending">待认证</TabsTrigger>
                <TabsTrigger value="passed">已通过</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、身份证号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>人员信息</TableHead>
                <TableHead>身份证号</TableHead>
                <TableHead>人脸采集</TableHead>
                <TableHead>身份证验证</TableHead>
                <TableHead>手机绑定</TableHead>
                <TableHead>电子签名</TableHead>
                <TableHead>综合状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={record.faceImage} />
                        <AvatarFallback>{record.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{record.name}</p>
                        <p className="text-xs text-muted-foreground">{record.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{record.idCard}</TableCell>
                  <TableCell>{getStatusBadge(record.faceStatus)}</TableCell>
                  <TableCell>{getStatusBadge(record.idStatus)}</TableCell>
                  <TableCell>{getStatusBadge(record.phoneStatus)}</TableCell>
                  <TableCell>{getStatusBadge(record.signatureStatus)}</TableCell>
                  <TableCell>{getStatusBadge(record.overallStatus)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setSelectedRecord(record)
                        setIsDetailOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>认证详情 - {selectedRecord?.name}</DialogTitle>
            <DialogDescription>查看完整认证信息及审核</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">人脸照片</p>
                  <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    采集时间: {selectedRecord.faceTime}
                  </p>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">姓名</p>
                      <p className="text-sm">{selectedRecord.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">身份证号</p>
                      <p className="text-sm font-mono">{selectedRecord.idCard}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">人脸状态</p>
                      {getStatusBadge(selectedRecord.faceStatus)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">综合状态</p>
                      {getStatusBadge(selectedRecord.overallStatus)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium mb-3">认证进度</p>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "人脸采集", status: selectedRecord.faceStatus, icon: Camera },
                    { label: "身份证验证", status: selectedRecord.idStatus, icon: CreditCard },
                    { label: "手机绑定", status: selectedRecord.phoneStatus, icon: Smartphone },
                    { label: "电子签名", status: selectedRecord.signatureStatus, icon: PenTool },
                  ].map((item, index) => (
                    <div key={index} className="text-center">
                      <div
                        className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${
                          item.status === "passed"
                            ? "bg-accent/10"
                            : item.status === "failed"
                            ? "bg-destructive/10"
                            : "bg-muted"
                        }`}
                      >
                        <item.icon
                          className={`h-6 w-6 ${
                            item.status === "passed"
                              ? "text-accent"
                              : item.status === "failed"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <p className="text-xs font-medium">{item.label}</p>
                      <p
                        className={`text-xs ${
                          item.status === "passed"
                            ? "text-accent"
                            : item.status === "failed"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {statusConfig[item.status as keyof typeof statusConfig].label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRecord?.overallStatus === "review" && (
              <>
                <Button variant="outline" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  驳回
                </Button>
                <Button className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  通过审核
                </Button>
              </>
            )}
            {selectedRecord?.overallStatus !== "review" && (
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
