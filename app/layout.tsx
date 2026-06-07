import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import Nav from "@/app/components/layout/Nav";
import Sidebar from "@/app/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Receptor",
  description: "思考アジリティ可視化アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "sans-serif" }}>
        <SessionProvider>
          <Nav />
          <div style={{ display: "flex" }}>
            <Sidebar />
            <main style={{ flex: 1, padding: "24px" }}>
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
