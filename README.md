# GreenSpace Herbs — Quantum Ayurveda

Static-exported **Next.js 16** site for [greenspaceherbs.com](https://www.greenspaceherbs.com), built for SEO and deployed to **GitHub Pages**.

## How it works

The site is a corpus of pre-designed HTML pages served through a single static-generated Next.js route:

- **`app/[[...slug]]/page.tsx`** — one optional catch-all page. `generateStaticParams()` enumerates every page from `content/html/`; `generateMetadata()` emits per-page `<title>`, description, canonical, OpenGraph and robots via the Next Metadata API. The page renders each source file's exact `<body>` markup (`dangerouslySetInnerHTML`) so the design is preserved 1:1.
- **`lib/content.ts`** — build-time content layer. Parses each HTML file, injects the shared chrome (`content/_partials/{head,header,footer}.html`) and the site-wide concierge/booking scripts, extracts page-specific CSS (hoisted to `<head>` by React 19), and classifies every page as **render / noindex / redirect / exclude** per `content/build-config.json`.
- **`app/sitemap.ts` / `app/robots.ts`** — emit static `sitemap.xml` (indexable pages only) and `robots.txt`.
- **`scripts/postbuild.mjs`** — runs after `next build`. Emits `.nojekyll`, `CNAME`, and a **meta-refresh + `rel=canonical` redirect stub** for every entry in `content/redirects.json` (GitHub Pages has no server-side 301s).

Output is `output: 'export'` → `out/` with `trailingSlash: true` (`/about/` → `out/about/index.html`), matching the old WordPress URLs exactly.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to ./out (+ redirect stubs, sitemap, robots)
npm run serve      # preview the built ./out locally
```

## Content & SEO model

| Set | Handling |
|---|---|
| Go-live pages (the crawled/indexed set) + new hubs, products, and herb monographs | rendered, indexed, in sitemap |
| `content/build-config.json → noindex` (dashboard, category/author archives) | rendered, `noindex, follow`, excluded from sitemap |
| `content/build-config.json → redirectRepos` (duplicate herb variants) | not rendered — redirect stub → canonical |
| `content/redirects.json` (press permalinks + herb variants) | meta-refresh + canonical stubs |
| `content/build-config.json → exclude` (test/old captures) | not built |

Keyword architecture and the full go-live reconciliation live in the design-reference repo's `docs/seo/`.

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml` (build → upload `out/` → deploy).

**One-time setup in the GitHub repo:**
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Custom domain:** the build writes `CNAME` (`www.greenspaceherbs.com`). Point DNS `www` (CNAME) at `immersepe12.github.io`, then set the custom domain under Settings → Pages and enable **Enforce HTTPS**.

## Redirects note

GitHub Pages serves the meta-refresh stubs as ~soft redirects (Google treats an instant meta-refresh as a permanent redirect, but a true 301 is stronger). For hard 301s, front the site with **Cloudflare** (free) and move `content/redirects.json` into a Cloudflare `_redirects` / Bulk Redirect list — same map, real 301 status.

## Images

Images are self-hosted under `public/wp-content/...` (identical paths to the old site), so every existing `/wp-content/...` URL resolves after the domain moves — no broken images, no hotlinking.
