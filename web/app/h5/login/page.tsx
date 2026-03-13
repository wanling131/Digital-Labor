"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Phone, Lock, ArrowRight, Eye, EyeOff, Loader2, QrCode } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { setWorkerToken } from "@/lib/api"

export default function H5LoginPage() {
  const [loginType, setLoginType] = useState<"phone" | "workid" | "qrcode">("phone")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [workId, setWorkId] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [projectKey, setProjectKey] = useState<string | null>(null)
  const router = useRouter()

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!phone || !password) {
      setError("请输入手机号和密码")
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的手机号")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/worker-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phone.trim(), password: password.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { message?: string }).message || "手机号或密码错误")
        return
      }
      const token = (data as { token?: string }).token
      if (token) setWorkerToken(token)
      router.push("/h5")
    } finally {
      setLoading(false)
    }
  }

  const handleWorkIdLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!workId || !name) {
      setError("请输入工号和姓名")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/worker-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_no: workId.trim(), name: name.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { message?: string }).message || "工号或姓名不匹配")
        return
      }
      const token = (data as { token?: string }).token
      if (token) setWorkerToken(token)
      router.push("/h5/activation")
    } finally {
      setLoading(false)
    }
  }

  const handleQRCodeLogin = async () => {
    setError("")
    setLoading(true)
    try {
      // 现场扫码通常由微信/浏览器完成，此处只负责根据已解析的 scene 调用后端
      // 为了简单起见，先从 URL 中读取 ?scene=xxx 作为项目级/人员级标识
      const url = new URL(window.location.href)
      const scene = url.searchParams.get("scene")
      if (!scene) {
        setError("当前链接缺少二维码参数，请从项目二维码重新进入")
        return
      }

      const res = await fetch("/api/auth/worker-qrcode-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { message?: string }).message || "二维码登录失败")
        return
      }

      const mode = (data as { mode?: string }).mode
      if (mode === "person") {
        const token = (data as { token?: string }).token
        if (token) setWorkerToken(token)
        router.push("/h5/activation")
      } else {
        const key = (data as { project_key?: string }).project_key ?? null
        setProjectKey(key)
        // 未直接绑定人员，继续走激活流程，在激活页可结合 projectKey 做后续逻辑
        router.push("/h5/activation")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-center p-4 pb-6 bg-gradient-to-br from-primary to-primary/90">
      <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-8 mt-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">建筑劳务服务</h1>
        </div>
        <p className="text-primary-foreground/70 text-sm">工人端应用</p>
      </div>

      {/* 登陆方式选择 */}
      <Card className="w-full shadow-xl">
        <CardContent className="p-4">
          {/* 选项卡 */}
          <div className="flex gap-2 mb-6 bg-muted p-1 rounded-lg">
            <button
              onClick={() => {
                setLoginType("phone")
                setError("")
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginType === "phone"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              手机号登陆
            </button>
            <button
              onClick={() => {
                setLoginType("workid")
                setError("")
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginType === "workid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              工号激活
            </button>
            <button
              onClick={() => {
                setLoginType("qrcode")
                setError("")
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginType === "qrcode"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              扫码激活
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm mb-4">
              {error}
            </div>
          )}

          {/* 手机号登陆 */}
          {loginType === "phone" && (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">手机号</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={11}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="username"
                    aria-label="手机号"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="h5-password" className="text-sm font-medium">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="h5-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                    autoComplete="current-password"
                    aria-label="密码"
                    aria-describedby="h5-password-toggle"
                  />
                  <button
                    type="button"
                    id="h5-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 p-0.5 rounded-md hover:bg-muted transition-colors"
                    disabled={loading}
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    aria-pressed={showPassword}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    登陆中...
                  </>
                ) : (
                  <>
                    登陆
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* 工号激活 */}
          {loginType === "workid" && (
            <form onSubmit={handleWorkIdLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">工号</label>
                <Input
                  type="text"
                  placeholder="输入您的工号"
                  value={workId}
                  onChange={(e) => setWorkId(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">姓名</label>
                <Input
                  type="text"
                  placeholder="输入您的姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p>通过工号和姓名查询激活账户，完成实名认证后可使用</p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    激活中...
                  </>
                ) : (
                  <>
                    开始激活
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* 扫码激活 */}
          {loginType === "qrcode" && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="w-40 h-40 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">扫描二维码激活账户</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p>• 使用微信扫一扫或手机相机扫描</p>
                <p>• 支持项目级统一二维码或个人专属二维码</p>
                <p>• 首次扫码将自动开启激活流程</p>
                {projectKey && (
                  <p className="text-[11px] text-muted-foreground/80">
                    已识别项目标识：{projectKey}
                  </p>
                )}
              </div>

              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleQRCodeLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    激活中...
                  </>
                ) : (
                  <>
                    已扫描，继续
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 演示账号提示（与 seed 中首条人员一致：手机号 13800138000，演示密码 123456） */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              演示账号: 13800138000 | 密码: 123456
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 返回首页 */}
      <Link href="/">
        <Button variant="ghost" className="mt-6 text-primary-foreground hover:bg-primary-foreground/10">
          返回首页
        </Button>
      </Link>
      </div>
    </div>
  )
}
