# XDCLUB 测试报告

日期：2026-08-30  
目标：Cloudflare Workers Static Assets / `https://xdclub.dpdns.org/`

## 当前结论

- 🟢 语法、Node/Worker、真实 Wrangler、系统 Chrome/Playwright、依赖高危审计和 Worker 打包检查均通过。
- 🟡 已知风险：现有 XD Custom 服务 URL 为 `http://custom.xdclub.dpdns.org/`。顶层链接通常可以完成导航，但会从 HTTPS 离开到未加密 HTTP；目标站流量不具备机密性或完整性，且可能触发浏览器或安全策略警告。服务支持后应改为 HTTPS。
- 🔴 本次自动回归和 7 个代表性视口的人工截图审阅未发现阻止交付的问题。

## 实际执行结果

| 命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过；锁文件未变更，未新增依赖。 |
| `pnpm run check:syntax` | 通过；3 个 JavaScript 文件均被 `node --check` 解析。 |
| `pnpm test` | 29/29 通过。 |
| `pnpm run test:wrangler` | 1/1 通过。 |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run test:browser` | 28/28 通过；未启用截图标志，未写入截图。 |
| `OC_REVIEW_SCREENSHOTS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run test:browser` | 28/28 通过；生成并人工审阅 28 张临时截图，随后删除。 |
| `pnpm audit --audit-level=high` | `No known vulnerabilities found`。 |
| `pnpm exec wrangler deploy --dry-run` | 通过；解析 Worker、静态资产和 `env.ASSETS` 绑定，未部署。 |

本次命令使用 Codex 捆绑 Node 24.19.0、pnpm 11.19.0、Wrangler 4.127.1 / workerd `2026-08-28` 和系统 Chrome `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。

## 响应式、资源与布局稳定性

浏览器回归覆盖以下 19 个视口：

`320x568`、`360x800`、`375x812`、`390x844`、`430x932`、`667x375`、`812x375`、`844x390`、`932x430`、`768x1024`、`820x1180`、`1024x768`、`1180x820`、`1280x720`、`1366x768`、`1440x900`、`1920x1080`、`2560x1080`、`2560x1440`。

每个视口自动验证：无水平溢出；首页、人物图层和 hero 布局的顶边一致且高度精确为一屏（短横屏为 `max(100svh, 430px)`，均允许 1 CSS px 边框误差）；服务区块保持至少一屏高；本地字体可用；OC 保持 2:3、`cover` 和 `62% 0%` 焦点；源图相对坐标 `55% x / 15% y` 的面部地标位于图层内且不进入移动文案矩形；页头不覆盖文案。

资源检查确认 `currentSrc` 始终同源且只选择 `oc-character-640.jpg` 或 `oc-character-1024.jpg`，窄竖屏选择 640px 文件；静态测试把两个交付资源分别限制在 150 KB 和 350 KB 以内。系统 Chrome 支持 Layout Instability API，实测初始组合累计布局偏移不超过保守上限 `0.05`。未设置依赖网络时序的 LCP 阈值。

## 人工视觉审阅

显式审计模式曾生成 28 张截图，覆盖 7 个代表性视口（`320x568`、`390x844`、`844x390`、`768x1024`、`1366x768`、`1920x1080`、`2560x1080`）的顶端/悬浮页头和深色/浅色主题。人工审阅确认这 7 个视口中人物脸部、发际、双眼、下巴和颈饰可见，比例与焦点正常；移动文案不遮挡面部地标；顶端页头在两种主题中可读；悬浮页头与服务文案分离；当前分区状态可辨认。截图审阅完成后已删除，不保留在仓库中。

上述人工结论只适用于这 7 个代表性视口；没有把它扩张为未经人工确认的全视口对比度结论。

## Lighthouse 与较窄审计范围

`command -v lighthouse` 未找到可执行 Lighthouse CLI，因此未安装新依赖，也没有生成或声称 Lighthouse 分数。现有检查不等同于 Lighthouse。

本次实际执行的较窄检查包括：Playwright 运行时错误收集、19 视口几何/溢出/裁切、响应式资源候选、静态资源大小、Layout Instability API 的 CLS 上限、键盘与无障碍名称、活动导航计算样式、主题切换、404/405、静态资源 MIME、安全响应头、受限 URL 协议和危险 DOM sink 扫描。

## 临时证据与清理

浏览器、Wrangler 和审计重建的 `work/`、`.wrangler/`、`test-results/`（含 28 张截图）、`playwright-report/`、报告、日志和缓存均在最终复验后删除。仅保留本计划的 `.superpowers/sdd/2026-08-30-xdclub-oc-redesign/` 元数据与 `node_modules/`，供复评使用；没有项目预览或 Worker 进程继续运行。
