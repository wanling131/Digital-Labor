"use client"

import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

interface Props {
  href?: string
}

export function HomeButton({ href = "/pc/dashboard" }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => {
        window.location.href = href
      }}
      className="text-muted-foreground hover:text-foreground"
      aria-label="返回首页"
    >
      <Home className="h-5 w-5" />
    </Button>
  )
}

