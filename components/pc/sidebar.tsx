"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Users,
  FileText,
  Clock,
  CreditCard,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  FileSignature,
  FilePlus,
  FileCheck,
  Archive,
  CalendarDays,
  ClipboardList,
  Wallet,
  PieChart,
  LogOut,
  Monitor,
  UserCog,
  Building,
  Lock,
  ScrollText,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MenuItem {
  title: string
  icon: React.ElementType
  href?: string
  children?: {
    title: string
    href: string
    icon: React.ElementType
  }[]
}

const menuItems: MenuItem[] = [
  {
    title: "综合数据看板",
    icon: LayoutDashboard,
    href: "/pc/dashboard",
  },
  {
    title: "人员档案及实名中心",
    icon: Users,
    children: [
      { title: "人员档案", href: "/pc/personnel/archive", icon: UserCheck },
      { title: "认证管理", href: "/pc/personnel/certification", icon: ShieldCheck },
      { title: "状态管理", href: "/pc/personnel/status", icon: Users },
    ],
  },
  {
    title: "电子合同及签约中心",
    icon: FileText,
    children: [
      { title: "合同模板", href: "/pc/contract/template", icon: FileSignature },
      { title: "合同发起", href: "/pc/contract/initiate", icon: FilePlus },
      { title: "签约状态", href: "/pc/contract/status", icon: FileCheck },
      { title: "合同归档", href: "/pc/contract/archive", icon: Archive },
    ],
  },
  {
    title: "考勤与工时管理",
    icon: Clock,
    children: [
      { title: "考勤数据接入", href: "/pc/attendance/import", icon: CalendarDays },
      { title: "工时报表", href: "/pc/attendance/report", icon: ClipboardList },
    ],
  },
  {
    title: "智能结算中心",
    icon: CreditCard,
    children: [
      { title: "结算单生成与确认", href: "/pc/settlement/generate", icon: Wallet },
      { title: "薪资报表与成本分析", href: "/pc/settlement/analysis", icon: PieChart },
    ],
  },
  {
    title: "项目现场管理",
    icon: Building2,
    children: [
      { title: "离场登记", href: "/pc/site/departure", icon: LogOut },
      { title: "在岗人员实时看板", href: "/pc/site/realtime", icon: Monitor },
    ],
  },
  {
    title: "系统管理",
    icon: Settings,
    children: [
      { title: "用户管理", href: "/pc/system/users", icon: UserCog },
      { title: "组织管理", href: "/pc/system/organization", icon: Building },
      { title: "权限分配", href: "/pc/system/permissions", icon: Lock },
      { title: "操作日志", href: "/pc/system/logs", icon: ScrollText },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // 根据当前路径自动展开对应的菜单组
  const initialExpandedItems = useMemo(() => {
    const expanded: string[] = []
    menuItems.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        expanded.push(item.title)
      }
    })
    return expanded.length > 0 ? expanded : ["综合数据看板"]
  }, [pathname])
  
  const [expandedItems, setExpandedItems] = useState<string[]>(initialExpandedItems)
  
  // 路径变化时自动展开对应菜单
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        if (!expandedItems.includes(item.title)) {
          setExpandedItems((prev) => [...prev, item.title])
        }
      }
    })
  }, [pathname])

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    )
  }

  const isActive = (href: string) => pathname === href
  const isParentActive = (children?: MenuItem["children"]) =>
    children?.some((child) => pathname === child.href)

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground">劳务管理系统</h1>
            <p className="text-xs text-sidebar-foreground/60">智慧工地平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menuItems.map((item) => (
          <div key={item.title}>
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => toggleExpand(item.title)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isParentActive(item.children)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.title}</span>
                  {expandedItems.includes(item.title) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedItems.includes(item.title) && item.children && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive(child.href)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
