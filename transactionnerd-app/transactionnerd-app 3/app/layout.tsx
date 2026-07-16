import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransactionNerd",
  description: "Transaction coordination, without the black box.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
