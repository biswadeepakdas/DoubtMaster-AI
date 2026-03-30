function siteBase() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
}

export default function robots() {
  const base = siteBase();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/settings',
        '/profile',
        '/history',
        '/progress',
        '/mock-tests',
        '/teacher',
        '/verify-otp',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
