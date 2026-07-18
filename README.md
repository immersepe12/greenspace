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

## Deploy (Vercel — primary)

1. **Import** the `immersepe12/greenspace` repo in Vercel (New Project). It auto-detects Next.js + `output: 'export'`; no build config needed. Every push to `main` redeploys.
2. **Redirects** are handled by `vercel.json` as real **301s** at the edge (press permalinks + duplicate herb variants + favicon), generated from `content/redirects.json`.
3. **Domain:** add `www.greenspaceherbs.com` (primary) and `greenspaceherbs.com` (Vercel auto-redirects apex → www) under Project → Domains, then set the DNS records Vercel shows.

`vercel.json` regeneration after editing `content/redirects.json`:
```bash
python3 - <<'PY'
import json
r=json.load(open("content/redirects.json"))
red=[{"source":"/"+k.strip("/"),"destination":v,"permanent":True} for k,v in r.items()]
red.append({"source":"/favicon.ico","destination":"/wp-content/uploads/2025/04/fab.png","permanent":False})
json.dump({"$schema":"https://openapi.vercel.sh/vercel.json","framework":"nextjs","trailingSlash":True,"redirects":red},open("vercel.json","w"),indent=2)
PY
```

### GitHub Pages (alternative)

`.github/workflows/deploy.yml` (kept as `deploy-workflow.yml.txt`) + the meta-refresh stubs / `CNAME` / `.nojekyll` written by `postbuild.mjs` support a GitHub Pages deploy. There, redirects are soft (meta-refresh); front with **Cloudflare** for hard 301s. On Vercel these artifacts are harmless and unused.

## Images

Images are self-hosted under `public/wp-content/...` (identical paths to the old site), so every existing `/wp-content/...` URL resolves after the domain moves — no broken images, no hotlinking.
