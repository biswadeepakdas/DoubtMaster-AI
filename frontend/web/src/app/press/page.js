import Link from 'next/link';

export default function Press() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <img src="/logo-icon.jpg" alt="DoubtMaster AI" className="w-9 h-9 rounded-xl object-cover" />
          <span className="font-bold text-xl text-gray-900">
            DoubtMaster <span className="text-teal-500">AI</span>
          </span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Press</h1>
        <p className="text-gray-600 mb-8">
          This page is coming soon. For questions, contact{' '}
          <a href="mailto:support@doubtmaster.ai" className="text-teal-600 hover:underline">
            support@doubtmaster.ai
          </a>
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
        >
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
