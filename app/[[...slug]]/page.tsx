import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, listRenderRepos, slugToRepo } from "@/lib/content";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const repos = await listRenderRepos();
  return repos.map((repo) => ({
    slug: repo === "__home" ? [] : repo.split("_"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slugToRepo(slug));
  if (!page) return {};
  return {
    title: { absolute: page.title },
    description: page.description || undefined,
    alternates: { canonical: page.canonical },
    robots: page.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "GreenSpace Herbs",
      title: page.title,
      description: page.description || undefined,
      url: page.canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description || undefined,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = await getPage(slugToRepo(slug));
  if (!page) notFound();

  return (
    <>
      {/* apply the source page's <body> class before content paints */}
      {page.bodyClass ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.body.className=${JSON.stringify(page.bodyClass)};`,
          }}
        />
      ) : null}
      {/* page-specific stylesheets — hoisted into <head> by React */}
      {page.headLinks.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="page" />
      ))}
      {page.headStyles.map((css, i) => (
        <style key={i} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      {/* exact source body markup, partials + concierge injected at build */}
      <div
        style={{ display: "contents" }}
        dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
      />
    </>
  );
}
