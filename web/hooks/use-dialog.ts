/**
 * 通用对话框状态管理 Hook
 */
import { useState, useCallback } from "react"

interface UseDialogReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useDialog(initialOpen = false): UseDialogReturn {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle }
}


interface UseDialogWithDataReturn<T> extends UseDialogReturn {
  data: T | null
  setData: (data: T | null) => void
  openWithData: (data: T) => void
}

export function useDialogWithData<T>(initialOpen = false): UseDialogWithDataReturn<T> {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [data, setData] = useState<T | null>(null)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const openWithData = useCallback((data: T) => {
    setData(data)
    setIsOpen(true)
  }, [])

  return { isOpen, open, close, toggle, data, setData, openWithData }
}
