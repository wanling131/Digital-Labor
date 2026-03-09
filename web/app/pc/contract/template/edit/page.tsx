"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ContractEditor } from "@/components/ContractEditor"
import { api } from "@/lib/api"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"

interface Variable {
  id?: number
  name: string
  label: string
  type: string
  required: boolean
  options?: string[]
}

interface Template {
  id?: number
  name: string
  file_path?: string
  content: string
  variables: Variable[]
  is_visual: boolean
}

export default function TemplateEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const templateId = params.id

  const [template, setTemplate] = useState<Template>({
    name: "",
    content: "",
    variables: [],
    is_visual: true
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (templateId && templateId !== "new") {
      loadTemplate()
    } else {
      setLoading(false)
    }
  }, [templateId])

  async function loadTemplate() {
    setLoading(true)
    try {
      const data = await api<Template & { variables: Variable[] }>(`/api/contract/template/${templateId}`)
      setTemplate({
        id: data.id,
        name: data.name,
        file_path: data.file_path,
        content: data.content || "",
        variables: data.variables || [],
        is_visual: data.is_visual || false
      })
    } catch (error) {
      console.error("加载模板失败:", error)
      toast.error("加载模板失败")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!template.name) {
      toast.error("模板名称必填")
      return
    }

    setSaving(true)
    try {
      if (templateId === "new") {
        const data = await api<{ id: number }>("/api/contract/template", {
          method: "POST",
          body: template
        })
        toast.success("模板创建成功")
        router.push(`/pc/contract/template/edit/${data.id}`)
      } else {
        await api(`/api/contract/template/${templateId}`, {
          method: "PUT",
          body: template
        })
        toast.success("模板更新成功")
      }
    } catch (error) {
      console.error("保存模板失败:", error)
      toast.error("保存模板失败")
    } finally {
      setSaving(false)
    }
  }

  function handleAddVariable() {
    setTemplate({
      ...template,
      variables: [...template.variables, { name: "", label: "", type: "text", required: false }]
    })
  }

  function handleVariableChange(index: number, changes: Partial<Variable>) {
    const newVariables = [...template.variables]
    newVariables[index] = { ...newVariables[index], ...changes }
    setTemplate({ ...template, variables: newVariables })
  }

  function handleRemoveVariable(index: number) {
    const newVariables = template.variables.filter((_, i) => i !== index)
    setTemplate({ ...template, variables: newVariables })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", template.name || file.name)

      const data = await api<{ file_path: string }>("/api/contract/template/upload", {
        method: "POST",
        body: formData
      })

      setTemplate({
        ...template,
        file_path: data.file_path
      })
      toast.success("文件上传成功")
    } catch (error) {
      console.error("文件上传失败:", error)
      toast.error("文件上传失败")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {templateId === "new" ? "创建合同模板" : "编辑合同模板"}
        </h1>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => router.push("/pc/contract/template")}>
            返回列表
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>模板名称</Label>
            <Input
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="请输入模板名称"
            />
          </div>

          <div className="space-y-2">
            <Label>上传文件（可选）</Label>
            <div className="flex items-center space-x-4">
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <span className="text-sm text-muted-foreground">上传中...</span>}
            </div>
            {template.file_path && (
              <p className="text-sm text-muted-foreground mt-2">
                已上传文件: {template.file_path.split("/").pop()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>模板内容</CardTitle>
          <p className="text-sm text-muted-foreground">
            使用可视化编辑器创建模板，可通过工具栏插入变量
          </p>
        </CardHeader>
        <CardContent>
          <ContractEditor
            initialContent={template.content}
            variables={template.variables.map(v => ({ name: v.name, label: v.label }))}
            onContentChange={(content) => setTemplate({ ...template, content })}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>模板变量</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddVariable}>
              添加变量
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            定义模板中使用的变量，用于动态替换内容
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.variables.map((variable, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label>变量名</Label>
                <Input
                  value={variable.name}
                  onChange={(e) => handleVariableChange(index, { name: e.target.value })}
                  placeholder="如：name"
                />
              </div>
              <div>
                <Label>显示标签</Label>
                <Input
                  value={variable.label}
                  onChange={(e) => handleVariableChange(index, { label: e.target.value })}
                  placeholder="如：姓名"
                />
              </div>
              <div>
                <Label>变量类型</Label>
                <Select
                  value={variable.type}
                  onValueChange={(value) => handleVariableChange(index, { type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">文本</SelectItem>
                    <SelectItem value="number">数字</SelectItem>
                    <SelectItem value="date">日期</SelectItem>
                    <SelectItem value="select">下拉选择</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label>操作</Label>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveVariable(index)}
                  >
                    删除
                  </Button>
                  <div className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={variable.required}
                      onChange={(e) => handleVariableChange(index, { required: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">必填</span>
                  </div>
                </div>
              </div>
              {variable.type === "select" && (
                <div className="md:col-span-4">
                  <Label>选项（每行一个）</Label>
                  <Textarea
                    value={(variable.options || []).join("\n")}
                    onChange={(e) => handleVariableChange(index, { options: e.target.value.split("\n") })}
                    placeholder="请输入选项，每行一个"
                  />
                </div>
              )}
            </div>
          ))}
          {template.variables.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              暂无变量，点击&quot;添加变量&quot;按钮添加
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
