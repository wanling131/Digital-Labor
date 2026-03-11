"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

interface Profile {
  id: number
  username: string
  name?: string | null
  org_id?: number | null
  org_name?: string | null
  role?: string | null
  enabled?: number | boolean | null
  created_at?: string | null
}

export default function PcProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Profile>("/api/sys/profile")
      .then((res) => {
        setProfile(res)
        setName(res.name ?? "")
      })
      .catch(() => {
        setProfile(null)
      })
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api("/api/sys/profile", {
        method: "PUT",
        body: { name: name.trim() || null },
      })
      setMessage("已保存")
    } catch (e: any) {
      setError(e?.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">个人设置</h1>
        <p className="text-muted-foreground">修改当前管理账号的基本信息。</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>仅影响显示名称，不会修改用户名。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input value={profile?.username ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>显示名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入显示名称"
            />
          </div>
          <div className="space-y-2">
            <Label>所属组织</Label>
            <Input value={profile?.org_name ?? "—"} disabled />
          </div>
          <div className="space-y-2">
            <Label>角色</Label>
            <Input value={profile?.role === "admin" ? "管理员" : profile?.role === "user" ? "业务员" : (profile?.role ?? "—")} disabled />
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

