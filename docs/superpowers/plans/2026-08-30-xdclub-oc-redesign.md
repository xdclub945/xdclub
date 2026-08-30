# XDCLUB OC Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the supplied OC into the existing four-section XDCLUB Workers site, replace the visual system with the approved moon-blue-gray palette, and add a top-merged-to-rounded-floating header without regressing existing behavior.

**Architecture:** Keep the existing Cloudflare Worker plus static `public/` HTML/CSS/JavaScript architecture. Add responsive static OC derivatives and semantic hero markup, drive header/reveal states with `IntersectionObserver`, and keep theme/config/security logic in the existing files. No framework or production dependency is added.

**Tech Stack:** HTML5, CSS custom properties and media queries, native browser JavaScript, Cloudflare Workers Static Assets, Node test runner, Playwright, Wrangler 4, pnpm 11.

**Spec:** `docs/superpowers/specs/2026-08-30-xdclub-oc-redesign-design.md`

## Global Constraints

- Preserve the four full-screen sections, service configuration flow, theme persistence, footer, branded 404, Worker `ASSETS` binding, and security headers.
- Preserve the supplied OC source exactly at 1024×1536 (2:3); do not redraw, recolor, stretch, compress, or overwrite it.
- Use dark tokens `#0D121B`, `#090E16`, `#171E2A`, `#F0F2F7`, `#AAB2C2`, `#8299C1`, `#6079A6`, and restrained `#8B6473`.
- Use light tokens `#F3F5F8`, `#E7EBF1`, `#FAFBFD`, `#18202B`, `#5F6B7B`, `#526B98`, `#3E5684`, and restrained `#76505F`.
- The OC face, hairline, eyes, chin, and neck accessory must remain fully visible at every tested viewport.
- At absolute top the header merges into the page; everywhere else it is a detached Apple-style continuous rounded rectangle.
- Use a 600–700ms `cubic-bezier(0.16, 1, 0.3, 1)` header transition without bounce or layout shift.
- Keep all production assets same-origin; do not add `innerHTML`, inline handlers, remote scripts, secrets, tokens, or new npm packages.
- Keep `wrangler.jsonc` entry `./src/worker.js`, assets directory `./public`, binding `ASSETS`, and compatibility date `2026-08-28` unchanged.
- Respect `prefers-reduced-motion`; content must remain visible and navigation functional without JavaScript or `IntersectionObserver`.

---

## File Map

### Create

- `assets/source/oc-character-original.png` — untouched archival source, excluded from Worker static delivery because it is outside `public/`.
- `public/assets/oc-character-640.jpg` — high-quality mobile derivative.
- `public/assets/oc-character-1024.jpg` — high-quality tablet/desktop derivative.

### Modify

- `public/index.html` — top sentinel, split brand markup, responsive OC `<picture>`, reveal hooks, fixed image dimensions.
- `public/styles.css` — moon-blue-gray theme, cinematic hero, two-state header, responsive face-safe positioning, restrained reveal motion.
- `public/app.js` — header, active section, and reveal observers; existing config/theme behavior remains intact.
- `public/_headers` — cache policy for production OC derivatives if the existing file lacks a suitable static image rule.
- `tests/structure.test.mjs` — static markup, image, brand, palette, and observer contract checks.
- `tests/responsive.test.mjs` — expanded viewport matrix, header-state transition, overlap, image-ratio, and reduced-motion checks.
- `tests/security.test.mjs` — same-origin OC and no unsafe DOM/handler regression checks.
- `README.md` — content customization plus OC asset/visual behavior notes.
- `TEST-REPORT.md` — actual commands, viewports, audit results, yellow risks, and cleanup record.

### Preserve Without Architectural Changes

- `src/worker.js`, `wrangler.jsonc`, `public/theme-init.js`, `public/site-config.json`, `public/404.html`, and service URL validation behavior.

---

### Task 1: Preserve and Optimize the OC Asset

**Files:**
- Create: `assets/source/oc-character-original.png`
- Create: `public/assets/oc-character-640.jpg`
- Create: `public/assets/oc-character-1024.jpg`
- Modify: `tests/structure.test.mjs`

**Interfaces:**
- Consumes: supplied file `/var/folders/gn/0ty5_1nj0dgg7vg0bq0d5j9c0000gn/T/codex-clipboard-06b34bec-21c3-437e-a2f8-6c7c8dac8e41.png`.
- Produces: immutable source PNG plus `/assets/oc-character-640.jpg` and `/assets/oc-character-1024.jpg` for Task 2 markup.

- [ ] **Step 1: Add failing source/derivative asset assertions**

Add imports and a focused test to `tests/structure.test.mjs`:

```js
import { access, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

test("OC source and responsive derivatives are preserved", async () => {
  const [source, mobile, desktop] = await Promise.all([
    readFile("assets/source/oc-character-original.png"),
    readFile("public/assets/oc-character-640.jpg"),
    readFile("public/assets/oc-character-1024.jpg"),
  ]);

  assert.equal(source.subarray(1, 4).toString(), "PNG");
  assert.deepEqual([...mobile.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.deepEqual([...desktop.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.ok(mobile.length < source.length);
  assert.ok(desktop.length <= source.length);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "d6a146171983500f413e578658e8a2476aaebd430672c45c40944ba2a3687edf",
  );
});
```

Do not duplicate the existing `access`, `readFile`, or `stat` import; extend it only if necessary.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm exec node --test --test-name-pattern="OC source" tests/structure.test.mjs
```

Expected: FAIL with `ENOENT` for `assets/source/oc-character-original.png`.

- [ ] **Step 3: Create exact source and high-quality derivatives**

Create directories, copy the source byte-for-byte, then generate JPEG derivatives without modifying the PNG:

```bash
mkdir -p assets/source public/assets
cp /var/folders/gn/0ty5_1nj0dgg7vg0bq0d5j9c0000gn/T/codex-clipboard-06b34bec-21c3-437e-a2f8-6c7c8dac8e41.png assets/source/oc-character-original.png
sips --resampleWidth 640 -s format jpeg -s formatOptions 92 assets/source/oc-character-original.png --out public/assets/oc-character-640.jpg
sips --resampleWidth 1024 -s format jpeg -s formatOptions 92 assets/source/oc-character-original.png --out public/assets/oc-character-1024.jpg
```

Verify dimensions and source identity:

```bash
sips -g pixelWidth -g pixelHeight assets/source/oc-character-original.png public/assets/oc-character-640.jpg public/assets/oc-character-1024.jpg
shasum -a 256 /var/folders/gn/0ty5_1nj0dgg7vg0bq0d5j9c0000gn/T/codex-clipboard-06b34bec-21c3-437e-a2f8-6c7c8dac8e41.png assets/source/oc-character-original.png
```

Expected: source hashes match; source is 1024×1536; mobile is 640×960; desktop is 1024×1536.

- [ ] **Step 4: Re-run the focused test**

Run:

```bash
pnpm exec node --test --test-name-pattern="OC source" tests/structure.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the asset pipeline output**

```bash
git add assets/source/oc-character-original.png public/assets/oc-character-640.jpg public/assets/oc-character-1024.jpg tests/structure.test.mjs
git commit -m "feat: add preserved responsive OC assets"
```

---

### Task 2: Add Semantic Hero and Split Brand Markup

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `tests/structure.test.mjs`

**Interfaces:**
- Consumes: OC derivatives from Task 1 and existing `data-config="brand"`, `home.*` configuration hooks.
- Produces: `.top-sentinel`, `.brand-mark`, `.brand-xd`, `.brand-club`, `.hero-layout`, `.hero-art`, `.hero-oc`, and `[data-reveal]` hooks used by Tasks 3 and 4.

- [ ] **Step 1: Write failing semantic markup tests**

Add to `tests/structure.test.mjs`:

```js
test("hero exposes split brand, top sentinel and responsive OC artwork", async () => {
  const html = await readRequired("public/index.html");

  assert.match(html, /class="top-sentinel"[^>]*aria-hidden="true"/);
  assert.match(html, /class="brand-xd">XD<\/span>/);
  assert.match(html, /class="brand-club">club<\/span>/);
  assert.match(html, /<picture\b[^>]*class="hero-art"/);
  assert.match(html, /srcset="\/assets\/oc-character-640\.jpg 640w, \/assets\/oc-character-1024\.jpg 1024w"/);
  assert.match(html, /class="hero-oc"[^>]*width="1024"[^>]*height="1536"/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /data-reveal/);
});
```

Update the existing brand test from literal `XDCLUB` text to semantic split spans inside the same `href="#home"` anchor.

- [ ] **Step 2: Verify the new markup test fails**

Run:

```bash
pnpm exec node --test --test-name-pattern="hero exposes|header brand" tests/structure.test.mjs
```

Expected: FAIL because `.top-sentinel`, split brand spans, and OC markup do not exist.

- [ ] **Step 3: Implement the minimal semantic markup**

Immediately after the skip link, add:

```html
<span class="top-sentinel" aria-hidden="true"></span>
```

Replace the brand link contents with:

```html
<a class="brand" href="#home" aria-label="XDclub，返回首页">
  <span class="brand-mark" aria-hidden="true">
    <span class="brand-xd">XD</span><span class="brand-club">club</span>
  </span>
</a>
```

Preserve the existing configurable brand without replacing the two spans. In `applyConfig`, replace the current brand `setText` call with:

```js
if (typeof config.brand === "string") {
  const brand = config.brand.trim();
  setText(root, ".brand-xd", brand.slice(0, 2));
  setText(root, ".brand-club", brand.slice(2));
}
```

The CSS in Task 3 renders `.brand-club` lowercase, so the existing `XDCLUB` configuration remains visually `XDclub` while preserving the configured characters.

Wrap the first panel content with `.hero-layout`, retain `.home-copy`, add `data-reveal`, and add:

```html
<picture class="hero-art" aria-label="XDclub 原创角色">
  <source
    srcset="/assets/oc-character-640.jpg 640w, /assets/oc-character-1024.jpg 1024w"
    sizes="(max-width: 760px) 100vw, (max-width: 1180px) 52vw, 48vw"
    type="image/jpeg"
  >
  <img
    class="hero-oc"
    src="/assets/oc-character-1024.jpg"
    width="1024"
    height="1536"
    alt="XDclub 原创角色"
    fetchpriority="high"
    decoding="async"
  >
</picture>
```

Add `data-reveal` only to `.home-copy` and each `.service-content`; do not animate every child node.

- [ ] **Step 4: Run structure and security tests**

Run:

```bash
pnpm test
```

Expected: all Node tests PASS. If the security suite rejects `aria-label` or local image references, adjust the assertion rather than weakening the rule.

- [ ] **Step 5: Commit semantic hero markup**

```bash
git add public/index.html public/app.js tests/structure.test.mjs
git commit -m "feat: add semantic OC hero markup"
```

---

### Task 3: Implement Moon-Blue-Gray Theme and Face-Safe Responsive Layout

**Files:**
- Modify: `public/styles.css`
- Modify: `tests/structure.test.mjs`
- Modify: `tests/responsive.test.mjs`

**Interfaces:**
- Consumes: markup hooks from Task 2.
- Produces: theme tokens, `.hero-layout`, `.hero-art`, `.hero-oc`, responsive `object-position`, top and floating header states, and reduced-motion fallbacks used by Task 4 behavior.

- [ ] **Step 1: Add failing static style-contract tests**

Extend the existing style test in `tests/structure.test.mjs`:

```js
assert.match(css, /--bg:\s*#f3f5f8/i);
assert.match(css, /--text:\s*#18202b/i);
assert.match(css, /--accent:\s*#526b98/i);
assert.match(css, /:root\[data-theme=["']dark["']\][^{]*\{[^}]*--bg:\s*#0d121b/is);
assert.match(css, /--text:\s*#f0f2f7/i);
assert.match(css, /--accent:\s*#8299c1/i);
assert.match(css, /\.hero-oc\s*\{[^}]*object-fit:\s*cover/is);
assert.match(css, /\.hero-art\s*\{[^}]*pointer-events:\s*none/is);
assert.match(css, /\.site-header\.is-floating/);
assert.match(css, /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
```

- [ ] **Step 2: Run the style-contract test and verify failure**

Run:

```bash
pnpm exec node --test --test-name-pattern="styles define" tests/structure.test.mjs
```

Expected: FAIL on the first moon-blue-gray token assertion.

- [ ] **Step 3: Replace theme tokens and implement cinematic hero CSS**

Replace the current gold variables with semantic blue-gray variables. Keep existing variable names only where other selectors still consume them, but add canonical tokens:

```css
:root {
  --bg: #f3f5f8;
  --bg-deep: #e7ebf1;
  --surface: rgba(250, 251, 253, 0.78);
  --surface-solid: #fafbfd;
  --text: #18202b;
  --text-soft: #5f6b7b;
  --accent: #526b98;
  --accent-strong: #3e5684;
  --accent-soft: rgba(82, 107, 152, 0.13);
  --secondary: #76505f;
  --line: rgba(55, 73, 104, 0.20);
  --header: rgba(250, 251, 253, 0.78);
}

:root[data-theme="dark"] {
  --bg: #0d121b;
  --bg-deep: #090e16;
  --surface: rgba(23, 30, 42, 0.72);
  --surface-solid: #171e2a;
  --text: #f0f2f7;
  --text-soft: #aab2c2;
  --accent: #8299c1;
  --accent-strong: #6079a6;
  --accent-soft: rgba(130, 153, 193, 0.14);
  --secondary: #8b6473;
  --line: rgba(174, 190, 219, 0.20);
  --header: rgba(13, 18, 27, 0.72);
}
```

Map previous `--gold*` uses to the semantic accent variables, then implement:

```css
.panel-home { padding-inline: 0; }

.top-sentinel {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.hero-layout {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 100svh;
  grid-template-columns: minmax(0, 52%) minmax(0, 48%);
  align-items: center;
}

.home-copy {
  z-index: 3;
  width: min(100%, 760px);
  margin-left: max(26px, 8vw);
  padding-right: clamp(20px, 4vw, 64px);
}

.hero-art {
  position: absolute;
  z-index: 1;
  inset: 0 0 0 auto;
  display: block;
  width: min(59vw, 980px);
  overflow: hidden;
  background: #f7f6f4;
  pointer-events: none;
}

.hero-art::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 74%, transparent) 18%, transparent 58%);
  content: "";
}

.hero-oc {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 0%;
}
```

Use a static rgba fallback before any `color-mix()` declaration so older browsers keep legible text.

- [ ] **Step 4: Implement responsive face-safe rules**

Add explicit breakpoints rather than stretching the image:

```css
@media (max-width: 1180px) {
  .hero-layout { grid-template-columns: minmax(0, 54%) minmax(0, 46%); }
  .hero-art { width: 54vw; }
  .hero-oc { object-position: 62% 0%; }
}

@media (max-width: 760px) and (orientation: portrait) {
  .hero-layout { display: block; }
  .hero-art { inset: 0; width: 100%; height: 100%; }
  .hero-art::after { background: linear-gradient(0deg, var(--bg) 4%, rgba(13, 18, 27, 0.9) 30%, transparent 72%); }
  .hero-oc { object-position: 62% 0%; }
  .home-copy {
    position: absolute;
    z-index: 3;
    right: clamp(18px, 5vw, 28px);
    bottom: max(46px, calc(env(safe-area-inset-bottom) + 28px));
    left: clamp(18px, 5vw, 28px);
    width: auto;
    margin: 0;
    padding: clamp(18px, 5vw, 28px);
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--surface);
  }
}

@media (orientation: landscape) and (max-height: 520px) {
  .hero-layout { min-height: max(100svh, 430px); }
  .hero-art { width: 48%; }
  .hero-oc { object-position: 62% 0%; }
}
```

If screenshots show the face too high or low, adjust only the percentage/edge position per breakpoint; never change the source or use non-proportional transforms.

- [ ] **Step 5: Implement split brand and two visual header states**

Keep `.site-header` as one fixed wrapper. The default state is top-merged; `.is-floating` is detached:

```css
.site-header {
  inset: 0 0 auto;
  width: min(100%, 100%);
  margin-inline: auto;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transition:
    width 650ms cubic-bezier(0.16, 1, 0.3, 1),
    top 650ms cubic-bezier(0.16, 1, 0.3, 1),
    padding 650ms cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 650ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 650ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 650ms cubic-bezier(0.16, 1, 0.3, 1);
}

.site-header.is-floating {
  top: max(10px, env(safe-area-inset-top));
  width: min(calc(100% - 24px), 832px);
  border-color: var(--line);
  border-radius: 18px;
  background: var(--header);
  box-shadow: 0 10px 36px rgba(4, 8, 16, 0.16), inset 0 1px rgba(255, 255, 255, 0.08);
}

.brand-mark { display: inline-flex; align-items: baseline; letter-spacing: -0.035em; }
.brand-xd { color: var(--text); font-weight: 750; }
.brand-club { color: var(--accent); font-weight: 520; text-transform: lowercase; }
```

Apply `backdrop-filter` only to `.site-header.is-floating` within `@supports`; use the solid-enough `--header` fallback otherwise.

- [ ] **Step 6: Run Node tests**

Run:

```bash
pnpm test
```

Expected: all Node tests PASS.

- [ ] **Step 7: Commit visual system and responsive layout**

```bash
git add public/styles.css tests/structure.test.mjs
git commit -m "feat: add moon blue responsive OC layout"
```

---

### Task 4: Add Header, Active Navigation, and Reveal Observers

**Files:**
- Modify: `public/app.js`
- Modify: `tests/responsive.test.mjs`

**Interfaces:**
- Consumes: `.top-sentinel`, `.site-header`, `.panel[id]`, `.section-nav a`, and `[data-reveal]` from Tasks 2–3.
- Produces: `.is-floating`, `.is-visible`, and `aria-current="page"`; no public API or config format changes.

- [ ] **Step 1: Add failing Playwright behavior tests**

Add to `tests/responsive.test.mjs`:

```js
test("header merges at top and becomes rounded floating navigation after scroll", async ({ page }) => {
  await page.goto("/");
  const header = page.locator(".site-header");

  await expect(header).not.toHaveClass(/is-floating/);
  await page.locator("#custom").scrollIntoViewIfNeeded();
  await expect(header).toHaveClass(/is-floating/);
  await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).not.toBe("0px");

  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(header).not.toHaveClass(/is-floating/);
});

test("active section navigation follows the visible panel", async ({ page }) => {
  await page.goto("/");
  await page.locator("#service-two").scrollIntoViewIfNeeded();
  await expect(page.locator('.section-nav a[href="#service-two"]')).toHaveAttribute("aria-current", "page");
});

test("reduced motion keeps reveal content visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-reveal]").first()).toBeVisible();
  expect(await page.locator("[data-reveal]").first().evaluate((node) => getComputedStyle(node).transform)).toBe("none");
});
```

- [ ] **Step 2: Run the focused browser tests and verify failure**

Run:

```bash
pnpm exec playwright test tests/responsive.test.mjs --grep "header merges|active section|reduced motion"
```

Expected: FAIL because the observer-driven classes and `aria-current` updates are absent.

- [ ] **Step 3: Implement observer setup in `public/app.js`**

Add a single setup function without new dependencies:

```js
function setupViewportEffects() {
  const header = document.querySelector(".site-header");
  const sentinel = document.querySelector(".top-sentinel");
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  const panels = [...document.querySelectorAll(".panel[id]")];
  const navLinks = [...document.querySelectorAll(".section-nav a")];

  document.documentElement.classList.add("effects-ready");

  if (!("IntersectionObserver" in window)) {
    for (const node of reveals) node.classList.add("is-visible");
    return;
  }

  if (header && sentinel) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-floating", !entry.isIntersecting);
    }, { threshold: 1 }).observe(sentinel);
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.18 });

  for (const node of reveals) revealObserver.observe(node);

  const sectionRatios = new Map(panels.map((panel) => [panel.id, 0]));
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      sectionRatios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
    }

    const [visibleId, visibleRatio] = [...sectionRatios.entries()]
      .sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!visibleId || visibleRatio === 0) return;

    for (const link of navLinks) {
      const active = link.hash === `#${visibleId}`;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }, { threshold: [0.35, 0.6] });

  for (const panel of panels) sectionObserver.observe(panel);
}
```

Call `setupViewportEffects()` once at the end of `start()` after existing theme listeners are registered and before or after `loadConfig`; configuration loading must not re-register observers.

- [ ] **Step 4: Add reveal CSS and reduced-motion fallback**

In `public/styles.css`, add:

```css
[data-reveal] {
  opacity: 1;
  transform: none;
  transition: opacity 560ms ease, transform 560ms cubic-bezier(0.16, 1, 0.3, 1);
}

.effects-ready [data-reveal] {
  opacity: 0;
  transform: translateY(16px);
}

.effects-ready [data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .effects-ready [data-reveal] { opacity: 1; transform: none; }
  .site-header { transition: none; }
}
```

Because `.effects-ready` is added only by the successfully loaded module, content remains visible if JavaScript is disabled or the module fails; do not modify `theme-init.js` or introduce a second initialization script.

- [ ] **Step 5: Run focused and full browser tests**

Run:

```bash
pnpm exec playwright test tests/responsive.test.mjs --grep "header merges|active section|reduced motion"
pnpm run test:browser
```

Expected: focused tests PASS, then all browser tests PASS.

- [ ] **Step 6: Commit interaction behavior**

```bash
git add public/app.js public/styles.css tests/responsive.test.mjs
git commit -m "feat: add fluid floating navigation states"
```

---

### Task 5: Expand Responsive, Accessibility, Security, and Image Regression Coverage

**Files:**
- Modify: `tests/responsive.test.mjs`
- Modify: `tests/security.test.mjs`
- Modify: `public/_headers`

**Interfaces:**
- Consumes: completed markup, styles, observers, and OC assets.
- Produces: complete viewport matrix and regression evidence required for final report.

- [ ] **Step 1: Replace the viewport matrix with all approved sizes**

Use:

```js
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 667, height: 375 },
  { width: 812, height: 375 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1180, height: 820 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
  { width: 2560, height: 1440 },
];
```

- [ ] **Step 2: Add failing image ratio and collision assertions inside each viewport case**

After navigation, collect:

```js
const hero = await page.evaluate(() => {
  const image = document.querySelector(".hero-oc");
  const copy = document.querySelector(".home-copy");
  const header = document.querySelector(".site-header");
  const imageRect = image.getBoundingClientRect();
  const copyRect = copy.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  return {
    naturalRatio: image.naturalWidth / image.naturalHeight,
    objectFit: getComputedStyle(image).objectFit,
    objectPosition: getComputedStyle(image).objectPosition,
    copyImageOverlap: overlap(copyRect, imageRect),
    headerCopyOverlap: overlap(headerRect, copyRect),
  };
});

expect(hero.naturalRatio).toBeCloseTo(2 / 3, 3);
expect(hero.objectFit).toBe("cover");
expect(hero.objectPosition).toMatch(/62%/);
expect(hero.headerCopyOverlap).toBe(0);
```

Do not require `copyImageOverlap === 0` on mobile because the approved design intentionally overlays a readable panel on the art layer; instead assert the copy background is nontransparent and manually inspect screenshots for face occlusion.

- [ ] **Step 3: Add same-origin image and cache security tests**

Add to `tests/security.test.mjs`:

```js
test("OC assets stay same-origin and markup does not expose local paths", async () => {
  const html = await readFile("public/index.html", "utf8");
  assert.doesNotMatch(html, /\/var\/folders|file:\/\//i);
  assert.doesNotMatch(html, /<img[^>]+src=["']https?:\/\//i);
  assert.match(html, /src="\/assets\/oc-character-1024\.jpg"/);
});
```

If `public/_headers` does not already give immutable caching to fingerprint-free images, add a conservative rule:

```text
/assets/*
  Cache-Control: public, max-age=86400
```

Do not mark non-fingerprinted images immutable because they may be replaced in a future redesign.

- [ ] **Step 4: Run complete local verification**

Run:

```bash
pnpm run check:syntax
pnpm test
pnpm run test:wrangler
pnpm run test:browser
pnpm audit --audit-level=high
```

Expected: all commands PASS and audit reports no high-severity vulnerabilities.

- [ ] **Step 5: Capture temporary screenshots for manual face review**

Use Playwright screenshots for these representative sizes only: 320×568, 390×844, 844×390, 768×1024, 1366×768, 1920×1080, and 2560×1080. Store them under `test-results/oc-review/`, review face/hair/chin/neck, header shape, text overlap, and light/dark contrast, then delete the directory in Task 7.

- [ ] **Step 6: Commit regression coverage and any minimal fixes**

```bash
git add tests/responsive.test.mjs tests/security.test.mjs public/_headers public/styles.css
git commit -m "test: cover OC layout and floating header ratios"
```

---

### Task 6: Run Production Audit and Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `TEST-REPORT.md`
- Modify only if audit finds a real issue: `public/index.html`, `public/styles.css`, `public/app.js`

**Interfaces:**
- Consumes: verified implementation and actual command outputs.
- Produces: accurate deployment/customization guidance and red-yellow-green evidence.

- [ ] **Step 1: Run Wrangler production dry run**

Run:

```bash
pnpm exec wrangler deploy --dry-run
```

Expected: Worker entry and static assets resolve; no missing `src/worker.js` or `public/` error.

- [ ] **Step 2: Start the production-like local Worker**

Run:

```bash
pnpm exec wrangler dev --port 8787
```

Keep the process in a managed terminal session for the next audit steps; do not create an untracked launch script.

- [ ] **Step 3: Run Lighthouse when available**

First detect an existing executable:

```bash
command -v lighthouse
```

If present, run mobile and desktop audits against `http://127.0.0.1:8787/` and write temporary JSON:

```bash
mkdir -p test-results/lighthouse
lighthouse http://127.0.0.1:8787/ --form-factor=mobile --output=json --output-path=test-results/lighthouse/mobile.json --chrome-flags="--headless --no-sandbox"
lighthouse http://127.0.0.1:8787/ --preset=desktop --output=json --output-path=test-results/lighthouse/desktop.json --chrome-flags="--headless --no-sandbox"
```

If absent, do not install a permanent dependency; record “Lighthouse CLI unavailable” and use the already executed Playwright resource/layout/accessibility/security checks as the equivalent audit. Never invent scores.

- [ ] **Step 4: Fix real red/yellow issues and rerun their checks**

Examples of blocking red issues: missing image, distorted ratio, clipped face, horizontal overflow, runtime exception, missing security header, keyboard-inaccessible control, or failed Worker dry run. Make the smallest root-cause fix, then rerun the exact failing test and the full relevant suite.

- [ ] **Step 5: Update README with exact customization boundaries**

Document:

```text
- Text and service URLs: public/site-config.json
- OC source: assets/source/oc-character-original.png
- Delivered derivatives: public/assets/oc-character-640.jpg and oc-character-1024.jpg
- Replacing the OC requires regenerating both derivatives while preserving 2:3 markup dimensions or updating those dimensions deliberately.
- Deployment remains Cloudflare Workers with npx wrangler deploy; no variables, KV, D1, R2, or extra bindings.
```

- [ ] **Step 6: Replace TEST-REPORT claims with actual results**

Record only executed commands, actual pass counts, tested viewport list, screenshot review findings, Lighthouse results or explicit unavailability, Worker dry-run result, dependency audit result, known HTTP external-service yellow risk, and cleanup performed.

- [ ] **Step 7: Commit documentation and audit-driven fixes**

```bash
git add README.md TEST-REPORT.md public/index.html public/styles.css public/app.js
git commit -m "docs: record verified OC redesign results"
```

If no production files changed in this task, omit them from `git add`.

---

### Task 7: Final Verification, Cleanup, and Integration Readiness

**Files:**
- Delete after validation: `.superpowers/`, `test-results/`, `playwright-report/`, `.wrangler/`, trace files, screenshots, logs, and other clearly disposable artifacts.
- Inspect: all tracked and untracked files.

**Interfaces:**
- Consumes: all implementation commits and test evidence.
- Produces: clean branch ready for GitHub upload and Cloudflare Workers deployment.

- [ ] **Step 1: Stop the visual companion and local Worker sessions**

Stop the exact managed sessions started during brainstorming/testing. For the visual companion, use:

```bash
bash /Users/zeonjyuwai/.codex/plugins/cache/openai-curated-remote/superpowers/6.3.0/skills/brainstorming/scripts/stop-server.sh /Users/zeonjyuwai/Documents/Codex/2026-08-30/bang-w/.superpowers/brainstorm/17487-1788040340
```

- [ ] **Step 2: Inventory cleanup targets before deletion**

Run:

```bash
find . -maxdepth 3 \( -name '.superpowers' -o -name '.wrangler' -o -name 'test-results' -o -name 'playwright-report' -o -name '*.log' -o -name '*.tmp' -o -name '*.temp' \) -print
git status --short
```

Inspect every result. Do not delete source, OC production assets, lockfiles, fonts, design docs, plans, or files with uncertain purpose.

- [ ] **Step 3: Delete only confirmed disposable paths**

After the inventory confirms they are disposable, remove only these exact project-local paths, then repeat the inventory:

```bash
rm -rf -- /Users/zeonjyuwai/Documents/Codex/2026-08-30/bang-w/.superpowers
rm -rf -- /Users/zeonjyuwai/Documents/Codex/2026-08-30/bang-w/test-results
rm -rf -- /Users/zeonjyuwai/Documents/Codex/2026-08-30/bang-w/playwright-report
rm -rf -- /Users/zeonjyuwai/Documents/Codex/2026-08-30/bang-w/.wrangler
```

Do not run system-wide cache cleanup and do not use broad home-directory targets.

- [ ] **Step 4: Run final verification from the cleaned tree**

Reinstall only if `node_modules` was deliberately removed, then run:

```bash
pnpm install --frozen-lockfile
pnpm run check:syntax
pnpm test
pnpm run test:wrangler
pnpm run test:browser
pnpm audit --audit-level=high
pnpm exec wrangler deploy --dry-run
git diff --check
git fsck --no-progress
```

Expected: every command PASS; no high-severity audit findings; Wrangler resolves `src/worker.js` and `public/`.

- [ ] **Step 5: Inspect final repository hygiene**

Run:

```bash
git status --short
git diff --stat HEAD~6..HEAD
rg -n "console\.(log|debug)|debugger|TODO|TBD|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|api[_-]?key|secret" public src tests README.md TEST-REPORT.md
```

Expected: no temporary/unrelated files, no debug statements, no secrets, and only intentional source/assets/docs/tests changes. Existing deliberate `console.warn` for configuration fallback is allowed.

- [ ] **Step 6: Create final cleanup commit only if tracked cleanup/docs changed**

```bash
git add -u
git add README.md TEST-REPORT.md
git commit -m "chore: finalize verified OC redesign"
```

Skip the commit when the worktree is already clean.

- [ ] **Step 7: Verify GitHub integration target before any remote mutation**

Confirm the remote, branch, and remote default branch contain `src/worker.js` plus `public/`:

```bash
git remote -v
git branch --show-current
git ls-remote --heads origin
```

Do not push a flattened file layout. The intended target remains `xdclub945/xdclub`, with `main` containing the complete directory structure. Push/upload only after all previous checks pass and report the resulting commit SHA and Cloudflare deployment status truthfully.
