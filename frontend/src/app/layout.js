import './globals.css';
import { AuthProvider } from '@/lib/auth';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata = {
  title: 'Agentvault — Evidence-first knowledge workspace',
  description: 'Search trusted knowledge, get cited answers, and review the evidence behind every response.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary antialiased">
        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
