# XDCLUB Cloudflare Workers 网站设计

日期：2026-08-30  
状态：已批准并实现
正式站点：`https://xdclub.dpdns.org/`

## 1. 目标

为私人俱乐部 XDCLUB 创建一个可直接部署到 Cloudflare Workers Static Assets 的单页网站。网站采用黑曜金视觉语言，兼具电竞氛围、克制感和现代 Google 风格排版。页面由四个纵向滚动的全屏分区组成，并提供完整的深色/浅色主题、集中式内容配置、安全响应头、错误降级和多比例设备验证。

## 2. 范围

### 包含

- 一个纵向滚动的单页网站，共四个全屏分区。
- 固定页头、XDCLUB 首页链接、分区导航和主题开关。
- 第一屏可配置品牌文字。
- 第二屏 XD Custom 外部服务入口。
- 第三、第四屏各一个独立的预留服务入口。
- 第四屏底部页脚。
- 深色与浅色主题、系统主题检测和用户选择记忆。
- Cloudflare Workers Static Assets 配置及安全响应头。
- 配置、结构、安全、响应式和浏览器行为验证。
- 使用绿/黄/红状态的最终测试报告。

### 不包含

- 登录、会员账户、数据库、支付或后台管理系统。
- 对外部服务 `custom.xdclub.dpdns.org` 的修改或 HTTPS 改造。
- 将网站部署到用户 Cloudflare 账户；交付物提供可直接执行的部署命令。
- 创建或写入 Figma 文件。当前 Figma 连接为只读席位，视觉方向已通过本地预览确认。

## 3. 已批准的视觉方向

- 方向：黑曜金。
- 深色主题：近黑背景、香槟金强调色、暖白正文、低对比装饰线。
- 浅色主题：象牙白背景、深墨正文、克制金色强调，不采用简单颜色反转。
- 英文排版使用本地托管的 Manrope；中文依次使用系统优质无衬线字体，例如 PingFang SC、Microsoft YaHei 和通用 sans-serif。
- 视觉装饰仅使用 CSS 渐变、细线和轻量形状，不依赖大图、视频或 WebGL。
- 动效以淡入、细微位移和滚动提示为主；`prefers-reduced-motion` 下关闭非必要动画和平滑滚动。

## 4. 信息架构与交互

### 固定页头

- 左侧文字标识固定为 `XDCLUB`。
- 点击 `XDCLUB` 平滑返回第一屏；减少动画模式下立即跳转。
- 右侧包含四个分区锚点和日/月主题开关。
- 小屏幕下压缩分区导航，但保留品牌、主题开关和可访问的导航能力。
- 页头在两种主题中都保持清晰对比度和可见键盘焦点。

### 第一屏：品牌文字

- 仅显示可配置的眉题、主标题和简介文字，以及非交互背景装饰。
- 不显示服务卡片或主要操作按钮。
- 内容由 `site-config.json` 覆盖；配置失败时使用 HTML 内置默认文案。

### 第二屏：XD Custom

- 独占一个全屏分区。
- 显示服务编号、标题、说明和外链操作。
- 链接固定初始值为 `http://custom.xdclub.dpdns.org/`。
- 外链在新标签页打开并使用 `rel="noopener noreferrer"`。

### 第三屏：预留服务 02

- 独占一个全屏分区。
- 服务标题、描述、状态和 URL 可在配置中修改。
- URL 未配置时呈现“即将开放”，不可点击，也不生成空链接。

### 第四屏：预留服务 03 与页脚

- 独占一个全屏分区。
- 服务入口行为与第三屏一致。
- 页脚位于分区底部，包含版权、XDCLUB 名称、正式站点地址和返回顶部入口。

### 滚动行为

- 每个分区使用 `min-height: 100svh`，兼容移动浏览器动态地址栏。
- 桌面及空间充足的设备使用纵向滚动吸附。
- 在窄屏、矮屏、文本放大或减少动画场景中降低或取消强制吸附，避免内容被截断或滚动困住。
- 所有锚点保留原生 URL 片段和无 JavaScript 基本可用性。

## 5. 主题设计

- 默认使用 `prefers-color-scheme` 跟随系统主题。
- 用户点击主题开关后，将 `light` 或 `dark` 保存到 `localStorage`。
- 页面加载早期通过独立的同源 `theme-init.js` 应用已保存选择，降低主题闪烁。
- 若存储访问失败，静默回退为系统主题，不影响内容和导航。
- 主题开关使用原生 `button`、可见文字或图标、动态 `aria-label` 和 `aria-pressed`。
- CSS 以语义变量管理背景、文字、强调色、边框和遮罩，组件不重复硬编码主题颜色。

## 6. 文件与组件边界

```text
xdclub-workers-site/
├── README.md
├── TEST-REPORT.md
├── package.json
├── wrangler.jsonc
├── src/
│   └── worker.js
├── public/
│   ├── index.html
│   ├── 404.html
│   ├── _headers
│   ├── .assetsignore
│   ├── favicon.svg
│   ├── site.webmanifest
│   ├── site-config.json
│   ├── styles.css
│   ├── theme-init.js
│   ├── app.js
│   └── fonts/
│       ├── manrope-latin.woff2
│       └── OFL.txt
└── tests/
    ├── structure.test.mjs
    ├── security.test.mjs
    ├── responsive.test.mjs
    └── wrangler.test.mjs
```

- `index.html`：语义结构、默认文案、元信息和无脚本降级。
- `site-config.json`：唯一的日常文案与链接配置入口。
- `styles.css`：布局、主题、响应式、滚动和动效。
- `theme-init.js`：加载阶段主题初始化；无其他职责。
- `app.js`：配置加载、链接验证、主题切换和轻量交互。
- `worker.js`：通过 `ASSETS` 绑定提供资源及一致的响应处理；不包含页面模板。
- `_headers`：Cloudflare 静态资源安全与缓存响应头。
- `wrangler.jsonc`：Workers Static Assets 的来源真相，使用 `public` 目录与当前兼容日期。
- `tests/`：纯结构/安全检查与浏览器响应式验证，不参与生产部署。

## 7. Cloudflare Workers 兼容方案

- 使用 Cloudflare 当前推荐的 `wrangler.jsonc`。
- 配置 `main: "./src/worker.js"`、`assets.directory: "./public"` 和 `assets.binding: "ASSETS"`。
- 保持静态资源优先，避免所有正常资源请求无条件执行 Worker。
- Worker 对未匹配路径返回自定义 `404.html`，或委托资源绑定生成正确响应。
- 不使用已弃用的 Workers Sites、KV asset handler 或 Pages 专用字段。
- HTML、CSS、JavaScript、JSON、SVG、Web Manifest、WOFF2 和 `_headers` 均为 Workers Static Assets 支持或识别的标准文件形式。
- `compatibility_date` 使用本次 Wrangler/workerd 实测支持的最新日期 `2026-08-28`，避免未来日期导致本地或部署校验失败。
- README 同时给出 `wrangler dev` 本地预览和 `wrangler deploy` 部署命令。

## 8. 数据流与容错

1. 浏览器加载 HTML、主题初始化脚本和 CSS。
2. HTML 默认文案立即可见，避免配置或 JavaScript 失败时出现空白首屏。
3. `app.js` 请求同源 `site-config.json`。
4. 配置通过结构和类型检查后，以 `textContent` 更新对应节点。
5. 外链通过 `URL` 解析，仅允许 `http:` 与 `https:`。
6. 无效或缺失 URL 对应的服务入口变为不可点击状态。
7. 配置请求失败、JSON 无效或字段缺失时，保留默认内容并记录非阻断警告。
8. 主题逻辑独立于配置逻辑；任一模块失败不影响另一模块。

## 9. 安全设计

- 不使用 `innerHTML`、`eval`、动态脚本、远程 JavaScript 或运行时第三方字体请求。
- 内容写入使用 `textContent`，URL 设置前执行协议白名单检查。
- 外链使用 `noopener noreferrer`，避免新页面控制来源窗口或获得来源信息。
- CSP 默认仅允许同源脚本、样式、字体、图片和配置请求；禁用对象、框架、表单提交和跨源网络连接。
- 响应头包含 `X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`、防嵌套策略和最小化 `Permissions-Policy`。
- 生产端无第三方 JavaScript 依赖。
- 现有 XD Custom 使用 HTTP，测试报告必须将其标为黄色外部风险；网站不能保证该外部服务链路的机密性或完整性。
- 不在前端代码或配置中存放密钥、令牌或私人会员数据。

## 10. 测试设计

### 自动结构与安全检查

- HTML 必需语义节点、四屏顺序、页头、主题开关和页脚存在。
- 所有本地引用文件存在，JSON 可解析，JavaScript 通过语法检查。
- 禁止内联事件、内联脚本、`innerHTML`、`eval` 和不受控协议链接。
- `_headers` 包含预期 CSP、MIME、防嵌套、来源和权限策略。
- Worker 配置包含正确目录、绑定、入口和兼容日期。
- 404 页面及未匹配路由返回正确状态与 MIME 类型。

### 浏览器行为与设备比例

- 视口：320×568、390×844、844×390、768×1024、1366×768、1920×1080、2560×1080。
- 验证深色、浅色、系统主题、主题持久化和主题开关可访问名称。
- 验证鼠标、触控等价布局、Tab/Enter 键盘操作和可见焦点。
- 验证 `prefers-reduced-motion`、无横向溢出、无文字遮挡和可访问页脚。
- 验证四屏顺序、XDCLUB 返回首屏、第二屏外链，以及第三、第四屏禁用状态。

### 红黄绿报告

- 绿色：检查通过且无已知风险。
- 黄色：功能可用但存在外部或环境风险，例如 XD Custom 的 HTTP 链接。
- 红色：阻止交付的问题，例如脚本错误、布局溢出、缺失安全头或 Worker 无法提供资源。
- 只有不存在红色项时才宣告实现完成。

## 11. 清理要求

- 开发预览目录 `.superpowers/` 在最终验证后停止服务并删除。
- 删除测试截图、浏览器临时数据、覆盖率目录、测试报告缓存、`node_modules` 和包管理器临时缓存。
- 清理前先确认目标位于当前任务目录，并只删除可明确判定为临时或可再生成的文件。
- 保留网站源码、字体及其许可证、README、锁文件（若生成）和最终 `TEST-REPORT.md`。
- 当前任务开始时已盘点工作区，除空 `outputs/`、`work/` 和本次 `.superpowers/` 预览目录外，没有发现此前遗留缓存。

## 12. 成功标准

- `wrangler dev` 能启动并正确提供首页、静态文件和 404。
- `wrangler deploy` 所需格式完整，不依赖旧 Workers Sites 配置。
- 四个分区、双主题、配置更新、外链、页脚和返回首屏符合已批准交互。
- 所有目标视口无横向溢出、关键内容无截断，键盘和减少动画设置可用。
- 安全检查无红色项，HTTP 外部服务风险明确记录为黄色。
- 临时和缓存文件按第 11 节要求完成清理。
