'use client';

import React, { useEffect, useRef } from 'react';
import { X, PanelLeft } from 'lucide-react';

interface ThumbnailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: any;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
}

function ThumbnailItem({
  pdfDoc,
  pageNumber,
  isActive,
  onClick,
}: {
  pdfDoc: any;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    async function renderThumbnail() {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;
        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;
      } catch (err) {
        // Cancelled or destroyed
      }
    }
    renderThumbnail();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      onClick={onClick}
      className={`p-2 rounded-xl cursor-pointer flex flex-col items-center gap-1.5 transition-all ${
        isActive
          ? 'bg-blue-500/15 border-2 border-blue-500 shadow-sm'
          : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent opacity-75 hover:opacity-100'
      }`}
    >
      <div className="bg-white rounded shadow-xs overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        <canvas ref={canvasRef} className="block" />
      </div>
      <span className="text-[11px] font-mono font-medium">Page {pageNumber}</span>
    </div>
  );
}

export function ThumbnailsSidebar({
  isOpen,
  onClose,
  pdfDoc,
  totalPages,
  currentPage,
  onSelectPage,
}: ThumbnailsSidebarProps) {
  if (!isOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 w-56 border-r shadow-2xl flex flex-col backdrop-blur-md transition-all duration-300 animate-slide-right"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <div className="p-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <PanelLeft className="w-4 h-4" />
          <h3 className="font-semibold text-xs tracking-tight uppercase">Thumbnails</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
          <ThumbnailItem
            key={pageNo}
            pdfDoc={pdfDoc}
            pageNumber={pageNo}
            isActive={pageNo === currentPage}
            onClick={() => onSelectPage(pageNo)}
          />
        ))}
      </div>
    </aside>
  );
}
