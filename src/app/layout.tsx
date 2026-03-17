import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaceAuth — 얼굴 인증",
  description: "안전한 얼굴 인증 서비스",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0e1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-[#0a0e1a] text-[#e8eaf6] antialiased">
        <div className="mx-auto max-w-[430px] min-h-dvh relative">
          {children}
        </div>
      </body>
    </html>
  );
}
