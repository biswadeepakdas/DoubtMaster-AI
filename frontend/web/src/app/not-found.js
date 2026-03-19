import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
          <span className="text-white font-bold text-3xl">?</span>
        </div>
        <h1 className="text-6xl font-extrabold text-slate-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-4">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Looks like this page does not exist. Maybe the URL is wrong, or this feature is coming soon.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
