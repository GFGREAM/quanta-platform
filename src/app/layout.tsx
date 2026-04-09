import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quanta by GFG AM",
  description: "Plataforma de Business Intelligence para GFG Real Estate Asset Management",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Quanta by GFG AM",
    description: "Plataforma de Business Intelligence",
    url: "https://quanta.gfgam.com",
    siteName: "Quanta",
    images: [
      {
        url: "/quanta_logo.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/quanta_logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
