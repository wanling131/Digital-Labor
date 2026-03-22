# 浏览器自动化测试（E2E）

本目录包含 Playwright 配置（`playwright.config.cjs`）；用例分布在 `tests/frontend/e2e/*.spec.ts` 与 `tests/frontend/e2e.test.js`。

## 端口说明

- **开发**：`web` 下 `npm run dev` 使用 **http://localhost:3002**（与 `next start -p 3001` 区分）。
- 本配置中 `baseURL` / `webServer.url` 已与 **3002** 对齐。

## 运行方式

1. **先启动后端**（另开终端）：
   ```bash
   cd server && python -m digital_labor.run
   ```

2. **任选一种**：

   **在仓库根目录**（推荐）：
   ```bash
   npm run test:e2e
   ```

   **在 `web` 目录**：
   ```bash
   npm run e2e          # 无头模式
   npm run e2e:headed   # 有界面模式
   ```

前端会在运行测试时由 Playwright 在 `web` 目录下执行 `npm run dev` 自动启动（若 3002 已有服务则复用，见 `reuseExistingServer`）。
