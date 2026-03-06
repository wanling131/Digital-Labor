"use client"

import { useState, useCallback } from "react"
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
import Link from "next/link"
import { cn } from "@/lib/utils"

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

const certifications = [
  { name: "特种作业操作证", status: "valid", expiry: "2025-06-30" },
  { name: "建筑施工安全证", status: "valid", expiry: "2024-12-31" },
  { name: "高空作业证", status: "expiring", expiry: "2024-04-15" },
]

export default function ProfilePage() {
  const [notificationEnabled, setNotificationEnabled] = useState(true)

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
                  <AvatarFallback className="text-2xl">张</AvatarFallback>
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
                  <h2 className="text-xl font-bold">张建国</h2>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    已实名
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">工号: HQ20240315</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    木工
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    入职 2024.01
                  </span>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>138****8888</span>
                <Badge variant="outline" className="ml-auto">已绑定</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>320123********1234</span>
                <Badge variant="outline" className="ml-auto">已认证</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>华东分公司 - 上海项目部</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>上海市浦东新区张江高科技园区</span>
              </div>
            </div>
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
              {certifications.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">有效期至 {cert.expiry}</p>
                  </div>
                  <Badge
                    className={
                      cert.status === "valid"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }
                  >
                    {cert.status === "valid" ? "有效" : "即将过期"}
                  </Badge>
                </div>
              ))}
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
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge className="bg-primary text-primary-foreground">{item.badge}</Badge>
                  )}
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
