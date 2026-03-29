import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/lib/convex-provider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MergeGuard — Pre-Merge Intelligence for Engineering Teams",
  description:
    "Open-source blast radius analysis and historical failure pattern mining. Know what breaks before you merge. Built for FOSS Hack 2026.",
  openGraph: {
    title: "MergeGuard — Pre-Merge Intelligence",
    description:
      "Catch dependency risks, logic bombs, and architectural regressions before they hit production.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0a0b0d" />
      </head>
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
