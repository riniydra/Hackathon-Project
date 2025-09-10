import "./globals.css";

export const metadata = { title: process.env.NEXT_PUBLIC_APP_NAME || "Calm Garden" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
