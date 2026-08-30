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

test("homepage exposes four ordered full-screen sections", async () => {
  const html = await readRequired("public/index.html");
  const panels = [...html.matchAll(/<section\b[^>]*\bclass="[^"]*\bpanel\b[^"]*"[^>]*\bid="([^"]+)"|<section\b[^>]*\bid="([^"]+)"[^>]*\bclass="[^"]*\bpanel\b[^"]*"/g)]
    .map((match) => match[1] ?? match[2]);

  assert.deepEqual(panels, ["home", "custom", "service-two", "service-three"]);
  assert.match(html, /<footer\b/);
  assert.ok(html.indexOf("<footer") > html.indexOf('id="service-three"'));
});

test("header brand returns home and exposes accessible navigation and theme control", async () => {
  const html = await readRequired("public/index.html");

  assert.match(html, /<a\b[^>]*class="brand"[^>]*href="#home"[^>]*>\s*<span class="brand-mark" aria-hidden="true">\s*<span class="brand-xd">XD<\/span><span class="brand-club">club<\/span>\s*<\/span>\s*<\/a>/);
  assert.match(html, /<nav\b[^>]*aria-label="[^"]+"/);
  assert.match(html, /<button\b[^>]*id="theme-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /class="skip-link"[^>]*href="#main"/);
});

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

test("canonical metadata targets the production domain", async () => {
  const html = await readRequired("public/index.html");

  assert.match(html, /<link\b[^>]*rel="canonical"[^>]*href="https:\/\/xdclub\.dpdns\.org\/"/);
  assert.match(html, /<html\b[^>]*lang="zh-CN"/);
  assert.match(html, /<meta\b[^>]*name="viewport"/);
});

test("configuration contains one live service and two separately reserved services", async () => {
  const config = JSON.parse(await readRequired("public/site-config.json"));

  assert.equal(config.brand, "XDCLUB");
  assert.deepEqual(config.services.map(({ id }) => id), ["custom", "service-two", "service-three"]);
  assert.equal(config.services[0].url, "http://custom.xdclub.dpdns.org/");
  assert.equal(config.services[1].url, null);
  assert.equal(config.services[2].url, null);
  assert.equal(config.footer.siteUrl, "https://xdclub.dpdns.org/");
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

test("styles define both themes, full-height panels and accessible motion fallbacks", async () => {
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
  assert.match(css, /\.site-header\.is-floating/);
  assert.match(css, /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
  assert.match(css, /\.panel\.panel-home\s*\{[^}]*padding:\s*0/s);
  assert.match(css, /\.panel\s*\{[^}]*min-height:\s*100svh/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/);
});

test("floating header has an opaque fallback, supported glass override and complete transition", async () => {
  const css = await readRequired("public/styles.css");

  assert.match(css, /\.site-header\s*\{[^}]*transition:[^}]*border-color\s+650ms\s+cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s);
  assert.match(css, /\.site-header\.is-floating\s*\{[^}]*background:\s*var\(--surface-solid\)/s);
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
    "d6a146171983500f413e578658e8a2476aaebd430672c45c40944ba2a3687edf",
  );
});
