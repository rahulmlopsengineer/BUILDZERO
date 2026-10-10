import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import ShapeGridBackground from "@/components/ShapeGridBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildZero — AI-powered Cloud Development",
  description: "Build full-stack apps with AI in your browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" style={{ position: 'relative' }}>
        {/* Fixed animated ShapeGrid behind all content */}
        <ShapeGridBackground />
        {/* Page content stacked above */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <SessionProvider>{children}</SessionProvider>
        </div>
      </body>
    </html>
  );
}
