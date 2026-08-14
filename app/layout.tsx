import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toast } from "@heroui/react";
import ReactQueryProvider from "./react-quesry-provider";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mahalu Spa Management",
  description: "Business management mahalu spa",
  icons: {
    icon: [
      { url: "/logo/favicon-48.webp", sizes: "48x48", type: "image/webp" },
      { url: "/logo/favicon-96.webp", sizes: "96x96", type: "image/webp" },
    ],
    apple: "/logo/apple-touch-icon.webp",
  },
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
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
      </head>
      {/* TAMBAHKAN suppressHydrationWarning JUGA DI BODY */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ReactQueryProvider>
          <Providers>
            <Toast.Provider placement="top end" />
            {children}
          </Providers>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
