export const metadata = {
  title: 'QuoteKai',
  description: 'A rotating quote app built for infrastructure practice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
