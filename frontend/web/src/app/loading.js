export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/25 animate-pulse">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        <div className="w-8 h-8 border-3 border-teal-200 dark:border-teal-800 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}
