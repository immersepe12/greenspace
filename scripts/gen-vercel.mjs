// Generate vercel.json from content/redirects.json (exact 301s) +
// content/redirect-patterns.json (Vercel param/wildcard 301s). Run after
// editing either file:  node scripts/gen-vercel.mjs
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();

const exact = JSON.parse(
  await fs.readFile(path.join(ROOT, "content", "redirects.json"), "utf-8")
);
const patterns = JSON.parse(
  await fs.readFile(path.join(ROOT, "content", "redirect-patterns.json"), "utf-8")
);

const redirects = [
  ...Object.entries(exact).map(([from, to]) => ({
    source: "/" + from.replace(/^\/+|\/+$/g, ""),
    destination: to,
    permanent: true,
  })),
  ...patterns,
  {
    source: "/favicon.ico",
    destination: "/wp-content/uploads/2025/04/fab.png",
    permanent: false,
  },
];

const vercel = {
  $schema: "https://openapi.vercel.sh/vercel.json",
  framework: "nextjs",
  trailingSlash: true,
  redirects,
};

await fs.writeFile(
  path.join(ROOT, "vercel.json"),
  JSON.stringify(vercel, null, 2) + "\n"
);
console.log(
  `vercel.json: ${Object.keys(exact).length} exact + ${patterns.length} pattern + 1 favicon = ${redirects.length} redirects`
);
