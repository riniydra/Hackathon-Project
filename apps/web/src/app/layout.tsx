import { ThemeProvider } from '@/lib/theme';
import '@/styles/tokens.css';

export const metadata = { title: process.env.NEXT_PUBLIC_APP_NAME || "Calm Garden" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: 'var(--font-family-sans)',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        margin: 0,
        padding: 0,
        minHeight: '100vh'
      }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
