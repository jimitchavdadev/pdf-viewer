'use client';

import React, { Suspense, useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import {
  Annotation,
  Comment,
  Document,
  ReadingTheme,
  ToolType,
} from '@/types';
import { api } from '@/services/api';
import { ReaderHeader } from '@/components/viewer/ReaderHeader';
import { AnnotationToolbar } from '@/components/viewer/AnnotationToolbar';
import { PdfPageRenderer } from '@/components/viewer/PdfPageRenderer';
import { CommentsDrawer } from '@/components/viewer/CommentsDrawer';
import { ImageLightbox } from '@/components/viewer/ImageLightbox';
import { ThumbnailsSidebar } from '@/components/viewer/ThumbnailsSidebar';
import { SearchBar } from '@/components/viewer/SearchBar';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

interface ViewerPageProps {
  params: Promise<{ id: string }>;
}

function ViewerContent({ params }: ViewerPageProps) {
  const { id: documentId } = use(params);

  const [document, setDocument] = useState<Document | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reading state
  const [theme, setTheme] = useState<ReadingTheme>('sepia');
  const [zoom, setZoom] = useState<number>(1.15);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isSaved, setIsSaved] = useState(false);

  // Panels & overlays
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Markup & Tools
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#E11D48');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [fontSize, setFontSize] = useState<number>(16);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number; page: number } | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const progressDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('aura_reading_theme') as ReadingTheme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const handleSetTheme = (t: ReadingTheme) => {
    setTheme(t);
    localStorage.setItem('aura_reading_theme', t);
  };

  // 1. Initialize Document, PDF.js, Annotations, Comments & Saved Reading Progress
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic load pdfjs-dist on client
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        // Fetch document metadata & progress from Rust backend
        const doc = await api.getDocument(documentId);
        if (isCancelled) return;
        setDocument(doc);
        setTotalPages(doc.page_count || 1);

        // Load PDF binary from Rust streaming endpoint
        const fileUrl = api.getDocumentFileUrl(documentId);
        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          withCredentials: false,
        });

        const loadedPdf = await loadingTask.promise;
        if (isCancelled) return;
        setPdfDoc(loadedPdf);
        setTotalPages(loadedPdf.numPages);

        // Fetch annotations & comments
        const [loadedAnnotations, loadedComments] = await Promise.all([
          api.listAnnotations(documentId),
          api.listComments(documentId),
        ]);

        if (isCancelled) return;
        setAnnotations(loadedAnnotations);
        setComments(loadedComments);

        // Resume saved reading progress
        const savedPage = doc.current_page || 1;
        const savedZoom = doc.zoom_level ? Number(doc.zoom_level) : 1.15;
        setCurrentPage(savedPage);
        setZoom(savedZoom);

        // Scroll to saved position after render
        setTimeout(() => {
          if (doc.scroll_position_y && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = Number(doc.scroll_position_y);
          } else if (savedPage > 1) {
            const pageEl = pageRefs.current.get(savedPage);
            pageEl?.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load viewer data:', err);
          setError(err.message || 'Failed to load PDF document');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [documentId]);

  // 2. Track Reading Progress on Scroll (Debounced to Rust Backend)
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || totalPages <= 0) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const midPoint = scrollTop + viewportHeight / 2;

    // Detect which page is currently in view
    let visiblePage = 1;
    for (let p = 1; p <= totalPages; p++) {
      const el = pageRefs.current.get(p);
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (midPoint >= top && midPoint <= bottom) {
          visiblePage = p;
          break;
        }
      }
    }

    setCurrentPage(visiblePage);
    const readingPercent = Math.min(100, Number(((visiblePage / totalPages) * 100).toFixed(1)));

    // Debounce save to Rust backend
    if (progressDebounceTimer.current) clearTimeout(progressDebounceTimer.current);
    progressDebounceTimer.current = setTimeout(async () => {
      try {
        await api.updateProgress(documentId, {
          current_page: visiblePage,
          total_pages: totalPages,
          percentage: readingPercent,
          zoom_level: zoom,
          scroll_position_y: scrollTop,
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } catch (e) {
        console.error('Error saving reading progress:', e);
      }
    }, 1200);
  };

  // 3. Annotations management
  const handleAddAnnotation = async (annoData: {
    page_number: number;
    annotation_type: string;
    data: any;
  }) => {
    try {
      const created = await api.createAnnotation(documentId, annoData);
      setAnnotations((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to create annotation:', err);
    }
  };

  const handleDeleteAnnotation = async (annoId: string) => {
    try {
      await api.deleteAnnotation(documentId, annoId);
      setAnnotations((prev) => prev.filter((a) => a.id !== annoId));
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  const handleClearPageAnnotations = async () => {
    const pageAnnos = annotations.filter((a) => a.page_number === currentPage);
    if (pageAnnos.length === 0) return;
    if (!window.confirm(`Clear all ${pageAnnos.length} annotations on Page ${currentPage}?`)) return;

    for (const a of pageAnnos) {
      await api.deleteAnnotation(documentId, a.id);
    }
    setAnnotations((prev) => prev.filter((a) => a.page_number !== currentPage));
  };

  // 4. Comments management
  const handleDropCommentPin = (pin: { x: number; y: number; page: number }) => {
    setPendingPin(pin);
    setIsCommentsOpen(true);
  };

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [...prev, newComment]);
  };

  const handleCommentDeleted = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleJumpToPage = (page: number) => {
    const pageEl = pageRefs.current.get(page);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const readingPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-3 theme-${theme}`}
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
      >
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p className="text-sm font-medium">Opening document & restoring your reading progress...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-4 p-4 theme-${theme}`}
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
      >
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-semibold">Unable to load document</h2>
        <p className="text-sm max-w-md text-center" style={{ color: 'var(--text-muted)' }}>
          {error || 'Document not found.'}
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: 'var(--accent-color)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Drive</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col theme-${theme}`}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* 1. Header Toolbar */}
      <ReaderHeader
        document={document}
        currentPage={currentPage}
        totalPages={totalPages}
        readingPercent={readingPercentage}
        zoom={zoom}
        setZoom={setZoom}
        theme={theme}
        setTheme={handleSetTheme}
        commentsCount={comments.length}
        isCommentsOpen={isCommentsOpen}
        setIsCommentsOpen={setIsCommentsOpen}
        isThumbnailsOpen={isThumbnailsOpen}
        setIsThumbnailsOpen={setIsThumbnailsOpen}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        onRotatePage={() => setRotation((r) => (r + 90) % 360)}
        isSaved={isSaved}
      />

      {/* 2. Thumbnails Sidebar */}
      <ThumbnailsSidebar
        isOpen={isThumbnailsOpen}
        onClose={() => setIsThumbnailsOpen(false)}
        pdfDoc={pdfDoc}
        totalPages={totalPages}
        currentPage={currentPage}
        onSelectPage={handleJumpToPage}
      />

      {/* 3. In-Document Text Search Bar */}
      <SearchBar
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        pdfDoc={pdfDoc}
        totalPages={totalPages}
        onJumpToPage={handleJumpToPage}
      />

      {/* 4. Main Reader Viewport with Multi-page Continuous Scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pdf-viewport py-8 px-4"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
            <div
              key={pageNo}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNo, el);
                else pageRefs.current.delete(pageNo);
              }}
              className="w-full flex justify-center"
            >
              <PdfPageRenderer
                pdfDoc={pdfDoc}
                pageNumber={pageNo}
                zoom={zoom}
                rotation={rotation}
                theme={theme}
                activeTool={activeTool}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                fontSize={fontSize}
                annotations={annotations}
                comments={comments}
                onAddAnnotation={handleAddAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                onDropCommentPin={handleDropCommentPin}
                onCommentPinClick={() => {
                  setIsCommentsOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Floating Eye-Friendly Markup Toolbar */}
      <AnnotationToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onClearPageAnnotations={handleClearPageAnnotations}
      />

      {/* 6. Comments Drawer with Image Support */}
      <CommentsDrawer
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        documentId={documentId}
        currentPage={currentPage}
        comments={comments}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
        onImageClick={(url) => setActiveLightboxImage(url)}
        onJumpToPage={handleJumpToPage}
        pendingPin={pendingPin}
        clearPendingPin={() => setPendingPin(null)}
      />

      {/* 7. Image Attachment Lightbox */}
      <ImageLightbox
        imageUrl={activeLightboxImage}
        onClose={() => setActiveLightboxImage(null)}
      />
    </div>
  );
}

export default function ViewerPage({ params }: ViewerPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ViewerContent params={params} />
    </Suspense>
  );
}
