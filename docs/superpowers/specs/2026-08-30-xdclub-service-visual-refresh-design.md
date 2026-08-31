# XDCLUB 服务屏与页头优化设计

日期：2026-08-30

## 目标

在保持 Cloudflare Workers Static Assets 架构、四个纵向分区、主题系统和安全边界不变的前提下，完成中断恢复和以下视觉/内容升级：

- 第一屏标题两段之间增加可读间距，并保留现有首页 OC。
- 用户提供的三张 2:3 OC 图依次作为第二、第三、第四屏背景。
- 页头页码位于最右侧；移动端滚动状态切换连续；悬浮态更接近 new-api 的紧凑圆角玻璃导航。
- 删除滚动吸附，保留锚点平滑跳转和自由手势滚动。
- `custom` 分区统一改名为 `service-one`。
- 第四屏由禁用链接改成可配置的 Minecraft 服务器信息预览卡。
- 页脚仅保留版权文字，删除站点 URL 和返回顶部链接。
- 修复上一轮最终审查留下、但因代理额度中断而未提交的首屏高度、活动导航、品牌无障碍同步和审计证据问题。

## 参考页头

参考 `QuantumNous/new-api` 当前 `web/src/components/layout/components/public-header.tsx` 的行为，而不复制其 React/AGPL 实现：

- `scrollY > 20` 才进入悬浮态。
- 约 700ms，`cubic-bezier(0.16, 1, 0.3, 1)`。
- 顶部态与页面顶部融合；悬浮态最大宽度 832px、紧凑高度、玻璃背景、阴影和明显圆角。

XDCLUB 继续使用一个原生固定 `<header>`。滚动监听为被动监听，并经 `requestAnimationFrame` 合并写入；这比 1px sentinel 的临界交叉状态更适合移动端连续滚动。

## 资源映射

三张用户资源均为无透明通道的 1024×1536 PNG：

| 页面 | 原始资源 | SHA-256 | 交付资源 |
| --- | --- | --- | --- |
| 第二屏 / `service-one` | `codex-clipboard-3634...png` | `6d6797d219e516dface8e391804e00e829e07bb52c74c60fd962a1a03343b379` | `service-one-640.jpg`, `service-one-1024.jpg` |
| 第三屏 / `service-two` | `codex-clipboard-a8a3...png` | `7925c4996ab3f80324d32ab66725d7a1b246aeac542e6213e94770010373ab4f` | `service-two-640.jpg`, `service-two-1024.jpg` |
| 第四屏 / `service-three` | `codex-clipboard-a215...png` | `f17a027f050eec51717416756a834826a10678a3730c6e67c7312ecfcc8dd8f2` | `service-three-640.jpg`, `service-three-1024.jpg` |

原始 PNG 保存到 `assets/source/`；网站只交付本地 JPEG 衍生图。服务图使用 `loading="lazy"`、`decoding="async"`，不得引用临时路径、远程图片或 `file://`。

## 分区与视觉

四个分区 ID 固定为：

1. `home`
2. `service-one`
3. `service-two`
4. `service-three`

首页 `.panel-home` 与 `.hero-layout` 默认精确一屏高；短横屏允许 `max(100svh, 430px)`，但不得叠加通用 panel 内边距。首页标题两个直接子 span 使用独立 `row-gap`，不通过插入空行或 `<br>` 修补。

三个服务背景采用统一 `<picture class="service-art">`：桌面位于右侧，移动竖屏铺满分区；全部保持 `object-fit: cover` 和按断点设置的焦点位置，不使用非等比 transform。服务文案在移动端使用半透明、带边框的表面卡，卡片停留在画面下部，避免遮挡人物脸部。

删除 `scroll-snap-type` 和 `scroll-snap-align`。`scroll-behavior: smooth` 只服务于导航锚点，触控板/触摸手势可停在任意滚动位置。

## 页头

DOM 顺序为品牌、主题切换、页码导航；页码导航是页头最后一个元素，贴近右边内边距。悬浮态设计值：

- `scrollY > 20`
- `width: min(calc(100% - 16px), 832px)`
- `min-height: 52px`
- `border-radius: 22px`
- `top: max(10px, env(safe-area-inset-top))`
- 700ms 指定缓动
- 无 `backdrop-filter` 时使用不透明 `--surface-solid`；支持时使用 `--header` 和 blur/saturate

顶部态保持全宽、圆角 0、透明背景。滚动状态只切换 `.is-floating`，不创建第二个页头。活动页码继续使用 `aria-current="page"`，并具有可见颜色/背景差异。

## 配置与 MC 预览卡

`public/site-config.json` 保持纯文本配置和安全 `textContent` 写入。服务项结构：

```json
{
  "id": "service-three",
  "index": "03",
  "eyebrow": "Minecraft server",
  "title": "Minecraft Server",
  "description": "成员服务器连接信息预览。",
  "preview": {
    "label": "服务器地址",
    "value": "mc.example.com:25565",
    "note": "请在 public/site-config.json 中修改此处文本"
  }
}
```

第四屏不再渲染禁用 `<a>`。预览卡使用普通文本和 `<code>`，不执行、不自动连接、不写剪贴板。`preview.label/value/note` 分别映射到明确的 `data-service-field`，非字符串配置被忽略，HTML 默认值始终可用。

第一项 ID、分区锚点、`data-service-id`、导航、测试和文档从 `custom` 全部迁移为 `service-one`。服务 URL 仍只接受绝对 `http:` / `https:`。页脚配置只保留 `copyright`；应用代码不再读取 `footer.siteUrl`。

## 安全与兼容

- 不新增依赖、内联事件、远程脚本、远程字体、HTML sink、动态代码或 Worker 绑定。
- Cloudflare Workers 继续由 `src/worker.js` 加 `env.ASSETS` 提供静态文件；无需变量、密钥、KV、D1、R2 或服务绑定。
- CSP、COOP、CORP、HSTS、MIME 防嗅探、404/405 和 URL 协议验证保持现状。
- 三套新原图及衍生图纳入哈希、尺寸、JPEG 头、同源和路径泄露测试。
- 无 JavaScript 时默认内容、MC 卡和四屏结构仍然可读；减少动态效果时过渡近乎关闭。

## 测试与验收

自动回归覆盖现有 19 个视口。新增断言至少包括：

- 首页标题 span 的计算间距大于 0。
- 四个新 ID/锚点完全一致，仓库运行代码中无旧 `#custom` / `id: custom`。
- 页码导航位于页头动作区最右侧且每个链接可点击。
- 390×844 等移动视口在 20px 阈值前后稳定切换，悬浮态最终为 22px 圆角、52px 紧凑高度，返回顶部连续恢复。
- 页面计算样式没有纵向 scroll snap；任意滚动位置不会被自动吸附。
- 三个服务背景选择本地 640/1024 JPEG，比例正确、脸部焦点在画面内、文案与页头不碰撞。
- 第四屏 MC 预览卡可从配置安全更新，且没有 `href`。
- 页脚仅有版权文字。

人工截图审阅使用 320×568、390×844、844×390、768×1024、1366×768、1920×1080、2560×1080 的深/浅主题和顶部/悬浮页头；审阅后删除截图。最终运行语法、Node、安全、Wrangler、浏览器、依赖高危审计和 Worker dry-run，并清理 `.pnpm-store`、`work`、`.wrangler`、`test-results`、报告、日志、缓存、旧 SDD 临时目录和 `node_modules`。

