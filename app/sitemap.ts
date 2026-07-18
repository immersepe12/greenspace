import type { MetadataRoute } from "next";
import { listIndexableRepos, repoToPath, SITE_ORIGIN } from "@/lib/content";

export const dynamic = "force-static";

// Emitted as a static out/sitemap.xml at build. Lists only indexable pages
// (render set minus noindex), so archives/dashboard/redirect stubs are excluded.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repos = await listIndexableRepos();
  const priority = (repo: string) => {
    if (repo === "__home") return 1.0;
    if (repo.startsWith("products") || repo.startsWith("research-and-science"))
      return 0.9;
    if (repo.startsWith("curcuminqa") || repo.startsWith("berberineqa") || repo.startsWith("ashwagandhaqa"))
      return 0.9;
    return 0.7;
  };
  return repos.map((repo) => ({
    url: SITE_ORIGIN + repoToPath(repo),
    changeFrequency: "monthly",
    priority: priority(repo),
  }));
}
