export const metadata = { title: process.env.NEXT_PUBLIC_APP_NAME || "Calm Garden" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/src/app/globals.css" />
      </head>
      <body style={{fontFamily:"system-ui, sans-serif"}}>{children}</body>
    </html>
  );
}
