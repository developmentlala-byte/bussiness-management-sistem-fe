import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
// Hapus import Sidebar dari sini

const interSans = Inter({
  variable: "--font-inter", // Saya sesuaikan dengan variabel CSS Anda sebelumnya
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mahalu Studio Management",
  description: "Studio management system by Mahalu Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${interSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
