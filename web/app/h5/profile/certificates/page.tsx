"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/h5/page-header"
import { BottomNav } from "@/components/h5/bottom-nav"
import { Award } from "lucide-react"
import { getWorkerToken, apiWorker } from "@/lib/api"

interface CertItem {
  id: number
  name: string
  certificate_no?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  status: string
}

export default function ProfileCertificatesPage() {
  const router = useRouter()
  const [list, setList] = useState<CertItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadCertificates = useCallback(async () => {
    if (!getWorkerToken()) return
    try {
      const res = await apiWorker<{ list: CertItem[] }>("/api/worker/certificates")
      setList(res.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!getWorkerToken()) {
      router.replace("/h5/login")
      return
    }
    loadCertificates()
  }, [router, loadCertificates])

  return (
    <div className="pb-24 min-h-screen">
      <PageHeader title="我的证书" backHref="/h5/profile" />

      <div className="px-4 pt-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-sm">加载中...</p>
            </CardContent>
          </Card>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Award className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">暂无证书记录</p>
              <p className="text-xs mt-1">证书信息将在此展示</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {list.map((cert) => {
                  const isExpiring = cert.status === "expiring" || (cert.expiry_date && new Date(cert.expiry_date) < new Date(Date.now() + 90 * 86400000))
                  const isExpired = cert.expiry_date && new Date(cert.expiry_date) < new Date()
                  return (
                    <div key={cert.id} className="flex items-center justify-between px-4 py-4">
                      <div>
                        <p className="font-medium text-sm">{cert.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          有效期至 {cert.expiry_date || "—"}
                        </p>
                      </div>
                      <Badge
                        className={
                          isExpired
                            ? "bg-gray-100 text-gray-700"
                            : isExpiring
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                        }
                      >
                        {isExpired ? "已过期" : isExpiring ? "即将过期" : "有效"}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
