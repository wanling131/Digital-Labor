"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { useMemo } from "react"

const pathNameMap: Record<string, string> = {
  pc: "管理中心",
  dashboard: "综合数据看板",
  personnel: "人员档案及实名中心",
  archive: "人员档案",
  certification: "认证管理",
  status: "状态管理",
  contract: "电子合同及签约中心",
  template: "合同模板",
  initiate: "合同发起",
  attendance: "考勤与工时管理",
  import: "考勤数据接入",
  log: "打卡日志",
  report: "工时报表",
  settlement: "智能结算中心",
  generate: "结算单生成与确认",
  analysis: "薪资报表与成本分析",
  site: "项目现场管理",
  departure: "离场登记",
  realtime: "在岗人员实时看板",
  monitor: "现场监管",
  system: "系统管理",
  users: "用户管理",
  organization: "组织管理",
  permissions: "权限分配",
  roles: "角色权限",
  logs: "操作日志",
}

// 这些 /pc 下的父级路径没有单独页面，只是分组节点
const PARENT_ONLY_PATHS = new Set([
  "/pc/personnel",
  "/pc/contract",
  "/pc/attendance",
  "/pc/settlement",
  "/pc/site",
  "/pc/system",
])

export function Breadcrumb() {
  const pathname = usePathname()

  const breadcrumbs = useMemo(() => {
    const paths = pathname.split("/").filter(Boolean)
    return paths.map((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/")
      const name = pathNameMap[path] || path
      const isLast = index === paths.length - 1
      const isParentOnly = PARENT_ONLY_PATHS.has(href)
      return { href, name, isLast, isParentOnly }
    })
  }, [pathname])

  if (breadcrumbs.length <= 1) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/pc/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.slice(1).map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {crumb.isLast || crumb.isParentOnly ? (
            <span className={crumb.isLast ? "text-foreground font-medium" : ""}>{crumb.name}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
