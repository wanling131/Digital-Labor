"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/h5/page-header"
import { BottomNav } from "@/components/h5/bottom-nav"
import { apiWorker, getWorkerToken } from "@/lib/api"
import { Lock, Smartphone } from "lucide-react"

function passwordStrength(pwd: string): { label: string; weak: boolean } {
  if (!pwd) return { label: "", weak: true }
  if (pwd.length < 6) return { label: "至少 6 位", weak: true }
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasNumber = /\d/.test(pwd)
  if (hasLetter && hasNumber) return { label: "强度较好", weak: false }
  if (hasLetter || hasNumber) return { label: "建议加入字母和数字", weak: false }
  return { label: "建议加入字母和数字", weak: false }
}

export default function ProfileSecurityPage() {
  const router = useRouter()
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!getWorkerToken()) router.replace("/h5/login")
  }, [router])

  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState("")
  const [pwdSuccess, setPwdSuccess] = useState(false)

  const [mobile, setMobile] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [mobileLoading, setMobileLoading] = useState(false)
  const [mobileError, setMobileError] = useState("")
  const [mobileSuccess, setMobileSuccess] = useState(false)

  const strength = passwordStrength(newPwd)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError("")
    setPwdSuccess(false)
    if (newPwd.length < 6) {
      setPwdError("新密码至少 6 位")
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError("两次输入的新密码不一致")
      return
    }
    setPwdLoading(true)
    try {
      await apiWorker("/api/worker/change-password", {
        method: "POST",
        body: { old_password: oldPwd, new_password: newPwd },
      })
      setPwdSuccess(true)
      setOldPwd("")
      setNewPwd("")
      setConfirmPwd("")
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message
      setPwdError(msg || "修改失败，请检查原密码")
    } finally {
      setPwdLoading(false)
    }
  }

  const handleBindMobile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMobileError("")
    setMobileSuccess(false)
    const m = mobile.trim()
    if (!m) {
      setMobileError("请输入手机号")
      return
    }
    if (!/^1\d{10}$/.test(m)) {
      setMobileError("请输入正确的 11 位手机号")
      return
    }
    setMobileLoading(true)
    try {
      await apiWorker("/api/worker/bind-mobile", {
        method: "POST",
        body: { mobile: m, verify_code: verifyCode.trim() || undefined },
      })
      setMobileSuccess(true)
      setMobile("")
      setVerifyCode("")
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message
      setMobileError(msg || "绑定失败")
    } finally {
      setMobileLoading(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-24">
      <PageHeader title="安全设置" backHref="/h5/profile" />

      <div className="px-4 pt-4 space-y-6">
        {/* 修改密码 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              修改密码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="old_password">原密码</Label>
                <Input
                  id="old_password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="未设置过可留空"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_password">新密码</Label>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="至少 6 位"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                {newPwd && (
                  <p className={`text-xs ${strength.weak ? "text-amber-600" : "text-muted-foreground"}`}>
                    {strength.label}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">确认新密码</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="再次输入新密码"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </div>
              {pwdError && <p className="text-sm text-destructive">{pwdError}</p>}
              {pwdSuccess && <p className="text-sm text-green-600">密码已修改</p>}
              <Button type="submit" className="w-full" disabled={pwdLoading}>
                {pwdLoading ? "提交中..." : "修改密码"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 手机绑定 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              手机绑定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleBindMobile} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mobile">手机号</Label>
                <Input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="11 位手机号"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="verify_code">验证码（选填）</Label>
                <Input
                  id="verify_code"
                  type="text"
                  placeholder="暂未开通短信验证可留空"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                />
              </div>
              {mobileError && <p className="text-sm text-destructive">{mobileError}</p>}
              {mobileSuccess && <p className="text-sm text-green-600">手机号已更新</p>}
              <Button type="submit" className="w-full" disabled={mobileLoading}>
                {mobileLoading ? "提交中..." : "绑定手机号"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
