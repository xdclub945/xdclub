# XDCLUB Workers Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a four-section, dual-theme XDCLUB website that deploys directly with Cloudflare Workers Static Assets.

**Architecture:** Cloudflare serves files from `public/` through a Workers Static Assets binding. Semantic HTML supplies an immediate no-JavaScript baseline, small ES modules load editable JSON configuration and theme state, and CSS custom properties implement the black-gold/light-gold design. Node tests inspect structure and security, a Worker unit test covers fallback behavior, and Playwright checks target viewport ratios.

**Tech Stack:** HTML5, CSS, browser-native ES modules, JSON, Cloudflare Workers/Wrangler v4, Node.js built-in test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-30-xdclub-workers-website-design.md`

**Implementation note (2026-08-30):** The verified implementation uses Node 22+, pnpm 11, `compatibility_date: 2026-08-28` (the newest date supported by the installed workerd), and `html_handling: "auto-trailing-slash"` so `/` resolves to `index.html`. The branded Worker fallback fetches canonical `/404`; these verified deviations replace the earlier illustrative snippets below.

## Global Constraints

- Canonical production URL is exactly `https://xdclub.dpdns.org/`.
- The page has exactly four vertically ordered full-screen sections.
- The header brand text is exactly `XDCLUB`; activating it returns to section one.
- Section one contains copy only; section two links to `http://custom.xdclub.dpdns.org/`; sections three and four each hold one separately configurable reserved service.
- Section four contains the footer.
- Runtime production dependencies are forbidden; font and scripts are self-hosted.
- User-editable copy and service URLs live in `public/site-config.json`.
- Text updates use `textContent`; URLs accept only absolute `http:` and `https:` values.
- Dark, light, system preference, saved preference, reduced motion, keyboard navigation and no-JavaScript fallback are required.
- Target viewports are 320×568, 390×844, 844×390, 768×1024, 1366×768, 1920×1080 and 2560×1080.
- Delivery is blocked by any red test result; the known HTTP service URL is reported yellow.
- Final cleanup removes `.superpowers/`, screenshots, browser data, caches and `node_modules` while preserving source, font license, lockfile and `TEST-REPORT.md`.

## File Map

- `wrangler.jsonc`: Worker entry point, compatibility date and Static Assets binding.
- `src/worker.js`: missing-route fallback and security headers for Worker-generated responses.
- `public/_headers`: CSP and security/cache policy for asset-first responses.
- `public/.assetsignore`: excludes non-public metadata from asset upload.
- `public/index.html`: semantic four-section shell and default copy.
- `public/404.html`: branded not-found page.
- `public/site-config.json`: editable brand, home, services and footer data.
- `public/theme-init.js`: earliest saved/system theme selection only.
- `public/app.js`: safe config application, service-link state and theme-button behavior.
- `public/styles.css`: local font, themes, layout, motion and responsive rules.
- `public/favicon.svg`: brand mark.
- `public/site.webmanifest`: install metadata and theme colors.
- `public/fonts/manrope-latin.woff2`: self-hosted Manrope Latin variable webfont.
- `public/fonts/OFL.txt`: Manrope license.
- `tests/worker.test.mjs`: Worker fallback and headers.
- `tests/structure.test.mjs`: file references, four-section structure and config schema.
- `tests/security.test.mjs`: policy, dangerous API and URL assertions.
- `tests/responsive.test.mjs`: Playwright theme, keyboard and viewport checks.
- `README.md`: customization, development and deployment instructions.
- `TEST-REPORT.md`: final green/yellow/red evidence.

---

### Task 1: Cloudflare Worker and Security Foundation

**Files:**
- Create: `package.json`
- Create: `wrangler.jsonc`
- Create: `src/worker.js`
- Create: `public/_headers`
- Create: `public/.assetsignore`
- Create: `public/404.html`
- Test: `tests/worker.test.mjs`
- Test: `tests/security.test.mjs`

**Interfaces:**
- Consumes: Cloudflare `env.ASSETS.fetch(request)` binding.
- Produces: default export `{ fetch(request, env): Promise<Response> }`, `withSecurityHeaders(response): Response`, and asset/security configuration used by all later tasks.

- [ ] **Step 1: Write failing Worker and policy tests**

```js
// tests/worker.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import worker, { withSecurityHeaders } from "../src/worker.js";

test("Worker returns branded 404 with security headers", async () => {
  const env = { ASSETS: { fetch: async () => new Response("XDCLUB — Page not found", { status: 200, headers: { "content-type": "text/html" } }) } };
  const response = await worker.fetch(new Request("https://xdclub.dpdns.org/missing"), env);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("withSecurityHeaders preserves body and status", async () => {
  const response = withSecurityHeaders(new Response("no", { status: 404 }));
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "no");
});
```

```js
// tests/security.test.mjs (initial policy checks)
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("static asset policy is strict and same-origin", async () => {
  const headers = await readFile("public/_headers", "utf8");
  for (const value of ["Content-Security-Policy", "default-src 'self'", "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "X-Content-Type-Options: nosniff", "Referrer-Policy: no-referrer"]) assert.match(headers, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
```

- [ ] **Step 2: Run tests and confirm missing-file failure**

Run: `node --test tests/worker.test.mjs tests/security.test.mjs`  
Expected: FAIL because `src/worker.js` and `public/_headers` do not exist.

- [ ] **Step 3: Add the minimal Worker and policy implementation**

```js
// src/worker.js
const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

export function withSecurityHeaders(response, status = response.status) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const notFoundUrl = new URL("/404.html", request.url);
    const page = await env.ASSETS.fetch(new Request(notFoundUrl, request));
    return withSecurityHeaders(page, 404);
  }
};
```

```jsonc
// wrangler.jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "xdclub",
  "main": "./src/worker.js",
  "compatibility_date": "2026-08-30",
  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "html_handling": "none",
    "not_found_handling": "none"
  }
}
```

Use this exact asset policy and exclusion list:

```text
# public/_headers
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

/index.html
  Cache-Control: public, max-age=0, must-revalidate
/site-config.json
  Cache-Control: public, max-age=0, must-revalidate
/theme-init.js
  Cache-Control: public, max-age=0, must-revalidate
/app.js
  Cache-Control: public, max-age=0, must-revalidate
```

```text
# public/.assetsignore
.DS_Store
*.map
*.tmp
*.log
```

Create `404.html` as a standalone Chinese page with `<meta name="robots" content="noindex">`, heading `页面未找到`, body `你访问的页面不存在。`, and `<a href="/">返回 XDCLUB</a>`; it may share `styles.css` but must remain usable if the stylesheet fails.

- [ ] **Step 4: Run Worker and policy tests**

Run: `node --test tests/worker.test.mjs tests/security.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit the foundation**

```bash
git add package.json wrangler.jsonc src/worker.js public/_headers public/.assetsignore public/404.html tests/worker.test.mjs tests/security.test.mjs
git commit -m "feat: add Workers static asset foundation"
```

### Task 2: Semantic Four-Section Content and Safe Configuration

**Files:**
- Create: `public/index.html`
- Create: `public/site-config.json`
- Create: `public/favicon.svg`
- Create: `public/site.webmanifest`
- Create: `public/app.js`
- Test: `tests/structure.test.mjs`
- Modify: `tests/security.test.mjs`

**Interfaces:**
- Consumes: JSON shape `{ brand, home, services[3], footer }` and DOM nodes marked with `data-config`/`data-service-id`.
- Produces: `safeHttpUrl(value): string | null`, `applyConfig(document, config): void`, `loadConfig(fetcher, document): Promise<void>`.

- [ ] **Step 1: Write failing structure, configuration and URL tests**

```js
// tests/structure.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("homepage has four ordered full-screen sections and required chrome", async () => {
  const html = await readFile("public/index.html", "utf8");
  assert.equal((html.match(/class="[^"]*panel/g) ?? []).length, 4);
  assert.ok(html.indexOf('id="home"') < html.indexOf('id="custom"'));
  assert.ok(html.indexOf('id="custom"') < html.indexOf('id="service-two"'));
  assert.ok(html.indexOf('id="service-two"') < html.indexOf('id="service-three"'));
  assert.match(html, /href="#home"[^>]*>XDCLUB</);
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /<footer/);
});

test("configuration has one live and two reserved services", async () => {
  const config = JSON.parse(await readFile("public/site-config.json", "utf8"));
  assert.equal(config.services.length, 3);
  assert.equal(config.services[0].url, "http://custom.xdclub.dpdns.org/");
  assert.equal(config.services[1].url, null);
  assert.equal(config.services[2].url, null);
});
```

```js
// append to tests/security.test.mjs
import { safeHttpUrl } from "../public/app.js";
test("safeHttpUrl rejects executable and malformed protocols", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,boom"), null);
  assert.equal(safeHttpUrl("/relative"), null);
  assert.equal(safeHttpUrl("http://custom.xdclub.dpdns.org/"), "http://custom.xdclub.dpdns.org/");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test tests/structure.test.mjs tests/security.test.mjs`  
Expected: FAIL because HTML, JSON and exported app functions do not exist.

- [ ] **Step 3: Build semantic HTML, JSON config and safe app module**

Create `index.html` from this exact structural skeleton, expanding each service panel with its eyebrow, title, description and one action while preserving IDs and ordering:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="dark light">
  <link rel="canonical" href="https://xdclub.dpdns.org/">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/site.webmanifest">
  <script src="/theme-init.js"></script>
  <link rel="stylesheet" href="/styles.css">
  <script type="module" src="/app.js"></script>
  <title>XDCLUB · Private Digital Club</title>
</head>
<body>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header class="site-header">
    <a class="brand" href="#home" aria-label="XDCLUB，返回首页">XDCLUB</a>
    <nav aria-label="页面分区"><a href="#home">01</a><a href="#custom">02</a><a href="#service-two">03</a><a href="#service-three">04</a></nav>
    <button id="theme-toggle" type="button" aria-pressed="false"><span aria-hidden="true"></span></button>
  </header>
  <main id="main">
    <section id="home" class="panel panel-home" aria-labelledby="home-title"><p data-config="home.eyebrow">Private digital club · Est. 2026</p><h1 id="home-title"><span data-config="home.titlePrimary">Built for</span><span data-config="home.titleAccent">the chosen few.</span></h1><p data-config="home.description">这里放置可自由修改的俱乐部介绍、宣言或欢迎文字。</p></section>
    <section id="custom" class="panel panel-service" data-service-id="custom"></section>
    <section id="service-two" class="panel panel-service" data-service-id="service-two"></section>
    <section id="service-three" class="panel panel-service" data-service-id="service-three"><footer><span data-config="footer.copyright">© 2026 XDCLUB</span><a href="#home">返回顶部</a></footer></section>
  </main>
</body>
</html>
```

Create `site-config.json` with this service data:

```json
{
  "brand": "XDCLUB",
  "home": {
    "eyebrow": "Private digital club · Est. 2026",
    "titlePrimary": "Built for",
    "titleAccent": "the chosen few.",
    "description": "这里放置可自由修改的俱乐部介绍、宣言或欢迎文字。"
  },
  "services": [
    { "id": "custom", "index": "01", "eyebrow": "Featured service", "title": "XD Custom", "description": "XDCLUB 专属定制服务入口。", "url": "http://custom.xdclub.dpdns.org/" },
    { "id": "service-two", "index": "02", "eyebrow": "Reserved service", "title": "即将开放", "description": "为下一项成员服务预留的独立入口。", "url": null },
    { "id": "service-three", "index": "03", "eyebrow": "Reserved service", "title": "即将开放", "description": "为未来扩展预留的独立入口。", "url": null }
  ],
  "footer": { "copyright": "© 2026 XDCLUB", "siteUrl": "https://xdclub.dpdns.org/" }
}
```

Use this URL contract and the same assignment pattern for every text field:

```js
export function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node && typeof value === "string") node.textContent = value;
}
```

`applyConfig` calls `setText` for each declared home/footer field and each panel's title/description. For a live URL it assigns `href`, `target="_blank"`, and `rel="noopener noreferrer"`; for a missing or invalid URL it removes `href`, sets `aria-disabled="true"`, and sets the action text to `即将开放`. `loadConfig` catches network and JSON errors and leaves the HTML defaults intact.

- [ ] **Step 4: Run structure and security tests**

Run: `node --test tests/structure.test.mjs tests/security.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit content and configuration**

```bash
git add public/index.html public/site-config.json public/favicon.svg public/site.webmanifest public/app.js tests/structure.test.mjs tests/security.test.mjs
git commit -m "feat: add configurable four-section club page"
```

### Task 3: Theme State and Black-Gold Responsive Presentation

**Files:**
- Create: `public/theme-init.js`
- Create: `public/styles.css`
- Create: `public/fonts/manrope-latin.woff2`
- Create: `public/fonts/OFL.txt`
- Modify: `public/app.js`
- Modify: `tests/structure.test.mjs`
- Test: `tests/responsive.test.mjs`

**Interfaces:**
- Consumes: `document.documentElement.dataset.theme`, `localStorage["xdclub-theme"]`, `matchMedia("(prefers-color-scheme: dark)")` and `#theme-toggle`.
- Produces: `getPreferredTheme(storage, media): "dark" | "light"`, `setTheme(theme, root, storage, button): void`, responsive CSS with no horizontal overflow.

- [ ] **Step 1: Write failing theme and responsive tests**

```js
// add pure-function checks to tests/structure.test.mjs
import { getPreferredTheme } from "../public/app.js";
test("theme preference uses saved value before system preference", () => {
  assert.equal(getPreferredTheme({ getItem: () => "light" }, { matches: true }), "light");
  assert.equal(getPreferredTheme({ getItem: () => null }, { matches: true }), "dark");
  assert.equal(getPreferredTheme({ getItem: () => null }, { matches: false }), "light");
});
```

```js
// tests/responsive.test.mjs
import { test, expect } from "@playwright/test";
const viewports = [
  { width: 320, height: 568 }, { width: 390, height: 844 },
  { width: 844, height: 390 }, { width: 768, height: 1024 },
  { width: 1366, height: 768 }, { width: 1920, height: 1080 },
  { width: 2560, height: 1080 }
];
for (const viewport of viewports) test(`layout fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator(".panel")).toHaveCount(4);
  await expect(page.locator("footer")).toBeVisible();
});
test("theme toggle persists and updates its accessible state", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-pressed", theme === "light" ? "true" : "false");
});
```

- [ ] **Step 2: Run tests and confirm theme/style failure**

Run: `node --test tests/structure.test.mjs`  
Expected: FAIL because `getPreferredTheme` is not exported. Responsive tests are expected to fail until the dev server and styles exist.

- [ ] **Step 3: Implement theme functions, initial theme script and styles**

Use these pure functions in `app.js`:

```js
export function getPreferredTheme(storage, media) {
  try {
    const saved = storage.getItem("xdclub-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return media.matches ? "dark" : "light";
}

export function setTheme(theme, root, storage, button) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try { storage.setItem("xdclub-theme", theme); } catch {}
  if (button) {
    button.setAttribute("aria-pressed", String(theme === "light"));
    button.setAttribute("aria-label", theme === "dark" ? "切换到白天模式" : "切换到暗黑模式");
  }
}
```

The blocking `theme-init.js` wraps its storage read in `try/catch`, validates only `dark`/`light`, otherwise checks `(prefers-color-scheme: dark)`, then assigns `document.documentElement.dataset.theme` and `style.colorScheme`.

Create `styles.css` with the following named foundations, then add only the component rules needed by the HTML skeleton:

```css
@font-face { font-family: Manrope; src: url("/fonts/manrope-latin.woff2") format("woff2"); font-style: normal; font-weight: 400 700; font-display: swap; }
:root { --bg: #f4f0e8; --surface: #ebe4d8; --text: #17130d; --muted: #6d6353; --gold: #8a682d; --line: rgba(83, 62, 28, .22); color-scheme: light; }
:root[data-theme="dark"] { --bg: #08090c; --surface: #0d0f13; --text: #f3efe6; --muted: #a39b8e; --gold: #d1ae68; --line: rgba(214, 183, 119, .2); color-scheme: dark; }
html { scroll-behavior: smooth; scroll-snap-type: y proximity; background: var(--bg); }
body { margin: 0; min-width: 320px; overflow-x: clip; font-family: Manrope, "PingFang SC", "Microsoft YaHei", sans-serif; background: var(--bg); color: var(--text); }
.panel { box-sizing: border-box; min-height: 100svh; scroll-snap-align: start; scroll-margin-top: 72px; padding: max(96px, 12vh) max(24px, 8vw); display: flex; flex-direction: column; justify-content: center; }
:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
@media (max-width: 600px), (max-height: 520px) { html { scroll-snap-type: none; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } html { scroll-behavior: auto; scroll-snap-type: none; } }
```

- local `@font-face` for Manrope 400–700 and system Chinese fallbacks;
- dark and light semantic color variables;
- sticky translucent header and responsive anchor navigation;
- four `.panel` sections using `min-height: 100svh`, safe-area padding and scroll-margin;
- desktop scroll snap with opt-outs for short/narrow screens and reduced motion;
- black-gold geometric background made only from gradients and pseudo-elements;
- section-one typography only, one service action per later section, and footer anchored without overlay;
- visible `:focus-visible`, skip-link behavior, disabled service styling, touch targets at least 44px;
- media queries covering phone portrait, phone landscape, tablet, desktop and ultrawide proportions;
- `prefers-reduced-motion` rules that remove animation and smooth scrolling.

Fetch the Google Fonts CSS for `Manrope:wght@400..700` with a browser user agent, select its `latin` WOFF2 URL, save it as `public/fonts/manrope-latin.woff2`, and save `https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt` as `public/fonts/OFL.txt`. Run `test -s` on both files and record the two source URLs in README.

- [ ] **Step 4: Run pure theme tests**

Run: `node --test tests/structure.test.mjs tests/security.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit theme and presentation**

```bash
git add public/theme-init.js public/styles.css public/fonts public/app.js tests/structure.test.mjs tests/responsive.test.mjs
git commit -m "feat: add accessible black-gold themes"
```

### Task 4: Local Worker and Multi-Viewport Verification

**Files:**
- Modify: `package.json`
- Create: `playwright.config.mjs`
- Modify: `tests/responsive.test.mjs`
- Create: `TEST-REPORT.md`

**Interfaces:**
- Consumes: `npm run dev`, local Worker URL, target viewport list and all tests from Tasks 1–3.
- Produces: repeatable `npm test`, `npm run test:browser`, `npm run check`, and an evidence-based traffic-light report.

- [ ] **Step 1: Add repeatable commands and browser server configuration**

```json
{
  "name": "xdclub-workers-site",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "test": "node --test tests/worker.test.mjs tests/structure.test.mjs tests/security.test.mjs",
    "test:browser": "playwright test tests/responsive.test.mjs",
    "check:syntax": "node --check src/worker.js && node --check public/theme-init.js && node --check public/app.js",
    "check": "npm run check:syntax && npm test && npm run test:browser"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "wrangler": "^4.0.0"
  }
}
```

Configure Playwright `webServer.command` as `npm run dev -- --port 8787 --ip 127.0.0.1`, `baseURL` as `http://127.0.0.1:8787`, Chromium only, one worker, trace on first retry, and temporary output below `work/test-results`.

- [ ] **Step 2: Install development tools and run the complete check**

Run: `npm install`  
Run: `npx playwright install chromium` if the bundled browser is unavailable.  
Run: `npm run check`  
Expected: all structural, security, Worker, theme and seven-viewport tests PASS.

- [ ] **Step 3: Inspect both themes at representative sizes and fix defects**

Inspect 390×844, 844×390, 1366×768 and 2560×1080 in dark and light themes. Verify header, title wrapping, one-service-per-section layout, footer, focus state, scroll behavior and disabled reserved entries. Any defect gets a regression assertion in `tests/responsive.test.mjs` before the CSS/JS fix.

- [ ] **Step 4: Write the final traffic-light report from observed results**

Create `TEST-REPORT.md` with a dated matrix for Worker/MIME, structure, dark/light, keyboard, reduced motion, each target viewport, CSP/security policy, external link and cleanup. Mark passing checks `🟢`, the HTTP external service `🟡`, and any blocking failure `🔴`. Include exact commands and state that delivery is prohibited while red entries exist.

- [ ] **Step 5: Commit verification tooling and report**

```bash
git add package.json package-lock.json playwright.config.mjs tests TEST-REPORT.md
git commit -m "test: verify Workers security and responsive layout"
```

### Task 5: Documentation, Cleanup and GitHub Delivery

**Files:**
- Modify: `README.md`
- Create: `.gitignore`
- Modify: `TEST-REPORT.md`
- Delete after verification: `.superpowers/`, `work/test-results/`, `node_modules/`, browser caches and screenshots.

**Interfaces:**
- Consumes: verified source tree and commits from Tasks 1–4.
- Produces: clean reproducible repository on `main` at `https://github.com/xdclub945/xdclub`.

- [ ] **Step 1: Write deployment and customization documentation**

Document prerequisites (Node 20+ and Wrangler 4), `npm install`, `npm run dev`, `npm run check`, `npx wrangler deploy`, custom domain `xdclub.dpdns.org`, and exact editable fields in `public/site-config.json`. Explain that reserved URLs remain `null` until ready and that the current custom service uses unencrypted HTTP.

- [ ] **Step 2: Add repository exclusions**

Create `.gitignore` containing `.DS_Store`, `.wrangler/`, `.superpowers/`, `node_modules/`, `work/`, `test-results/`, `playwright-report/`, `coverage/`, and debug logs. Confirm fonts, lockfile and `TEST-REPORT.md` are not excluded.

- [ ] **Step 3: Perform the final clean-room verification**

Run `npm run check` once more from the committed source. Check `git diff --check`, `git status --short`, the generated local security headers, and the canonical URL. Confirm no red report entries.

- [ ] **Step 4: Stop preview processes and delete only validated temporary paths**

Stop the Superpowers preview with its recorded session directory. Remove only task-local `.superpowers/`, `work/test-results/`, Playwright output, `.wrangler/`, `node_modules/` and downloaded browser cache created for this task. Re-run `find` for cache/temp names and record cleanup as green in `TEST-REPORT.md`.

- [ ] **Step 5: Commit final documentation and cleanup state**

```bash
git add README.md .gitignore TEST-REPORT.md
git commit -m "docs: add XDCLUB deployment guide"
git status --short
```

- [ ] **Step 6: Integrate the remote README-only main branch without overwriting user code**

Add remote `origin`, fetch `main`, verify it contains only `README.md` with `# xdclub`, then merge or rebase the local history onto `origin/main`. Resolve the README by keeping the completed deployment guide. Run the full test suite after integration.

- [ ] **Step 7: Push and verify GitHub**

Push the tested history to `origin/main`. Fetch `https://api.github.com/repos/xdclub945/xdclub/contents` and confirm the expected root files and latest commit are visible. If credentials lack push permission, preserve the local commits and report the exact missing repository authorization without attempting destructive workarounds.
