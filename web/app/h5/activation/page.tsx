"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/h5/page-header"
import { BottomNav } from "@/components/h5/bottom-nav"
import { FaceVerify } from "@/components/h5/face-verify"
import { SignaturePad } from "@/components/h5/signature-pad"
import { 
  CheckCircle2, 
  Clock, 
  User, 
  Camera, 
  Phone, 
  FileText,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { apiWorker } from "@/lib/api"

const steps = [
  {
    id: 1,
    title: "信息确认",
    description: "确认个人基本信息",
    icon: User,
    completed: true,
  },
  {
    id: 2,
    title: "人脸认证",
    description: "进行人脸活体检测",
    icon: Camera,
    completed: false,
    current: true,
  },
  {
    id: 3,
    title: "信息补全",
    description: "绑定手机号和签名",
    icon: Phone,
    completed: false,
  },
  {
    id: 4,
    title: "激活完成",
    description: "账户激活成功",
    icon: CheckCircle2,
    completed: false,
  },
]

export default function ActivationPage() {
  const [currentStep, setCurrentStep] = useState(2)
  const [loading, setLoading] = useState(false)
  const [faceVerified, setFaceVerified] = useState(false)
  const [personInfo, setPersonInfo] = useState<any>(null)
  const [mobileInput, setMobileInput] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const router = useRouter()

  // 获取当前登录用户信息
  useEffect(() => {
    const fetchPersonInfo = async () => {
      try {
        const token = localStorage.getItem('labor_worker_token')
        if (!token) {
          router.push('/h5/login')
          return
        }

        const response = await fetch('/api/worker/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setPersonInfo(data)
          // 预填手机号
          if (data.mobile) {
            setMobileInput(String(data.mobile))
          }
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    }

    fetchPersonInfo()
  }, [router])

  const handleNextStep = async () => {
    setLoading(true)
    try {
      if (currentStep === 3) {
        // 信息补全保存
        try {
          await apiWorker("/api/person/me/activation", {
            method: "POST",
            body: {
              id_card: personInfo?.id_card,
              mobile: mobileInput.trim() || undefined,
              signature_image: signature || undefined,
            },
          })
        } catch (e) {
          console.error("保存激活信息失败:", e)
        }
      }
      await new Promise(resolve => setTimeout(resolve, 800))
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1)
      } else {
        router.push("/h5")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFaceVerifySuccess = (result: any) => {
    setFaceVerified(true)
    // 延迟后自动进入下一步
    setTimeout(() => {
      setCurrentStep(3)
    }, 1500)
  }

  const handleFaceVerifyError = (error: string) => {
    console.error('人脸验证失败:', error)
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-24 bg-background">
      <PageHeader title="账户激活" backHref="/h5/login" />

      {/* 步骤指示器 */}
      <div className="px-4 mt-6 mb-8">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon
            return (
              <div key={step.id} className="flex gap-4">
                {/* 步骤节点 */}
                <div className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    step.completed
                      ? "bg-accent text-accent-foreground"
                      : step.current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-1 h-8 mt-2 ${
                      step.completed ? "bg-accent" : "bg-muted"
                    }`} />
                  )}
                </div>

                {/* 步骤信息 */}
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 当前步骤内容 */}
      <div className="px-4 space-y-4">
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">确认个人信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">姓名</span>
                  <span className="font-medium">张三</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">工号</span>
                  <span className="font-medium">20240001</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">项目</span>
                  <span className="font-medium">张江项目</span>
                </div>
              </div>
              <Button 
                size="lg" 
                className="w-full gap-2" 
                onClick={handleNextStep}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    确认中...
                  </>
                ) : (
                  <>
                    信息正确，下一步
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">人脸活体检测</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!faceVerified ? (
                <FaceVerify
                  mode="living"
                  personId={personInfo?.id}
                  certName={personInfo?.name}
                  certNo={personInfo?.id_card}
                  onSuccess={handleFaceVerifySuccess}
                  onError={handleFaceVerifyError}
                  onCancel={() => router.push('/h5/login')}
                />
              ) : (
                <div className="flex flex-col items-center space-y-4 p-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-600">验证通过</h3>
                  <p className="text-sm text-gray-500">人脸验证成功，正在进入下一步...</p>
                  <Button 
                    size="lg" 
                    className="w-full gap-2" 
                    onClick={() => setCurrentStep(3)}
                  >
                    下一步
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">信息补全</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-2">身份证号</label>
                  <Input
                    placeholder="请输入身份证号"
                    defaultValue={personInfo?.id_card || ""}
                    disabled
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">手机号 *</label>
                  <Input
                    type="tel"
                    placeholder="请输入手机号"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">电子签名 *</label>
                  <SignaturePad
                    value={signature}
                    onChange={setSignature}
                  />
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full gap-2" 
                onClick={handleNextStep}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    完成激活
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-center">激活成功！</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
                <p className="font-semibold mb-2">欢迎，张三</p>
                <p className="text-sm text-muted-foreground">
                  您的账户已激活，现在可以使用所有功能
                </p>
              </div>

              <div className="bg-accent/10 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">您现在可以:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ 查看考勤记录</li>
                  <li>✓ 查看和签署合同</li>
                  <li>✓ 查询工资和工时</li>
                  <li>✓ 管理个人信息</li>
                </ul>
              </div>

              <Button 
                size="lg" 
                className="w-full gap-2" 
                onClick={handleNextStep}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    进入中...
                  </>
                ) : (
                  <>
                    进入首页
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
