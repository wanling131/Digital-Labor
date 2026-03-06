"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Clock, FileText, Wallet, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/h5", icon: Home, label: "首页" },
  { href: "/h5/attendance", icon: Clock, label: "考勤" },
  { href: "/h5/contract", icon: FileText, label: "合同" },
  { href: "/h5/salary", icon: Wallet, label: "工资" },
  { href: "/h5/profile", icon: User, label: "我的" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border max-w-md mx-auto z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/h5" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:text-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-xs transition-all duration-200",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      {/* iOS safe area padding */}
      <div className="h-[env(safe-area-inset-bottom)] bg-card/95 backdrop-blur-md" />
    </nav>
  )
}
