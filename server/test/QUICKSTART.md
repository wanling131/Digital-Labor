# 四项功能点测试快速执行指南

## 一、环境准备

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 启动服务

**启动后端服务（必须）**
```bash
cd server
npm run dev
```
后端将在 http://localhost:3000 启动

**启动前端服务（E2E测试需要）**
```bash
cd web
npm run dev
```
前端将在 http://localhost:3001 启动

## 二、执行测试

### 方式1：使用npm脚本（推荐）

```bash
cd server

# 运行四项功能点的API测试
npm run test:features

# 运行E2E测试（Edge浏览器，无头模式）
npm run test:e2e

# 运行E2E测试（有界面模式，可以看到浏览器操作）
npm run test:e2e:headed

# 运行E2E测试（UI模式，交互式测试界面）
npm run test:e2e:ui

# 运行所有测试（API + E2E）
npm run test:all

# 生成测试报告
npm run test:report
```

### 方式2：使用测试运行脚本

```bash
cd server

# 交互式菜单
node test/run-tests.js

# 或直接指定命令
node test/run-tests.js 1    # API测试
node test/run-tests.js 2    # E2E测试
node test/run-tests.js 3    # 所有测试
node test/run-tests.js 4    # 生成报告
node test/run-tests.js 5    # 检查环境
```

### 方式3：直接运行测试文件

```bash
cd server

# API测试
node --test test/features.test.js

# E2E测试
npx playwright test

# 生成报告
node test/generate-report.js
```

## 三、测试结果查看

### 1. 命令行输出

测试执行时会实时显示：
- ✓ 通过的测试
- ✗ 失败的测试
- ○ 跳过的测试
- 每个测试的执行时间

### 2. HTML报告

执行 `npm run test:report` 后，打开以下文件查看详细报告：

```
server/test/test-results/test-report.html
```

报告包含：
- 测试概览统计
- 各功能点的详细结果
- 每个测试用例的执行状态
- 可视化的测试覆盖率

### 3. Playwright报告

E2E测试完成后，查看以下文件：

```
server/test-results/html-report/index.html
```

提供：
- 测试执行时间线
- 截图和视频（失败时）
- 详细的错误堆栈

## 四、测试用例覆盖

### 功能点1：权限分配页 - 按钮权限配置
- **API测试**: 7个用例
- **E2E测试**: 8个用例
- **覆盖**: 权限分组、角色权限查询、权限保存、参数校验、数据范围说明

### 功能点2：认证管理页 - 人脸认证状态展示
- **API测试**: 6个用例
- **E2E测试**: 7个用例
- **覆盖**: face_verified字段、筛选、搜索、审核状态、人脸认证

### 功能点3：人员证书在PC端的增删改功能
- **API测试**: 9个用例
- **E2E测试**: 7个用例
- **覆盖**: 证书增删改、必填字段、部分更新、数据范围校验、错误处理

### 功能点4：权限分配页数据范围说明
- **API测试**: 6个用例
- **E2E测试**: 3个用例
- **覆盖**: 角色列表、组织ID、数据范围、组织树、菜单权限

### 综合测试
- **测试**: 2个用例
- **覆盖**: 完整流程、权限隔离

## 五、常见问题

### Q1: 端口被占用怎么办？
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

# 或修改配置文件中的端口号
```

### Q2: 数据库初始化失败？
```bash
cd server
npm run seed
```

### Q3: E2E测试找不到浏览器？
```bash
# 安装Playwright浏览器
npx playwright install msedge

# 或使用其他浏览器
npx playwright install chromium
```

### Q4: 测试超时怎么办？
检查网络连接和服务器响应速度，或增加测试超时时间：
```javascript
// playwright.config.js
use: {
  actionTimeout: 20000,  // 增加到20秒
  navigationTimeout: 60000  // 增加到60秒
}
```

### Q5: 如何只运行特定测试？
```bash
# API测试：修改test文件，注释掉不需要的测试
# E2E测试：使用test.only
test.only('特定测试', async ({ page }) => {
  // 测试代码
})
```

## 六、CI/CD集成

### GitHub Actions示例

```yaml
name: 四项功能点测试

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: windows-latest
    
    steps:
    - name: 检出代码
      uses: actions/checkout@v3
      
    - name: 设置Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: 安装依赖
      run: npm ci
      
    - name: 初始化数据库
      run: npm run seed
      
    - name: 运行API测试
      run: npm run test:features
      
    - name: 安装Playwright浏览器
      run: npx playwright install --with-deps msedge
      
    - name: 运行E2E测试
      run: npm run test:e2e
      
    - name: 生成测试报告
      if: always()
      run: npm run test:report
      
    - name: 上传测试报告
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-report
        path: server/test/test-results/
        retention-days: 30
```

## 七、测试最佳实践

1. **测试隔离**: 每个测试独立运行，不依赖其他测试状态
2. **数据清理**: 测试完成后清理创建的测试数据
3. **显式等待**: 使用waitForSelector而非固定延迟
4. **错误日志**: 记录详细的错误信息便于调试
5. **断言清晰**: 使用有意义的断言消息
6. **定期更新**: 功能变更时及时更新测试用例

## 八、联系支持

如遇到问题，请查看：
- 测试文档: `server/test/README.md`
- API文档: `server/docs/API.md`
- 项目文档: 项目根目录README.md

---

**最后更新**: 2024年
**测试框架**: Node.js Test + Playwright
**目标浏览器**: Microsoft Edge
