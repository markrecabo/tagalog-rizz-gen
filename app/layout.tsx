import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tagalog Pickup Line Generator",
  description: "A fun and personal project by Mark Recabo that generates Tagalog pickup lines using Google Gemini via OpenRouter API.",
  keywords: ["tagalog", "pickup lines", "rizz", "AI", "generator", "Mark Recabo", "Gemini", "OpenRouter"],
  authors: [{ name: "Mark Recabo" }],
  creator: "Mark Recabo",
  openGraph: {
    title: "Tagalog Pickup Line Generator",
    description: "Generate creative Tagalog pickup lines with AI",
    url: "https://tagalog-rizz-gen.netlify.app",
    siteName: "Tagalog Pickup Line Generator",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tagalog Pickup Line Generator",
    description: "Generate creative Tagalog pickup lines with AI",
    creator: "@markrecabo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
