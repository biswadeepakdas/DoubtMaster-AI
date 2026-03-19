'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Renders p5.js animations in a sandboxed iframe.
 * The LLM generates p5.js code (setup + draw), and this component
 * runs it safely in an isolated iframe with the p5.js library loaded.
 */
export default function AnimationRenderer({ code, title, description, className = '' }) {
  const iframeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code || !iframeRef.current) return;

    setIsLoaded(false);
    setError('');

    // Clean the code — strip markdown fences if present
    let cleanCode = code.trim();
    cleanCode = cleanCode.replace(/^```(?:javascript|js)?\s*\n?/, '').replace(/\n?```\s*$/, '');

    // Build the HTML document for the iframe
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      background: #FFFFFF;
      overflow: hidden;
    }
    canvas { border-radius: 8px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"><\/script>
</head>
<body>
  <script>
    try {
      ${cleanCode}
      window.parent.postMessage({ type: 'animation-loaded' }, '*');
    } catch(e) {
      document.body.innerHTML = '<p style="color:#EF4444;padding:20px;font-family:system-ui;">Animation error: ' + e.message + '</p>';
      window.parent.postMessage({ type: 'animation-error', message: e.message }, '*');
    }
  <\/script>
</body>
</html>`;

    const iframe = iframeRef.current;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;

    // Listen for messages from iframe
    const handleMessage = (e) => {
      if (e.data?.type === 'animation-error') {
        setError(e.data.message);
      }
      if (e.data?.type === 'animation-loaded') {
        setIsLoaded(true);
      }
    };
    window.addEventListener('message', handleMessage);

    // Fallback: mark loaded after a short timeout in case postMessage is blocked
    const fallbackTimer = setTimeout(() => setIsLoaded(true), 2000);

    return () => {
      URL.revokeObjectURL(url);
      window.removeEventListener('message', handleMessage);
      clearTimeout(fallbackTimer);
    };
  }, [code]);

  const togglePlay = () => {
    if (!iframeRef.current) return;
    try {
      const p5Inst = iframeRef.current.contentWindow;
      if (isPlaying) {
        p5Inst.noLoop?.();
      } else {
        p5Inst.loop?.();
      }
      setIsPlaying(!isPlaying);
    } catch {
      // Cross-origin restrictions — can't control p5 directly
    }
  };

  const restart = () => {
    if (!iframeRef.current || !code) return;
    setIsPlaying(true);
    setIsLoaded(false);
    // Re-trigger the effect by reassigning src
    const iframe = iframeRef.current;
    const currentSrc = iframe.src;
    iframe.src = '';
    requestAnimationFrame(() => {
      iframe.src = currentSrc;
    });
  };

  if (!code) return null;

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/80 dark:border-slate-700/80 backdrop-blur-sm transition-all duration-300 ${className}`}
    >
      {/* Gradient Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-teal-600 dark:to-emerald-600">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5,3 19,12 5,21" fill="white" stroke="none" />
            </svg>
          </div>
          <span className="text-white text-sm font-semibold truncate">{title || 'Animation'}</span>
        </div>

        {/* Video-player-style controls */}
        <div className="flex items-center gap-1.5">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors duration-150"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <polygon points="6,3 20,12 6,21" />
              </svg>
            )}
          </button>

          {/* Restart */}
          <button
            onClick={restart}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors duration-150"
            title="Restart"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,4 1,10 7,10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="px-4 py-2.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700/50">
          {description}
        </p>
      )}

      {/* Animation iframe + loading skeleton */}
      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Animation failed to load: {error}
        </div>
      ) : (
        <div className="relative bg-white dark:bg-slate-900">
          {/* Loading skeleton */}
          {!isLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40 flex items-center justify-center animate-pulse">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-teal-500 dark:text-teal-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="h-2.5 w-40 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse" />
                <div className="h-2 w-28 bg-gray-100 dark:bg-slate-800 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Iframe with fade-in */}
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            className={`w-full border-0 bg-white dark:bg-white transition-opacity duration-500 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ height: '380px' }}
            title={title || 'Educational Animation'}
          />
        </div>
      )}
    </div>
  );
}
