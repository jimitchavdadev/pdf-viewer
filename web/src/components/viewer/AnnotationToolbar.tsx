'use client';

import React, { useState } from 'react';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Type,
  Square,
  Eraser,
  MessageSquarePlus,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { ToolType } from '@/types';

interface AnnotationToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  onClearPageAnnotations: () => void;
}

const PEN_COLORS = ['#18181B', '#E11D48', '#2563EB', '#059669', '#D97706', '#9333EA'];
const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#FECDD3', '#BAE6FD', '#E9D5FF'];

export function AnnotationToolbar({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  fontSize,
  setFontSize,
  onClearPageAnnotations,
}: AnnotationToolbarProps) {
  const [showPalette, setShowPalette] = useState(false);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
      {/* Palette Popover */}
      {showPalette && (
        <div
          className="p-3 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md animate-fade-in"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {(activeTool === 'highlighter' ? HIGHLIGHT_COLORS : PEN_COLORS).map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  strokeColor === c ? 'scale-125 border-zinc-900 dark:border-white shadow-xs' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-[1px] h-5 bg-zinc-300 dark:bg-zinc-700" />

          {/* Width / Font Size Selector */}
          {activeTool === 'text' ? (
            <div className="flex items-center gap-1.5">
              {[12, 16, 20, 24].map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    fontSize === s ? 'bg-black/10 dark:bg-white/10' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {s}px
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {[2, 4, 6].map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    strokeWidth === w ? 'bg-black/10 dark:bg-white/10' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Dock */}
      <div
        className="px-3 py-2 rounded-2xl border shadow-2xl flex items-center gap-1 backdrop-blur-lg transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
      >
        {/* Select Tool */}
        <button
          onClick={() => {
            setActiveTool('select');
            setShowPalette(false);
          }}
          title="Select & Read"
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <MousePointer className="w-4 h-4" />
        </button>

        {/* Freehand Pen / Scribble */}
        <button
          onClick={() => {
            setActiveTool('pen');
            if (!PEN_COLORS.includes(strokeColor)) setStrokeColor(PEN_COLORS[1]);
            setShowPalette(true);
          }}
          title="Pen / Scribble"
          className={`p-2.5 rounded-xl transition-all flex items-center gap-1 ${
            activeTool === 'pen'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <PenTool className="w-4 h-4" />
          {activeTool === 'pen' && (
            <span
              className="w-2 h-2 rounded-full border border-white"
              style={{ backgroundColor: strokeColor }}
            />
          )}
        </button>

        {/* Highlighter Tool */}
        <button
          onClick={() => {
            setActiveTool('highlighter');
            if (!HIGHLIGHT_COLORS.includes(strokeColor)) setStrokeColor(HIGHLIGHT_COLORS[0]);
            setShowPalette(true);
          }}
          title="Highlighter"
          className={`p-2.5 rounded-xl transition-all flex items-center gap-1 ${
            activeTool === 'highlighter'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <Highlighter className="w-4 h-4" />
          {activeTool === 'highlighter' && (
            <span
              className="w-2 h-2 rounded-full border border-white"
              style={{ backgroundColor: strokeColor }}
            />
          )}
        </button>

        {/* Text Annotation Tool */}
        <button
          onClick={() => {
            setActiveTool('text');
            setShowPalette(true);
          }}
          title="Text Box (Type on page)"
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'text'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Rectangle Shape Tool */}
        <button
          onClick={() => {
            setActiveTool('rectangle');
            setShowPalette(true);
          }}
          title="Rectangle / Callout Box"
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'rectangle'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Eraser Tool */}
        <button
          onClick={() => {
            setActiveTool('eraser');
            setShowPalette(false);
          }}
          title="Eraser (Tap annotation to remove)"
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'eraser'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* Comment Pin Tool */}
        <button
          onClick={() => {
            setActiveTool('comment');
            setShowPalette(false);
          }}
          title="Comment Pin"
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'comment'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* Toggle Palette */}
        {activeTool !== 'select' && activeTool !== 'eraser' && activeTool !== 'comment' && (
          <button
            onClick={() => setShowPalette((p) => !p)}
            title="Colors & Settings"
            className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
          >
            <Palette className="w-4 h-4" />
          </button>
        )}

        {/* Clear Page Annotations */}
        <button
          onClick={onClearPageAnnotations}
          title="Clear Annotations on this Page"
          className="p-2.5 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-colors opacity-80 hover:opacity-100"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
