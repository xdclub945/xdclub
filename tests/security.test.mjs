import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readRequired(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    assert.fail(`${path} should exist and be readable: ${error.message}`);
  }
}

test("asset responses enforce a same-origin content policy", async () => {
  const headers = await readRequired("public/_headers");

  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ]) {
    assert.ok(headers.includes(directive), `missing CSP directive: ${directive}`);
  }
});

test("asset responses disable MIME sniffing, referrers and sensitive permissions", async () => {
  const headers = await readRequired("public/_headers");

  assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
  assert.match(headers, /Referrer-Policy:\s*no-referrer/i);
  assert.match(headers, /X-Frame-Options:\s*DENY/i);
  assert.match(headers, /Cross-Origin-Opener-Policy:\s*same-origin/i);
  assert.match(headers, /Cross-Origin-Resource-Policy:\s*same-origin/i);
  assert.match(headers, /Strict-Transport-Security:\s*max-age=31536000/i);
  for (const permission of ["camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()"]) {
    assert.ok(headers.includes(permission), `permission should be disabled: ${permission}`);
  }
});

test("editable content and scripts are always revalidated", async () => {
  const headers = await readRequired("public/_headers");

  for (const path of ["/index.html", "/site-config.json", "/theme-init.js", "/app.js"]) {
    const sectionStart = headers.indexOf(path);
    assert.notEqual(sectionStart, -1, `missing cache section for ${path}`);
    const section = headers.slice(sectionStart, sectionStart + 120);
    assert.match(section, /max-age=0, must-revalidate/);
  }
});

test("OC assets stay same-origin and markup does not expose local paths", async () => {
  const html = await readFile("public/index.html", "utf8");
  assert.doesNotMatch(html, /\/var\/folders|file:\/\//i);
  assert.doesNotMatch(html, /<img[^>]+src=["']https?:\/\//i);
  assert.match(html, /src="\/assets\/oc-character-1024\.jpg"/);
});

test("replaceable OC assets use a conservative cache lifetime", async () => {
  const headers = await readRequired("public/_headers");
  const route = headers.match(/^\/assets\/\*\s*$/m);
  assert.ok(route?.index !== undefined, "missing cache section for OC assets");
  const section = headers.slice(route.index).split(/\n(?=\/[^\n]+\n)/, 1)[0];
  assert.match(section, /Cache-Control:\s*public, max-age=86400/);
  assert.doesNotMatch(section, /immutable/i);
});

test("service URLs allow only absolute HTTP and HTTPS destinations", async () => {
  let app;
  try {
    app = await import("../public/app.js");
  } catch (error) {
    assert.fail(`public/app.js should exist and load: ${error.message}`);
  }

  assert.equal(app.safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(app.safeHttpUrl("data:text/html,boom"), null);
  assert.equal(app.safeHttpUrl("/relative-path"), null);
  assert.equal(app.safeHttpUrl("not a url"), null);
  assert.equal(app.safeHttpUrl(null), null);
  assert.equal(app.safeHttpUrl("http://custom.xdclub.dpdns.org/"), "http://custom.xdclub.dpdns.org/");
  assert.equal(app.safeHttpUrl("https://example.com/path"), "https://example.com/path");
});

test("browser modules avoid executable HTML sinks and dynamic code evaluation", async () => {
  const scripts = await Promise.all([
    readRequired("public/app.js"),
    readRequired("public/theme-init.js"),
  ]);
  const source = scripts.join("\n");

  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.doesNotMatch(source, /\.outerHTML\s*=/);
  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /new\s+Function\s*\(/);
  assert.doesNotMatch(source, /document\.write\s*\(/);
});

test("HTML and CSS contain no inline executable hooks or remote imports", async () => {
  const [index, notFound, css] = await Promise.all([
    readRequired("public/index.html"),
    readRequired("public/404.html"),
    readRequired("public/styles.css"),
  ]);
  const html = `${index}\n${notFound}`;

  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(css, /@import\b/i);
  assert.doesNotMatch(css, /url\(\s*["']?https?:/i);
});
