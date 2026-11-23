'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Trash2, Download, Clock, ArrowRight } from 'lucide-react';
import { Document } from '@/types';
import { api } from '@/services/api';

interface DocumentCardProps {
  doc: Document;
  onDeleted: (id: string) => void;
}

export function DocumentCard({ doc, onDeleted }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;

    try {
      setIsDeleting(true);
      await api.deleteDocument(doc.id);
      onDeleted(doc.id);
    } catch (err) {
      alert('Failed to delete document');
      setIsDeleting(false);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(api.getDocumentFileUrl(doc.id), '_blank');
  };

  const readingPercent = Math.min(Math.max(Number(doc.reading_percentage) || 0, 0), 100);

  return (
    <div
      className="group relative rounded-2xl border transition-all duration-300 hover:shadow-lg flex flex-col justify-between overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <Link href={`/viewer/${doc.id}`} className="p-5 flex-1 flex flex-col justify-between block">
        {/* Top Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ backgroundColor: 'var(--bg-app)', color: 'var(--accent-color)' }}
            >
              <FileText className="w-6 h-6" />
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleDownload}
                title="Download PDF"
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete Document"
                className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Metadata */}
          <h3 className="font-semibold text-base line-clamp-2 mb-1.5 leading-snug group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
            {doc.title}
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'} • {formatSize(doc.file_size)}
          </p>
        </div>

        {/* Progress & Bottom Info */}
        <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span style={{ color: 'var(--text-muted)' }}>
              Page {doc.current_page || 1} of {doc.page_count}
            </span>
            <span style={{ color: 'var(--accent-color)' }}>
              {readingPercent.toFixed(0)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${readingPercent}%`,
                backgroundColor: 'var(--accent-color)',
              }}
            />
          </div>

          {/* Footer timestamp */}
          <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {doc.last_read_at ? 'Recently read' : 'Unopened'}
            </span>
            <span className="flex items-center gap-1 font-medium group-hover:translate-x-0.5 transition-transform">
              Read <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
