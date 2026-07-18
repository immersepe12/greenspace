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
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
