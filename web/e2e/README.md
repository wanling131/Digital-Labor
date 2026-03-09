# 浏览器自动化测试（E2E）

本目录包含 Playwright 端到端测试的配置与用例。

## 目录说明

- `playwright.config.ts` — Playwright 配置（Edge、前端地址、自动启动 Next）
- `*.spec.ts` — 测试用例（首页、PC 登录、H5 工人端）

## 运行方式

1. **先启动后端**（另开终端）：
   ```bash
   cd server && npm start
   ```

2. **在 web 目录执行**：
   ```bash
   npm run e2e          # 无头模式
   npm run e2e:headed   # 有界面模式
   ```

前端会在运行测试时由 Playwright 自动启动，无需手动 `npm run dev`。
