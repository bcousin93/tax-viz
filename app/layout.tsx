import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tax Visualizer — see where your tax dollars go",
  description: "Enter your ZIP and income to see a breakdown of where your federal, state, and local taxes go.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
