import "./globals.css";
import "../generated/tailwind.css";

export const metadata = {
  title: "TalentStream",
  description: "Job board UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}