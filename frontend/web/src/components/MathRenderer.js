'use client';

import { useMemo } from 'react';
import katex from 'katex';

/**
 * Renders text with inline LaTeX math expressions.
 * Supports:
 *   - $...$ for inline math
 *   - $$...$$ for display (block) math
 *   - \[...\] for display math
 *   - \(...\) for inline math
 *   - \begin{bmatrix}...\end{bmatrix} etc. (auto-detected)
 *   - Plain text passed through as-is
 */
export default function MathRenderer({ text, className = '' }) {
  const rendered = useMemo(() => {
    if (!text) return '';
    return renderMathInText(text);
  }, [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

/**
 * Block-level math renderer for formulas that should be centered.
 */
export function MathBlock({ text, className = '' }) {
  const rendered = useMemo(() => {
    if (!text) return '';
    return renderMathInText(text);
  }, [text]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

/**
 * Parse text and render LaTeX segments with KaTeX.
 * Non-math text is HTML-escaped and returned as-is.
 */
function renderMathInText(text) {
  const trimmed = text.trim();

  // If the entire text looks like LaTeX (environment, or contains LaTeX commands without delimiters)
  if (/^\\begin\{/.test(trimmed) || /^\\\[/.test(trimmed)) {
    try {
      return katex.renderToString(trimmed, { displayMode: true, throwOnError: false, trust: true });
    } catch {
      return escapeHtml(text);
    }
  }

  // If text contains LaTeX commands but no $ delimiters, it's likely unwrapped math
  // Common patterns: \text{}, \frac{}, \cdot, \sqrt{}, \pm, \times, \div, \leq, \geq, \neq, \alpha, etc.
  if (!text.includes('$') && /\\(?:text|frac|cdot|sqrt|pm|times|div|leq|geq|neq|alpha|beta|gamma|delta|theta|lambda|mu|sigma|pi|infty|sum|prod|int|lim|log|sin|cos|tan|vec|hat|bar|dot|ddot|mathbf|mathrm|mathbb|left|right|binom|tbinom)\b/.test(text)) {
    try {
      return katex.renderToString(trimmed, { displayMode: false, throwOnError: false, trust: true });
    } catch {
      // Fall through to normal parsing
    }
  }

  const parts = [];
  let remaining = text;

  // Process the text, finding math delimiters
  while (remaining.length > 0) {
    // Find the next math delimiter
    let match = null;
    let matchIndex = Infinity;

    // Check for $$ (display math) — must check before single $
    const ddIdx = remaining.indexOf('$$');
    if (ddIdx !== -1 && ddIdx < matchIndex) {
      const endIdx = remaining.indexOf('$$', ddIdx + 2);
      if (endIdx !== -1) {
        match = { start: ddIdx, end: endIdx + 2, latex: remaining.substring(ddIdx + 2, endIdx), display: true };
        matchIndex = ddIdx;
      }
    }

    // Check for single $ (inline math) — only if no $$ found at same position
    if (!match || matchIndex > 0) {
      const sIdx = remaining.indexOf('$');
      if (sIdx !== -1 && sIdx < matchIndex && !(remaining[sIdx + 1] === '$')) {
        const endIdx = remaining.indexOf('$', sIdx + 1);
        if (endIdx !== -1 && endIdx > sIdx + 1) {
          const inlineLatex = remaining.substring(sIdx + 1, endIdx);
          const hasBlockEnv = /\\begin\{/.test(inlineLatex);
          match = { start: sIdx, end: endIdx + 1, latex: inlineLatex, display: hasBlockEnv };
          matchIndex = sIdx;
        }
      }
    }

    // Check for \[...\] (display math)
    const blIdx = remaining.indexOf('\\[');
    if (blIdx !== -1 && blIdx < matchIndex) {
      const endIdx = remaining.indexOf('\\]', blIdx + 2);
      if (endIdx !== -1) {
        match = { start: blIdx, end: endIdx + 2, latex: remaining.substring(blIdx + 2, endIdx), display: true };
        matchIndex = blIdx;
      }
    }

    // Check for \(...\) (inline math)
    const ipIdx = remaining.indexOf('\\(');
    if (ipIdx !== -1 && ipIdx < matchIndex) {
      const endIdx = remaining.indexOf('\\)', ipIdx + 2);
      if (endIdx !== -1) {
        match = { start: ipIdx, end: endIdx + 2, latex: remaining.substring(ipIdx + 2, endIdx), display: false };
        matchIndex = ipIdx;
      }
    }

    // Check for \begin{...} without enclosing delimiters
    const beginIdx = remaining.indexOf('\\begin{');
    if (beginIdx !== -1 && beginIdx < matchIndex) {
      // Find the matching \end{...}
      const envMatch = remaining.substring(beginIdx).match(/^(\\begin\{(\w+)\}[\s\S]*?\\end\{\2\})/);
      if (envMatch) {
        match = { start: beginIdx, end: beginIdx + envMatch[1].length, latex: envMatch[1], display: true };
        matchIndex = beginIdx;
      }
    }

    if (!match) {
      // No more math found — push remaining text
      parts.push(escapeHtml(remaining));
      break;
    }

    // Push text before the math
    if (match.start > 0) {
      parts.push(escapeHtml(remaining.substring(0, match.start)));
    }

    // Render the math
    try {
      parts.push(katex.renderToString(match.latex, {
        displayMode: match.display,
        throwOnError: false,
        trust: true,
      }));
    } catch {
      parts.push(escapeHtml(remaining.substring(match.start, match.end)));
    }

    remaining = remaining.substring(match.end);
  }

  return parts.join('');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}
