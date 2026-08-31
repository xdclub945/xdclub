# XDCLUB 测试报告

日期：2026-08-31

目标：Cloudflare Workers Static Assets / `https://xdclub.dpdns.org/`

## 红绿灯结论

- 🟢 语法、Node/Worker、真实 Wrangler、系统 Chrome/Playwright、依赖高危审计、Worker dry-run、Git 完整性和资源来源检查均通过。
- 🟢 远端 `main` 的自定义品牌、首页文案、XD Proxy、OOPZ、第五屏按钮“背景梦男”与 404 文案已原样迁移到最新配置结构；两个服务入口均为 HTTPS。
- 🔴 未发现阻止交付的错误、恶意代码、危险 DOM sink、硬编码密钥、远程脚本、水平溢出或已知高危依赖漏洞。

## 最终实际执行结果

| 命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过；锁文件未变更，未新增依赖。 |
| `pnpm run check:syntax` | 通过；`src/worker.js`、`public/theme-init.js`、`public/app.js` 均通过 `node --check`。 |
| `pnpm test` | 40/40 通过。 |
| `pnpm run test:wrangler` | 1/1 通过。 |
| `pnpm run test:browser`（使用系统 Chrome） | 40/40 通过；未启用截图标志。 |
| `OC_REVIEW_SCREENSHOTS=1 pnpm run test:browser` | 本次未启用截图标志；完整回归不会写入截图。第五屏和预览层另以本地可见浏览器审阅。 |
| `pnpm audit --audit-level=high` | `No known vulnerabilities found`。 |
| `pnpm exec wrangler deploy --dry-run` | 通过；Wrangler 读取 26 个静态资产条目并识别 `env.ASSETS`，未部署。 |
| `git diff --check` / `git fsck --full --no-dangling` | 通过。 |

本次命令使用 Node 24.19.0、pnpm 11.19.0、Wrangler 4.127.1、`compatibility_date` `2026-08-28` 和系统 Chrome 151.0.7922.174。

## 响应式、交互和内容验证

浏览器回归覆盖以下 19 个视口：

`320x568`、`360x800`、`375x812`、`390x844`、`430x932`、`667x375`、`812x375`、`844x390`、`932x430`、`768x1024`、`820x1180`、`1024x768`、`1180x820`、`1280x720`、`1366x768`、`1440x900`、`1920x1080`、`2560x1080`、`2560x1440`。

每个视口都验证：

- 五个纵向分区、自由滚动和任意中间位置不会被 scroll snap 拉走。
- 无水平溢出；首页高度精确为一屏，短横屏使用 `max(100svh, 430px)`；服务区块至少一屏高。
- 首页与四张分区 OC 均从同源本地响应式 JPEG 加载，保持 2:3、`object-fit: cover`、有效尺寸和面部地标可见。
- `01–05` 使用独立的右侧竖向分页栏；点击分区页码会把目标分区居中，首页回到顶端，并保持普通滚轮/触控自由滚动。
- 滚动超过 20px 后页头进入 26px 圆角、52px 高的悬浮状态；返回顶部后合并，且无 IntersectionObserver 时仍可工作。
- 页头不覆盖可见文案；844×390 短横屏的服务标题、入口按钮和 Minecraft 信息卡仍位于视口内。
- XD Proxy 入口为有背景、有边框、至少 46px 高且有足够横向内边距的显眼按钮；OOPZ 入口使用同一安全链接行为，Minecraft 卡片不生成链接。
- 第五屏图片预览按钮使用 `surprise` 配置和原生模态对话框；当前自定义文字“背景梦男”被保留。P2 保持 873×1920 比例完整显示，背景遮罩非透明，底部关闭按钮至少 44px，并支持点击关闭与 `Escape`。
- `service-one` 标识、两项自定义服务、Minecraft 正式地址与复制按钮、版权-only 页脚、自定义 404、配置请求失败/禁用 JavaScript 兜底、主题持久化、键盘跳转、文字上浮与减少动画、404/405、MIME 和安全响应头均符合约定。

## 人工视觉审阅

此前显式审计模式已覆盖 7 个代表性视口（`320x568`、`390x844`、`844x390`、`768x1024`、`1366x768`、`1920x1080`、`2560x1080`）的顶端/悬浮页头和深色/浅色主题；本次变更未改动前四屏构图。此次另在 1280×720 与 390×844 的本地可见浏览器中审阅第五屏和打开后的 P2：人物正脸、标题、按钮和页脚清晰，P2 居中完整显示，背景明显压暗，关闭按钮位于图片下方。

本次还通过临时定向视图审阅了第二至第四屏的 390×844，以及第三、第四屏的 844×390 深浅主题状态，确认三张新背景映射正确，第三屏标题不再在短横屏异常竖排，第四屏 Minecraft 卡片内容完整。上述视图均为可再生成的临时验证证据，最终清理后不纳入仓库。

## 资源来源与尺寸

五张分区源图均为 1024×1536，SHA-256 如下：

- `oc-character-original.png`：`a836b4d4f9fc72ead89162cab8ee0b965ac62183384f66e08e2e10ba94bee6fd`
- `service-one-original.png`：`230e108141ac0d62ac6ecb66c95c645c895f07682ae53d34a1331172c6901e81`
- `service-two-original.png`：`9072736d587827b50a28d7cabcb81e3553bb664e681e863b0053f7620dd33f81`
- `service-three-original.png`：`1459069044dd001436da17110080502c783af70086993612c5845339c2f3382a`
- `surprise-panel-original.png`：`600787abe52ab411fb8c9c47dc90ced4caa95a249ebd1168d00e69a82d162e5e`

每张分区源图都有 640×960 与 1024×1536 两个本地 JPEG 衍生文件。P2 原图为 873×1920、SHA-256 为 `400d96393a1df8bc9c4ffab44963b11ea003d2b4de590e2178fc02867c880237`，另有 640px 本地响应式版本。来源测试逐项核对文件存在、比例、尺寸和体积上限；网页不引用剪贴板路径、远程图片或第三方脚本。

## 安全与较窄审计范围

安全测试覆盖 URL 协议白名单、`textContent` 配置写入、危险 DOM sink/动态执行、调试输出、密钥特征、内联执行钩子、远程导入、CSP、COOP、CORP、HSTS、Referrer Policy、Permissions Policy、MIME 防嗅探、404/405 和资源缓存策略。额外的跟踪文件扫描未发现常见令牌或私钥特征；本机环境信息不会进入 Worker 静态目录。

`command -v lighthouse` 未找到 Lighthouse CLI，因此没有安装额外依赖，也没有生成或声称 Lighthouse 分数；现有测试不等同于 Lighthouse。

## 清理状态

常规浏览器回归不会写入审计截图。最终按精确路径删除显式截图、Wrangler/Playwright 结果与日志、项目缓存、`node_modules` 以及本次两张剪贴板输入图；五张正式分区源图、P2 源图及其本地响应式衍生文件保留在仓库。整个过程未对系统临时目录使用通配删除，也未遗留本项目的 Wrangler/Playwright 监听进程。
