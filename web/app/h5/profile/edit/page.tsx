"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/h5/page-header"
import { BottomNav } from "@/components/h5/bottom-nav"
import { apiWorker } from "@/lib/api"

export default function ProfileEditPage() {
  const router = useRouter()
  const [mobile, setMobile] = useState("")
  const [idCard, setIdCard] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // 不预填手机号/身份证（接口返回脱敏值）；仅提交用户填写的新值，留空则不修改

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await apiWorker("/api/worker/me", {
        method: "PUT",
        body: { mobile: mobile.trim() || undefined, id_card: idCard.trim() || undefined },
      })
      router.push("/h5/profile")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 min-h-screen">
      <PageHeader title="信息补全" backHref="/h5/profile" />

      <div className="px-4 pt-4">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">手机号</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="留空则不修改，填写则更新手机号"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_card">身份证号</Label>
                <Input
                  id="id_card"
                  placeholder="留空则不修改，填写则更新身份证号"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "保存中..." : "保存"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4">
          完善手机号和身份证信息，便于接收通知及实名认证。
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
