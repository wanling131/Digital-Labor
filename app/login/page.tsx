"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Lock, User, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!username || !password) {
      setError("请输入用户名和密码")
      return
    }

    setLoading(true)
    // 模拟登陆请求
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    
    // 登陆成功，跳转到管理端首页
    router.push("/pc/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-primary-foreground">建筑劳务管理</h1>
          </div>
          <p className="text-primary-foreground/70">PC管理端登陆</p>
        </div>

        {/* 登陆卡片 */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">管理员登陆</CardTitle>
            <CardDescription>
              输入用户名和密码以访问管理系统
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* 用户名 */}
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* 密码 */}
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 记住我和忘记密码 */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="remember" className="font-normal cursor-pointer">
                    记住我
                  </Label>
                </div>
                <Link href="#" className="text-primary hover:underline">
                  忘记密码?
                </Link>
              </div>

              {/* 登陆按钮 */}
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    登陆中...
                  </>
                ) : (
                  <>
                    进入系统
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* 演示账号 */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  演示账号
                </p>
                <div className="space-y-1 text-xs text-muted-foreground text-center">
                  <p>用户名: admin</p>
                  <p>密码: 123456</p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 返回首页 */}
        <div className="text-center mt-6">
          <Link href="/">
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
