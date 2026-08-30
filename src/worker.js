const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

export function withSecurityHeaders(response, status = response.status) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status,
    statusText: status === 404 ? "Not Found" : response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return withSecurityHeaders(new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
        headers: { Allow: "GET, HEAD" },
      }));
    }

    // With auto-trailing-slash HTML handling, /404.html redirects to /404.
    // Fetch the canonical asset path directly so the original response keeps its body.
    const notFoundUrl = new URL("/404", request.url);
    // Do not forward If-None-Match or Range from the missing URL. Those headers
    // could make the internal asset lookup return 304/206 and strip the 404 body.
    const notFoundRequest = new Request(notFoundUrl, { method: request.method });
    const page = await env.ASSETS.fetch(notFoundRequest);

    return withSecurityHeaders(page, 404);
  },
};
