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
  title: "Quanta by GFG AM",
  description: "Plataforma de Business Intelligence",
  icons: {
    icon: "/favicon.svg",
    apple: "/quanta_logo.png",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
