import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "PHOTA | Medical Matching & Route Control",
  description: "Punjab's secure hospital and public portal for organ coordination, blood availability, location-aware matching, and moderated contact.",
  openGraph: {
    title: "PHOTA | Medical Matching & Route Control",
    description: "PHOTA",
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 864, alt: "PHOTA medical matching and route control" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
