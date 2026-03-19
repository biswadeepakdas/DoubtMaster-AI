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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code || !iframeRef.current) return;

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
    body { display: flex; justify-content: center; align-items: center; min-height: 100%; background: #F8FAFC; overflow: hidden; }
    canvas { border-radius: 12px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"><\/script>
</head>
<body>
  <script>
    try {
      ${cleanCode}
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

    // Listen for errors from iframe
    const handleMessage = (e) => {
      if (e.data?.type === 'animation-error') {
        setError(e.data.message);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      URL.revokeObjectURL(url);
      window.removeEventListener('message', handleMessage);
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

  if (!code) return null;

  return (
    <div className={`rounded-2xl overflow-hidden border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">&#9654;</span>
          <span className="text-white text-sm font-semibold">{title || 'Animation'}</span>
        </div>
        <button
          onClick={togglePlay}
          className="text-white/80 hover:text-white text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      {/* Description */}
      {description && (
        <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          {description}
        </p>
      )}

      {/* Animation iframe */}
      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          Animation failed to load: {error}
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          className="w-full border-0 bg-gray-50 dark:bg-slate-800"
          style={{ height: '380px' }}
          title={title || 'Educational Animation'}
        />
      )}
    </div>
  );
}
