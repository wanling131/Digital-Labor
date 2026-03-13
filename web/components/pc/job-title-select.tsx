"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "@/lib/api"

interface JobTitleSelectProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
}

export function JobTitleSelect({
  value = "",
  onChange,
  placeholder = "选择工种",
  multiple = false,
  disabled = false,
  className,
}: JobTitleSelectProps) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api<{ list?: unknown[]; flat?: string[] }>("/api/person/job-titles", { query: { flat: "1" } })
      .then((res) => {
        if (cancelled) return
        const flat = res.flat ?? (Array.isArray(res.list) ? res.list.filter((x): x is string => typeof x === "string") : [])
        setOptions(flat)
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const displayValue = value || (multiple ? "" : placeholder)
  const displayOptions = value && value.trim() && !options.includes(value) ? [value, ...options] : options

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索工种..." />
          <CommandList>
            <CommandEmpty>未找到工种</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value=""
                onSelect={() => {
                  onChange?.("")
                  if (!multiple) setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                清空
              </CommandItem>
              {displayOptions.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange?.(opt)
                    if (!multiple) setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
