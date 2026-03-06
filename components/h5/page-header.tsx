"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  backHref?: string
  transparent?: boolean
  rightAction?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  backHref = "/h5",
  transparent = false,
  rightAction,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-40 px-4 pt-12 pb-4",
        transparent
          ? "bg-primary text-primary-foreground"
          : "bg-card border-b border-border",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={backHref}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full",
                transparent
                  ? "text-primary-foreground hover:bg-primary-foreground/10"
                  : "hover:bg-muted"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </div>
  )
}
