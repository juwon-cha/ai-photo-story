import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "AI Photo Story — 사진이 이야기가 되는 순간",
  description:
    "사진 몇 장을 올리면 AI가 캡션과 짧은 이야기를 지어 나만의 앨범으로 만들어 드립니다. 공유 링크로 남기고 갤러리에서 함께 즐겨보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background antialiased">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t py-8 text-center text-sm text-muted-foreground">
          <div className="container">
            AI Photo Story · 바이브코딩으로 만든 포트폴리오 프로젝트
          </div>
        </footer>
      </body>
    </html>
  );
}
