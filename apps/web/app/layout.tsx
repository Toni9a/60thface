import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IB's 60th Birthday",
  description: "Private photo album with timeline and people browsing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

