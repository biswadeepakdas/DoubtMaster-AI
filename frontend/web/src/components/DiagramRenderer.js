'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Renders Mermaid.js diagrams from code strings.
 * Extracts mermaid code from markdown fences or raw mermaid syntax.
 */
export default function DiagramRenderer({ code, className = '' }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    // Extract mermaid code from markdown fences if present
    let mermaidCode = code.trim();
    const fenceMatch = mermaidCode.match(/```mermaid\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
      mermaidCode = fenceMatch[1].trim();
    }
    // Also strip leading ``` without mermaid label
    mermaidCode = mermaidCode.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

    if (!mermaidCode || mermaidCode.length < 10) return;

    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#0D9488',
            primaryTextColor: '#1E293B',
            primaryBorderColor: '#14B8A6',
            lineColor: '#64748B',
            secondaryColor: '#F0FDF4',
            tertiaryColor: '#F8FAFC',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 12,
          },
          securityLevel: 'strict',
        });

        const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);
        const { svg: renderedSvg } = await mermaid.render(id, mermaidCode);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Mermaid render failed:', err.message);
          setError('Diagram could not be rendered');
          setSvg('');
        }
      }
    }

    renderDiagram();
    return () => { cancelled = true; };
  }, [code]);

  if (!code) return null;

  if (error) {
    return (
      <div className={`p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <p className="font-medium mb-1">Diagram</p>
        <pre className="whitespace-pre-wrap text-xs font-mono">{code.replace(/```mermaid\s*\n?/, '').replace(/\n?```/, '')}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`p-4 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center ${className}`}>
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
