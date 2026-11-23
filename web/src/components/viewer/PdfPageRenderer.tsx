'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Annotation, Comment, ReadingTheme, ToolType } from '@/types';
import { MapPin } from 'lucide-react';

interface PdfPageRendererProps {
  pdfDoc: any;
  pageNumber: number;
  zoom: number;
  rotation?: number;
  theme: ReadingTheme;
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  fontSize?: number;
  annotations: Annotation[];
  comments: Comment[];
  onAddAnnotation: (anno: { page_number: number; annotation_type: string; data: any }) => void;
  onDeleteAnnotation: (annoId: string) => void;
  onDropCommentPin: (pin: { x: number; y: number; page: number }) => void;
  onCommentPinClick: (comment: Comment) => void;
}

export function PdfPageRenderer({
  pdfDoc,
  pageNumber,
  zoom,
  rotation = 0,
  theme,
  activeTool,
  strokeColor,
  strokeWidth,
  fontSize = 16,
  annotations,
  comments,
  onAddAnnotation,
  onDeleteAnnotation,
  onDropCommentPin,
  onCommentPinClick,
}: PdfPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const renderTaskRef = useRef<any>(null);

  // 1. Render PDF page onto canvas with zoom & rotation
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const effectiveRotation = (page.rotate + rotation) % 360;
        const viewport = page.getViewport({ scale: zoom, rotation: effectiveRotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setPageSize({ width: viewport.width, height: viewport.height });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNumber, zoom, rotation]);

  // Helper to redraw overlay annotations
  const redrawAnnotations = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    annotations.forEach((anno) => {
      if (anno.page_number !== pageNumber) return;

      if (anno.annotation_type === 'scribble' && anno.data?.points) {
        const points = anno.data.points;
        if (points.length < 2) return;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = anno.data.color || '#e11d48';
        ctx.lineWidth = (anno.data.strokeWidth || 3) * zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(points[0].x * zoom, points[0].y * zoom);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x * zoom, points[i].y * zoom);
        }
        ctx.stroke();
        ctx.restore();
      } else if ((anno.annotation_type === 'highlighter' || anno.annotation_type === 'highlight') && anno.data?.points) {
        const points = anno.data.points;
        if (points.length < 2) return;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = anno.data.color || '#fef08a';
        ctx.lineWidth = (anno.data.strokeWidth || 16) * zoom;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.45;

        ctx.moveTo(points[0].x * zoom, points[0].y * zoom);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x * zoom, points[i].y * zoom);
        }
        ctx.stroke();
        ctx.restore();
      } else if (anno.annotation_type === 'rectangle' && anno.data) {
        ctx.save();
        ctx.strokeStyle = anno.data.color || '#e11d48';
        ctx.lineWidth = (anno.data.strokeWidth || 2) * zoom;
        ctx.strokeRect(
          anno.data.x * zoom,
          anno.data.y * zoom,
          anno.data.width * zoom,
          anno.data.height * zoom
        );
        ctx.restore();
      } else if (anno.annotation_type === 'text' && anno.data) {
        ctx.save();
        ctx.fillStyle = anno.data.color || '#18181b';
        const fs = (anno.data.fontSize || 16) * zoom;
        ctx.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(anno.data.text || '', anno.data.x * zoom, anno.data.y * zoom);
        ctx.restore();
      }
    });
  };

  // 2. Redraw Annotations on the Overlay Canvas
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || pageSize.width === 0) return;

    const pixelRatio = window.devicePixelRatio || 1;
    overlay.width = pageSize.width * pixelRatio;
    overlay.height = pageSize.height * pixelRatio;
    overlay.style.width = `${pageSize.width}px`;
    overlay.style.height = `${pageSize.height}px`;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    redrawAnnotations(ctx, pageSize.width, pageSize.height);
  }, [annotations, pageNumber, pageSize, zoom]);

  // 3. Pointer event handlers for drawing & interacting
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (
      activeTool !== 'pen' &&
      activeTool !== 'highlighter' &&
      activeTool !== 'comment' &&
      activeTool !== 'eraser' &&
      activeTool !== 'rectangle' &&
      activeTool !== 'text'
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (activeTool === 'comment') {
      const percentX = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
      const percentY = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
      onDropCommentPin({ x: percentX, y: percentY, page: pageNumber });
      return;
    }

    if (activeTool === 'text') {
      const text = window.prompt('Enter annotation text:');
      if (text && text.trim()) {
        onAddAnnotation({
          page_number: pageNumber,
          annotation_type: 'text',
          data: {
            x,
            y,
            text: text.trim(),
            color: strokeColor,
            fontSize,
          },
        });
      }
      return;
    }

    if (activeTool === 'eraser') {
      const clickedAnno = annotations.find((a) => {
        if (a.page_number !== pageNumber) return false;
        if (a.data?.points) {
          return a.data.points.some((p: any) => Math.hypot(p.x - x, p.y - y) < 18);
        }
        if (a.annotation_type === 'rectangle' && a.data) {
          return (
            x >= a.data.x - 8 &&
            x <= a.data.x + a.data.width + 8 &&
            y >= a.data.y - 8 &&
            y <= a.data.y + a.data.height + 8
          );
        }
        if (a.annotation_type === 'text' && a.data) {
          return Math.hypot(a.data.x - x, a.data.y - y) < 30;
        }
        return false;
      });

      if (clickedAnno) {
        onDeleteAnnotation(clickedAnno.id);
      }
      return;
    }

    setIsDrawing(true);
    if (activeTool === 'rectangle') {
      dragStartRef.current = { x, y };
    } else {
      currentPointsRef.current = [{ x, y }];
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio || 1;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if (activeTool === 'rectangle' && dragStartRef.current) {
      // Redraw base annotations first to prevent trails
      redrawAnnotations(ctx, pageSize.width, pageSize.height);

      // Draw current rectangle preview
      const start = dragStartRef.current;
      const rx = Math.min(start.x, x) * zoom;
      const ry = Math.min(start.y, y) * zoom;
      const rw = Math.abs(x - start.x) * zoom;
      const rh = Math.abs(y - start.y) * zoom;

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * zoom;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    } else if (activeTool === 'pen' || activeTool === 'highlighter') {
      currentPointsRef.current.push({ x, y });

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = (activeTool === 'highlighter' ? 16 : strokeWidth) * zoom;
      ctx.lineCap = activeTool === 'highlighter' ? 'square' : 'round';
      ctx.lineJoin = 'round';
      if (activeTool === 'highlighter') ctx.globalAlpha = 0.45;

      const points = currentPointsRef.current;
      if (points.length >= 2) {
        const prev = points[points.length - 2];
        ctx.moveTo(prev.x * zoom, prev.y * zoom);
        ctx.lineTo(x * zoom, y * zoom);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'rectangle' && dragStartRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      const start = dragStartRef.current;

      const width = Math.abs(x - start.x);
      const height = Math.abs(y - start.y);

      if (width > 5 && height > 5) {
        onAddAnnotation({
          page_number: pageNumber,
          annotation_type: 'rectangle',
          data: {
            x: Math.min(start.x, x),
            y: Math.min(start.y, y),
            width,
            height,
            color: strokeColor,
            strokeWidth,
          },
        });
      }
      dragStartRef.current = null;
    } else {
      const points = currentPointsRef.current;
      if (points.length > 1) {
        onAddAnnotation({
          page_number: pageNumber,
          annotation_type: activeTool === 'highlighter' ? 'highlighter' : 'scribble',
          data: {
            points,
            color: strokeColor,
            strokeWidth: activeTool === 'highlighter' ? 16 : strokeWidth,
          },
        });
      }
      currentPointsRef.current = [];
    }
  };

  // Determine theme filter styles
  const filterStyle: React.CSSProperties = {
    filter:
      theme === 'sepia'
        ? 'sepia(38%) brightness(96%) contrast(97%)'
        : theme === 'dark'
        ? 'invert(90%) hue-rotate(180deg) contrast(92%)'
        : 'none',
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto my-6 shadow-xl rounded-lg overflow-hidden transition-all duration-300"
      style={{
        width: pageSize.width || undefined,
        height: pageSize.height || undefined,
        backgroundColor: theme === 'sepia' ? '#F6F0E6' : theme === 'dark' ? '#18191B' : '#FFFFFF',
      }}
    >
      {/* 1. Underlying PDF Render Canvas */}
      <canvas
        ref={canvasRef}
        style={filterStyle}
        className="block transition-all duration-200"
      />

      {/* 2. Interactive Annotation Markup Layer */}
      <canvas
        ref={overlayCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute inset-0 z-10 ${
          activeTool === 'select'
            ? 'cursor-default'
            : activeTool === 'comment'
            ? 'cursor-crosshair'
            : activeTool === 'text'
            ? 'cursor-text'
            : activeTool === 'rectangle'
            ? 'cursor-crosshair'
            : activeTool === 'eraser'
            ? 'cursor-cell'
            : 'cursor-crosshair'
        }`}
      />

      {/* 3. Comment Pin Indicators on the Page */}
      {comments
        .filter((c) => c.page_number === pageNumber && c.position_x !== null && c.position_y !== null)
        .map((c) => (
          <button
            key={c.id}
            onClick={(e) => {
              e.stopPropagation();
              onCommentPinClick(c);
            }}
            title={`${c.author_name}: ${c.content}`}
            style={{
              left: `${c.position_x}%`,
              top: `${c.position_y}%`,
            }}
            className="absolute z-20 -translate-x-1/2 -translate-y-full p-1 rounded-full bg-amber-500 text-white shadow-lg hover:scale-125 transition-transform"
          >
            <MapPin className="w-4 h-4 fill-amber-500 stroke-white" />
          </button>
        ))}

      {/* Page Label Badge (Floating subtle) */}
      <div className="absolute bottom-2 right-3 z-10 px-2 py-0.5 rounded text-[10px] font-mono font-medium opacity-60 backdrop-blur-xs bg-black/10 dark:bg-white/10">
        Page {pageNumber}
      </div>
    </div>
  );
}
