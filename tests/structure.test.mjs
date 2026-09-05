import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import vm from "node:vm";

async function readRequired(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    assert.fail(`${path} should exist and be readable: ${error.message}`);
  }
}

test("six ordered full-screen sections keep existing identifiers and append the surprise panel", async () => {
  const html = await readRequired("public/index.html");
  const panels = [...html.matchAll(/<section\b[^>]*\bclass="[^"]*\bpanel\b[^"]*"[^>]*\bid="([^"]+)"|<section\b[^>]*\bid="([^"]+)"[^>]*\bclass="[^"]*\bpanel\b[^"]*"/g)]
    .map((match) => match[1] ?? match[2]);

  assert.deepEqual(panels, ["home", "service-one", "service-two", "service-three", "service-four", "surprise"]);
  assert.doesNotMatch(html, /(?:id|href|data-service-id)=["']#?custom["']/);
  assert.match(html, /<footer\b/);
  assert.ok(html.indexOf("<footer") > html.indexOf('id="surprise"'));
});

test("surprise panel opens a local proportional image in an accessible modal", async () => {
  const html = await readRequired("public/index.html");
  const start = html.indexOf('<section id="surprise"');
  const section = html.slice(start, html.indexOf("</section>", start));

  assert.notEqual(start, -1, "surprise section should exist");
  assert.match(section, /<h2\b[^>]*data-config="surprise\.title"[^>]*>好东西哦：）<\/h2>/);
  assert.doesNotMatch(section, /class="(?:service-)?description"/);
  assert.match(section, /srcset="\/assets\/surprise-panel-640\.jpg\?v=600787abe52a 640w, \/assets\/surprise-panel-1024\.jpg\?v=600787abe52a 1024w"/);
  assert.match(section, /<button\b[^>]*data-config="surprise\.button"[^>]*data-open-tac[^>]*aria-haspopup="dialog"[^>]*aria-controls="tac-preview"[^>]*>\s*背景梦男\s*<\/button>/);
  assert.match(html, /<dialog\b[^>]*id="tac-preview"[^>]*aria-label="tac 图片预览"/);
  assert.match(html, /<img\b[^>]*class="tac-preview-image"[^>]*src="\/assets\/tac-preview-873\.jpg\?v=400d96393a1d"[^>]*width="873"[^>]*height="1920"[^>]*alt="tac 图片预览"/);
  assert.match(html, /<button\b[^>]*data-close-tac[^>]*aria-label="关闭图片预览"[^>]*>\s*×\s*<\/button>/);
});

test("header brand returns home while navigation is exposed as a separate side rail", async () => {
  const html = await readRequired("public/index.html");

  assert.match(html, /<a\b[^>]*class="brand"[^>]*href="#home"[^>]*aria-label="XD CLUB，返回首页"[^>]*>\s*<span class="brand-mark" aria-hidden="true">\s*<span class="brand-xd">XD<\/span><span class="brand-club"> CLUB<\/span>\s*<\/span>\s*<\/a>/);
  assert.match(html, /<nav\b[^>]*aria-label="[^"]+"/);
  assert.match(html, /<nav\b[^>]*class="section-nav"[^>]*aria-label="页面分区"/);
  assert.match(html, /<button\b[^>]*id="theme-toggle"[^>]*aria-pressed="false"/);
  assert.ok(html.indexOf("</header>") < html.indexOf('<nav class="section-nav"'));
  assert.match(html, /class="skip-link"[^>]*href="#main"/);
});

test("hero exposes split brand and responsive OC artwork without a header sentinel", async () => {
  const html = await readRequired("public/index.html");

  assert.doesNotMatch(html, /class="top-sentinel"/);
  assert.match(html, /class="brand-xd">XD<\/span>/);
  assert.match(html, /class="brand-club"> CLUB<\/span>/);
  assert.match(html, /<picture\b[^>]*class="hero-art"/);
  assert.match(html, /srcset="\/assets\/oc-character-640\.jpg\?v=a836b4d4f9fc 640w, \/assets\/oc-character-1024\.jpg\?v=a836b4d4f9fc 1024w"/);
  assert.match(html, /class="hero-oc"[^>]*width="1024"[^>]*height="1536"/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /data-reveal/);
});

test("canonical metadata targets the production domain", async () => {
  const html = await readRequired("public/index.html");

  assert.match(html, /<link\b[^>]*rel="canonical"[^>]*href="https:\/\/xdclub\.dpdns\.org\/"/);
  assert.match(html, /<html\b[^>]*lang="zh-CN"/);
  assert.match(html, /<meta\b[^>]*name="viewport"/);
});

test("configuration preserves custom content in the latest service schema", async () => {
  const config = JSON.parse(await readRequired("public/site-config.json"));

  assert.equal(config.brand, "XD CLUB");
  assert.deepEqual(config.home, {
    eyebrow: "Private digital club · Est. 2026",
    titlePrimary: "小丁",
    titleAccent: "俱乐部",
    description: "专为电竞玩家打造的综合服务站点",
  });
  assert.deepEqual(config.services.map(({ id }) => id), ["service-one", "service-two", "service-three", "service-four"]);
  assert.deepEqual(config.surprise, {
    title: "好东西哦：）",
    button: "背景梦男",
  });
  assert.deepEqual(config.services[0], {
    id: "service-one",
    index: "01",
    eyebrow: "PROXY SERVICE",
    title: "XD Proxy",
    description: "XDCLUB 专属定制服务入口。",
    action: "访问服务",
    url: "https://custom.xdclub.dpdns.org/",
  });
  assert.deepEqual(config.services[1], {
    id: "service-two",
    index: "02",
    eyebrow: "VOICE CHAT",
    title: "oopz",
    description: "来这里语音",
    action: "点这里",
    url: "https://oopz.cn/i/By3GmC",
  });
  assert.equal(config.services[2].url, undefined);
  assert.equal(config.services[2].eyebrow, "Minecraft server");
  assert.equal(config.services[2].title, "Minecraft Server");
  assert.equal(config.services[2].description, "成员服务器连接信息预览。");
  assert.deepEqual(config.services[2].preview, {
    label: "服务器地址",
    value: "mc.xdclub.dpdns.org",
  });
  assert.deepEqual(config.services[3], {
    id: "service-four",
    index: "04",
    eyebrow: "Audio fidelity",
    title: "High‑Fidelity",
    description: "忠实还原录音原本的声音，不额外染色失真",
  });
  assert.equal(config.footer.copyright, "© 2026 XDCLUB");
  assert.equal(config.footer.siteUrl, undefined);
});

test("HTML fallback mirrors customized content and secure service actions", async () => {
  const html = await readRequired("public/index.html");
  const serviceOne = html.slice(html.indexOf('<section id="service-one"'), html.indexOf("</section>", html.indexOf('<section id="service-one"')));
  const serviceTwo = html.slice(html.indexOf('<section id="service-two"'), html.indexOf("</section>", html.indexOf('<section id="service-two"')));

  assert.match(html, /data-config="home\.titlePrimary">小丁<\/span>/);
  assert.match(serviceOne, /data-service-field="eyebrow">PROXY SERVICE<\/p>/);
  assert.match(serviceTwo, /data-service-field="eyebrow">VOICE CHAT<\/p>/);
  assert.match(html, /data-config="home\.titleAccent">俱乐部<\/span>/);
  assert.match(html, /data-config="home\.description">专为电竞玩家打造的综合服务站点<\/p>/);
  assert.match(serviceOne, /data-service-field="title">XD Proxy<\/h2>/);
  assert.match(serviceOne, /href="https:\/\/custom\.xdclub\.dpdns\.org\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(serviceTwo, /data-service-field="title">oopz<\/h2>/);
  assert.match(serviceTwo, /data-service-field="description">来这里语音<\/p>/);
  assert.match(serviceTwo, /href="https:\/\/oopz\.cn\/i\/By3GmC"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.doesNotMatch(serviceTwo, /aria-disabled|\bis-disabled\b/);
});

test("branded 404 preserves the customized copy", async () => {
  const html = await readRequired("public/404.html");

  assert.match(html, /<title>页面不见啦qwq · XDCLUB<\/title>/);
  assert.match(html, /<h1>页面找不到了啦qwq<\/h1>/);
  assert.match(html, /<p>这里没有你要的东西<\/p>/);
});

test("service backgrounds use ordered cache-busted local artwork and the footer stays link-free", async () => {
  const html = await readRequired("public/index.html");
  const assets = new Map([
    ["service-one", ["service-one", "230e108141ac"]],
    ["service-two", ["service-two", "9072736d5878"]],
    ["service-three", ["service-three", "1459069044dd"]],
    ["service-four", ["high-fidelity", "a20300213c27a"]],
  ]);

  for (const service of ["service-one", "service-two", "service-three", "service-four"]) {
    const start = html.indexOf(`<section id="${service}"`);
    const section = html.slice(start, html.indexOf("</section>", start));
    const [asset, version] = assets.get(service);

    assert.notEqual(start, -1, `${service} section should exist`);
    assert.match(section, /<picture\b[^>]*class="service-art"[^>]*aria-hidden="true"/);
    assert.match(section, new RegExp(`srcset="/assets/${asset}-640\\.jpg\\?v=${version} 640w, /assets/${asset}-1024\\.jpg\\?v=${version} 1024w"`));
    assert.match(section, /sizes="\(max-width: 760px\) 100vw, 52vw"/);
    assert.match(section, new RegExp(`<img\\b[^>]*class="service-oc"[^>]*src="/assets/${asset}-1024\\.jpg\\?v=${version}"[^>]*width="1024"[^>]*height="1536"[^>]*alt=""[^>]*loading="lazy"[^>]*decoding="async"`));
  }

  const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
  assert.doesNotMatch(footer, /<a\b/);
});

test("Minecraft preview exposes a configurable address and copy action without a service link", async () => {
  const html = await readRequired("public/index.html");
  const start = html.indexOf('<section id="service-three"');
  const section = html.slice(start, html.indexOf("</section>", start));

  assert.match(section, /<div\b[^>]*class="server-preview"[^>]*data-service-preview[^>]*aria-label="Minecraft 服务器信息"/);
  assert.match(section, /data-service-field="preview-label"/);
  assert.match(section, /<code\b[^>]*data-service-field="preview-value"/);
  assert.match(section, /<button\b[^>]*class="server-copy"[^>]*data-copy-server[^>]*aria-label="复制服务器地址"/);
  assert.match(section, /data-copy-label[^>]*>复制</);
  assert.doesNotMatch(section, /data-service-field="preview-note"|请在 public\/site-config\.json 中修改此处文本|:25565/);
  assert.doesNotMatch(section, /<a\b[^>]*data-service-field="action"/);
});

test("High-Fidelity panel keeps configurable copy and local badge artwork", async () => {
  const html = await readRequired("public/index.html");
  const section = html.slice(html.indexOf('<section id="service-four"'), html.indexOf("</section>", html.indexOf('<section id="service-four"')));

  assert.match(section, /data-service-field="title"><span data-title-part="first">High‑<\/span><wbr><span data-title-part="second">Fidelity<\/span><\/h2>/);
  assert.match(section, /data-service-field="description">忠实还原录音原本的声音，不额外染色失真<\/p>/);
  assert.match(section, /class="high-res-badge(?:\s+[^"]+)*"[^>]*src="\/assets\/high-res-audio-640\.png/);
  assert.match(section, /src="\/assets\/high-res-audio-p2-640\.png/);
  assert.match(section, /alt="Hi-Res Audio"/);
  assert.match(section, /alt="我操太HiFi了"/);
  assert.match(section, /href="https:\/\/music\.apple\.com\/cn\/playlist\/%E8%AF%95%E9%9F%B3\/pl\.u-BNA6vmJt1Exb2e1"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(section, />无损精选\s*<span/);
  assert.doesNotMatch(section, /小红书|1015988781/);
  assert.doesNotMatch(html, /class="section-index"/);
});

test("manifest, browser chrome and icon use local moon-blue-gray assets", async () => {
  const html = await readRequired("public/index.html");
  const manifest = JSON.parse(await readRequired("public/site.webmanifest"));
  const icon = await readRequired("public/favicon.svg");

  assert.match(html, /href="\/site\.webmanifest"/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.equal(manifest.name, "XDCLUB");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.background_color, "#0d121b");
  assert.equal(manifest.theme_color, "#0d121b");
  assert.match(icon, /<svg\b/);
  assert.match(html, /<meta\b[^>]*name="theme-color"[^>]*content="#0d121b"[^>]*media="\(prefers-color-scheme: dark\)"/);
  assert.match(html, /<meta\b[^>]*name="theme-color"[^>]*content="#f3f5f8"[^>]*media="\(prefers-color-scheme: light\)"/);
  assert.match(icon, /fill="#0d121b"/i);
  assert.match(icon, /fill="#526b98"/i);
  assert.doesNotMatch(`${html}\n${icon}`, /#08090c|#f4f0e8|#d1ae68/i);
});

test("every root-relative page asset exists in the Workers public directory", async () => {
  const pages = await Promise.all([
    readRequired("public/index.html"),
    readRequired("public/404.html"),
  ]);
  const paths = new Set();

  for (const html of pages) {
    for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) {
      paths.add(match[1] === "/" ? "/index.html" : match[1]);
    }
  }

  for (const path of paths) {
    await assert.doesNotReject(
      access(`public${path}`),
      `missing root-relative asset: ${path}`,
    );
  }
});

test("saved theme preference wins over the operating system preference", async () => {
  const { getPreferredTheme } = await import("../public/app.js");

  assert.equal(getPreferredTheme({ getItem: () => "light" }, { matches: true }), "light");
  assert.equal(getPreferredTheme({ getItem: () => "dark" }, { matches: false }), "dark");
});

test("invalid or unavailable theme storage falls back to the operating system", async () => {
  const { getPreferredTheme } = await import("../public/app.js");
  const unavailableStorage = { getItem: () => { throw new Error("blocked"); } };

  assert.equal(getPreferredTheme({ getItem: () => "unexpected" }, { matches: true }), "dark");
  assert.equal(getPreferredTheme({ getItem: () => null }, { matches: false }), "light");
  assert.equal(getPreferredTheme(unavailableStorage, { matches: true }), "dark");
});

test("setting a theme updates the document, persistence and accessible toggle state", async () => {
  const { setTheme } = await import("../public/app.js");
  const saved = new Map();
  const root = { dataset: {}, style: {} };
  const attributes = new Map();
  const button = { setAttribute: (name, value) => attributes.set(name, value) };

  setTheme("light", root, { setItem: (name, value) => saved.set(name, value) }, button);

  assert.equal(root.dataset.theme, "light");
  assert.equal(root.style.colorScheme, "light");
  assert.equal(saved.get("xdclub-theme"), "light");
  assert.equal(attributes.get("aria-pressed"), "true");
  assert.equal(attributes.get("aria-label"), "切换到暗黑模式");
});

test("early theme initialization applies saved or system preference without throwing", async () => {
  const source = await readRequired("public/theme-init.js");

  const run = ({ saved, systemDark, storageThrows = false }) => {
    const documentElement = { dataset: {}, style: {} };
    const context = {
      document: { documentElement },
      localStorage: { getItem: () => storageThrows ? (() => { throw new Error("blocked"); })() : saved },
      matchMedia: () => ({ matches: systemDark }),
    };
    vm.runInNewContext(source, context);
    return documentElement;
  };

  assert.equal(run({ saved: "light", systemDark: true }).dataset.theme, "light");
  assert.equal(run({ saved: null, systemDark: true }).dataset.theme, "dark");
  assert.equal(run({ saved: null, systemDark: false, storageThrows: true }).dataset.theme, "light");
});

test("styles define both themes, free scrolling, service art and accessible motion fallbacks", async () => {
  const css = await readRequired("public/styles.css");

  assert.match(css, /:root\s*\{/);
  assert.match(css, /:root\[data-theme=["']dark["']\]/);
  assert.match(css, /--bg:\s*#f3f5f8/i);
  assert.match(css, /--text:\s*#18202b/i);
  assert.match(css, /--accent:\s*#526b98/i);
  assert.match(css, /:root\[data-theme=["']dark["']\][^{]*\{[^}]*--bg:\s*#0d121b/is);
  assert.match(css, /--text:\s*#f0f2f7/i);
  assert.match(css, /--accent:\s*#8299c1/i);
  assert.match(css, /\.hero-oc\s*\{[^}]*object-fit:\s*cover/is);
  assert.match(css, /\.hero-art\s*\{[^}]*pointer-events:\s*none/is);
  assert.match(css, /\.service-oc\s*\{[^}]*object-fit:\s*cover/is);
  assert.match(css, /\.service-art\s*\{[^}]*pointer-events:\s*none/is);
  assert.match(css, /\.site-header\.is-floating/);
  assert.match(css, /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
  assert.doesNotMatch(css, /scroll-snap-(?:type|align|stop)/);
  assert.match(css, /\.hero-title\s*\{[^}]*row-gap:\s*clamp\(\s*(?!0(?:px|rem|em|%|\s*,))[\d.]+(?:px|rem|em|%)/is);
  assert.match(css, /\.panel\.panel-home\s*\{[^}]*padding:\s*0/s);
  assert.match(css, /\.panel\s*\{[^}]*min-height:\s*100svh/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/);
});

test("floating header uses the 20px-scroll motion contract with opaque and glass surfaces", async () => {
  const css = await readRequired("public/styles.css");

  assert.match(css, /\.site-header\s*\{[^}]*transition:[^}]*border-color\s+700ms\s+cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s);
  assert.match(css, /\.site-header\.is-floating\s*\{[^}]*min-height:\s*52px[^}]*border-radius:\s*26px[^}]*background:\s*var\(--surface-solid\)/s);
  assert.match(css, /@supports\s*\(backdrop-filter:\s*blur\(16px\)\)\s*\{\s*\.site-header\.is-floating\s*\{[^}]*background:\s*var\(--header\)[^}]*backdrop-filter:\s*blur\(18px\)\s+saturate\(125%\)/s);
});

test("custom brand updates visible split text and accessible name through safe sinks", async () => {
  const { applyConfig } = await import("../public/app.js");
  const xd = { textContent: "XD" };
  const club = { textContent: "club" };
  const attributes = new Map([["aria-label", "XDclub，返回首页"]]);
  const brand = { setAttribute: (name, value) => attributes.set(name, value) };
  const root = {
    querySelectorAll(selector) {
      if (selector === ".brand-xd") return [xd];
      if (selector === ".brand-club") return [club];
      return [];
    },
    querySelector(selector) {
      return selector === ".brand" ? brand : null;
    },
  };

  applyConfig(root, { brand: "Nova" });
  assert.equal(xd.textContent, "No");
  assert.equal(club.textContent, "va");
  assert.equal(attributes.get("aria-label"), "Nova，返回首页");

  applyConfig(root, { brand: "   " });
  assert.equal(xd.textContent, "No");
  assert.equal(club.textContent, "va");
  assert.equal(attributes.get("aria-label"), "Nova，返回首页");
});

test("surprise configuration updates the current custom title and button text", async () => {
  const { applyConfig } = await import("../public/app.js");
  const title = { textContent: "默认标题" };
  const button = { textContent: "默认按钮" };
  const fields = new Map([
    ['[data-config="surprise.title"]', [title]],
    ['[data-config="surprise.button"]', [button]],
  ]);
  const root = {
    querySelectorAll: (selector) => fields.get(selector) ?? [],
    querySelector: () => null,
  };

  applyConfig(root, {
    surprise: {
      title: "新的标题",
      button: "新的按钮",
    },
  });

  assert.equal(title.textContent, "新的标题");
  assert.equal(button.textContent, "新的按钮");
});

test("Minecraft preview configuration updates the address without creating a link", async () => {
  const { applyConfig } = await import("../public/app.js");
  const label = { textContent: "服务器地址" };
  const value = { textContent: "mc.xdclub.dpdns.org" };
  const fields = new Map([
    ['[data-service-field="preview-label"]', [label]],
    ['[data-service-field="preview-value"]', [value]],
  ]);
  const panel = {
    querySelector: (selector) => selector === '[data-service-field="action"]' ? null : null,
    querySelectorAll: (selector) => fields.get(selector) ?? [],
  };
  const root = {
    querySelector: (selector) => selector === '[data-service-id="service-three"]' ? panel : null,
    querySelectorAll: () => [],
  };
  const originalCss = globalThis.CSS;
  globalThis.CSS = { escape: (id) => id };

  try {
    applyConfig(root, {
      services: [{
        id: "service-three",
        preview: {
          label: "服务器地址",
          value: "mc.xdclub.test",
        },
      }],
    });
  } finally {
    globalThis.CSS = originalCss;
  }

  assert.equal(label.textContent, "服务器地址");
  assert.equal(value.textContent, "mc.xdclub.test");
  assert.equal(Object.hasOwn(value, "href"), false);
});

test("Minecraft address copying trims text and fails closed when clipboard access is unavailable", async () => {
  const { copyServerAddress } = await import("../public/app.js");
  const writes = [];

  assert.equal(await copyServerAddress("  mc.xdclub.dpdns.org  ", { writeText: async (value) => writes.push(value) }), true);
  assert.deepEqual(writes, ["mc.xdclub.dpdns.org"]);
  assert.equal(await copyServerAddress("   ", { writeText: async () => assert.fail("empty values must not be copied") }), false);
  assert.equal(await copyServerAddress("mc.xdclub.dpdns.org", null), false);
  assert.equal(await copyServerAddress("mc.xdclub.dpdns.org", { writeText: async () => { throw new Error("denied"); } }), false);
});

test("self-hosted font and its redistribution license are present", async () => {
  let fontInfo;
  let license;
  try {
    [fontInfo, license] = await Promise.all([
      stat("public/fonts/manrope-latin.woff2"),
      readFile("public/fonts/OFL.txt", "utf8"),
    ]);
  } catch (error) {
    assert.fail(`font assets should exist: ${error.message}`);
  }

  assert.ok(fontInfo.size > 10_000, "font file should contain a real WOFF2 payload");
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/i);
});

test("package metadata declares the Node version required by locked Wrangler", async () => {
  const packageJson = JSON.parse(await readRequired("package.json"));

  assert.equal(packageJson.engines?.node, ">=22.0.0");
});

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
  assert.ok(mobile.length <= 150_000, "640px delivery asset should stay below 150 KB");
  assert.ok(desktop.length <= 350_000, "1024px delivery asset should stay below 350 KB");
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "a836b4d4f9fc72ead89162cab8ee0b965ac62183384f66e08e2e10ba94bee6fd",
  );
});

test("service OC sources retain their provenance and bounded JPEG deliveries", async () => {
  const services = [
    ["service-one", "230e108141ac0d62ac6ecb66c95c645c895f07682ae53d34a1331172c6901e81"],
    ["service-two", "9072736d587827b50a28d7cabcb81e3553bb664e681e863b0053f7620dd33f81"],
    ["service-three", "1459069044dd001436da17110080502c783af70086993612c5845339c2f3382a"],
  ];

  for (const [service, expectedHash] of services) {
    const [source, mobile, desktop] = await Promise.all([
      readFile(`assets/source/${service}-original.png`),
      readFile(`public/assets/${service}-640.jpg`),
      readFile(`public/assets/${service}-1024.jpg`),
    ]);

    assert.equal(createHash("sha256").update(source).digest("hex"), expectedHash);
    assert.deepEqual([...mobile.subarray(0, 3)], [0xff, 0xd8, 0xff]);
    assert.deepEqual([...desktop.subarray(0, 3)], [0xff, 0xd8, 0xff]);
    assert.ok(mobile.length < source.length, `${service} 640px delivery should be smaller than its source`);
    assert.ok(mobile.length < 350_000, `${service} 640px delivery should stay below 350 KB`);
    assert.ok(desktop.length < 350_000, `${service} 1024px delivery should stay below 350 KB`);
  }
});

test("surprise panel and tac preview preserve the supplied local sources", async () => {
  const [panelSource, panelMobile, panelDesktop, previewSource, previewMobile, previewDesktop] = await Promise.all([
    readFile("assets/source/surprise-panel-original.png"),
    readFile("public/assets/surprise-panel-640.jpg"),
    readFile("public/assets/surprise-panel-1024.jpg"),
    readFile("assets/source/tac-preview-original.jpg"),
    readFile("public/assets/tac-preview-640.jpg"),
    readFile("public/assets/tac-preview-873.jpg"),
  ]);

  assert.equal(createHash("sha256").update(panelSource).digest("hex"), "600787abe52ab411fb8c9c47dc90ced4caa95a249ebd1168d00e69a82d162e5e");
  assert.equal(createHash("sha256").update(previewSource).digest("hex"), "400d96393a1df8bc9c4ffab44963b11ea003d2b4de590e2178fc02867c880237");
  for (const image of [panelMobile, panelDesktop, previewMobile, previewDesktop]) {
    assert.deepEqual([...image.subarray(0, 3)], [0xff, 0xd8, 0xff]);
    assert.ok(image.length < 350_000, "delivery images should stay below 350 KB");
  }
});
