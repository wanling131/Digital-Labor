"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Filter,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calculator,
  Wallet,
} from "lucide-react"

const settlementData = [
  {
    id: "SET001",
    name: "张三",
    idCard: "320102***********34",
    project: "项目A-主体工程",
    team: "钢筋班组",
    period: "2024-03",
    workDays: 26,
    workHours: 234,
    unitPrice: 25,
    payable: 5850,
    paid: 0,
    status: "pending_confirm",
  },
  {
    id: "SET002",
    name: "李四",
    idCard: "320103***********78",
    project: "项目A-主体工程",
    team: "木工班组",
    period: "2024-03",
    workDays: 25,
    workHours: 225,
    unitPrice: 28,
    payable: 6300,
    paid: 0,
    status: "pending_confirm",
  },
  {
    id: "SET003",
    name: "王五",
    idCard: "320104***********12",
    project: "项目B-装修工程",
    team: "抹灰班组",
    period: "2024-03",
    workDays: 24,
    workHours: 192,
    unitPrice: 22,
    payable: 4224,
    paid: 4224,
    status: "confirmed",
  },
  {
    id: "SET004",
    name: "赵六",
    idCard: "320105***********56",
    project: "项目B-装修工程",
    team: "水电班组",
    period: "2024-03",
    workDays: 22,
    workHours: 176,
    unitPrice: 30,
    payable: 5280,
    paid: 5280,
    status: "paid",
  },
]

const statusConfig = {
  pending_confirm: { label: "待确认", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  confirmed: { label: "已确认", color: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle },
  paid: { label: "已发放", color: "bg-accent/10 text-accent border-accent/20", icon: Wallet },
  rejected: { label: "已驳回", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
}

export default function SettlementGeneratePage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPushOpen, setIsPushOpen] = useState(false)

  const filteredData = settlementData.filter(
    (item) =>
      item.name.includes(searchTerm) ||
      item.id.includes(searchTerm) ||
      item.project.includes(searchTerm)
  )

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredData.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredData.map((d) => d.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

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
          <h1 className="text-2xl font-bold text-foreground">结算单生成与确认</h1>
          <p className="text-muted-foreground">基于工时生成结算单，在线审核与调整</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="2024-03">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择周期" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-03">2024年3月</SelectItem>
              <SelectItem value="2024-02">2024年2月</SelectItem>
              <SelectItem value="2024-01">2024年1月</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Calculator className="h-4 w-4" />
            批量生成
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">本月结算单</p>
                <p className="text-2xl font-bold">3,350</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">待确认</p>
                <p className="text-2xl font-bold">856</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已确认</p>
                <p className="text-2xl font-bold">1,245</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">已发放</p>
                <p className="text-2xl font-bold">1,249</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 结算单列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>结算单列表</CardTitle>
              <CardDescription>查看和管理结算单</CardDescription>
            </div>
            <Button
              className="gap-2"
              disabled={selectedItems.length === 0}
              onClick={() => setIsPushOpen(true)}
            >
              <Send className="h-4 w-4" />
              批量推送 ({selectedItems.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="pending">待确认</TabsTrigger>
                <TabsTrigger value="confirmed">已确认</TabsTrigger>
                <TabsTrigger value="paid">已发放</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索姓名、结算单号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-60 pl-9"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredData.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>结算单号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>身份证号</TableHead>
                    <TableHead>项目/班组</TableHead>
                    <TableHead>结算周期</TableHead>
                    <TableHead>出勤/工时</TableHead>
                    <TableHead>应发金额</TableHead>
                    <TableHead>已发金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {item.idCard}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{item.project}</p>
                          <p className="text-xs text-muted-foreground">{item.team}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.period}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{item.workDays}天</p>
                          <p className="text-muted-foreground">{item.workHours}小时</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        ¥{item.payable.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-accent">
                        ¥{item.paid.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditOpen(true)}
                          >
                            调整
                          </Button>
                          {item.status === "pending_confirm" && (
                            <Button variant="ghost" size="sm" className="text-primary">
                              推送
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 调整结算单弹窗 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>调整结算单</DialogTitle>
            <DialogDescription>修改应发放金额和已发放金额</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value="张三" disabled />
              </div>
              <div className="space-y-2">
                <Label>结算周期</Label>
                <Input value="2024-03" disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>出勤天数</Label>
                <Input value="26天" disabled />
              </div>
              <div className="space-y-2">
                <Label>总工时</Label>
                <Input value="234小时" disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>应发金额</Label>
                <Input type="number" defaultValue={5850} />
              </div>
              <div className="space-y-2">
                <Label>已发金额</Label>
                <Input type="number" defaultValue={0} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>调整说明</Label>
              <Input placeholder="请输入调整原因（选填）" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setIsEditOpen(false)}>确认调整</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量推送弹窗 */}
      <Dialog open={isPushOpen} onOpenChange={setIsPushOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量推送确认</DialogTitle>
            <DialogDescription>
              即将向 {selectedItems.length} 名人员推送结算单确认通知
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                推送后，相关人员将通过短信和微信收到结算单确认通知，请确保信息无误。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPushOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setIsPushOpen(false)}>确认推送</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
