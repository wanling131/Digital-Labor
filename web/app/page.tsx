"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Monitor,
  Smartphone,
  Users,
  FileText,
  Clock,
  Wallet,
  BarChart3,
  Shield,
  ArrowRight,
  Building2,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "人员档案管理",
    description: "完整的工人信息管理，包括基础档案、证照认证、状态追踪",
  },
  {
    icon: FileText,
    title: "电子合同管理",
    description: "在线签署劳动合同，模板管理、批量签署、归档查询",
  },
  {
    icon: Clock,
    title: "智能考勤管理",
    description: "多方式打卡、工时统计、考勤报表、异常处理",
  },
  {
    icon: Wallet,
    title: "薪资结算系统",
    description: "自动计算工资、结算单生成、多维度薪资分析",
  },
  {
    icon: BarChart3,
    title: "数据分析看板",
    description: "实时数据统计、多维度报表、可视化图表展示",
  },
  {
    icon: Shield,
    title: "安全权限管理",
    description: "角色权限配置、操作日志审计、数据安全保障",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-14 w-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Building2 className="h-8 w-8" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">建筑工人劳务管理系统</h1>
            </div>
            <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto mb-10 text-balance">
              专业的建筑劳务管理解决方案，涵盖人员档案、电子合同、考勤管理、智能结算等核心功能，助力企业高效管理
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pc/dashboard">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Monitor className="h-5 w-5" />
                  进入PC管理端
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/h5">
                <Button size="lg" className="gap-2 w-full sm:w-auto bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/30">
                  <Smartphone className="h-5 w-5" />
                  进入移动端
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Selection */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">PC管理端</CardTitle>
              <CardDescription>
                面向管理人员的Web管理后台，提供完整的人员、合同、考勤、结算等管理功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  综合数据看板与实时统计
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  人员档案全生命周期管理
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  电子合同在线签署与归档
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  考勤数据接入与智能分析
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  薪资自动计算与报表生成
                </li>
              </ul>
              <Link href="/pc/dashboard">
                <Button className="w-full gap-2">
                  进入管理端
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Smartphone className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-xl">微信H5移动端</CardTitle>
              <CardDescription>
                面向建筑工人的移动端应用，支持考勤打卡、合同签署、工资查询等自助服务
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  人脸识别/GPS定位打卡
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  电子合同在线签署确认
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  工资明细查询与下载
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  个人档案信息维护
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                  消息通知实时推送
                </li>
              </ul>
              <Link href="/h5">
                <Button variant="outline" className="w-full gap-2">
                  进入移动端
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-balance">核心功能模块</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            系统涵盖建筑劳务管理的全流程，从人员入职到薪资结算，实现数字化、规范化管理
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">建筑工人劳务管理系统</span>
            </div>
            <p className="text-sm text-muted-foreground">
              专业的建筑劳务数字化解决方案
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
