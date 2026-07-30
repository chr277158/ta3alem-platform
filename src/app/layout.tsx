import { MishbakProvider } from '@/context/MishbakContext';
import KidMishbakAssistant from '@/components/KidMishbakAssistant';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '@/app/globals.css';

export const metadata = {
  title: 'تعلّم وألعب! - Ta3alem',
  description: 'منصة تعليمية تفاعلية للتلاميذ التونسيين',
};

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