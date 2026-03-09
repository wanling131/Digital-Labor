# 四项功能点自动化测试文档

## 概述

本文档描述了针对数字劳务系统四项新增功能点的自动化测试套件，包括API测试和端到端（E2E）测试。

### 测试覆盖的功能点

1. **权限分配页：按钮权限配置功能**
   - 在权限分配页面支持按角色勾选「按钮级权限」，与现有菜单权限并列
   - 数据范围改为说明文案（已实现按组织过滤）

2. **认证管理页：人脸认证状态展示**
   - 在认证管理页面显示已人脸认证人数及在列表中可区分「已人脸/未人脸」
   - GET /api/person/auth 返回 face_verified 和 face_verified_at 字段

3. **人员证书在PC端的增删改功能**
   - 在人员档案编辑或详情中，支持对该人员的证书进行新增、编辑、删除
   - 包含数据范围校验：业务员只能操作本组织及下级人员

4. **权限分配页数据范围说明**
   - 明确数据范围逻辑并体现在页面上
   - 业务员（user）仅能查看/操作其所属组织及下级组织的数据；管理员可查看全部

## 测试文件结构

```
server/test/
├── api.test.mjs             # 主 API 自动化测试（健康、登录、组织、人员、权限、证书等，26 用例）
├── features.test.mjs        # 四项功能点的 API 测试（权限、认证、证书、数据范围）
├── e2e.test.js              # Playwright E2E（需单独运行 npm run test:e2e）
├── generate-report.js       # 测试报告生成脚本
├── run-tests.js             # 交互式测试菜单
└── README.md                # 本文档
```

## 环境要求

### 基础环境
- Node.js >= 18.0.0
- npm >= 9.0.0

### 依赖包
```bash
npm install --save-dev @playwright/test supertest
```

### 浏览器要求
- Microsoft Edge（用于E2E测试）
- Chromium（可选）
- Firefox（可选）
- WebKit（可选）

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 启动测试环境

#### 启动后端服务
```bash
cd server
npm run dev
```
后端服务将在 http://localhost:3000 启动

#### 启动前端服务（用于E2E测试）
```bash
cd web
npm run dev
```
前端服务将在 http://localhost:3001 启动

### 3. 运行测试

#### 运行 API 测试（默认：api + features）
```bash
cd server
npm test
```
即执行 `node --test test/api.test.mjs test/features.test.mjs`，共 26 个 api 用例 + 功能点用例。

#### 仅运行主 API 测试（api.test.mjs，26 用例）
```bash
cd server
npm run test:api
```

#### 运行四项功能点的 API 测试
```bash
cd server
npm run test:features
```

#### 运行E2E测试（Edge浏览器）
```bash
cd server
npm run test:e2e
```

#### 运行E2E测试（有界面模式）
```bash
cd server
npm run test:e2e:headed
```

#### 运行E2E测试（调试模式）
```bash
cd server
npm run test:e2e:debug
```

#### 运行所有测试
```bash
cd server
npm run test:all
```

### 4. 生成测试报告

```bash
cd server/test
node generate-report.js
```

报告将生成在 `server/test/test-results/test-report.html`

## 测试用例说明

### 功能点1：权限分配页 - 按钮权限配置

#### API测试（7个用例）
1. `GET /api/sys/all-permissions 返回权限分组` - 验证权限分组结构
2. `GET /api/sys/role/:code/permissions 返回角色按钮权限` - 验证角色权限查询
3. `PUT /api/sys/role/:code/permissions 保存角色按钮权限` - 验证权限保存
4. `PUT /api/sys/role/:code/permissions 验证无效权限过滤` - 验证权限过滤
5. `PUT /api/sys/role/:code/permissions 验证空keys参数` - 验证空参数处理
6. `PUT /api/sys/role/:code/permissions 验证非数组参数` - 验证参数校验
7. `GET /api/sys/my-permissions 返回当前用户权限` - 验证用户权限查询

#### E2E测试（8个用例）
1. 访问权限分配页面
2. 查看按钮权限配置区域
3. 选择角色并加载按钮权限
4. 勾选按钮权限
5. 全选按钮权限
6. 取消全选按钮权限
7. 保存按钮权限配置
8. 查看数据范围说明

### 功能点2：认证管理页 - 人脸认证状态展示

#### API测试（6个用例）
1. `GET /api/person/auth 返回face_verified字段` - 验证人脸认证字段
2. `GET /api/person/auth 支持filled参数筛选` - 验证筛选功能
3. `GET /api/person/auth 支持keyword搜索` - 验证搜索功能
4. `PUT /api/person/:id/auth-review 更新审核状态` - 验证审核状态更新
5. `PUT /api/person/:id/auth-review 验证无效状态` - 验证状态校验
6. `POST /api/person/face-verify 更新face_verified状态` - 验证人脸认证

#### E2E测试（7个用例）
1. 访问认证管理页面
2. 查看人脸采集统计卡片
3. 查看认证记录列表
4. 查看人脸认证状态徽章
5. 查看人员详情中的人脸认证信息
6. 按已补全状态筛选
7. 搜索人员

### 功能点3：人员证书在PC端的增删改功能

#### API测试（9个用例）
1. `GET /api/person/archive/:id/certificates 返回证书列表` - 验证证书列表查询
2. `POST /api/person/archive/:id/certificates 添加证书` - 验证证书添加
3. `POST /api/person/archive/:id/certificates 验证必填字段` - 验证必填字段校验
4. `PUT /api/person/archive/:id/certificates/:certId 更新证书` - 验证证书更新
5. `PUT /api/person/archive/:id/certificates/:certId 部分更新` - 验证部分更新
6. `DELETE /api/person/archive/:id/certificates/:certId 删除证书` - 验证证书删除
7. `证书操作数据范围校验：业务员只能操作本组织人员` - 验证权限控制
8. `证书操作验证人员不存在` - 验证错误处理
9. `证书操作验证证书不存在` - 验证错误处理

#### E2E测试（7个用例）
1. 访问人员档案页面
2. 编辑人员并查看证书管理区域
3. 添加新证书
4. 编辑证书
5. 删除证书
6. 取消编辑证书
7. 验证证书必填字段

### 功能点4：权限分配页数据范围说明

#### API测试（6个用例）
1. `GET /api/sys/role 返回角色列表` - 验证角色列表
2. `GET /api/sys/my-permissions 返回org_id` - 验证组织ID返回
3. `GET /api/person/archive 业务员只能看到本组织及下级人员` - 验证数据范围
4. `GET /api/sys/org 返回组织树` - 验证组织树结构
5. `GET /api/sys/my-menu 返回菜单权限` - 验证菜单权限
6. `PUT /api/sys/role/:code/menus 保存菜单权限` - 验证菜单权限保存

#### E2E测试（3个用例）
1. 查看数据范围说明文案
2. 验证说明文案位置
3. 验证角色卡片描述

### 综合测试（2个用例）
1. 完整流程：创建人员 -> 添加证书 -> 人脸认证 -> 权限验证
2. 权限隔离：业务员无法操作其他组织数据

## 测试报告

测试执行完成后，可以生成详细的HTML测试报告：

```bash
node server/test/generate-report.js
```

报告包含：
- 测试概览（总测试数、通过、失败、跳过、通过率、总耗时）
- 各功能点的详细测试结果
- 每个测试用例的执行状态和耗时
- API测试和E2E测试的分类展示

## 测试配置

### Playwright配置（playwright.config.js）

```javascript
export default defineConfig({
  testDir: './test',
  baseURL: 'http://localhost:3001',
  headless: true,
  viewport: { width: 1280, height: 720 },
  projects: [
    {
      name: 'Microsoft Edge',
      use: { channel: 'msedge' }
    }
  ]
});
```

### 测试超时设置
- API测试：默认超时 5000ms
- E2E测试：操作超时 10000ms，导航超时 30000ms

## 错误处理

### 常见错误及解决方案

1. **端口被占用**
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   解决方案：停止占用端口的进程或修改配置中的端口号

2. **数据库连接失败**
   ```
   Error: SQLITE_CANTOPEN: unable to open database file
   ```
   解决方案：确保数据库文件存在且有读写权限

3. **浏览器未安装**
   ```
   Error: Executable doesn't exist at /path/to/msedge
   ```
   解决方案：安装Microsoft Edge浏览器或使用其他浏览器

4. **测试超时**
   ```
   Error: Test timeout of 5000ms exceeded
   ```
   解决方案：增加测试超时时间或检查网络连接

## 持续集成（CI）

### GitHub Actions示例

```yaml
name: 功能点测试

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run API tests
        run: npm run test:features
      - name: Install Playwright
        run: npx playwright install --with-deps msedge
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## 测试最佳实践

1. **测试隔离**：每个测试用例应该独立运行，不依赖其他测试的状态
2. **数据清理**：测试完成后清理创建的测试数据
3. **断言清晰**：使用有意义的断言消息，便于调试
4. **等待策略**：使用显式等待而非固定延迟
5. **错误日志**：记录详细的错误信息，便于问题定位
6. **测试覆盖率**：确保所有API接口和前端功能都有对应的测试用例

## 维护指南

### 添加新测试用例

1. 在 `features.test.js` 中添加API测试
2. 在 `e2e.test.js` 中添加E2E测试
3. 更新 `generate-report.js` 中的测试数据
4. 运行测试验证新用例

### 更新测试报告模板

修改 `generate-report.js` 中的HTML模板和样式

## 联系方式

如有问题或建议，请联系开发团队。

---

**最后更新时间**: 2024年
**版本**: 1.0.0
