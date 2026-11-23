import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura PDF Drive & Reader | Eye-Friendly PDF Markup",
  description: "A modern, eye-friendly PDF viewer and drive with annotations, scribbles, reading progress sync, and image-supported comments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
