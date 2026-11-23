'use client';

import React from 'react';
import { BookOpen, Moon, Sun, UploadCloud, Coffee, Search } from 'lucide-react';
import { ReadingTheme } from '@/types';

interface DriveHeaderProps {
  theme: ReadingTheme;
  setTheme: (theme: ReadingTheme) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onUploadClick: () => void;
  totalDocuments: number;
}

export function DriveHeader({
  theme,
  setTheme,
  searchQuery,
  setSearchQuery,
  onUploadClick,
  totalDocuments,
}: DriveHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md border-b transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-tight">Aura PDF Drive</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {totalDocuments} {totalDocuments === 1 ? 'document' : 'documents'} stored
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="Search books & papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none transition-all focus:ring-2 focus:ring-opacity-50"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Eye-Comfort Theme Toggles */}
          <div className="flex items-center p-1 rounded-lg border gap-0.5"
            style={{
              backgroundColor: 'var(--bg-app)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setTheme('light')}
              title="Daylight Mode"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center transition-all ${
                theme === 'light' ? 'shadow-sm bg-white text-zinc-900' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              title="Warm Sepia Paper (Eye Relax)"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center transition-all ${
                theme === 'sepia' ? 'shadow-sm bg-[#DECDB8] text-[#342823]' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Coffee className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title="Night Charcoal Mode"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center transition-all ${
                theme === 'dark' ? 'shadow-sm bg-zinc-800 text-zinc-100' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Button */}
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
}
