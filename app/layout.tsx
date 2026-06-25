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
