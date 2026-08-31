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
  test(`five-section layout and OC art fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
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
    await expect(page.locator(".panel")).toHaveCount(5);

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
        { id: "surprise", art: "#surprise .service-art", image: "#surprise .service-oc", content: "#surprise .service-content", paths: ["/assets/surprise-panel-640.jpg", "/assets/surprise-panel-1024.jpg"] },
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

    expect(artwork).toHaveLength(5);
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
    for (const serviceId of ["service-one", "service-two", "service-three", "surprise"]) {
      await page.locator(`#${serviceId}`).evaluate((panel) => panel.scrollIntoView({ block: "start" }));
      await expect(header).toHaveClass(/is-floating/);
      await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("26px");
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
      await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("26px");
      await page.screenshot({ path: `test-results/oc-review/${reviewKey}-floating-light.png`, fullPage: false });
    }

    await page.locator("#surprise").scrollIntoViewIfNeeded();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("#service-three [data-service-preview]")).toBeVisible();
    await expect(page.locator("#service-three [data-service-field=action]")).toHaveCount(0);
    expect(runtimeErrors).toEqual([]);
  });
}

test("system theme, visible active icons, manual toggle and saved preference stay consistent", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-label", "切换到白天模式");

  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-label", "切换到暗黑模式");
  await expect(page.locator(".theme-icon-sun")).toHaveCSS("color", "rgb(255, 255, 255)");

  const sunContrast = await page.locator(".theme-icon-sun").evaluate((icon) => {
    const parse = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = (rgb) => {
      const channels = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foreground = luminance(parse(getComputedStyle(icon).color));
    const background = luminance(parse(getComputedStyle(document.querySelector(".theme-toggle-thumb")).backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(sunContrast).toBeGreaterThanOrEqual(3);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-pressed", "true");
});

test("theme icons share the moving thumb center on desktop and mobile", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("xdclub-theme"));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });

  for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const centerDelta = async (iconSelector) => page.evaluate((selector) => {
      const icon = document.querySelector(selector).getBoundingClientRect();
      const thumb = document.querySelector(".theme-toggle-thumb").getBoundingClientRect();
      return {
        x: Math.abs((icon.left + icon.width / 2) - (thumb.left + thumb.width / 2)),
        y: Math.abs((icon.top + icon.height / 2) - (thumb.top + thumb.height / 2)),
      };
    }, iconSelector);

    const moon = await centerDelta(".theme-icon-moon");
    expect(moon.x).toBeLessThanOrEqual(0.75);
    expect(moon.y).toBeLessThanOrEqual(0.75);

    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect.poll(async () => (await centerDelta(".theme-icon-sun")).x).toBeLessThanOrEqual(0.75);
    await expect.poll(async () => (await centerDelta(".theme-icon-sun")).y).toBeLessThanOrEqual(0.75);
  }
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
  await expect(page.locator("#service-three [data-service-field=preview-value]")).toHaveText("mc.xdclub.dpdns.org");
  await expect(page.locator("#service-three [data-service-field=preview-note]")).toHaveCount(0);
  await expect(page.locator("#service-three [data-copy-server]")).toHaveAccessibleName("复制服务器地址");
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
  await expect.poll(() => header.evaluate((node) => getComputedStyle(node).borderRadius), { timeout: 1_200 }).toBe("26px");
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

test("right-side page controls center each service without enabling scroll snap", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    for (const serviceId of ["service-one", "service-two", "service-three", "surprise"]) {
      await page.locator(`.section-nav a[href="#${serviceId}"]`).click();
      await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${serviceId}`);
      await expect.poll(() => page.locator(`#${serviceId}`).evaluate((panel) => {
        const bounds = panel.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - innerHeight / 2);
      })).toBeLessThanOrEqual(1.5);
    }

    await page.locator('.section-nav a[href="#home"]').click();
    await expect.poll(() => page.evaluate(() => Math.abs(scrollY))).toBeLessThanOrEqual(1.5);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
  }
});

test("service text rises from below once it enters the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(600);

  const content = page.locator("#service-two .service-content");
  const before = await content.evaluate((node) => ({
    opacity: Number.parseFloat(getComputedStyle(node).opacity),
    matrix: getComputedStyle(node).transform,
    duration: getComputedStyle(node).transitionDuration,
  }));
  expect(before.opacity).toBe(0);
  expect(before.matrix).not.toBe("none");
  expect(before.duration).toContain("0.56s");

  await page.locator('.section-nav a[href="#service-two"]').click();
  await expect(content).toHaveClass(/is-visible/);
  await expect.poll(() => content.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  await expect.poll(() => content.evaluate((node) => getComputedStyle(node).transform)).toBe("matrix(1, 0, 0, 1, 0, 0)");
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

test("fixed right-side navigation rail stays usable and service art stays behind content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const nav = document.querySelector(".section-nav");
    const art = document.querySelector("#service-one .service-art");
    const image = document.querySelector("#service-one .service-oc");
    const content = document.querySelector("#service-one .service-content");
    const rect = (node) => node.getBoundingClientRect();
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const navRect = rect(nav);
    const contentRect = rect(content);
    return {
      navPosition: getComputedStyle(nav).position,
      navRightOffset: document.documentElement.clientWidth - navRect.right,
      navIsVertical: navRect.height > navRect.width,
      navLinkSizes: [...nav.querySelectorAll("a")].map((link) => ({ width: rect(link).width, height: rect(link).height })),
      artWidth: rect(art).width,
      artHeight: rect(art).height,
      imageFit: getComputedStyle(image).objectFit,
      artPointerEvents: getComputedStyle(art).pointerEvents,
      navContentOverlap: overlap(navRect, contentRect),
    };
  });

  expect(layout.navPosition).toBe("fixed");
  expect(layout.navRightOffset).toBeLessThanOrEqual(18);
  expect(layout.navRightOffset).toBeGreaterThanOrEqual(6);
  expect(layout.navIsVertical).toBe(true);
  for (const size of layout.navLinkSizes) {
    expect(size.width).toBeGreaterThanOrEqual(36);
    expect(size.height).toBeGreaterThanOrEqual(36);
  }
  expect(layout.artWidth).toBeGreaterThan(0);
  expect(layout.artHeight).toBeGreaterThan(0);
  expect(layout.imageFit).toBe("cover");
  expect(layout.artPointerEvents).toBe("none");
  expect(layout.navContentOverlap).toBe(0);

  const navLink = page.locator('.section-nav a[href="#service-one"]');
  await navLink.focus();
  const focusAppearance = await navLink.evaluate((node) => ({
    outlineStyle: getComputedStyle(node).outlineStyle,
    boxShadow: getComputedStyle(node).boxShadow,
  }));
  expect(focusAppearance.outlineStyle).toBe("none");
  expect(focusAppearance.boxShadow).not.toBe("none");
});

test("Minecraft address copies through the real browser clipboard", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:8787" });
  await page.goto("/");
  await page.locator("#service-three").scrollIntoViewIfNeeded();

  const button = page.locator("#service-three [data-copy-server]");
  await button.click();
  await expect(button.locator("[data-copy-label]")).toHaveText("已复制");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("mc.xdclub.dpdns.org");
});

test("short landscape keeps service titles and primary information in the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");

  for (const serviceId of ["service-one", "service-two", "service-three", "surprise"]) {
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

    expect(layout.titleLines).toBeLessThanOrEqual(["service-three", "surprise"].includes(serviceId) ? 2.2 : 1.2);
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

test("tac opens a prominent proportional preview and closes from the button or Escape", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator('.section-nav a[href="#surprise"]').click();

    await expect(page.locator("#surprise h2")).toHaveText("好东西哦：）");
    const trigger = page.locator("[data-open-tac]");
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.locator("#tac-preview");
    const image = page.locator(".tac-preview-image");
    const close = page.locator("[data-close-tac]");
    await expect(dialog).toHaveJSProperty("open", true);
    await expect(image).toBeVisible();
    await expect(close).toBeVisible();
    await expect(close).toHaveAccessibleName("关闭图片预览");

    const layout = await dialog.evaluate((node) => {
      const image = node.querySelector(".tac-preview-image");
      const close = node.querySelector("[data-close-tac]");
      const imageRect = image.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();
      return {
        imageRatio: imageRect.width / imageRect.height,
        naturalRatio: image.naturalWidth / image.naturalHeight,
        imageInsideViewport: imageRect.left >= 0 && imageRect.right <= innerWidth && imageRect.top >= 0 && imageRect.bottom <= innerHeight,
        closeBelowImage: closeRect.top >= imageRect.bottom,
        closeSize: Math.min(closeRect.width, closeRect.height),
        backdrop: getComputedStyle(node, "::backdrop").backgroundColor,
      };
    });
    expect(layout.imageRatio).toBeCloseTo(873 / 1920, 3);
    expect(layout.naturalRatio).toBeCloseTo(873 / 1920, 3);
    expect(layout.imageInsideViewport).toBe(true);
    expect(layout.closeBelowImage).toBe(true);
    expect(layout.closeSize).toBeGreaterThanOrEqual(44);
    expect(layout.backdrop).not.toBe("rgba(0, 0, 0, 0)");

    await close.click();
    await expect(dialog).toHaveJSProperty("open", false);
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveJSProperty("open", false);
  }
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
