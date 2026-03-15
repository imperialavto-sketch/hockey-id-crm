import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "Hockey ID CRM — Мировой лидер",
  description: "CRM для хоккейных школ: команды, игроки, расписания и аналитика",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.variable} ${orbitron.variable} ${inter.className} antialiased`}>
        <AuthProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </AuthProvider>
      </body>
    </html>
  );
}
