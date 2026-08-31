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
const retiredServiceFragment = ["#", "custom"].join("");

async function floatingHeaderMetrics(page) {
  return page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const content = document.querySelector("#service-one .service-content");
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
    await expect(page.locator("body")).toHaveCSS("overflow-x", "clip");

    expect(response?.status()).toBe(200);
    await expect(page.locator(".panel")).toHaveCount(4);

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const bounds = document.querySelector(selector).getBoundingClientRect();
        return { top: bounds.top, height: bounds.height };
      };

      const viewportWidth = document.documentElement.clientWidth;
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        offenders: [...document.querySelectorAll("body *")]
          .map((node) => {
            const bounds = node.getBoundingClientRect();
            return { selector: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${node.classList.length ? `.${[...node.classList].join(".")}` : ""}`, left: bounds.left, right: bounds.right, width: bounds.width };
          })
          .filter(({ left, right }) => left < -1 || right > viewportWidth + 1)
          .slice(0, 12),
        home: rect(".panel-home"),
        art: rect(".hero-art"),
        heroLayout: rect(".hero-layout"),
        serviceHeights: [...document.querySelectorAll(".panel-service")].map((panel) => panel.getBoundingClientRect().height),
        fontReady: document.fonts.check('16px "Manrope"'),
      };
    });

    expect(layout.overflow, `horizontal overflow offenders: ${JSON.stringify(layout.offenders)}`).toBeLessThanOrEqual(1);
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

    await page.locator(".hero-oc, .service-oc").evaluateAll(async (images) => {
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode()));
    });

    const artwork = await page.evaluate(async () => {
      const layers = [
        { id: "home", art: ".hero-art", image: ".hero-oc", content: ".home-copy", paths: ["/assets/oc-character-640.jpg", "/assets/oc-character-1024.jpg"] },
        { id: "service-one", art: "#service-one .service-art", image: "#service-one .service-oc", content: "#service-one .service-content", paths: ["/assets/service-one-640.jpg", "/assets/service-one-1024.jpg"] },
        { id: "service-two", art: "#service-two .service-art", image: "#service-two .service-oc", content: "#service-two .service-content", paths: ["/assets/service-two-640.jpg", "/assets/service-two-1024.jpg"] },
        { id: "service-three", art: "#service-three .service-art", image: "#service-three .service-oc", content: "#service-three .service-content", paths: ["/assets/service-three-640.jpg", "/assets/service-three-1024.jpg"] },
      ];
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const rect = (node) => node.getBoundingClientRect();

      return Promise.all(layers.map(async ({ id, art, image, content, paths }) => {
        const artNode = document.querySelector(art);
        const imageNode = document.querySelector(image);
        const contentNode = document.querySelector(content);
        const source = new Image();
        source.src = imageNode.currentSrc;
        await source.decode();
        const imageRect = rect(imageNode);
        const artRect = rect(artNode);
        const contentRect = rect(contentNode);
        const [positionX = 50, positionY = 50] = getComputedStyle(imageNode).objectPosition
          .split(/\s+/).map((value) => Number.parseFloat(value));
        const scale = Math.max(imageRect.width / source.naturalWidth, imageRect.height / source.naturalHeight);
        const renderedWidth = source.naturalWidth * scale;
        const renderedHeight = source.naturalHeight * scale;
        // Face/eyes landmark: x=55%, y=15% in every preserved 1024x1536 source.
        const faceX = imageRect.left + (imageRect.width - renderedWidth) * (positionX / 100) + renderedWidth * 0.55;
        const faceY = imageRect.top + (imageRect.height - renderedHeight) * (positionY / 100) + renderedHeight * 0.15;

        return {
          id,
          paths,
          currentSrc: imageNode.currentSrc,
          naturalRatio: source.naturalWidth / source.naturalHeight,
          objectFit: getComputedStyle(imageNode).objectFit,
          artSize: { width: artRect.width, height: artRect.height },
          imageSize: { width: imageRect.width, height: imageRect.height },
          contentArtOverlap: overlap(contentRect, artRect),
          faceInsideArt: faceX >= artRect.left && faceX <= artRect.right && faceY >= artRect.top && faceY <= artRect.bottom,
          copyBackground: id === "home" ? getComputedStyle(contentNode).backgroundColor : null,
        };
      }));
    });

    expect(artwork).toHaveLength(4);
    for (const layer of artwork) {
      expect(layer.naturalRatio).toBeCloseTo(2 / 3, 3);
      const currentUrl = new URL(layer.currentSrc);
      expect(currentUrl.origin).toBe("http://127.0.0.1:8787");
      expect(layer.paths).toContain(currentUrl.pathname);
      expect(layer.objectFit).toBe("cover");
      expect(layer.artSize.width).toBeGreaterThan(0);
      expect(layer.artSize.height).toBeGreaterThan(0);
      expect(layer.imageSize.width).toBeGreaterThan(0);
      expect(layer.imageSize.height).toBeGreaterThan(0);
      expect(layer.faceInsideArt).toBe(true);
    }
    const homeArt = artwork[0];
    const homeUrl = new URL(homeArt.currentSrc);
    if (viewport.width <= 430 && viewport.height > viewport.width) {
      expect(homeUrl.pathname).toBe("/assets/oc-character-640.jpg");
      expect(homeArt.copyBackground).not.toBe("rgba(0, 0, 0, 0)");
    }

    const reviewKey = `${viewport.width}x${viewport.height}`;
    if (captureReviewScreenshots && reviewViewports.has(reviewKey)) {
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-top-dark.png`, fullPage: false });
    }

    const header = page.locator(".site-header");
    for (const serviceId of ["service-one", "service-two", "service-three"]) {
      await page.locator(`#${serviceId}`).evaluate((panel) => panel.scrollIntoView({ block: "start" }));
      await expect(header).toHaveClass(/is-floating/);
      await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("22px");
      const floating = await page.evaluate((id) => {
        const headerRect = document.querySelector(".site-header").getBoundingClientRect();
        const contentRect = document.querySelector(`#${id} .service-content`).getBoundingClientRect();
        return Math.max(0, Math.min(headerRect.right, contentRect.right) - Math.max(headerRect.left, contentRect.left))
          * Math.max(0, Math.min(headerRect.bottom, contentRect.bottom) - Math.max(headerRect.top, contentRect.top));
      }, serviceId);
      expect(floating).toBe(0);
    }
    await page.locator("#service-one").scrollIntoViewIfNeeded();

    if (captureReviewScreenshots && reviewViewports.has(reviewKey)) {
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-floating-dark.png`, fullPage: false });
      await page.emulateMedia({ colorScheme: "light" });
      await page.evaluate(() => {
        history.scrollRestoration = "manual";
        scrollTo({ top: 0, behavior: "instant" });
      });
      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(header).not.toHaveClass(/is-floating/);
      await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("0px");
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-top-light.png`, fullPage: false });
      await page.locator("#service-one").scrollIntoViewIfNeeded();
      await expect(header).toHaveClass(/is-floating/);
      await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("22px");
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-floating-light.png`, fullPage: false });
    }

    await page.locator("#service-three").scrollIntoViewIfNeeded();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("#service-three [data-service-preview]")).toBeVisible();
    await expect(page.locator("#service-three [data-service-field=action]")).toHaveCount(0);
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

test("renamed services load their configured actions, preview, and copyright without the old fragment", async ({ page }) => {
  await page.goto("/");

  const serviceOne = page.locator("#service-one [data-service-field=action]");
  await expect(serviceOne).toHaveAttribute("href", "https://custom.xdclub.dpdns.org/");
  await expect(serviceOne).toHaveAttribute("target", "_blank");
  await expect(serviceOne).toHaveAttribute("rel", "noopener noreferrer");

  const serviceTwo = page.locator("#service-two [data-service-field=action]");
  await expect(serviceTwo).toHaveAttribute("href", "https://oopz.cn/i/By3GmC");
  await expect(serviceTwo).toHaveAttribute("target", "_blank");
  await expect(serviceTwo).toHaveAttribute("rel", "noopener noreferrer");
  await expect(serviceTwo).toHaveText("点这里 ↗");
  await expect(page.locator("#service-three [data-service-preview]")).toBeVisible();
  await expect(page.locator("#service-three [data-service-field=action]")).toHaveCount(0);
  await expect(page.locator("#service-three [data-service-field=preview-label]")).toHaveText("服务器地址");
  await expect(page.locator("#service-three [data-service-field=preview-value]")).toHaveText("mc.example.com:25565");
  await expect(page.locator("#service-three [data-service-field=preview-note]")).toHaveText("请在 public/site-config.json 中修改此处文本");
  await expect(page.locator("footer")).toHaveText("© 2026 XDCLUB");
  await expect(page.locator("footer a")).toHaveCount(0);
  await expect(page.locator(`.section-nav a[href="${retiredServiceFragment}"]`)).toHaveCount(0);
  expect(await page.evaluate(() => location.hash)).not.toBe(retiredServiceFragment);
});

test("customized fallbacks survive unavailable config and disabled JavaScript", async ({ browser, page }) => {
  const assertFallback = async (target) => {
    await expect(target.locator(".brand")).toHaveAttribute("aria-label", "XD CLUB，返回首页");
    await expect(target.locator('[data-config="home.titlePrimary"]')).toHaveText("小丁");
    await expect(target.locator('[data-config="home.titleAccent"]')).toHaveText("俱乐部");
    await expect(target.locator("#service-one [data-service-field=action]")).toHaveAttribute("href", "https://custom.xdclub.dpdns.org/");
    await expect(target.locator("#service-two [data-service-field=action]")).toHaveAttribute("href", "https://oopz.cn/i/By3GmC");
  };

  await page.route("**/site-config.json", (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto("/");
  await assertFallback(page);

  const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScriptContext.newPage();
  try {
    await noScriptPage.goto("/");
    await assertFallback(noScriptPage);
  } finally {
    await noScriptContext.close();
  }
});

test("clickable service entrance is a readable high-contrast action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const action = page.locator("#service-one .service-link[href]");
  const appearance = await action.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      background: style.backgroundColor,
      borderRadius: Number.parseFloat(style.borderRadius),
      height: node.getBoundingClientRect().height,
      paddingInline: Number.parseFloat(style.paddingInlineStart) + Number.parseFloat(style.paddingInlineEnd),
    };
  });

  await expect(action).toBeVisible();
  expect(appearance.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(appearance.borderRadius).toBeGreaterThanOrEqual(12);
  expect(appearance.height).toBeGreaterThanOrEqual(46);
  expect(appearance.paddingInline).toBeGreaterThanOrEqual(32);
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

test("mobile header uses the exact 20px floating threshold and 52px endpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const header = page.locator(".site-header");

  await expect(header).not.toHaveClass(/is-floating/);
  await page.evaluate(() => scrollTo({ top: 10, behavior: "instant" }));
  await expect(header).not.toHaveClass(/is-floating/);
  await page.evaluate(() => scrollTo({ top: 24, behavior: "instant" }));
  await expect(header).toHaveClass(/is-floating/);
  await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius), { timeout: 1_200 }).toBe("22px");
  await expect.poll(() => header.evaluate((node) => getComputedStyle(node).minHeight), { timeout: 1_200 }).toBe("52px");

  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(header).not.toHaveClass(/is-floating/);
});

test("header scroll tracking works when IntersectionObserver is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    delete window.IntersectionObserver;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.evaluate(() => scrollTo({ top: 24, behavior: "instant" }));
  await expect(page.locator(".site-header")).toHaveClass(/is-floating/);
  await expect(page.locator("[data-reveal]").first()).toHaveClass(/is-visible/);
});

test("free scrolling keeps arbitrary service positions stable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const target = await page.evaluate(() => document.querySelector("#service-one").offsetTop + 123);
  await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), target);
  await page.waitForTimeout(300);

  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
  expect(Math.abs(await page.evaluate(() => scrollY) - target)).toBeLessThanOrEqual(2);
});

test("title spacing keeps both home title lines visually separate", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const title = await page.locator(".hero-title").evaluate((node) => ({
    rowGap: Number.parseFloat(getComputedStyle(node).rowGap),
    lineHeight: Number.parseFloat(getComputedStyle(node).lineHeight),
    lines: node.querySelectorAll(":scope > span").length,
  }));

  expect(title.lines).toBe(2);
  expect(title.rowGap).toBeGreaterThan(0);
  expect(title.lineHeight).toBeGreaterThan(0);
});

test("rightmost header navigation stays usable and service art stays behind content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const nav = document.querySelector(".section-nav");
    const art = document.querySelector("#service-one .service-art");
    const image = document.querySelector("#service-one .service-oc");
    const content = document.querySelector("#service-one .service-content");
    const rect = (node) => node.getBoundingClientRect();
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const headerRect = rect(header);
    const navRect = rect(nav);
    const contentRect = rect(content);
    return {
      navRightOffset: headerRect.right - Number.parseFloat(getComputedStyle(header).paddingRight) - navRect.right,
      navLinkWidths: [...nav.querySelectorAll("a")].map((link) => rect(link).width),
      artWidth: rect(art).width,
      artHeight: rect(art).height,
      imageFit: getComputedStyle(image).objectFit,
      artPointerEvents: getComputedStyle(art).pointerEvents,
      headerContentOverlap: overlap(headerRect, contentRect),
    };
  });

  expect(layout.navRightOffset).toBeLessThanOrEqual(16);
  expect(layout.navRightOffset).toBeGreaterThanOrEqual(-2);
  expect(layout.navLinkWidths).toEqual([28, 28, 28, 28]);
  expect(layout.artWidth).toBeGreaterThan(0);
  expect(layout.artHeight).toBeGreaterThan(0);
  expect(layout.imageFit).toBe("cover");
  expect(layout.artPointerEvents).toBe("none");
  expect(layout.headerContentOverlap).toBe(0);
});

test("short landscape keeps service titles and primary information in the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");

  for (const serviceId of ["service-one", "service-two", "service-three"]) {
    await page.evaluate((id) => scrollTo({ top: document.querySelector(`#${id}`).offsetTop, behavior: "instant" }), serviceId);
    await expect(page.locator(".site-header")).toHaveClass(/is-floating/);
    const layout = await page.locator(`#${serviceId}`).evaluate((panel) => {
      const title = panel.querySelector(".service-title");
      const primary = panel.querySelector(".service-link, .server-preview");
      const titleRect = title.getBoundingClientRect();
      const primaryRect = primary.getBoundingClientRect();
      return {
        titleLines: titleRect.height / Number.parseFloat(getComputedStyle(title).lineHeight),
        primaryTop: primaryRect.top,
        primaryBottom: primaryRect.bottom,
      };
    });

    expect(layout.titleLines).toBeLessThanOrEqual(serviceId === "service-three" ? 2.2 : 1.2);
    expect(layout.primaryTop).toBeGreaterThanOrEqual(52);
    expect(layout.primaryBottom).toBeLessThanOrEqual(390);
  }
});

test("active section navigation follows the visible panel", async ({ page }) => {
  for (const colorScheme of ["dark", "light"]) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await page.locator("#service-two").scrollIntoViewIfNeeded();
    const active = page.locator('.section-nav a[href="#service-two"]');
    const inactive = page.locator('.section-nav a[href="#service-one"]');
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
  expect(await missing.text()).toContain("页面找不到了啦qwq");
  expect(missing.headers()["referrer-policy"]).toBe("no-referrer");
  expect(rejected.status()).toBe(405);
  expect(rejected.headers().allow).toBe("GET, HEAD");
});

test("branded 404 remains readable in the light theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  const response = await page.goto("/missing-route");

  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "页面找不到了啦qwq" })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回 XDCLUB" })).toHaveAttribute("href", "/");
});
