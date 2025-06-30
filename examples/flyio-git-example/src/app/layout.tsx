import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lightfast Computer - Next.js Example',
  description: 'Example Next.js app demonstrating Lightfast Computer SDK usage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    🚀 Lightfast Computer
                  </h1>
                  <span className="ml-3 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                    Next.js Example
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  SDK Demo App
                </div>
              </div>
            </div>
          </header>
          
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
