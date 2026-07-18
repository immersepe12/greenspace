// Runs after `next build` (output: export). GitHub Pages can't do server-side
// 301s, so we emit meta-refresh + rel=canonical stub pages for every redirect,
// and ensure .nojekyll + CNAME exist in the exported site.
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const ORIGIN = "https://www.greenspaceherbs.com";
const DOMAIN = "www.greenspaceherbs.com";

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function stub(target) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="${target}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p>This page has moved. Redirecting to <a href="${target}">${target}</a>…</p>
<script>window.location.replace(${JSON.stringify(target)});</script>
</body>
</html>
`;
}

async function main() {
  if (!(await exists(OUT))) {
    console.error("postbuild: out/ not found — did `next build` run?");
    process.exit(1);
  }

  // GitHub Pages: don't run Jekyll (keeps _next/ etc.), and pin the custom domain.
  await fs.writeFile(path.join(OUT, ".nojekyll"), "");
  await fs.writeFile(path.join(OUT, "CNAME"), DOMAIN + "\n");

  // favicon.ico parity (live site 302'd it to the uploaded png)
  const favSrc = path.join(OUT, "wp-content/uploads/2025/04/fab.png");
  if (await exists(favSrc)) {
    await fs.copyFile(favSrc, path.join(OUT, "favicon.ico"));
  }

  const redirects = JSON.parse(
    await fs.readFile(path.join(ROOT, "content", "redirects.json"), "utf-8")
  );

  let written = 0;
  for (const [from, to] of Object.entries(redirects)) {
    const target = to.startsWith("http") ? to : ORIGIN + to;
    const rel = from.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!rel) continue;
    const dir = path.join(OUT, rel);
    // never clobber a real rendered page
    if (await exists(path.join(dir, "index.html"))) continue;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "index.html"), stub(target));
    written++;
  }
  console.log(`postbuild: ${written} redirect stubs, .nojekyll + CNAME written.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
