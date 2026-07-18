// Build-time content layer. Runs only on the server/build (fs access).
// Parses the static HTML corpus into metadata + a renderable body fragment,
// injecting shared partials and the site-wide concierge, and classifies each
// page as render / noindex / redirect / exclude per the go-live curation.
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const HTML_DIR = path.join(ROOT, "content", "html");
const PARTIALS_DIR = path.join(ROOT, "content", "_partials");

export const SITE_ORIGIN = "https://www.greenspaceherbs.com";

type BuildConfig = {
  redirectRepos: string[]; // repo basenames (no .html) that redirect -> excluded from render
  exclude: string[];
  noindex: string[];
  canonicals?: Record<string, string>; // repo -> preferred canonical path (dedup duplicate titles)
};

let _cfg: BuildConfig | null = null;
async function config(): Promise<BuildConfig> {
  if (_cfg) return _cfg;
  _cfg = JSON.parse(
    await fs.readFile(path.join(ROOT, "content", "build-config.json"), "utf-8")
  );
  return _cfg!;
}

type RelatedLink = { href: string; label: string };
let _related: Record<string, RelatedLink[]> | null = null;
async function relatedMap(): Promise<Record<string, RelatedLink[]>> {
  if (_related) return _related;
  try {
    _related = JSON.parse(
      await fs.readFile(path.join(ROOT, "content", "related.json"), "utf-8")
    );
  } catch {
    _related = {};
  }
  return _related!;
}

function renderRelated(links: RelatedLink[]): string {
  const items = links
    .map(
      (l) =>
        `<a class="related-link" href="${l.href}">${l.label}<span aria-hidden="true">→</span></a>`
    )
    .join("");
  return `\n<section class="section related-explore" aria-label="Explore more"><div class="wrap"><p class="eyebrow">Explore more</p><div class="related-grid">${items}</div></div></section>\n`;
}

let _categories: Record<string, string> | null = null;
async function categories(): Promise<Record<string, string>> {
  if (_categories) return _categories;
  try {
    _categories = JSON.parse(
      await fs.readFile(path.join(ROOT, "content", "_categories.json"), "utf-8")
    );
  } catch {
    _categories = {};
  }
  return _categories!;
}

// Per-page JSON-LD: BreadcrumbList (from the URL path) + a type-specific node.
function buildJsonLd(
  repo: string,
  cat: string,
  title: string,
  description: string,
  canonical: string,
  image?: string
): object[] {
  const nodes: object[] = [];

  // Breadcrumb from path segments
  const segs = repo === "__home" ? [] : repo.split("_");
  const crumbs: { "@type": string; position: number; name: string; item: string }[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
  ];
  let acc = "";
  segs.forEach((s, i) => {
    acc += "/" + s;
    crumbs.push({
      "@type": "ListItem",
      position: i + 2,
      name:
        i === segs.length - 1
          ? title
          : s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      item: `${SITE_ORIGIN}${acc}/`,
    });
  });
  if (crumbs.length > 1)
    nodes.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs,
    });

  const publisher = { "@type": "Organization", name: "GreenSpace Herbs", "@id": `${SITE_ORIGIN}/#organization` };
  const isRoleDetail = cat === "CAREERS" && repo !== "careers";

  if (cat === "HERB" || cat === "BLOG" || cat === "SCIENCE") {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: description || undefined,
      image: image || undefined,
      mainEntityOfPage: canonical,
      author: publisher,
      publisher,
      dateModified: "2026-07-18",
      inLanguage: "en-US",
    });
  } else if (cat === "PRODUCT") {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      description: description || undefined,
      image: image || undefined,
      brand: { "@type": "Brand", name: "GreenSpace Herbs" },
      manufacturer: publisher,
      url: canonical,
    });
  } else if (isRoleDetail) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title,
      description: description || title,
      datePosted: "2026-07-01",
      validThrough: "2026-12-31",
      employmentType: "FULL_TIME",
      hiringOrganization: publisher,
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Bengaluru",
          addressCountry: "IN",
        },
      },
      directApply: false,
    });
  }
  return nodes;
}

let _partials: { head: string; header: string; footer: string } | null = null;
async function partials() {
  if (_partials) return _partials;
  const read = async (f: string) => {
    try {
      return await fs.readFile(path.join(PARTIALS_DIR, f), "utf-8");
    } catch {
      return "";
    }
  };
  _partials = {
    head: await read("head.html"),
    header: await read("header.html"),
    footer: await read("footer.html"),
  };
  return _partials;
}

// slug array <-> repo basename (route.ts convention: segments joined with "_")
export function slugToRepo(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return "__home";
  return slug.join("_");
}
export function repoToSlug(repo: string): string[] {
  if (repo === "__home") return [];
  return repo.split("_");
}
export function repoToPath(repo: string): string {
  if (repo === "__home") return "/";
  return "/" + repo.split("_").join("/") + "/";
}

// Which stylesheet hrefs are already loaded globally by the layout — drop these
// from per-page head extraction to avoid double-loading.
const GLOBAL_CSS = ["/redesign/site.css", "/redesign/pages.css"];

export type PageData = {
  repo: string;
  slugPath: string; // "/about/"
  title: string;
  description: string;
  canonical: string;
  bodyClass: string;
  headLinks: string[]; // page-specific stylesheet hrefs (rendered as hoisted <link>)
  headStyles: string[]; // page-specific inline <style> css text
  bodyHtml: string; // <body> inner, partials injected, concierge appended
  noindex: boolean;
  jsonLd: object[]; // per-page structured data (Breadcrumb + type node)
};

function firstMatch(re: RegExp, s: string): string {
  const m = s.match(re);
  return m ? m[1].trim() : "";
}

// Decode HTML entities in extracted title/description text. These strings go
// through the Next Metadata API, which re-escapes them — so if we leave the raw
// entity in, "&amp;" becomes "&amp;amp;". The body HTML is rendered raw and is
// unaffected. Keep this to plain-text metadata only.
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", trade: "™", reg: "®", copy: "©",
  hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“",
  rdquo: "”", deg: "°", times: "×", eacute: "é",
};
function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, ent: string) => {
    if (ent[0] === "#") {
      const code =
        ent[1] === "x" || ent[1] === "X"
          ? parseInt(ent.slice(2), 16)
          : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ent in NAMED ? NAMED[ent] : m;
  });
}

async function injectPartials(html: string): Promise<string> {
  if (!html.includes("<!--#")) return html;
  const p = await partials();
  return html
    .replaceAll("<!--#HEAD#-->", "") // head handled globally by layout
    .replaceAll("<!--#HEADER#-->", p.header)
    .replaceAll("<!--#FOOTER#-->", p.footer);
}

const CONCIERGE =
  '\n<script src="/redesign/concierge.js" defer></script>' +
  '\n<script src="/redesign/booking.js" defer></script>\n';

export async function getPage(repo: string): Promise<PageData | null> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(HTML_DIR, `${repo}.html`), "utf-8");
  } catch {
    return null;
  }
  const cfg = await config();

  const head = firstMatch(/<head[^>]*>([\s\S]*?)<\/head>/i, raw);
  const title =
    decodeEntities(firstMatch(/<title>([\s\S]*?)<\/title>/i, head)) ||
    "GreenSpace Herbs";
  const description = decodeEntities(
    firstMatch(
      /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i,
      head
    )
  );

  // body open tag + inner
  const bodyOpen = raw.match(/<body([^>]*)>/i);
  const bodyClass = bodyOpen ? firstMatch(/class=["']([^"']*)["']/i, bodyOpen[1]) : "";
  let bodyHtml = "";
  if (bodyOpen) {
    const start = bodyOpen.index! + bodyOpen[0].length;
    const end = raw.toLowerCase().lastIndexOf("</body>");
    bodyHtml = raw.slice(start, end === -1 ? undefined : end);
  } else {
    bodyHtml = raw;
  }
  bodyHtml = await injectPartials(bodyHtml);

  // Inject the "Explore more" internal-link module before the footer.
  const rel = (await relatedMap())[repo];
  if (rel && rel.length) {
    const block = renderRelated(rel);
    const fi = bodyHtml.search(/<footer[\s>]/i);
    bodyHtml =
      fi === -1
        ? bodyHtml + block
        : bodyHtml.slice(0, fi) + block + bodyHtml.slice(fi);
  }

  if (!bodyHtml.includes("/redesign/concierge.js")) bodyHtml += CONCIERGE;

  // page-specific CSS from <head>: keep non-global stylesheet links + inline styles
  const headLinks: string[] = [];
  for (const m of head.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)) {
    const href = firstMatch(/href=["']([^"']+)["']/i, m[0]);
    if (!href) continue;
    if (GLOBAL_CSS.some((g) => href.includes(g))) continue;
    if (href.includes("fonts.googleapis") || href.includes("fonts.gstatic")) continue;
    if (!headLinks.includes(href)) headLinks.push(href);
  }
  const headStyles: string[] = [];
  for (const m of head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    headStyles.push(m[1]);
  }

  const slugPath = repoToPath(repo);
  const noindex = cfg.noindex.includes(repo);
  // dedup duplicate-title clusters: point non-preferred pages at the canonical
  const canonicalPath = cfg.canonicals?.[repo] ?? slugPath;
  const canonical = SITE_ORIGIN + canonicalPath;
  const cat = (await categories())[repo] ?? "";
  // first real content image (hero/figure) for Article/Product schema — skip
  // logos, icons and inline data-URIs.
  let image: string | undefined;
  for (const m of bodyHtml.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const src = m[1];
    if (src.startsWith("data:")) continue;
    if (/logo|g-w-logo|fab\.png|\.svg$/i.test(src)) continue;
    if (/\/wp-content\/uploads\/|\/redesign\/(landing|brand)\//i.test(src)) {
      image = src.startsWith("http") ? src : SITE_ORIGIN + src;
      break;
    }
  }
  const jsonLd = noindex
    ? []
    : buildJsonLd(repo, cat, title, description, canonical, image);

  return {
    repo,
    slugPath,
    title,
    description,
    canonical,
    jsonLd,
    bodyClass,
    headLinks,
    headStyles,
    bodyHtml,
    noindex,
  };
}

// All repo basenames that should be RENDERED (not redirected/excluded).
export async function listRenderRepos(): Promise<string[]> {
  const cfg = await config();
  const skip = new Set([...cfg.redirectRepos, ...cfg.exclude]);
  const files = await fs.readdir(HTML_DIR);
  return files
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .filter((repo) => !skip.has(repo))
    .sort();
}

// Repos that are rendered AND indexable (for the sitemap). Excludes noindex
// pages and duplicates that canonicalize to a different URL.
export async function listIndexableRepos(): Promise<string[]> {
  const cfg = await config();
  const noindex = new Set(cfg.noindex);
  const canonicalized = new Set(Object.keys(cfg.canonicals ?? {}));
  return (await listRenderRepos()).filter(
    (r) => !noindex.has(r) && !canonicalized.has(r)
  );
}
