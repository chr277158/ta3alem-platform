

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MishbakAssistant from '@/components/MishbakAssistant';
import './components/MishbakAssistant.css';

// ✅ تعريف الخطوط
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ بيانات الموقع (Metadata)
export const metadata: Metadata = {
  title: "تعلّم وألعب! - Ta3alem",
  description: "منصة تعليمية تفاعلية للتلاميذ التونسيين في التعليم الابتدائي",
};

// ✅ دالة RootLayout واحدة فقط (بدون تكرار)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <MishbakAssistant />
      </body>
    </html>
  );
}