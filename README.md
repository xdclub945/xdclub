# XDCLUB

XDCLUB 私人俱乐部官网。一个可直接部署到 Cloudflare Workers Static Assets 的单页网站，包含五个纵向全屏分区、月光蓝灰浅色/深色主题、两个服务外链、一个 Minecraft 信息卡、一个本地图片预览入口和精简页脚。

正式地址：<https://xdclub.dpdns.org/>

## 自定义内容、服务入口与 OC

日常内容集中在 [`public/site-config.json`](public/site-config.json)：

- `brand`：页头品牌文字；非空字符串会同步更新可见拆分文字和返回首页链接的无障碍名称，空白值会被忽略。
- `home`：第一屏眉题、主标题和简介。
- `services[0]`：`id` 必须保持为 `service-one`；它控制第二屏 XD Proxy 的文字和入口，目前指向 `https://custom.xdclub.dpdns.org/`。
- `services[1]`：第三屏 OOPZ 语音入口，目前指向 `https://oopz.cn/i/By3GmC`。
- `services[2]`：第四屏 Minecraft 信息预览，不是链接。修改 `preview.label` 和 `preview.value` 即可更换标签与服务器地址；当前正式地址为 `mc.xdclub.dpdns.org`。
- 第五屏“好东西哦：）”与 `tac` 按钮直接保存在 [`public/index.html`](public/index.html)；点击后使用浏览器原生对话框打开本地图片，支持底部关闭按钮和 `Escape`。
- `footer.copyright`：页脚只显示版权文字，不包含网址或返回顶部链接。

所有配置文字都通过 `textContent` 写入；服务 URL 仅接受绝对 `http:` 或 `https:` 地址。配置文件不可用时，HTML 内置默认内容仍会显示。

首页两行标题之间的间距由 [`public/styles.css`](public/styles.css) 中 `.hero-title` 的 `row-gap` 控制。

五屏 OC 的可替换边界如下：

- 首页：[`assets/source/oc-character-original.png`](assets/source/oc-character-original.png) → `public/assets/oc-character-{640,1024}.jpg`。
- 第二屏：[`assets/source/service-one-original.png`](assets/source/service-one-original.png) → `public/assets/service-one-{640,1024}.jpg`。
- 第三屏：[`assets/source/service-two-original.png`](assets/source/service-two-original.png) → `public/assets/service-two-{640,1024}.jpg`。
- 第四屏：[`assets/source/service-three-original.png`](assets/source/service-three-original.png) → `public/assets/service-three-{640,1024}.jpg`。
- 第五屏：[`assets/source/surprise-panel-original.png`](assets/source/surprise-panel-original.png) → `public/assets/surprise-panel-{640,1024}.jpg`。
- 替换任一 OC 时，必须从对应新原图重新生成 640×960 与 1024×1536 的 JPEG，并保持 HTML 既有的 2:3 标记尺寸；若有意改变比例，须同时更新标记尺寸与响应式视觉验证。

`tac` 预览源图保存在 [`assets/source/tac-preview-original.jpg`](assets/source/tac-preview-original.jpg)，网页使用 `public/assets/tac-preview-{640,873}.jpg`。预览图按原比例完整显示，不使用 `cover` 裁切。

## 本地运行

需要 Node.js 22+、pnpm 11 和 Wrangler 4。

```bash
pnpm install
pnpm run dev
```

默认在 Wrangler 输出的本机地址打开网站。当前 `compatibility_date` 固定为 `2026-08-28`，这是本次验证所用 Wrangler/workerd 支持的最新日期。

## 测试

```bash
pnpm run check:syntax
pnpm test
pnpm run test:wrangler
pnpm audit --audit-level=high
```

浏览器全自动测试需要先安装 Playwright Chromium：

```bash
pnpm exec playwright install chromium
pnpm run test:browser
```

也可以复用本机 Chromium/Chrome，而不下载测试浏览器：

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/path/to/chrome" pnpm run test:browser
```

`pnpm run check` 会依次执行语法、Node/Worker 和浏览器测试。目标尺寸及本次实测结果见 [`TEST-REPORT.md`](TEST-REPORT.md)。

常规浏览器回归不会保存截图。仅在人工视觉审计时显式启用临时截图：

```bash
OC_REVIEW_SCREENSHOTS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/path/to/chrome" pnpm run test:browser
```

该模式为 7 个代表性视口分别捕获顶端/悬浮页头与深色/浅色主题，共 28 张；审阅后应删除这些可再生成证据。

## 部署到 Cloudflare Workers

```bash
npx wrangler deploy
```

部署后在 Cloudflare Workers 的域名设置中绑定 `xdclub.dpdns.org`。项目不需要变量、密钥、KV、D1、R2、服务绑定或任何其他绑定；唯一的 Worker 资源绑定由 Wrangler 的静态资产配置自动提供。

## 安全说明

- CSP、COOP、CORP、Permissions Policy、MIME 防嗅探、来源控制和 HSTS 由 `public/_headers` 与 Worker 回退响应共同提供。
- 未知路径返回自定义 404；非 GET/HEAD 请求返回 405。
- 生产页面无第三方 JavaScript、远程字体、密钥或会员数据。
- XD Proxy 与 OOPZ 均使用用户指定的 HTTPS 地址，并以新标签页打开且带 `noopener noreferrer`。
