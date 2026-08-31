# XDCLUB 测试报告

日期：2026-08-31

目标：Cloudflare Workers Static Assets / `https://xdclub.dpdns.org/`

## 红绿灯结论

- 🟢 语法、Node/Worker、真实 Wrangler、系统 Chrome/Playwright、依赖高危审计、Worker dry-run、Git 完整性和资源来源检查均通过。
- 🟢 远端 `main` 的自定义品牌、首页文案、XD Proxy、OOPZ 与 404 文案已原样迁移到最新配置结构；两个服务入口均为 HTTPS。
- 🔴 未发现阻止交付的错误、恶意代码、危险 DOM sink、硬编码密钥、远程脚本、水平溢出或已知高危依赖漏洞。

## 最终实际执行结果

| 命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过；锁文件未变更，未新增依赖。 |
| `pnpm run check:syntax` | 通过；`src/worker.js`、`public/theme-init.js`、`public/app.js` 均通过 `node --check`。 |
| `pnpm test` | 36/36 通过。 |
| `pnpm run test:wrangler` | 1/1 通过。 |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run test:browser` | 35/35 通过；未启用截图标志。 |
| `OC_REVIEW_SCREENSHOTS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run test:browser` | 35/35 通过；重新生成并审阅 28 张临时截图。 |
| `pnpm audit --audit-level=high` | `No known vulnerabilities found`。 |
| `pnpm exec wrangler deploy --dry-run` | 通过；Wrangler 读取 22 个静态资产条目并识别 `env.ASSETS`，未部署。 |
| `git diff --check` / `git fsck --full --no-dangling` | 通过。 |

本次命令使用 Codex 捆绑 Node 24.19.0、pnpm 11.19.0、Wrangler 4.127.1、`compatibility_date` `2026-08-28` 和系统 Chrome 151.0.7922.174。Wrangler 的版本查询与 dry-run 使用项目内日志路径，避免把沙箱外日志目录权限告警误判为 Worker 错误。

## 响应式、交互和内容验证

浏览器回归覆盖以下 19 个视口：

`320x568`、`360x800`、`375x812`、`390x844`、`430x932`、`667x375`、`812x375`、`844x390`、`932x430`、`768x1024`、`820x1180`、`1024x768`、`1180x820`、`1280x720`、`1366x768`、`1440x900`、`1920x1080`、`2560x1080`、`2560x1440`。

每个视口都验证：

- 四个纵向分区、自由滚动和任意中间位置不会被 scroll snap 拉走。
- 无水平溢出；首页高度精确为一屏，短横屏使用 `max(100svh, 430px)`；服务区块至少一屏高。
- 首页与三张服务 OC 均从同源本地响应式 JPEG 加载，保持 2:3、`object-fit: cover`、有效尺寸和面部地标可见。
- 顶部导航顺序为主题切换后接右侧 `01–04`；活动分区在深浅主题中可区分。
- 滚动超过 20px 后页头进入 22px 圆角、52px 高的悬浮状态；返回顶部后合并，且无 IntersectionObserver 时仍可工作。
- 页头不覆盖可见文案；844×390 短横屏的服务标题、入口按钮和 Minecraft 信息卡仍位于视口内。
- XD Proxy 入口为有背景、有边框、至少 46px 高且有足够横向内边距的显眼按钮；OOPZ 入口使用同一安全链接行为，Minecraft 卡片不生成链接。
- `service-one` 新标识、两项自定义服务、Minecraft 自定义字段、版权-only 页脚、自定义 404、配置请求失败/禁用 JavaScript 兜底、主题持久化、键盘跳转、减少动画、404/405、MIME 和安全响应头均符合约定。

## 人工视觉审阅

显式审计模式在当前最终代码上生成 28 张截图，覆盖 7 个代表性视口（`320x568`、`390x844`、`844x390`、`768x1024`、`1366x768`、`1920x1080`、`2560x1080`）的顶端/悬浮页头和深色/浅色主题。逐张审阅确认：人物正脸、双眼和比例正常；首页标题行距清晰；页码位于右侧；圆角悬浮页头没有遮挡；服务入口在两种主题中均明显可读。

Task 5 还通过临时定向视图审阅了第二至第四屏的 390×844，以及第三、第四屏的 844×390 深浅主题状态，确认三张新背景映射正确，第三屏标题不再在短横屏异常竖排，第四屏 Minecraft 卡片内容完整。上述视图均为可再生成的临时验证证据，最终清理后不纳入仓库。

## 资源来源与尺寸

四张保留源图均为 1024×1536，SHA-256 如下：

- `oc-character-original.png`：`d6a146171983500f413e578658e8a2476aaebd430672c45c40944ba2a3687edf`
- `service-one-original.png`：`6d6797d219e516dface8e391804e00e829e07bb52c74c60fd962a1a03343b379`
- `service-two-original.png`：`7925c4996ab3f80324d32ab66725d7a1b246aeac542e6213e94770010373ab4f`
- `service-three-original.png`：`f17a027f050eec51717416756a834826a10678a3730c6e67c7312ecfcc8dd8f2`

每张源图都有 640×960 与 1024×1536 两个本地 JPEG 衍生文件。来源测试逐项核对文件存在、比例、尺寸和体积上限；网页不引用剪贴板路径、远程图片或第三方脚本。

## 安全与较窄审计范围

安全测试覆盖 URL 协议白名单、`textContent` 配置写入、危险 DOM sink/动态执行、调试输出、密钥特征、内联执行钩子、远程导入、CSP、COOP、CORP、HSTS、Referrer Policy、Permissions Policy、MIME 防嗅探、404/405 和资源缓存策略。额外的跟踪文件扫描未发现常见令牌或私钥特征；仅历史实施计划保留了当时的本机临时输入路径，用于可审计的来源记录，不会进入 Worker 静态目录。

`command -v lighthouse` 未找到 Lighthouse CLI，因此没有安装额外依赖，也没有生成或声称 Lighthouse 分数；现有测试不等同于 Lighthouse。

## 清理状态

常规浏览器回归不会写入审计截图。第一阶段已按精确路径删除显式截图、Wrangler 临时包、Playwright 结果、日志、项目缓存和四张剪贴板输入图；为保证复审可追溯，`node_modules` 与两份 SDD 工作区只保留到独立终审结束，随后再按精确路径删除。整个过程不对系统临时目录使用通配删除，也不遗留本项目的 Wrangler/Playwright 监听进程。
