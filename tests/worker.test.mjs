import test from "node:test";
import assert from "node:assert/strict";

async function loadWorkerModule() {
  try {
    return await import("../src/worker.js");
  } catch (error) {
    assert.fail(`Worker module should exist and load: ${error.message}`);
  }
}

test("missing routes return the branded 404 response with security headers", async () => {
  const { default: worker } = await loadWorkerModule();
  const requestedPaths = [];
  const env = {
    ASSETS: {
      async fetch(request) {
        requestedPaths.push(new URL(request.url).pathname);
        return new Response("<!doctype html><title>404</title><h1>页面未找到</h1>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  };

  const response = await worker.fetch(
    new Request("https://xdclub.dpdns.org/not-a-real-page"),
    env,
  );

  assert.deepEqual(requestedPaths, ["/404"]);
  assert.equal(response.status, 404);
  assert.equal(response.statusText, "Not Found");
  assert.match(await response.text(), /页面未找到/);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("security header wrapping preserves the original body and status", async () => {
  const { withSecurityHeaders } = await loadWorkerModule();
  const response = withSecurityHeaders(new Response("missing", { status: 404 }));

  assert.equal(response.status, 404);
  assert.equal(await response.text(), "missing");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});

test("non-read methods are rejected before static assets are accessed", async () => {
  const { default: worker } = await loadWorkerModule();
  let assetRequests = 0;
  const env = {
    ASSETS: {
      async fetch() {
        assetRequests += 1;
        return new Response("unexpected");
      },
    },
  };

  const response = await worker.fetch(
    new Request("https://xdclub.dpdns.org/not-a-real-page", { method: "POST" }),
    env,
  );

  assert.equal(assetRequests, 0);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("404 asset lookup ignores conditional and range headers from the missing URL", async () => {
  const { default: worker } = await loadWorkerModule();
  const receivedHeaders = [];
  const env = {
    ASSETS: {
      async fetch(request) {
        receivedHeaders.push({
          ifNoneMatch: request.headers.get("if-none-match"),
          range: request.headers.get("range"),
        });
        const conditional = request.headers.has("if-none-match") || request.headers.has("range");
        return conditional
          ? new Response(null, { status: 304 })
          : new Response("<h1>页面未找到</h1>", { status: 200 });
      },
    },
  };

  const response = await worker.fetch(new Request(
    "https://xdclub.dpdns.org/not-a-real-page",
    { headers: { "If-None-Match": '"cached-404"', Range: "bytes=0-10" } },
  ), env);

  assert.deepEqual(receivedHeaders, [{ ifNoneMatch: null, range: null }]);
  assert.equal(response.status, 404);
  assert.match(await response.text(), /页面未找到/);
});
