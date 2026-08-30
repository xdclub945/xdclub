import { test, expect } from "@playwright/test";

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

const reviewViewports = new Set([
  "320x568",
  "390x844",
  "844x390",
  "768x1024",
  "1366x768",
  "1920x1080",
  "2560x1080",
]);
const captureReviewScreenshots = process.env.OC_REVIEW_SCREENSHOTS === "1";

async function floatingHeaderMetrics(page) {
  return page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const content = document.querySelector("#custom .service-content");
    const headerRect = header.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const overlap = Math.max(0, Math.min(headerRect.right, contentRect.right) - Math.max(headerRect.left, contentRect.left))
      * Math.max(0, Math.min(headerRect.bottom, contentRect.bottom) - Math.max(headerRect.top, contentRect.top));

    return {
      borderRadius: getComputedStyle(header).borderRadius,
      headerContentOverlap: overlap,
    };
  });
}

for (const viewport of viewports) {
  test(`four-section layout and OC art fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "dark" });
    const response = await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    expect(response?.status()).toBe(200);
    await expect(page.locator(".panel")).toHaveCount(4);

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const bounds = document.querySelector(selector).getBoundingClientRect();
        return { top: bounds.top, height: bounds.height };
      };

      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        home: rect(".panel-home"),
        art: rect(".hero-art"),
        heroLayout: rect(".hero-layout"),
        serviceHeights: [...document.querySelectorAll(".panel-service")].map((panel) => panel.getBoundingClientRect().height),
        fontReady: document.fonts.check('16px "Manrope"'),
      };
    });

    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.fontReady).toBe(true);
    const expectedHomeHeight = viewport.height <= 520 && viewport.width > viewport.height
      ? Math.max(viewport.height, 430)
      : viewport.height;
    expect(Math.abs(layout.home.height - expectedHomeHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.art.height - expectedHomeHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.heroLayout.height - expectedHomeHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.home.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.art.top - layout.home.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.heroLayout.top - layout.home.top)).toBeLessThanOrEqual(1);
    for (const height of layout.serviceHeights) expect(height).toBeGreaterThanOrEqual(viewport.height - 1);

    const hero = await page.evaluate(async () => {
      const image = document.querySelector(".hero-oc");
      const copy = document.querySelector(".home-copy");
      const header = document.querySelector(".site-header");
      const source = new Image();
      source.src = image.currentSrc;
      await source.decode();
      const imageRect = image.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

      return {
        naturalRatio: source.naturalWidth / source.naturalHeight,
        currentSrc: image.currentSrc,
        objectFit: getComputedStyle(image).objectFit,
        objectPosition: getComputedStyle(image).objectPosition,
        copyBackground: getComputedStyle(copy).backgroundColor,
        copyImageOverlap: overlap(copyRect, imageRect),
        headerCopyOverlap: overlap(headerRect, copyRect),
        faceLandmark: (() => {
          // Maintainable source-relative point near the visible face center:
          // x=55%, y=15% in the preserved 1024x1536 OC source.
          const scale = Math.max(imageRect.width / source.naturalWidth, imageRect.height / source.naturalHeight);
          const renderedWidth = source.naturalWidth * scale;
          const renderedHeight = source.naturalHeight * scale;
          const x = imageRect.left + (imageRect.width - renderedWidth) * 0.62 + renderedWidth * 0.55;
          const y = imageRect.top + renderedHeight * 0.15;
          return {
            insideArt: x >= imageRect.left && x <= imageRect.right && y >= imageRect.top && y <= imageRect.bottom,
            insideCopy: x >= copyRect.left && x <= copyRect.right && y >= copyRect.top && y <= copyRect.bottom,
          };
        })(),
      };
    });

    expect(hero.naturalRatio).toBeCloseTo(2 / 3, 3);
    const currentUrl = new URL(hero.currentSrc);
    expect(currentUrl.origin).toBe("http://127.0.0.1:8787");
    expect(["/assets/oc-character-640.jpg", "/assets/oc-character-1024.jpg"]).toContain(currentUrl.pathname);
    if (viewport.width <= 430 && viewport.height > viewport.width) {
      expect(currentUrl.pathname).toBe("/assets/oc-character-640.jpg");
    }
    expect(hero.objectFit).toBe("cover");
    expect(hero.objectPosition).toMatch(/62%/);
    expect(hero.headerCopyOverlap).toBe(0);
    expect(hero.faceLandmark.insideArt).toBe(true);
    expect(hero.faceLandmark.insideCopy).toBe(false);
    if (viewport.width <= 760 && viewport.height > viewport.width) {
      expect(hero.copyBackground).not.toBe("rgba(0, 0, 0, 0)");
    }

    const reviewKey = `${viewport.width}x${viewport.height}`;
    if (captureReviewScreenshots && reviewViewports.has(reviewKey)) {
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-top-dark.png`, fullPage: false });
    }

    await page.locator("#custom").scrollIntoViewIfNeeded();
    const header = page.locator(".site-header");
    await expect(header).toHaveClass(/is-floating/);
    await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("18px");
    const floating = await floatingHeaderMetrics(page);
    expect(floating.headerContentOverlap).toBe(0);

    if (captureReviewScreenshots && reviewViewports.has(reviewKey)) {
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-floating-dark.png`, fullPage: false });
      await page.emulateMedia({ colorScheme: "light" });
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await expect(header).not.toHaveClass(/is-floating/);
      await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("0px");
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-top-light.png`, fullPage: false });
      await page.locator("#custom").scrollIntoViewIfNeeded();
      await expect(header).toHaveClass(/is-floating/);
      await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("18px");
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-floating-light.png`, fullPage: false });
    }

    await page.locator("#service-three").scrollIntoViewIfNeeded();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("#service-three [data-service-field=action]")).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
}

test("system theme, manual toggle and saved preference stay consistent", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-label", "切换到白天模式");

  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-label", "切换到暗黑模式");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-pressed", "true");
});

test("service destinations are safe and reserved entries are not links", async ({ page }) => {
  await page.goto("/");

  const custom = page.locator("#custom [data-service-field=action]");
  await expect(custom).toHaveAttribute("href", "http://custom.xdclub.dpdns.org/");
  await expect(custom).toHaveAttribute("target", "_blank");
  await expect(custom).toHaveAttribute("rel", "noopener noreferrer");

  for (const id of ["service-two", "service-three"]) {
    const reserved = page.locator(`#${id} [data-service-field=action]`);
    await expect(reserved).not.toHaveAttribute("href", /.+/);
    await expect(reserved).toHaveAttribute("aria-disabled", "true");
  }
});

test("keyboard navigation exposes the skip link and header brand returns home", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#service-three");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#service-three");

  await page.locator(".brand").click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#home");
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBeLessThan(2);

  // Start a fresh document so the first Tab is measured from the browser's
  // natural initial focus, not from the brand link clicked above.
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(behavior).toBe("auto");
});

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
  for (const colorScheme of ["dark", "light"]) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await page.locator("#service-two").scrollIntoViewIfNeeded();
    const active = page.locator('.section-nav a[href="#service-two"]');
    const inactive = page.locator('.section-nav a[href="#custom"]');
    await expect(active).toHaveAttribute("aria-current", "page");
    await expect.poll(async () => {
      const [activeStyle, inactiveStyle] = await Promise.all([
        active.evaluate((node) => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor })),
        inactive.evaluate((node) => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor })),
      ]);
      return JSON.stringify(activeStyle) === JSON.stringify(inactiveStyle);
    }).toBe(false);
  }
});

test("initial home composition stays within a conservative CLS bound", async ({ page }) => {
  await page.addInitScript(() => {
    window.__ocLayoutShift = { supported: "LayoutShift" in window, value: 0 };
    if (!window.__ocLayoutShift.supported) return;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__ocLayoutShift.value += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const cls = await page.evaluate(() => window.__ocLayoutShift);
  test.skip(!cls.supported, "Layout Instability API is unsupported by this browser");
  expect(cls.value).toBeLessThanOrEqual(0.05);
});

test("reduced motion keeps reveal content visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-reveal]").first()).toBeVisible();
  expect(await page.locator("[data-reveal]").first().evaluate((node) => getComputedStyle(node).transform)).toBe("none");
});

test("Worker serves expected MIME and security headers including branded 404", async ({ request }) => {
  const home = await request.get("/");
  const config = await request.get("/site-config.json");
  const font = await request.get("/fonts/manrope-latin.woff2");
  const missing = await request.get("/missing-route");
  const rejected = await request.post("/missing-route");

  expect(home.status()).toBe(200);
  expect(home.headers()["content-type"]).toContain("text/html");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(home.headers()["cross-origin-opener-policy"]).toBe("same-origin");
  expect(home.headers()["cross-origin-resource-policy"]).toBe("same-origin");
  expect(home.headers()["strict-transport-security"]).toBe("max-age=31536000");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(config.headers()["content-type"]).toContain("application/json");
  expect(font.headers()["content-type"]).toContain("font/woff2");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("页面未找到");
  expect(missing.headers()["referrer-policy"]).toBe("no-referrer");
  expect(rejected.status()).toBe(405);
  expect(rejected.headers().allow).toBe("GET, HEAD");
});

test("branded 404 remains readable in the light theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  const response = await page.goto("/missing-route");

  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "页面未找到" })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回 XDCLUB" })).toHaveAttribute("href", "/");
});
