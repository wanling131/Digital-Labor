"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { BottomNav } from "@/components/h5/bottom-nav"
import { PageHeader } from "@/components/h5/page-header"
import { PullRefresh } from "@/components/h5/pull-refresh"
import { EmptyState } from "@/components/h5/empty-state"
import {
  FileText,
  Eye,
  PenTool,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Contract {
  id: string
  title: string
  type: string
  company: string
  startDate: string
  endDate: string
  status: "pending" | "signed" | "expired" | "rejected"
  signedAt?: string
}

const contracts: Contract[] = [
  {
    id: "1",
    title: "2024年度劳动合同",
    type: "劳动合同",
    company: "建筑集团有限公司",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    status: "pending",
  },
  {
    id: "2",
    title: "安全生产责任书",
    type: "安全协议",
    company: "建筑集团有限公司",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    status: "signed",
    signedAt: "2024-01-05 14:30",
  },
  {
    id: "3",
    title: "2023年度劳动合同",
    type: "劳动合同",
    company: "建筑集团有限公司",
    startDate: "2023-01-01",
    endDate: "2023-12-31",
    status: "expired",
    signedAt: "2023-01-10 09:15",
  },
  {
    id: "4",
    title: "保密协议",
    type: "保密协议",
    company: "建筑集团有限公司",
    startDate: "2024-01-01",
    endDate: "2026-12-31",
    status: "signed",
    signedAt: "2024-01-05 14:35",
  },
]

const statusConfig = {
  pending: { label: "待签署", color: "bg-orange-100 text-orange-700", icon: Clock },
  signed: { label: "已签署", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "已过期", color: "bg-gray-100 text-gray-700", icon: AlertCircle },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700", icon: AlertCircle },
}

export default function ContractPage() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signedSuccess, setSignedSuccess] = useState(false)
  const [contractList, setContractList] = useState(contracts)

  const pendingContracts = contractList.filter((c) => c.status === "pending")
  const signedContracts = contractList.filter((c) => c.status === "signed")
  const expiredContracts = contractList.filter((c) => c.status === "expired")

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
  }, [])

  const handleSign = () => {
    if (!agreed || !selectedContract) return
    setSigning(true)
    setTimeout(() => {
      // 更新合同状态
      setContractList(prev => prev.map(c => 
        c.id === selectedContract.id 
          ? { ...c, status: "signed" as const, signedAt: new Date().toLocaleString("zh-CN") }
          : c
      ))
      setSigning(false)
      setShowSignDialog(false)
      setSignedSuccess(true)
      setTimeout(() => {
        setSignedSuccess(false)
        setSelectedContract(null)
        setAgreed(false)
      }, 2000)
    }, 2000)
  }

  const ContractCard = ({ contract }: { contract: Contract }) => {
    const config = statusConfig[contract.status]
    const StatusIcon = config.icon
    return (
      <Card className="mb-3 overflow-hidden active:scale-[0.98] transition-transform duration-150">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                contract.status === "pending" ? "bg-chart-5/10" : 
                contract.status === "signed" ? "bg-accent/10" : "bg-muted"
              )}>
                <FileText className={cn(
                  "h-5 w-5",
                  contract.status === "pending" ? "text-chart-5" : 
                  contract.status === "signed" ? "text-accent" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <h3 className="font-medium text-sm">{contract.title}</h3>
                <p className="text-xs text-muted-foreground">{contract.type}</p>
              </div>
            </div>
            <Badge className={config.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground mb-3">
            <p>签约方: {contract.company}</p>
            <p>有效期: {contract.startDate} 至 {contract.endDate}</p>
            {contract.signedAt && <p>签署时间: {contract.signedAt}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 active:scale-95 transition-transform"
              onClick={() => setSelectedContract(contract)}
            >
              <Eye className="h-4 w-4 mr-1" />
              查看
            </Button>
            {contract.status === "pending" && (
              <Button
                size="sm"
                className="flex-1 active:scale-95 transition-transform"
                onClick={() => {
                  setSelectedContract(contract)
                  setShowSignDialog(true)
                }}
              >
                <PenTool className="h-4 w-4 mr-1" />
                签署
              </Button>
            )}
            {contract.status === "signed" && (
              <Button variant="outline" size="sm" className="flex-1 active:scale-95 transition-transform">
                <Download className="h-4 w-4 mr-1" />
                下载
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <PullRefresh onRefresh={handleRefresh} className="pb-24 min-h-screen">
      {/* Success Toast */}
      {signedSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">签署成功</span>
        </div>
      )}
      
      {/* Header */}
      <PageHeader title="我的合同" backHref="/h5" />
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-primary-foreground/10 border-0">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{pendingContracts.length}</p>
              <p className="text-xs opacity-80">待签署</p>
            </CardContent>
          </Card>
          <Card className="bg-primary-foreground/10 border-0">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{signedContracts.length}</p>
              <p className="text-xs opacity-80">已签署</p>
            </CardContent>
          </Card>
          <Card className="bg-primary-foreground/10 border-0">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{expiredContracts.length}</p>
              <p className="text-xs opacity-80">已过期</p>
            </CardContent>
          </Card>
        </div>

      {/* Contract List */}
      <div className="px-4 mt-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="pending">
              待签署 {pendingContracts.length > 0 && `(${pendingContracts.length})`}
            </TabsTrigger>
            <TabsTrigger value="signed">已签署</TabsTrigger>
            <TabsTrigger value="all">全部</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {pendingContracts.length > 0 ? (
              pendingContracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))
            ) : (
              <EmptyState
                icon={FileText}
                title="暂无待签署合同"
                description="所有合同都已签署完毕"
              />
            )}
          </TabsContent>
          <TabsContent value="signed">
            {signedContracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </TabsContent>
          <TabsContent value="all">
            {contracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>合同签署确认</DialogTitle>
            <DialogDescription>
              请仔细阅读合同内容后进行签署
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">{selectedContract.title}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>合同类型: {selectedContract.type}</p>
                  <p>签约方: {selectedContract.company}</p>
                  <p>有效期: {selectedContract.startDate} 至 {selectedContract.endDate}</p>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-muted-foreground">
                <p className="mb-2">合同主要条款:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>甲方同意聘用乙方从事建筑施工相关工作</li>
                  <li>乙方应遵守甲方的各项规章制度和安全操作规程</li>
                  <li>甲方按月支付乙方劳动报酬，具体标准按双方约定执行</li>
                  <li>乙方应按时出勤，服从工作安排</li>
                  <li>甲方为乙方提供必要的劳动保护用品和安全培训</li>
                </ol>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <label htmlFor="agree" className="text-sm leading-relaxed">
                  本人已仔细阅读并同意上述合同全部条款，确认签署
                </label>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSignDialog(false)} className="flex-1 active:scale-95 transition-transform">
              取消
            </Button>
            <Button
              onClick={handleSign}
              disabled={!agreed || signing}
              className="flex-1 active:scale-95 transition-transform"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  签署中...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-1" />
                  确认签署
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </PullRefresh>
  )
}
