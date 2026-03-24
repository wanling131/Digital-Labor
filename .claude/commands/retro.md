# 周度回顾分析

分析过去一周的提交记录和代码质量趋势。

## 分析内容

### 一、提交统计
- 总提交数
- 代码行数变更
- 提交类型分布（feat/fix/docs/refactor/test）

### 二、代码质量趋势
- 测试覆盖率变化
- TypeScript 编译状态
- ESLint 检查状态

### 三、功能完成情况
- 本周完成
- 进行中
- 下周计划

### 四、问题与风险
- 遇到的问题
- 潜在风险

### 五、流程改进建议
- 做得好的
- 需要改进的
- 下周行动项

---

## 执行命令

```bash
# 最近一周提交
git log --since="1 week ago" --oneline --stat

# 按类型统计
git log --since="1 week ago" --pretty=format:"%s" | grep -E "^(feat|fix|docs|refactor|test)" | cut -d: -f1 | sort | uniq -c
```

---

请指定分析的时间范围。
