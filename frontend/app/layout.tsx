import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FR물동량",
  description: "FR 대리상 물동량 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
