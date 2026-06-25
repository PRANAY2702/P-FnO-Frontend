import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Script from "next/script";

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
        <AuthProvider>
          {children}
        </AuthProvider>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
