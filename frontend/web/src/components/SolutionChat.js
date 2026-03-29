'use client';

import { useState, useRef, useEffect } from 'react';
import MathRenderer from './MathRenderer';

/**
 * Lightweight follow-up chat agent embedded below solutions.
 * Students can ask clarifications, get re-explanations, or explore variations.
 * Uses streaming for real-time response display.
 */
export default function SolutionChat({ questionText, solution, subject, className = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const suggestions = [
    'Explain step by step in simpler words',
    'Why did we use this method?',
    'Can you solve a similar problem?',
    'I don\'t understand the formula',
  ];

  const handleSend = async (text) => {
    const msgText = text || input.trim();
    if (!msgText || isStreaming) return;

    // Add user message
    const userMsg = { role: 'user', content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    // Add empty assistant message for streaming
    const assistantMsg = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMsg]);

    try {
      const token = localStorage.getItem('dm-token');
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Build conversation context
      const solutionContext = solution?.steps?.map(s =>
        `Step ${s.stepNumber}: ${s.title}\n${s.content}`
      ).join('\n\n') || '';

      const systemPrompt = `You are a friendly, patient tutor helping an Indian student understand a ${subject || 'academic'} solution.

The student was solving: "${questionText || ''}"

The solution provided was:
${solutionContext}
${solution?.finalAnswer ? `\nFinal Answer: ${solution.finalAnswer}` : ''}

Rules:
- Be concise — 2-4 sentences per response unless asked for detail
- Use simple language appropriate for Indian school students
- If they ask to re-explain, use a DIFFERENT approach or analogy
- Use LaTeX for math: $x^2$ for inline, $$equation$$ for display
- If they ask for a similar problem, create one and solve it
- Be encouraging — "Great question!", "You're on the right track!"
- If they seem confused, offer a hint before giving the full answer`;

      const chatHistory = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${BASE_URL}/api/v1/chat/followup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ systemPrompt, messages: chatHistory }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to get response');
      }

      // Handle streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep incomplete chunk
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const chunk = JSON.parse(payload);
            if (chunk.text) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + chunk.text,
                };
                return updated;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I couldn\'t respond right now. Please try again.',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all
          bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10
          border border-indigo-200 dark:border-indigo-500/20
          text-indigo-600 dark:text-indigo-400
          hover:shadow-md hover:shadow-indigo-500/10 ${className}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Got a doubt? Ask a follow-up question
      </button>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden border border-indigo-200 dark:border-indigo-500/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-white text-sm font-semibold">Ask a follow-up</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/70 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 mb-3">Ask anything about this solution</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-500 text-white rounded-br-md'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
            }`}>
              {msg.role === 'assistant' ? (
                <MathRenderer text={msg.content || (isStreaming && i === messages.length - 1 ? '...' : '')} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type your doubt..."
          disabled={isStreaming}
          className="flex-1 px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isStreaming}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isStreaming ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
