# XDCLUB Service Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover the interrupted audit fixes, add three service-screen OC backgrounds, refine the new-api-inspired header and free scrolling, rename the first service, add a configurable MC preview card, simplify the footer, and leave a clean Cloudflare Workers-ready branch.

**Architecture:** Keep the existing native HTML/CSS/ES modules and Worker static-assets entry. Preserve each supplied PNG under `assets/source`, deliver two lazy JPEG candidates per service screen, and extend the existing safe `textContent` configuration flow with three preview text fields. One passive/rAF scroll handler owns the single header's top/floating class; IntersectionObserver remains responsible only for reveal and active-section state.

**Tech Stack:** HTML5, CSS, browser ES modules, Node test runner, Playwright, Cloudflare Workers/Wrangler, macOS `sips`; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-30-xdclub-service-visual-refresh-design.md`

## Global Constraints

- Preserve Cloudflare Workers `main: ./src/worker.js`, `assets.directory: ./public`, and `env.ASSETS`; require no user variables, secrets, KV, D1, R2, service bindings, or other bindings.
- Preserve four vertical sections and use IDs exactly `home`, `service-one`, `service-two`, `service-three`.
- Keep the live service URL exactly `http://custom.xdclub.dpdns.org/` unless the user changes it later.
- Use only local assets; no remote JavaScript, fonts, images, inline event handlers, executable HTML sinks, or dynamic code evaluation.
- Preserve supplied image proportions; never use non-proportional transforms.
- Use safe `textContent`/attribute setters for config; service URLs accept only absolute `http:` or `https:`.
- Do not add dependencies or restructure unrelated working code.
- Use the bundled Node runtime and existing system Chrome for verification.
- Do not push, deploy, merge, fetch, or mutate remote state during plan execution.

---

### Task 1: Recover and Commit the Interrupted Final-Audit Fixes

**Files:**
- Modify as already present in working tree: `README.md`, `TEST-REPORT.md`, `public/app.js`, `public/styles.css`, `tests/responsive.test.mjs`, `tests/structure.test.mjs`
- Create report: `.superpowers/sdd/2026-08-30-xdclub-service-visual-refresh/task-1-report.md`

**Interfaces:**
- Consumes: uncommitted recovery diff left by the interrupted `final_remediation` agent at HEAD `61fc7fd`.
- Produces: clean committed baseline with exact home height, visible active nav, header fallback/transition, brand accessible-name sync, gated screenshots, bounded OC resources, face landmark and CLS checks.

- [ ] **Step 1: Audit the interrupted working tree before changing it**

Run:

```bash
git status --short
git diff --check
git diff -- README.md TEST-REPORT.md public/app.js public/styles.css tests/responsive.test.mjs tests/structure.test.mjs
```

Expected: exactly the six intended files are modified; `git diff --check` currently reports the Markdown trailing-space line in `TEST-REPORT.md` and no source-code whitespace error.

- [ ] **Step 2: Remove the Markdown whitespace error without changing claims**

Replace the two-space hard line break after the report date with a blank Markdown line. Run `git diff --check` and expect no output.

- [ ] **Step 3: Verify the interrupted code statically and in Node**

Run with the bundled Node path:

```bash
pnpm run check:syntax
pnpm test
```

Expected: syntax PASS and 29 Node tests PASS. If counts differ, record the actual count and diagnose before committing.

- [ ] **Step 4: Verify browser behavior without screenshot generation**

Run:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run test:browser
```

Expected: all tests PASS and `test-results/oc-review` is absent because `OC_REVIEW_SCREENSHOTS` is not set.

- [ ] **Step 5: Commit only the recovered final-audit work**

```bash
git add README.md TEST-REPORT.md public/app.js public/styles.css tests/responsive.test.mjs tests/structure.test.mjs
git commit -m "fix: recover interrupted OC audit remediations"
```

---

### Task 2: Preserve and Optimize the Three Service OC Assets

**Files:**
- Create: `assets/source/service-one-original.png`
- Create: `assets/source/service-two-original.png`
- Create: `assets/source/service-three-original.png`
- Create: `public/assets/service-one-640.jpg`
- Create: `public/assets/service-one-1024.jpg`
- Create: `public/assets/service-two-640.jpg`
- Create: `public/assets/service-two-1024.jpg`
- Create: `public/assets/service-three-640.jpg`
- Create: `public/assets/service-three-1024.jpg`
- Modify: `tests/structure.test.mjs`

**Interfaces:**
- Consumes: the three exact attached PNG paths and hashes from the design spec.
- Produces: same-origin responsive JPEGs used by Task 3 markup.

- [ ] **Step 1: Write a failing asset provenance test**

Add a table-driven Node test that, for each service, asserts the source PNG exists, has the exact SHA-256 from the spec, both JPEGs start with `ff d8 ff`, the 640 file is smaller than its source, and every delivery file is below 350 KB.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
pnpm exec node --test --test-name-pattern="service OC sources" tests/structure.test.mjs
```

Expected: FAIL because the nine files do not exist.

- [ ] **Step 3: Copy exact sources and create proportional derivatives**

Copy the exact inputs to the source paths, then run `sips` with JPEG quality 84:

```bash
sips -s format jpeg -s formatOptions 84 -Z 640 assets/source/service-one-original.png --out public/assets/service-one-640.jpg
sips -s format jpeg -s formatOptions 84 -Z 1024 assets/source/service-one-original.png --out public/assets/service-one-1024.jpg
```

Repeat for `service-two` and `service-three`. No crop, stretch, recolor, AI edit, metadata-dependent runtime, or temporary generated script is allowed.

- [ ] **Step 4: Verify hashes and dimensions**

Run `shasum -a 256` for all three sources and `sips -g pixelWidth -g pixelHeight` for all nine assets.

Expected: source hashes match the spec; each source and 1024 derivative is 1024×1536; each 640 derivative is 640×960.

- [ ] **Step 5: Run focused/full Node tests and commit**

```bash
pnpm exec node --test --test-name-pattern="service OC sources" tests/structure.test.mjs
pnpm test
git add assets/source/service-*-original.png public/assets/service-*.jpg tests/structure.test.mjs
git commit -m "feat: add responsive service OC artwork"
```

---

### Task 3: Rename Service One, Add Background Markup, MC Preview, and Footer Simplification

**Files:**
- Modify: `public/index.html`
- Modify: `public/site-config.json`
- Modify: `public/app.js`
- Modify: `tests/structure.test.mjs`
- Modify: `tests/security.test.mjs`

**Interfaces:**
- Consumes: six service JPEGs from Task 2 and current `applyService` config flow.
- Produces: exact four IDs, three `.service-art` pictures, MC preview fields, and copyright-only footer used by Tasks 4–5.

- [ ] **Step 1: Write failing structure/config tests**

Assert:

```js
assert.deepEqual(panels, ["home", "service-one", "service-two", "service-three"]);
assert.deepEqual(config.services.map(({ id }) => id), ["service-one", "service-two", "service-three"]);
assert.doesNotMatch(html, /(?:id|href|data-service-id)=["']#?custom["']/);
assert.equal(config.footer.siteUrl, undefined);
```

Also assert each service section owns a lazy `<picture class="service-art">` with its matching 640/1024 local srcset, empty alt, 1024×1536 dimensions and async decoding; the footer contains no link; `service-three` contains `preview-label`, `preview-value`, `preview-note` fields and no action anchor.

- [ ] **Step 2: Write a failing config behavior test**

Construct the existing minimal DOM-shaped test root and prove that:

```js
applyConfig(root, {
  services: [{
    id: "service-three",
    preview: { label: "服务器地址", value: "mc.xdclub.test:25565", note: "Java 版" }
  }]
});
```

updates three `textContent` values and never creates an `href`. Add a security assertion that service artwork paths are root-relative and contain no `/var/folders`, `file://`, or remote image URL.

- [ ] **Step 3: Run focused tests and verify RED**

```bash
pnpm exec node --test --test-name-pattern="four ordered|configuration contains|service backgrounds|Minecraft preview|same-origin" tests/structure.test.mjs tests/security.test.mjs
```

Expected: FAIL on the old `custom` ID, absent pictures/preview card, and footer links.

- [ ] **Step 4: Implement the semantic HTML/config changes**

Rename every first-service HTML hook to `service-one`, including `aria-labelledby` and nav href. Reorder header actions so the theme button precedes the nav. Remove `.top-sentinel` because Task 4 replaces its header observer.

For each service, add a decorative lazy picture with this concrete shape:

```html
<picture class="service-art" aria-hidden="true">
  <source srcset="/assets/service-one-640.jpg 640w, /assets/service-one-1024.jpg 1024w" sizes="(max-width: 760px) 100vw, 52vw" type="image/jpeg">
  <img class="service-oc" src="/assets/service-one-1024.jpg" width="1024" height="1536" alt="" loading="lazy" decoding="async">
</picture>
```

Use matching names for services two and three. Replace the fourth-screen action with:

```html
<div class="server-preview" data-service-preview aria-label="Minecraft 服务器信息">
  <span class="server-preview-label" data-service-field="preview-label">服务器地址</span>
  <code class="server-preview-value" data-service-field="preview-value">mc.example.com:25565</code>
  <span class="server-preview-note" data-service-field="preview-note">请在 public/site-config.json 中修改此处文本</span>
</div>
```

Leave the third-screen disabled service link unchanged. Footer markup becomes only the copyright span.

- [ ] **Step 5: Extend the safe config mapper minimally**

In `applyService`, update `preview.label`, `preview.value`, and `preview.note` through the existing `setText` helper when `service.preview` is an object. Keep action-link handling unchanged for panels that have an action. In `applyConfig`, reduce footer handling to copyright text only.

- [ ] **Step 6: Run Node/security tests and commit**

```bash
pnpm test
git diff --check
git add public/index.html public/site-config.json public/app.js tests/structure.test.mjs tests/security.test.mjs
git commit -m "feat: add service art and MC preview content"
```

---

### Task 4: Implement Free Scrolling, Service Background Layout, and Refined Header State

**Files:**
- Modify: `public/styles.css`
- Modify: `public/app.js`
- Modify: `tests/structure.test.mjs`
- Modify: `tests/responsive.test.mjs`

**Interfaces:**
- Consumes: reordered header, exact service IDs, `.service-art`, `.service-oc`, `.server-preview` from Task 3.
- Produces: 700ms 20px-threshold header, 22px/52px floating state, free scrolling, title row gap, responsive service art and MC card visuals.

- [ ] **Step 1: Add failing CSS/behavior contracts**

Static tests must reject any `scroll-snap-type`/`scroll-snap-align`, require `.hero-title` positive `row-gap`, require floating `border-radius: 22px`, `min-height: 52px`, 700ms reference easing, opaque fallback and supported glass override, and require `.service-oc { object-fit: cover; }` plus `.service-art { pointer-events: none; }`.

Playwright tests must show that at 390×844:

- scrollY 10 does not float;
- scrollY 24 floats and settles to 22px radius and 52px height;
- scrollY 0 restores top state;
- nav is the rightmost header action and its right edge is within 16px of the header's right content edge;
- an arbitrary scroll position within a service panel remains within 2px after 300ms;
- the two home-title direct spans have a positive computed row gap.

- [ ] **Step 2: Run focused tests and verify RED**

Run the style-contract Node test and Playwright grep for `mobile header|free scrolling|title spacing|rightmost`. Expected: FAIL on old snap CSS, 18px/650ms header, sentinel threshold and absent title gap.

- [ ] **Step 3: Implement the minimal header scroll state**

Remove sentinel header handling. In `setupViewportEffects`, use one passive scroll listener with one pending animation frame:

```js
let headerFrame = 0;
const syncHeader = () => {
  headerFrame = 0;
  header?.classList.toggle("is-floating", window.scrollY > 20);
};
const requestHeaderSync = () => {
  if (!headerFrame) headerFrame = window.requestAnimationFrame(syncHeader);
};
syncHeader();
window.addEventListener("scroll", requestHeaderSync, { passive: true });
```

Keep IntersectionObserver for reveals and active-section ratios. The no-IntersectionObserver fallback must reveal content but must not skip header scroll setup.

- [ ] **Step 4: Implement the CSS states and free scroll**

Delete all scroll-snap declarations. Add positive `row-gap` and raise hero line height to preserve separation. Keep top header full-width; floating state uses width `min(calc(100% - 16px), 832px)`, min-height 52px, radius 22px, compact padding, and 700ms requested easing for width/top/min-height/padding/border/background/shadow. Place nav last/right with `.header-actions { margin-left: auto; }`.

Service art uses one shared absolute right-side layer with a theme-aware horizontal gradient; mobile portrait makes it full-bleed and places `.service-content` on a readable lower surface card. Short landscape keeps text left and image right. `.server-preview` is a compact bordered surface with label, code value using `overflow-wrap: anywhere`, and note.

- [ ] **Step 5: Run focused/full tests and commit**

```bash
pnpm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm exec playwright test tests/responsive.test.mjs --grep "mobile header|free scrolling|title spacing|rightmost"
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run test:browser
git diff --check
git add public/styles.css public/app.js tests/structure.test.mjs tests/responsive.test.mjs
git commit -m "feat: refine service visuals and floating header"
```

---

### Task 5: Expand Multi-Viewport, Security, and Visual Regression Coverage

**Files:**
- Modify: `tests/responsive.test.mjs`
- Modify: `tests/security.test.mjs`
- Modify only for evidence-backed layout defects: `public/styles.css`, `public/app.js`

**Interfaces:**
- Consumes: completed four-screen implementation.
- Produces: trustworthy 19-viewport and representative screenshot evidence.

- [ ] **Step 1: Extend each viewport case to all four art layers**

For homepage and each service picture, decode `currentSrc` in a detached `Image`, assert 2:3, same origin, allowed matching 640/1024 path, `object-fit: cover`, and a documented source-relative face landmark inside the art bounds. Assert the visible section content and floating header do not overlap.

- [ ] **Step 2: Add MC/footer/ID browser assertions**

Verify service one live link at `#service-one`; service two remains disabled; service three has no action link and displays the three MC preview texts loaded from config; footer has no links and only the configured copyright.

- [ ] **Step 3: Add regression scans**

Use `rg`-equivalent Node assertions to ensure production/tests/docs contain no runtime `#custom`, `id="custom"`, `data-service-id="custom"`, old footer URL hook, temporary image paths, remote `<img>`, HTML sinks, debug statements, private-key markers or secret literals. Historical design docs may retain the old term and are excluded from this runtime scan.

- [ ] **Step 4: Run the full matrix and explicit screenshot audit**

Run browser tests normally, then with `OC_REVIEW_SCREENSHOTS=1`. Confirm exactly 28 screenshots. Inspect all seven representative sizes in both themes/top and floating states for face/eyes/chin, title spacing, service cards, MC card, right-aligned nav and header animation endpoints. Apply only root-cause CSS fixes backed by a failing test.

- [ ] **Step 5: Run security/audit/Worker checks and commit**

```bash
pnpm run check:syntax
pnpm test
pnpm run test:wrangler
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm run test:browser
pnpm audit --audit-level=high
pnpm exec wrangler deploy --dry-run
git diff --check
git add tests/responsive.test.mjs tests/security.test.mjs public/styles.css public/app.js
git commit -m "test: cover service art and free-scroll behavior"
```

If production files did not require fixes, omit them from `git add`.

---

### Task 6: Update Guidance, Final Verification, Cleanup, and Integration Readiness

**Files:**
- Modify: `README.md`
- Modify: `TEST-REPORT.md`
- Delete after final evidence: project-local `.pnpm-store/`, `work/`, `.wrangler/`, `test-results/`, `playwright-report/`, logs, reports, caches, prior `.superpowers` workspaces, and `node_modules/`

**Interfaces:**
- Consumes: actual Task 1–5 evidence.
- Produces: accurate customization/deployment docs and a clean local repository ready for a separately approved push/deploy.

- [ ] **Step 1: Update customization documentation**

Document `service-one` ID, three service artwork source/delivery paths, title spacing CSS location, MC preview config fields, copyright-only footer, and the unchanged no-binding Workers deployment. Remove old claims that services two and three are both reserved links or that footer has a site URL.

- [ ] **Step 2: Replace the test report with actual results only**

Record actual command counts, 19 viewport list, 28 temporary screenshot review results, free-scroll/header checks, new asset hashes/dimensions, Lighthouse unavailability without equivalence claims, HTTP service warning, Worker dry-run asset count, audit result and cleanup status.

- [ ] **Step 3: Inventory and clean exact disposable targets**

Stop exact project-local preview/Worker processes after validating their command lines. Inventory every project-local temp/cache path. Delete only confirmed paths. After all source files are committed and hashes verified, delete the four exact managed clipboard inputs used for the homepage and service art; every one has an identical tracked source copy. Never use a broad temp-directory glob.

- [ ] **Step 4: Run final verification before removing dependencies**

Run frozen install, syntax, Node, Wrangler, normal browser suite, explicit screenshot audit, high-severity audit, dry-run, diff check, fsck, asset hashes/dimensions, hygiene/secret scan and process scan. Delete all artifacts recreated by verification. Keep the current plan's SDD workspace only until its task and broad reviews finish.

- [ ] **Step 5: Commit tracked documentation/cleanup state**

```bash
git add README.md TEST-REPORT.md
git commit -m "docs: record verified service visual refresh"
```

Skip the commit if no tracked file changed.

- [ ] **Step 6: Verify integration target without mutation**

Confirm branch, remote redirect, live default branch and full local Worker tree. Do not push, deploy, publish, merge or fetch. After the final broad review is clean, delete the current and prior SDD workspaces plus `node_modules`, then use `superpowers:finishing-a-development-branch` to present integration choices.

