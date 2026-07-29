
import { MishbakProvider } from '@/context/MishbakContext';
import { Metadata } from 'next';
import KidMishbakAssistant from '@/components/KidMishbakAssistant';
import '@/app/globals.css';

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
      <body>
        <MishbakProvider>
          {children}
          <KidMishbakAssistant />
        </MishbakProvider>
      </body>
    </html>
  );
}


