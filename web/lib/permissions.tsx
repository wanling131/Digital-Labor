"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { api } from "@/lib/api"

interface PermissionsContextValue {
  permissions: string[]
  orgId: number | null
  role: string
  loading: boolean
  hasPermission: (key: string) => boolean
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([])
  const [orgId, setOrgId] = useState<number | null>(null)
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await api<{ permissions: string[]; org_id?: number; role?: string }>("/api/sys/my-permissions")
      setPermissions(res.permissions || [])
      setOrgId(res.org_id != null ? Number(res.org_id) : null)
      setRole(res.role || "")
    } catch {
      setPermissions([])
      setOrgId(null)
      setRole("")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const hasPermission = (key: string) => {
    if (role === "admin") return true
    return permissions.includes(key)
  }

  return (
    <PermissionsContext.Provider value={{ permissions, orgId, role, loading, hasPermission, refresh }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  return ctx ?? {
    permissions: [] as string[],
    orgId: null as number | null,
    role: "",
    loading: false,
    hasPermission: () => true,
    refresh: async () => {},
  }
}
