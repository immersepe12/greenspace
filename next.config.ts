import type { NextConfig } from "next";

// Static SSG for GitHub Pages (custom domain, apex/www — no basePath).
// Redirects() and rewrites() do NOT run in `output: export`; redirects are
// emitted as meta-refresh + canonical stub pages by scripts/postbuild.mjs.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // WP URL parity: /about/ -> out/about/index.html
  images: { unoptimized: true }, // no Image Optimization server on GH Pages
  outputFileTracingIncludes: {
    "/[[...slug]]": ["./content/**/*"],
  },
};

export default nextConfig;
