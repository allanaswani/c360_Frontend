import type { NextConfig } from 'next';
import path from 'node:path';

// Customer 360 is served under a PATH on the shared HFCB domain in production
// (e.g. https://ceo.hfcb.co.ke/customer-360), mirroring the portfolio's per-tool
// paths (…/business-performance). Set NEXT_PUBLIC_BASE_PATH=/customer-360 in the
// deploy container; left unset for local dev so URLs stay at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

// Where the Django API is reachable from THIS Next server process. On the deploy box
// the backend runs on the host network (see backend/Dockerfile), so 127.0.0.1:9001.
const backendOrigin = process.env.C360_BACKEND_ORIGIN || 'http://127.0.0.1:9001';

const nextConfig: NextConfig = {
  // Prefix all routes + assets so the app works under /customer-360 behind nginx.
  ...(basePath ? { basePath } : {}),

  // Do NOT 308-redirect a trailing slash off the URL. The SPA calls the API with a
  // trailing slash (e.g. /api/auth/me/); if Next strips it, the request reaches Django
  // slash-less, Django's APPEND_SLASH then 301s to a root-relative path that drops the
  // /customer-360 basePath, and the browser lands on ceo.hfcb.co.ke/api/... → 404. Keep
  // the slash so the rewrite forwards /api/auth/me/ straight through to the backend.
  skipTrailingSlashRedirect: true,

  // Pin the workspace root to this app so Turbopack doesn't infer a parent
  // directory's lockfile (there are unrelated lockfiles higher up).
  turbopack: {
    root: path.join(__dirname),
  },

  // Proxy the SPA's same-origin `/api` calls to the Django backend. This is what
  // lets ONE relative API base (NEXT_PUBLIC_API_BASE=/customer-360/api) serve both
  // access paths: on the public domain nginx routes /customer-360/api → backend,
  // and on the office LAN (IP:5401, no nginx in front) the Next server itself
  // proxies to the backend on the host network. With basePath set, `source` is
  // automatically prefixed, so this matches /customer-360/api/* .
  async rewrites() {
    return [
      // Forward the trailing slash straight through. DRF routes require it (APPEND_SLASH);
      // the plain `/api/:path*` rule captures `auth/me` WITHOUT the slash, so Django 301s to
      // a root-relative path that drops the /customer-360 basePath and 404s. Match the
      // slash form first so `/api/auth/me/` reaches the backend as `/api/auth/me/`.
      { source: '/api/:path*/', destination: `${backendOrigin}/api/:path*/` },
      { source: '/api/:path*', destination: `${backendOrigin}/api/:path*` },
    ];
  },
};

export default nextConfig;
