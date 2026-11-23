'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { SearchMatch } from '@/types';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: any;
  totalPages: number;
  onJumpToPage: (page: number) => void;
}

export function SearchBar({
  isOpen,
  onClose,
  pdfDoc,
  totalPages,
  onJumpToPage,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !pdfDoc) return;

    try {
      setIsSearching(true);
      const q = query.trim().toLowerCase();
      const results: SearchMatch[] = [];

      for (let p = 1; p <= totalPages; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str).join(' ');

        if (textItems.toLowerCase().includes(q)) {
          // Extract short snippet around query
          const idx = textItems.toLowerCase().indexOf(q);
          const start = Math.max(0, idx - 20);
          const end = Math.min(textItems.length, idx + q.length + 20);
          const snippet = `...${textItems.slice(start, end)}...`;

          results.push({
            pageNumber: p,
            textSnippet: snippet,
          });
        }
      }

      setMatches(results);
      setCurrentMatchIdx(0);

      if (results.length > 0) {
        onJumpToPage(results[0].pageNumber);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const next = (currentMatchIdx + 1) % matches.length;
    setCurrentMatchIdx(next);
    onJumpToPage(matches[next].pageNumber);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prev = (currentMatchIdx - 1 + matches.length) % matches.length;
    setCurrentMatchIdx(prev);
    onJumpToPage(matches[prev].pageNumber);
  };

  return (
    <div
      className="fixed top-16 right-4 sm:right-8 z-40 p-2.5 rounded-2xl border shadow-xl flex items-center gap-2 backdrop-blur-lg animate-fade-in"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <Search className="w-4 h-4 opacity-50 shrink-0" />
        <input
          type="text"
          placeholder="Find text in document..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-44 sm:w-56 px-2 py-1 text-xs rounded-lg border outline-none"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        />
        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-xs disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent-color)' }}
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
        </button>
      </form>

      {matches.length > 0 && (
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span>
            {currentMatchIdx + 1}/{matches.length}
          </span>
          <button
            onClick={handlePrevMatch}
            title="Previous Match"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNextMatch}
            title="Next Match"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {matches.length === 0 && query && !isSearching && (
        <span className="text-[11px] opacity-60">No matches</span>
      )}

      <button
        onClick={onClose}
        className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-70 hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
