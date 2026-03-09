"use client"

import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { BottomNav } from "@/components/h5/bottom-nav"
import { PullRefresh } from "@/components/h5/pull-refresh"
import {
  ChevronRight,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  CreditCard,
  FileText,
  Shield,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  Award,
  Calendar,
  Camera,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiWorker, setWorkerToken } from "@/lib/api"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FaceVerify } from "@/components/h5/face-verify"

const menuItems = [
  {
    icon: FileText,
    label: "我的证书",
    desc: "3个有效证书",
    href: "/h5/profile/certificates",
    badge: 3,
  },
  {
    icon: CreditCard,
    label: "银行卡管理",
    desc: "工商银行 **** 8888",
    href: "/h5/profile/bank",
  },
  {
    icon: Shield,
    label: "安全设置",
    desc: "修改密码、手机绑定",
    href: "/h5/profile/security",
  },
  {
    icon: Bell,
    label: "消息设置",
    desc: "通知提醒设置",
    href: "/h5/profile/notifications",
  },
  {
    icon: HelpCircle,
    label: "帮助与反馈",
    desc: "常见问题、意见反馈",
    href: "/h5/profile/help",
  },
  {
    icon: Settings,
    label: "系统设置",
    desc: "语言、缓存管理",
    href: "/h5/profile/settings",
  },
]

interface CertItem {
  id: number
  name: string
  expiry_date?: string | null
  status: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [workerId, setWorkerId] = useState<number | null>(null)
  const [faceDialogOpen, setFaceDialogOpen] = useState(false)
  const [faceResult, setFaceResult] = useState<"idle" | "success" | "fail">("idle")
  const [me, setMe] = useState<{ name?: string; work_no?: string; org_name?: string; mobile?: string; status?: string; id_card?: string; bank_card?: string } | null>(null)
  const [certificates, setCertificates] = useState<CertItem[]>([])

  useEffect(() => {
    apiWorker<{ id?: number; name?: string; work_no?: string; org_name?: string; mobile?: string; status?: string; id_card?: string; bank_card?: string }>("/api/worker/me")
      .then((res) => {
        setWorkerId(res.id ?? null)
        setMe(res)
      })
      .catch(() => setMe(null))
  }, [])

  useEffect(() => {
    apiWorker<{ list: CertItem[] }>("/api/worker/certificates")
      .then((res) => setCertificates(res.list || []))
      .catch(() => setCertificates([]))
  }, [])

  const handleFaceVerifyOpen = useCallback(() => {
    if (workerId == null) return
    setFaceDialogOpen(true)
  }, [workerId])

  const handleFaceVerifySuccess = useCallback(() => {
    setFaceResult("success")
    setFaceDialogOpen(false)
  }, [])

  const handleFaceVerifyCancel = useCallback(() => {
    setFaceDialogOpen(false)
  }, [])

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
  }, [])

  return (
    <PullRefresh onRefresh={handleRefresh} className="pb-24 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 px-4 pt-12 pb-20 text-primary-foreground">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">个人中心</h1>
          <Link href="/h5/profile/edit">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 active:scale-95 transition-transform">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-16">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-card">
                  <AvatarImage src="/placeholder-user.jpg" />
                  <AvatarFallback className="text-2xl">{me?.name ? me.name.slice(0, 1) : "工"}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{me?.name ?? "工人"}</h2>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {me?.status === "已实名" || me?.status === "已签约" || me?.status === "已进场" ? (me?.status ?? "已实名") : "预注册"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">工号: {me?.work_no ?? "—"}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {me?.org_name ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{me?.mobile ? me.mobile.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "—"}</span>
                {me?.mobile && <Badge variant="outline" className="ml-auto">已绑定</Badge>}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{me?.id_card ? me.id_card.slice(0, 6) + "********" + me.id_card.slice(-4) : "—"}</span>
                {me?.id_card && <Badge variant="outline" className="ml-auto">已认证</Badge>}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{me?.org_name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>上海市浦东新区张江高科技园区</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 人脸实名认证（占位流程） */}
      <div className="px-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                人脸实名认证
              </h3>
              {faceResult === "success" && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  已通过
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">活体检测与人脸采集，完成后可标记实名认证（需配置阿里云密钥后使用真实服务）</p>
            <Button
              variant="outline"
              className="w-full"
              disabled={workerId == null}
              onClick={handleFaceVerifyOpen}
            >
              开始人脸采集
            </Button>
            <Dialog open={faceDialogOpen} onOpenChange={setFaceDialogOpen}>
              <DialogContent className="max-w-sm mx-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle>人脸活体检测</DialogTitle>
                </DialogHeader>
                <FaceVerify
                  mode="living"
                  personId={workerId ?? undefined}
                  onSuccess={handleFaceVerifySuccess}
                  onCancel={handleFaceVerifyCancel}
                  onError={() => {}}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Certifications */}
      <div className="px-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                我的证书
              </h3>
              <Link href="/h5/profile/certificates" className="text-sm text-primary flex items-center">
                全部 <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">暂无证书记录</p>
              ) : (
                certificates.slice(0, 3).map((cert) => {
                  const isExpired = cert.expiry_date && new Date(cert.expiry_date) < new Date()
                  const isExpiring = cert.status === "expiring" || (cert.expiry_date && new Date(cert.expiry_date) < new Date(Date.now() + 90 * 86400000))
                  return (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{cert.name}</p>
                        <p className="text-xs text-muted-foreground">有效期至 {cert.expiry_date || "—"}</p>
                      </div>
                      <Badge
                        className={
                          isExpired ? "bg-gray-100 text-gray-700" : isExpiring ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                        }
                      >
                        {isExpired ? "已过期" : isExpiring ? "即将过期" : "有效"}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu List */}
      <div className="px-4 mt-4">
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 border-b border-border last:border-0 transition-all duration-150",
                  "active:bg-muted/50 active:scale-[0.99]"
                )}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.href === "/h5/profile/bank"
                      ? (me?.bank_card || "暂无绑定")
                      : item.href === "/h5/profile/certificates"
                        ? (certificates.length ? `${certificates.length}个证书` : "暂无证书")
                        : item.desc}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(item.href === "/h5/profile/certificates" ? certificates.length : item.badge) ? (
                    <Badge className="bg-primary text-primary-foreground">
                      {item.href === "/h5/profile/certificates" ? certificates.length : item.badge}
                    </Badge>
                  ) : null}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Notification Toggle */}
      <div className="px-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">推送通知</p>
                  <p className="text-xs text-muted-foreground">接收考勤、工资等提醒</p>
                </div>
              </div>
              <Switch
                checked={notificationEnabled}
                onCheckedChange={setNotificationEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout */}
      <div className="px-4 mt-4 mb-4">
        <Button 
          variant="outline" 
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-transform"
          onClick={() => {
            setWorkerToken(null)
            router.replace("/h5/login")
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </Button>
      </div>

      {/* Version */}
      <div className="text-center text-xs text-muted-foreground mb-4">
        版本 1.0.0
      </div>

      <BottomNav />
    </PullRefresh>
  )
}
