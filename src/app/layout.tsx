import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "P-FnO — Futures & Options",
  description: "Professional-grade options pricing & risk management platform for NSE derivatives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body suppressHydrationWarning className="h-full">
        {children}
      </body>
    </html>
  );
}
