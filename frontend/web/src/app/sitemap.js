const PUBLIC_PATHS = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/press', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/login', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/signup', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms-of-service', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/cookie-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
];

function siteBase() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
}

export default function sitemap() {
  const base = siteBase();
  const lastModified = new Date();
  return PUBLIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: path ? `${base}${path}` : `${base}/`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
