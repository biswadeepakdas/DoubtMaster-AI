import './globals.css';

export const metadata = {
  title: 'DoubtMaster AI - Clear Doubts. Think Better.',
  description: 'India\'s #1 AI homework solver. Solve any NCERT, JEE, or NEET question instantly with step-by-step solutions. Free for all NCERT questions.',
  keywords: 'homework solver, NCERT solutions, JEE preparation, NEET preparation, AI tutor, CBSE, ICSE, Indian students, DoubtMaster AI',
  openGraph: {
    title: 'DoubtMaster AI - Clear Doubts. Think Better.',
    description: 'India\'s smartest AI homework solver. Unlimited free NCERT solutions. JEE/NEET prep at just Rs.49/month.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'DoubtMaster AI',
    images: [{ url: '/logo-dark.jpg', width: 571, height: 881, alt: 'DoubtMaster AI' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo-icon.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo-icon.jpg" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
