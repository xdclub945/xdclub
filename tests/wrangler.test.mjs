import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test("Wrangler serves the homepage and branded 404 with security headers", { timeout: 30_000 }, async (t) => {
  const child = spawn(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", "dev", "--port", "8790", "--ip", "127.0.0.1"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        WRANGLER_LOG_PATH: "work/wrangler-regression.log",
        WRANGLER_SEND_METRICS: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  const append = (chunk) => { output += chunk.toString(); };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  t.after(() => {
    if (child.exitCode === null) child.kill("SIGTERM");
  });

  const ready = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 20_000);
    const inspect = () => {
      if (/Ready on http:\/\/127\.0\.0\.1:8790/i.test(output)) {
        clearTimeout(timeout);
        resolve(true);
      }
    };
    child.stdout.on("data", inspect);
    child.stderr.on("data", inspect);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });

  assert.equal(ready, true, `Wrangler should reach ready state:\n${output}`);

  const homepage = await fetch("http://127.0.0.1:8790/");
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /XDCLUB/);
  assert.match(homepage.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(homepage.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(homepage.headers.get("strict-transport-security"), "max-age=31536000");

  const missing = await fetch("http://127.0.0.1:8790/not-a-real-page");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /页面找不到了啦qwq/);
  assert.equal(missing.headers.get("x-content-type-options"), "nosniff");

  const conditionalMissing = await fetch("http://127.0.0.1:8790/not-a-real-page", {
    headers: { "If-None-Match": missing.headers.get("etag") ?? '"cached-404"' },
  });
  assert.equal(conditionalMissing.status, 404);
  assert.match(await conditionalMissing.text(), /页面找不到了啦qwq/);

  const rangedMissing = await fetch("http://127.0.0.1:8790/not-a-real-page", {
    headers: { Range: "bytes=0-10" },
  });
  assert.equal(rangedMissing.status, 404);
  assert.match(await rangedMissing.text(), /页面找不到了啦qwq/);

  const rejected = await fetch("http://127.0.0.1:8790/not-a-real-page", { method: "POST" });
  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.get("allow"), "GET, HEAD");

  const rejectedRoot = await fetch("http://127.0.0.1:8790/", { method: "POST" });
  // Existing assets are rejected by Cloudflare's asset-first layer before the
  // Worker runs. The platform currently returns 405 without an Allow header.
  assert.equal(rejectedRoot.status, 405);

  const headMissing = await fetch("http://127.0.0.1:8790/not-a-real-page", { method: "HEAD" });
  assert.equal(headMissing.status, 404);
  assert.equal(await headMissing.text(), "");
});
