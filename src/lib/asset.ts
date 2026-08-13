// Resolve a public-folder asset to an absolute URL that respects the app's basePath.
// Next.js auto-prefixes basePath for next/link, next/image and _next assets, but NOT
// for a plain <img src> or a metadata icon path — so under basePath (/customer-360)
// a raw "/hfcb-mark.png" would resolve at the domain root (the portfolio) and 404.
// Prefixing with NEXT_PUBLIC_BASE_PATH (inlined at build) keeps assets under the app.
export const asset = (path: string): string =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
