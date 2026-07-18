import type { Metadata } from "next";
import { SITE_ORIGIN } from "@/lib/content";

// Global metadata. Per-page title/description/canonical come from generateMetadata
// in app/[[...slug]]/page.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default:
      "GreenSpace Herbs — Where Ayurveda Meets Quantum Intelligence",
    template: "%s",
  },
  description:
    "GreenSpace Herbs engineers clinically validated Energized Active Supplement Ingredients (EASI)™ — botanical actives elevated by AI, Quantum Chemistry and Ayurveda.",
  icons: { icon: "/wp-content/uploads/2025/04/logo.png" },
  robots: { index: true, follow: true },
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: "GreenSpace Herbs",
      url: `${SITE_ORIGIN}/`,
      logo: `${SITE_ORIGIN}/wp-content/uploads/2025/04/logo.png`,
      description:
        "GreenSpace Herbs engineers clinically validated Energized Active Supplement Ingredients (EASI)™ — botanical actives elevated by AI, Quantum Chemistry and Ayurveda.",
      email: "quantum@greenspaceherbs.com",
      telephone: "+91-80-22330084",
      sameAs: [
        "https://www.linkedin.com/company/greenspace-herbs/",
        "https://www.instagram.com/greenspaceherbs/",
        "https://x.com/Greenspace_Hrbs",
        "https://www.youtube.com/@GreenSpaceHerbs",
      ],
      address: [
        {
          "@type": "PostalAddress",
          addressLocality: "Bengaluru",
          addressRegion: "Karnataka",
          postalCode: "560022",
          addressCountry: "IN",
        },
        {
          "@type": "PostalAddress",
          addressLocality: "South Plainfield",
          addressRegion: "NJ",
          postalCode: "07080",
          addressCountry: "US",
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: "GreenSpace Herbs",
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
        {/* Global design system — hoisted to <head> with high precedence */}
        <link rel="stylesheet" href="/redesign/site.css" precedence="high" />
        <link rel="stylesheet" href="/redesign/pages.css" precedence="high" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
