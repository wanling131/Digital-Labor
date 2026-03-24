# 发布文档更新流程

发布新版本后，更新相关文档。

## 更新检查清单

### CHANGELOG.md
按 [Keep a Changelog](https://keepachangelog.com/) 格式：

- Added（新增）
- Changed（变更）
- Fixed（修复）
- Security（安全）
- Deprecated（废弃）
- Removed（移除）

### README.md
- [ ] 功能描述是否准确
- [ ] 依赖版本是否更新
- [ ] 环境变量是否新增
- [ ] 最近更新章节

### 其他文档
- [ ] docs/API.md（如有API变更）
- [ ] docs/部署说明.md（如有部署变更）
- [ ] Schema 文件（如有数据库变更）

---

## 执行步骤

1. 收集变更（查看自上次发布以来的提交）
2. 分类整理（按 Added/Changed/Fixed 分类）
3. 更新 CHANGELOG
4. 检查 README 和其他文档
5. 验证文档链接

---

请提供版本号和主要变更内容。
