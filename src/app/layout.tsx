import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { default: "からだのじかん Growth OS", template: "%s | からだのじかん" },
  description: "今日やることが分かる、からだのじかん専用Instagram運用OS",
  applicationName: "からだのじかん Growth OS",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf8f3" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
