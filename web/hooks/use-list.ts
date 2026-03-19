/**
 * 通用数据列表 Hook
 * 用于处理分页、搜索、筛选等通用逻辑
 */
import { useState, useEffect, useCallback } from "react"

interface UseListOptions<T> {
  fetchFn: (params: { page: number; pageSize: number; keyword?: string }) => Promise<{ list: T[]; total: number }>
  pageSize?: number
}

interface UseListReturn<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  keyword: string
  setKeyword: (keyword: string) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  refresh: () => void
}

export function useList<T>(options: UseListOptions<T>): UseListReturn<T> {
  const { fetchFn, pageSize: initialPageSize = 10 } = options

  const [list, setList] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchFn({ page, pageSize, keyword })
      setList(result.list || [])
      setTotal(result.total || 0)
    } catch (error) {
      console.error("获取列表失败:", error)
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, page, pageSize, keyword])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    list,
    total,
    page,
    pageSize,
    loading,
    keyword,
    setKeyword,
    setPage,
    setPageSize,
    refresh,
  }
}
