import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrunchGo - 商家管理后台",
  description: "餐饮点单商家管理后台系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
