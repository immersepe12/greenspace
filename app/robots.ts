import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/content";

export const dynamic = "force-static";

// Emitted as a static out/robots.txt at build.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/"],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
