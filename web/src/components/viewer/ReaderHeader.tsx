'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sun,
  Coffee,
  Moon,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  Download,
  CheckCircle2,
  PanelLeft,
  Search,
  RotateCw,
  Printer,
} from 'lucide-react';
import { Document, ReadingTheme } from '@/types';
import { api } from '@/services/api';

interface ReaderHeaderProps {
  document: Document;
  currentPage: number;
  totalPages: number;
  readingPercent: number;
  zoom: number;
  setZoom: (fn: (prev: number) => number) => void;
  theme: ReadingTheme;
  setTheme: (t: ReadingTheme) => void;
  commentsCount: number;
  isCommentsOpen: boolean;
  setIsCommentsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isThumbnailsOpen: boolean;
  setIsThumbnailsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onRotatePage: () => void;
  isSaved?: boolean;
}

export function ReaderHeader({
  document,
  currentPage,
  totalPages,
  readingPercent,
  zoom,
  setZoom,
  theme,
  setTheme,
  commentsCount,
  isCommentsOpen,
  setIsCommentsOpen,
  isThumbnailsOpen,
  setIsThumbnailsOpen,
  isSearchOpen,
  setIsSearchOpen,
  onRotatePage,
  isSaved,
}: ReaderHeaderProps) {
  const handleDownload = () => {
    window.open(api.getDocumentFileUrl(document.id), '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <header
      className="sticky top-0 z-40 w-full backdrop-blur-md border-b px-3 sm:px-4 h-14 flex items-center justify-between gap-2 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* Left: Thumbnails Toggle, Back & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => setIsThumbnailsOpen((t) => !t)}
          title="Toggle Page Thumbnails"
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            isThumbnailsOpen ? 'bg-blue-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{ borderColor: isThumbnailsOpen ? undefined : 'var(--border-subtle)' }}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <Link
          href="/"
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Drive</span>
        </Link>
        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 hidden sm:block" />
        <h2 className="text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-xs md:max-w-sm">
          {document.title}
        </h2>
      </div>

      {/* Middle: Reading Progress & Page indicator */}
      <div className="flex items-center gap-2">
        <div
          className="px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 shadow-xs"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span>
            {currentPage} / {totalPages}
          </span>
          <span className="opacity-40">•</span>
          <span style={{ color: 'var(--accent-color)' }}>
            {Math.round(readingPercent)}%
          </span>
          {isSaved && (
            <span title="Progress Saved" className="text-emerald-500 flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Search, Rotate, Zoom, Themes, Comments, Print, Download */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Find in PDF */}
        <button
          onClick={() => setIsSearchOpen((s) => !s)}
          title="Find text in document (Ctrl+F)"
          className={`p-1.5 rounded-lg border transition-colors ${
            isSearchOpen ? 'bg-blue-600 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{ borderColor: isSearchOpen ? undefined : 'var(--border-subtle)' }}
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Rotate Page 90° Clockwise */}
        <button
          onClick={onRotatePage}
          title="Rotate Document 90° Clockwise"
          className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors hidden sm:flex"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Controls */}
        <div
          className="hidden md:flex items-center p-0.5 rounded-lg border text-xs"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono font-medium">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Eye Comfort Themes */}
        <div
          className="flex items-center p-0.5 rounded-lg border gap-0.5"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setTheme('light')}
            title="Daylight Theme"
            className={`p-1.5 rounded-md transition-all ${
              theme === 'light' ? 'bg-white text-zinc-900 shadow-xs' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('sepia')}
            title="Warm Sepia Paper (Eye Relax)"
            className={`p-1.5 rounded-md transition-all ${
              theme === 'sepia' ? 'bg-[#DECDB8] text-[#342823] shadow-xs' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            title="Night Charcoal Theme"
            className={`p-1.5 rounded-md transition-all ${
              theme === 'dark' ? 'bg-zinc-800 text-zinc-100 shadow-xs' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Comments Drawer Toggle */}
        <button
          onClick={() => setIsCommentsOpen((o) => !o)}
          title="Toggle Comments"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isCommentsOpen
              ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-sky-400'
              : 'hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{ borderColor: isCommentsOpen ? undefined : 'var(--border-subtle)' }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Comments</span>
          {commentsCount > 0 && (
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              {commentsCount}
            </span>
          )}
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          title="Print Document"
          className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors hidden sm:flex"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        {/* Download Original */}
        <button
          onClick={handleDownload}
          title="Download PDF"
          className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
