// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "App | Phase 4 - Header",
  description: "Header introduced with Tailwind",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <Header />
        {children}
      </body>
    </html>
  );
}