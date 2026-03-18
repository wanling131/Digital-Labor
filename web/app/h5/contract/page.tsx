"use client"

import { useState, useCallback, useEffect } from "react"
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
import { FaceVerify } from "@/components/h5/face-verify"
import {
  FileText,
  Eye,
  PenTool,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiWorker, downloadContractPdf, buildFileUrl } from "@/lib/api"

interface Contract {
  id: string
  title: string
  type: string
  company: string
  startDate: string
  endDate: string
  status: "pending" | "signed" | "expired" | "rejected"
  signedAt?: string
  signImageSnapshot?: string
  personSignatureImage?: string
}

const statusConfig = {
  pending: { label: "待签署", color: "bg-orange-100 text-orange-700", icon: Clock },
  signed: { label: "已签署", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired: { label: "已过期", color: "bg-gray-100 text-gray-700", icon: AlertCircle },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700", icon: AlertCircle },
}

/** 签署前强制阅读时长（秒），满足后方可勾选同意并确认签署 */
const READ_SECONDS = 15

export default function ContractPage() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [readSecondsLeft, setReadSecondsLeft] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signedSuccess, setSignedSuccess] = useState(false)
  const [contractList, setContractList] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfMessage, setPdfMessage] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [faceVerified, setFaceVerified] = useState(false)
  const [faceVerifying, setFaceVerifying] = useState(false)
  const [workerId, setWorkerId] = useState<number | null>(null)
  const [workerInfo, setWorkerInfo] = useState<any>(null)
  const [esignMode, setEsignMode] = useState(false)
  const [esignUrl, setEsignUrl] = useState<string | null>(null)
  const [evidenceInfo, setEvidenceInfo] = useState<any>(null)

  const mapRow = (row: { id: number; title?: string; status?: string; deadline?: string; signed_at?: string | null; sign_image_snapshot?: string | null; person_signature_image?: string | null }): Contract => ({
    id: String(row.id),
    title: row.title ?? "合同",
    type: "劳动合同",
    company: "建筑集团有限公司",
    startDate: row.deadline?.slice(0, 10) ?? "",
    endDate: row.deadline?.slice(0, 10) ?? "",
    status: row.status === "已签署" ? "signed" : row.status === "待签署" ? "pending" : "expired",
    signedAt: row.signed_at ?? undefined,
    signImageSnapshot: row.sign_image_snapshot ?? undefined,
    personSignatureImage: row.person_signature_image ?? undefined,
  })

  const loadContracts = useCallback(async () => {
    try {
      const [pendingRes, signedRes] = await Promise.all([
        apiWorker<{ list: unknown[] }>("/api/contract/my-pending"),
        apiWorker<{ list: unknown[] }>("/api/contract/my-signed"),
      ])
      const pending = (pendingRes.list || []).map((r) => mapRow(r as Parameters<typeof mapRow>[0]))
      const signed = (signedRes.list || []).map((r) => mapRow(r as Parameters<typeof mapRow>[0]))
      setContractList([...pending, ...signed])
    } catch {
      setContractList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  useEffect(() => {
    apiWorker<{ id?: number; name?: string; id_card?: string }>("/api/worker/me")
      .then((me) => {
        setWorkerId(me.id ?? null)
        setWorkerInfo(me)
      })
      .catch(() => setWorkerId(null))
  }, [])

  // 打开签署弹窗且人脸已通过时，开始强制阅读倒计时
  useEffect(() => {
    if (!showSignDialog || !faceVerified) return
    setReadSecondsLeft(READ_SECONDS)
    const t = setInterval(() => {
      setReadSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [showSignDialog, faceVerified])

  const pendingContracts = contractList.filter((c) => c.status === "pending")
  const signedContracts = contractList.filter((c) => c.status === "signed")
  const expiredContracts = contractList.filter((c) => c.status === "expired")

  const handleRefresh = useCallback(async () => {
    await loadContracts()
  }, [loadContracts])

  const handleSign = async () => {
    if (!agreed || !selectedContract) return
    setSigning(true)
    try {
      // 1. 先尝试获取e签宝签署链接
      const signUrlRes = await apiWorker<{ ok: boolean; signUrl?: string; local?: boolean }>(
        `/api/contract/${selectedContract.id}/sign-url`
      )

      if (signUrlRes.ok && signUrlRes.signUrl && !signUrlRes.local) {
        // 使用e签宝签署
        setEsignMode(true)
        setEsignUrl(signUrlRes.signUrl)
        // 打开e签宝签署页面
        window.open(signUrlRes.signUrl, '_blank')
        setShowSignDialog(false)
        // 提示用户完成签署后刷新
        setPdfMessage('请在弹出的页面完成签署，完成后请刷新列表')
      } else {
        // 使用本地签署流程
        await apiWorker(`/api/contract/sign/${selectedContract.id}`, { method: "POST" })
        setContractList((prev) =>
          prev.map((c) =>
            c.id === selectedContract.id
              ? { ...c, status: "signed" as const, signedAt: new Date().toLocaleString("zh-CN") }
              : c
          )
        )
        setShowSignDialog(false)
        setSignedSuccess(true)
        setTimeout(() => {
          setSignedSuccess(false)
          setSelectedContract(null)
          setAgreed(false)
          setFaceVerified(false)
        }, 2000)
      }
    } catch (error) {
      console.error('签署失败:', error)
      setPdfMessage('签署失败，请重试')
    } finally {
      setSigning(false)
    }
  }

  // 查询存证信息
  const handleViewEvidence = async (contractId: string) => {
    try {
      const res = await apiWorker<{ ok: boolean; evidence?: any }>(`/api/contract/${contractId}/evidence`)
      if (res.ok && res.evidence) {
        setEvidenceInfo(res.evidence)
      }
    } catch (error) {
      console.error('查询存证失败:', error)
    }
  }

  // 人脸验证成功回调
  const handleFaceVerifySuccess = (result: any) => {
    setFaceVerified(true)
    setFaceVerifying(false)
  }

  // 人脸验证失败回调
  const handleFaceVerifyError = (error: string) => {
    setFaceVerifying(false)
    setPdfMessage(`人脸验证失败: ${error}`)
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
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 active:scale-95 transition-transform"
                  disabled={downloadingId === contract.id}
                  onClick={async () => {
                    setDownloadingId(contract.id)
                    setPdfMessage(null)
                    const result = await downloadContractPdf(contract.id, true)
                    setDownloadingId(null)
                    if (!result.ok) setPdfMessage(result.message)
                  }}
                >
                  {downloadingId === contract.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  下载
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 active:scale-95 transition-transform"
                  onClick={() => handleViewEvidence(contract.id)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  存证
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PullRefresh onRefresh={handleRefresh} className="pb-24 flex-1 min-h-0">
      {/* Success Toast */}
      {signedSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">签署成功</span>
        </div>
      )}
      {/* PDF 提示 */}
      {pdfMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg shadow-lg text-sm max-w-[80vw]">
          {pdfMessage}
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
            {contractList.length === 0 && !loading ? (
              <EmptyState icon={FileText} title="暂无合同" description="暂无合同记录" />
            ) : (
              contractList.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))
            )}
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
              {!faceVerified ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">签署前需完成人脸验证，确保本人签署</p>
                  <FaceVerify
                    mode="living"
                    personId={workerId || undefined}
                    certName={workerInfo?.name}
                    certNo={workerInfo?.id_card}
                    onSuccess={handleFaceVerifySuccess}
                    onError={handleFaceVerifyError}
                    onCancel={() => setShowSignDialog(false)}
                  />
                </div>
              ) : (
                <>
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">{selectedContract.title}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>合同类型: {selectedContract.type}</p>
                  <p>签约方: {selectedContract.company}</p>
                  <p>有效期: {selectedContract.startDate} 至 {selectedContract.endDate}</p>
                </div>
              </div>

              {(() => {
                const raw = selectedContract.signImageSnapshot || selectedContract.personSignatureImage
                const url = buildFileUrl(raw)
                return url
                  ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">签名预览：</p>
                  <div className="border rounded-md p-2 inline-flex bg-white">
                    <img
                      src={url}
                      alt="签名"
                      className="h-16 w-auto object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                    />
                  </div>
                </div>
                  ) : null
              })()}
              
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

              {readSecondsLeft > 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  请阅读合同内容，<span className="font-medium text-foreground">{readSecondsLeft}</span> 秒后可勾选同意并签署
                </p>
              ) : null}

              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  disabled={readSecondsLeft > 0}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <label
                  htmlFor="agree"
                  className={cn(
                    "text-sm leading-relaxed",
                    readSecondsLeft > 0 && "cursor-not-allowed opacity-60"
                  )}
                >
                  本人已仔细阅读并同意上述合同全部条款，确认签署
                </label>
              </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSignDialog(false)} className="flex-1 active:scale-95 transition-transform">
              取消
            </Button>
            <Button
              onClick={handleSign}
              disabled={!faceVerified || !agreed || signing || readSecondsLeft > 0}
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

      {/* 存证信息弹窗 */}
      <Dialog open={!!evidenceInfo} onOpenChange={() => setEvidenceInfo(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              合同存证信息
            </DialogTitle>
            <DialogDescription>
              本合同已通过电子签章服务存证
            </DialogDescription>
          </DialogHeader>
          {evidenceInfo && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">存证类型</span>
                  <Badge variant="outline">{evidenceInfo.type}</Badge>
                </div>
                {evidenceInfo.evidenceNo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">存证编号</span>
                    <span className="text-sm font-mono">{evidenceInfo.evidenceNo}</span>
                  </div>
                )}
                {evidenceInfo.evidenceTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">存证时间</span>
                    <span className="text-sm">{evidenceInfo.evidenceTime}</span>
                  </div>
                )}
                {evidenceInfo.hash && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">文件哈希</span>
                    <p className="text-xs font-mono break-all bg-muted p-2 rounded">{evidenceInfo.hash}</p>
                  </div>
                )}
                {evidenceInfo.reportUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(evidenceInfo.reportUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    下载存证报告
                  </Button>
                )}
                {evidenceInfo.message && (
                  <p className="text-sm text-muted-foreground text-center">{evidenceInfo.message}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEvidenceInfo(null)} className="w-full">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PullRefresh>
      <BottomNav />
    </div>
  )
}
