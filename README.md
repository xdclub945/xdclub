# XDCLUB

XDCLUB 私人俱乐部官网。一个可直接部署到 Cloudflare Workers Static Assets 的单页网站，包含四个纵向全屏分区、月光蓝灰浅色/深色主题、三个服务入口位置和页脚。

正式地址：<https://xdclub.dpdns.org/>

## 自定义内容、服务入口与 OC

日常内容集中在 [`public/site-config.json`](public/site-config.json)：

- `brand`：页头品牌文字；非空字符串会同步更新可见拆分文字和返回首页链接的无障碍名称，空白值会被忽略。
- `home`：第一屏眉题、主标题和简介。
- `services[0]`：第二屏 XD Custom，目前指向 `http://custom.xdclub.dpdns.org/`。
- `services[1]`、`services[2]`：第三、第四屏预留服务。上线时把 `url` 从 `null` 改为完整的 `https://...` 或 `http://...` 地址。
- `footer`：版权文字和正式站点地址。

所有配置文字都通过 `textContent` 写入；服务 URL 仅接受绝对 `http:` 或 `https:` 地址。配置文件不可用时，HTML 内置默认内容仍会显示。

OC 的可替换边界如下：

- 原始 OC 文件是 [`assets/source/oc-character-original.png`](assets/source/oc-character-original.png)。
- 网站实际交付的是 [`public/assets/oc-character-640.jpg`](public/assets/oc-character-640.jpg) 和 [`public/assets/oc-character-1024.jpg`](public/assets/oc-character-1024.jpg)。
- 替换 OC 时，必须从新原图重新生成这两个衍生文件，并保持 HTML 既有的 2:3 标记尺寸；若有意改变比例，须同时明确更新这些尺寸与相应的响应式视觉验证。

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
- XD Custom 当前为用户指定的 HTTP 地址。顶层链接通常可以完成导航，但会从 HTTPS 离开到未加密 HTTP；目标站流量不具备机密性或完整性，且可能触发浏览器或安全策略警告。建议外部服务支持后改为 HTTPS。
