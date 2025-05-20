// src/app/layout.tsx

import './globals.css';
import { Inter } from 'next/font/google';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SNW03',
  description: '스마트 월렛 프로젝트',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-100`}>
        <div className="w-full max-w-[500px] mx-auto bg-white min-h-screen shadow-md">
          {/* ✅ ThirdwebProvider 포함된 Providers 컴포넌트로 감싸기 */}
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
