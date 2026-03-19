import './globals.css';

export const metadata = {
  title: 'DoubtMaster AI - India\'s #1 AI Homework Solver',
  description: 'Solve any NCERT, JEE, or NEET question instantly with AI. Step-by-step solutions in Hindi and 10 regional languages. Free for all NCERT questions.',
  keywords: 'homework solver, NCERT solutions, JEE preparation, NEET preparation, AI tutor, CBSE, ICSE, Indian students',
  openGraph: {
    title: 'DoubtMaster AI - Samjho, Sirf Answer Mat Dekho',
    description: 'India\'s smartest homework solver. Unlimited free NCERT solutions. JEE/NEET prep at just Rs.49/month.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'DoubtMaster AI',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
