-- Supabase Database Schema for PDF Viewer & Cloud Drive
-- Executed against PostgreSQL 17 on Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    page_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for sorting by recent updates
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at DESC);

-- 2. Reading Progress Table
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL DEFAULT 1,
    total_pages INTEGER NOT NULL DEFAULT 1,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    zoom_level NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    scroll_position_y NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_document_progress UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_doc ON public.reading_progress(document_id);

-- 3. Annotations Table (Highlights, Scribbles/Drawings, Text Boxes)
CREATE TABLE IF NOT EXISTS public.annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    annotation_type VARCHAR(50) NOT NULL, -- 'highlight', 'scribble', 'text', 'rectangle'
    data JSONB NOT NULL,                  -- coordinates, stroke paths, color, strokeWidth, opacity
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annotations_doc_page ON public.annotations(document_id, page_number);

-- 4. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    position_x NUMERIC(6, 3),             -- percentage (0.0 to 100.0) from page left
    position_y NUMERIC(6, 3),             -- percentage (0.0 to 100.0) from page top
    author_name VARCHAR(100) NOT NULL DEFAULT 'Reader',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_doc_page ON public.comments(document_id, page_number);

-- 5. Comment Attachments Table (Image Support)
CREATE TABLE IF NOT EXISTS public.comment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment ON public.comment_attachments(comment_id);
