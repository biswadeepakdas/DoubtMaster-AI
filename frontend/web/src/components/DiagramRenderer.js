'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Renders Mermaid.js diagrams from code strings.
 * Handles various LLM output formats and sanitizes for Mermaid v11 compatibility.
 */
export default function DiagramRenderer({ code, className = '' }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    let mermaidCode = cleanMermaidCode(code);
    if (!mermaidCode || mermaidCode.length < 10) return;

    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#CCFBF1',
            primaryTextColor: '#134E4A',
            primaryBorderColor: '#14B8A6',
            lineColor: '#64748B',
            secondaryColor: '#F0FDF4',
            tertiaryColor: '#F8FAFC',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            nodeBorder: '#14B8A6',
            mainBkg: '#CCFBF1',
            clusterBkg: '#F0FDF4',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 12,
            nodeSpacing: 40,
            rankSpacing: 50,
          },
          securityLevel: 'loose',
        });

        const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);
        const { svg: renderedSvg } = await mermaid.render(id, mermaidCode);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError('');
        }
      } catch (err) {
        console.warn('Mermaid render failed:', err.message, '\nCode:', mermaidCode);

        // Retry without style directives (common cause of v11 failures)
        if (!cancelled && mermaidCode.includes('style ')) {
          try {
            const stripped = mermaidCode.replace(/^\s*style\s+.*$/gm, '').trim();
            const mermaid = (await import('mermaid')).default;
            const id2 = 'mermaid-retry-' + Math.random().toString(36).slice(2, 9);
            const { svg: retrySvg } = await mermaid.render(id2, stripped);
            if (!cancelled) {
              setSvg(retrySvg);
              setError('');
              return;
            }
          } catch {
            // Fall through to error display
          }
        }

        if (!cancelled) {
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
    // Show the raw diagram as formatted text
    const rawCode = cleanMermaidCode(code);
    return (
      <div className={`rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Diagram (text view)</span>
        </div>
        <pre className="p-4 text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-slate-900 overflow-x-auto">{rawCode}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`p-6 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center gap-2 ${className}`}>
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Rendering diagram...</span>
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

/**
 * Clean and normalize Mermaid code from LLM output.
 * Handles: markdown fences, escaped newlines, style directives, bad syntax.
 */
function cleanMermaidCode(code) {
  let cleaned = code.trim();

  // Extract from markdown fences: ```mermaid\n...\n```
  const fenceMatch = cleaned.match(/```mermaid\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Strip remaining fence markers
  cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');

  // Replace literal \n with real newlines (LLM sometimes returns escaped)
  cleaned = cleaned.replace(/\\n/g, '\n');

  // Remove lines with problematic style directives that break Mermaid v11
  // Keep classDef but remove inline style directives with complex CSS
  cleaned = cleaned.replace(/^\s*style\s+\w+\s+fill:[^,\n]*,\s*stroke:[^,\n]*(?:,\s*stroke-width:[^\n]*)?\s*$/gm, '');

  // Fix common LLM issues:
  // 1. Remove empty lines between graph declaration and first node
  cleaned = cleaned.replace(/(graph\s+(?:TD|LR|TB|RL|BT))\s*\n\s*\n/g, '$1\n');

  // 2. Fix arrow syntax: --> | text | should be -->|text|
  cleaned = cleaned.replace(/--> \| /g, '-->|');
  cleaned = cleaned.replace(/ \| /g, '| ');

  // 3. Ensure the code starts with a valid graph/flowchart declaration
  if (!/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|pie|gantt|erDiagram)\s/m.test(cleaned)) {
    // Might be missing the graph declaration — try prepending
    if (cleaned.includes('-->') || cleaned.includes('---')) {
      cleaned = 'graph TD\n' + cleaned;
    }
  }

  return cleaned.trim();
}
