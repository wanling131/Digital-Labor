"use client"

import { useState, useRef, useCallback, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PullRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  className?: string
}

export function PullRefresh({ children, onRefresh, className }: PullRefreshProps) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const pullThreshold = 60

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return
    
    const currentY = e.touches[0].clientY
    const distance = Math.max(0, (currentY - startYRef.current) * 0.5)
    
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault()
      setPullDistance(Math.min(distance, pullThreshold * 1.5))
    }
  }, [pulling, refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= pullThreshold && !refreshing) {
      setRefreshing(true)
      setPullDistance(pullThreshold)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
    setPulling(false)
  }, [pullDistance, refreshing, onRefresh])

  return (
    <div
      ref={containerRef}
      className={cn("relative flex-1 min-h-0 overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-200",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ top: pullDistance - 40 }}
      >
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full bg-card shadow-md text-sm",
          refreshing && "animate-pulse"
        )}>
          <Loader2 className={cn(
            "h-4 w-4",
            refreshing ? "animate-spin" : "",
            pullDistance >= pullThreshold && !refreshing ? "text-primary" : "text-muted-foreground"
          )} />
          <span className="text-muted-foreground">
            {refreshing 
              ? "刷新中..." 
              : pullDistance >= pullThreshold 
                ? "释放刷新" 
                : "下拉刷新"}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
