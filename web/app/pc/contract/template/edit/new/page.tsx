"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Save, Loader2, Plus, Trash2, Eye } from "lucide-react"
import { api } from "@/lib/api"

interface TemplateVariable {
  name: string
  label: string
  type: string
  options: string[]
  required: boolean
}

interface TemplateData {
  id?: number
  name: string
  content: string
  variables: TemplateVariable[]
}

export default function TemplateEditNewPage() {
  const [template, setTemplate] = useState<TemplateData>({
    name: "",
    content: "",
    variables: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleAddVariable = () => {
    setTemplate(prev => ({
      ...prev,
      variables: [...prev.variables, {
        name: `var${prev.variables.length + 1}`,
        label: `变量${prev.variables.length + 1}`,
        type: "text",
        options: [],
        required: false
      }]
    }))
  }

  const handleRemoveVariable = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }))
  }

  const handleVariableChange = (index: number, field: keyof TemplateVariable, value: any) => {
    setTemplate(prev => ({
      ...prev,
      variables: prev.variables.map((var_, i) => 
        i === index ? { ...var_, [field]: value } : var_
      )
    }))
  }

  const handleSave = async () => {
    if (!template.name.trim()) {
      setError("模板名称不能为空")
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // 调用API保存新模板
      const response = await api<TemplateData>("/api/contract/template", {
        method: "POST",
        body: template
      })
      setSuccess("模板创建成功")
      // 可以在这里添加重定向逻辑
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">创建模板</h1>
          <p className="text-muted-foreground">创建新的可视化合同模板</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          保存
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default">
          <AlertTitle>成功</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>设置模板的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">模板名称</Label>
            <Input
              id="template-name"
              value={template.name}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              placeholder="请输入模板名称"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-content">模板内容</Label>
            <Textarea
              id="template-content"
              value={template.content}
              onChange={(e) => setTemplate(prev => ({ ...prev, content: e.target.value }))}
              placeholder="请输入模板内容，使用{{变量名}}表示变量"
              rows={10}
            />
            <div className="text-xs text-muted-foreground">
              提示：使用 {`{{变量名}}`} 格式插入变量，例如 {`{{name}}`}、{`{{age}}`} 等
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>变量管理</CardTitle>
              <CardDescription>定义模板中使用的变量</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddVariable}>
              <Plus className="h-4 w-4 mr-1" />
              添加变量
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {template.variables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无变量，请点击上方按钮添加
            </div>
          ) : (
            <div className="space-y-4">
              {template.variables.map((variable, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">变量 {index + 1}</h4>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveVariable(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`var-name-${index}`}>变量名</Label>
                      <Input
                        id={`var-name-${index}`}
                        value={variable.name}
                        onChange={(e) => handleVariableChange(index, "name", e.target.value)}
                        placeholder="例如：name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`var-label-${index}`}>显示标签</Label>
                      <Input
                        id={`var-label-${index}`}
                        value={variable.label}
                        onChange={(e) => handleVariableChange(index, "label", e.target.value)}
                        placeholder="例如：姓名"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`var-type-${index}`}>变量类型</Label>
                      <select
                        id={`var-type-${index}`}
                        value={variable.type}
                        onChange={(e) => handleVariableChange(index, "type", e.target.value)}
                        className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      >
                        <option value="text">文本</option>
                        <option value="number">数字</option>
                        <option value="date">日期</option>
                        <option value="select">下拉选择</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={variable.required}
                          onChange={(e) => handleVariableChange(index, "required", e.target.checked)}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        必选
                      </Label>
                    </div>
                  </div>
                  {variable.type === "select" && (
                    <div className="space-y-2">
                      <Label>选项（每行一个）</Label>
                      <Textarea
                        value={variable.options.join("\n")}
                        onChange={(e) => handleVariableChange(index, "options", e.target.value.split("\n").filter(opt => opt.trim()))}
                        placeholder="请输入选项，每行一个"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>预览</CardTitle>
          <CardDescription>预览模板效果</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 min-h-[200px]">
            <h3 className="font-medium mb-2">{template.name || "模板名称"}</h3>
            <div className="text-sm text-muted-foreground">
              {template.content || "模板内容将在此显示"}
            </div>
            {template.variables.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm">变量列表：</h4>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((variable, index) => (
                    <Badge key={index} variant="outline">
                      {`{{${variable.name}}}`} - {variable.label}
                      {variable.required && <span className="ml-1 text-destructive">*</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}