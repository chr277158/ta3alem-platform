
import { MishbakProvider } from '@/context/MishbakContext';
import KidMishbakAssistant from '@/components/KidMishbakAssistant';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '@/app/globals.css';

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

// ✅ دالة RootLayout واحدjة فقط (بدون تكرار)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <MishbakProvider>
          {children}
          <KidMishbakAssistant />
        </MishbakProvider>
      </body>
    </html>
  );
}


