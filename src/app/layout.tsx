import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shin君 - 木更津の専門AI",
  description: "木更津市・木更津高校に詳しい専門AIチャットボット。地域の情報から一般的な質問まで、Web検索も活用して正確にお答えします。",
  keywords: ["木更津", "木更津高校", "AI", "チャットボット", "千葉県"],
  openGraph: {
    title: "Shin君 - 木更津の専門AI",
    description: "木更津市・木更津高校に詳しい専門AIチャットボット",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
