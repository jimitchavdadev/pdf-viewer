'use client';

import React from 'react';
import { BookOpen, UploadCloud } from 'lucide-react';

interface EmptyDriveProps {
  onUploadClick: () => void;
}

export function EmptyDrive({ onUploadClick }: EmptyDriveProps) {
  return (
    <div
      className="max-w-md mx-auto my-16 p-8 rounded-2xl border text-center flex flex-col items-center shadow-sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-app)',
          color: 'var(--accent-color)',
        }}
      >
        <BookOpen className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Your Reading Drive is Empty</h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
        Upload research papers, ebooks, study materials, or contracts to start reading with eye-comfort modes, continuous progress tracking, and full markup scribbles.
      </p>
      <button
        onClick={onUploadClick}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl text-white shadow-md transition-transform active:scale-95"
        style={{ backgroundColor: 'var(--accent-color)' }}
      >
        <UploadCloud className="w-4 h-4" />
        <span>Upload First PDF</span>
      </button>
    </div>
  );
}
