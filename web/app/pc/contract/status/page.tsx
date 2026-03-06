"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Filter,
  Eye,
  Download,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react"

const contractStatus = [
  {
    id: "CON001",
    name: "张三",
    idCard: "320102***********34",
    template: "劳动合同-标准版",
    project: "项目A-主体工程",
    status: "signed",
    signTime: "2024-03-01 14:32:15",
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    archiveId: "ARC20240301001",
  },
  {
    id: "CON002",
    name: "李四",
    idCard: "320103***********78",
    template: "劳动合同-标准版",
    project: "项目A-主体工程",
    status: "signed",
    signTime: "2024-03-02 10:15:42",
    startDate: "2024-03-02",
    endDate: "2025-03-01",
    archiveId: "ARC20240302002",
  },
  {
    id: "CON003",
    name: "王五",
    idCard: "320104***********12",
    template: "劳务派遣合同",
    project: "项目B-装修工程",
    status: "pending",
    signTime: null,
    startDate: "2024-03-05",
    endDate: "2024-09-04",
    archiveId: null,
  },
  {
    id: "CON004",
    name: "赵六",
    idCard: "320105***********56",
    template: "临时用工协议",
    project: "项目B-装修工程",
    status: "expired",
    signTime: null,
    startDate: "2024-02-20",
    endDate: "2024-03-20",
    archiveId: null,
  },
  {
    id: "CON005",
    name: "钱七",
    idCard: "320106***********90",
    template: "安全责任书",
    project: "项目C-基建工程",
    status: "rejected",
    signTime: null,
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    archiveId: null,
  },
]

const statusConfig = {
  signed: { label: "已签署", color: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle },
  pending: { label: "待签署", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  expired: { label: "已逾期", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
  rejected: { label: "已驳回", color: "bg-muted text-muted-foreground border-muted", icon: XCircle },
}

export default function ContractStatusPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedContract, setSelectedContract] = useState<typeof contractStatus[0] | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const filteredContracts = contractStatus.filter(
    (contract) =>
      contract.name.includes(searchTerm) ||
      contract.id.includes(searchTerm) ||
      contract.project.includes(searchTerm)
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

  // 计算统计数据
  const signedCount = contractStatus.filter((c) => c.status === "signed").length
  const pendingCount = contractStatus.filter((c) => c.status === "pending").length
  const expiredCount = contractStatus.filter((c) => c.status === "expired").length
  const signRate = Math.round((signedCount / contractStatus.length) * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">签约状态</h1>
          <p className="text-muted-foreground">实时查看合同签署进度</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">签约进度</p>
                <p className="text-2xl font-bold">{signRate}%</p>
                <Progress value={signRate} className="mt-2 h-2" />
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已签署</p>
                <p className="text-2xl font-bold">{signedCount}</p>
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
                <p className="text-sm font-medium text-muted-foreground">待签署</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <div className="rounded-full bg-warning/10 p-3">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已逾期</p>
                <p className="text-2xl font-bold">{expiredCount}</p>
              </div>
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 合同列表 */}
      <Card>
        <CardHeader>
          <CardTitle>合同签署列表</CardTitle>
          <CardDescription>查看所有合同的签署状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、合同号、项目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="signed">已签署</SelectItem>
                <SelectItem value="pending">待签署</SelectItem>
                <SelectItem value="expired">已逾期</SelectItem>
                <SelectItem value="rejected">已驳回</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>合同编号</TableHead>
                <TableHead>签约人</TableHead>
                <TableHead>身份证号</TableHead>
                <TableHead>合同模板</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>合同期限</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>签署时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.id}</TableCell>
                  <TableCell>{contract.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {contract.idCard}
                  </TableCell>
                  <TableCell>{contract.template}</TableCell>
                  <TableCell>{contract.project}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{contract.startDate}</p>
                      <p className="text-muted-foreground">至 {contract.endDate}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {contract.signTime || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setSelectedContract(contract)
                          setIsDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        详情
                      </Button>
                      {contract.status === "signed" && (
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Download className="h-4 w-4" />
                          下载
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 合同详情弹窗 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>合同详情 - {selectedContract?.id}</DialogTitle>
            <DialogDescription>查看合同签署信息及存证详情</DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">签约人</p>
                  <p className="text-sm">{selectedContract.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">身份证号</p>
                  <p className="text-sm font-mono">{selectedContract.idCard}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">合同模板</p>
                  <p className="text-sm">{selectedContract.template}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">所属项目</p>
                  <p className="text-sm">{selectedContract.project}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">合同期限</p>
                  <p className="text-sm">
                    {selectedContract.startDate} 至 {selectedContract.endDate}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">签署状态</p>
                  {getStatusBadge(selectedContract.status)}
                </div>
              </div>

              {selectedContract.status === "signed" && (
                <>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-medium mb-3">存证信息</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">存证编号</p>
                        <p className="font-mono">{selectedContract.archiveId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">签署时间</p>
                        <p>{selectedContract.signTime}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                    <div className="text-center">
                      <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">合同PDF预览区域</p>
                      <Button variant="outline" size="sm" className="mt-2 gap-1">
                        <Download className="h-4 w-4" />
                        下载合同
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {selectedContract.status === "pending" && (
                <div className="rounded-lg bg-warning/10 p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    <p className="text-sm font-medium">等待签署中</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    已向签约人发送签署通知，请等待签署完成。
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
