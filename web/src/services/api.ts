import { Annotation, Comment, CommentAttachment, Document, ReadingProgress } from '@/types';

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'pdf.treezur.com') {
      return 'https://pdf-api.treezur.com/api';
    }
    const host = window.location.hostname;
    return `http://${host}:8080/api`;
  }
  return 'http://127.0.0.1:8080/api';
}

export const api = {
  // Documents
  async listDocuments(): Promise<Document[]> {
    const res = await fetch(`${getApiBase()}/documents`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getDocument(id: string): Promise<Document> {
    const res = await fetch(`${getApiBase()}/documents/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.json();
  },

  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const res = await fetch(`${getApiBase()}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed: ${err}`);
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${getApiBase()}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  getDocumentFileUrl(id: string): string {
    return `${getApiBase()}/documents/${id}/file`;
  },

  // Reading Progress
  async getProgress(documentId: string): Promise<ReadingProgress> {
    const res = await fetch(`${getApiBase()}/documents/${documentId}/progress`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  },

  async updateProgress(
    documentId: string,
    progress: {
      current_page: number;
      total_pages: number;
      percentage: number;
      zoom_level: number;
      scroll_position_y: number;
    }
  ): Promise<ReadingProgress> {
    const res = await fetch(`${getApiBase()}/documents/${documentId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });
    if (!res.ok) throw new Error('Failed to update progress');
    return res.json();
  },

  // Annotations
  async listAnnotations(documentId: string, page?: number): Promise<Annotation[]> {
    const url = page
      ? `${getApiBase()}/documents/${documentId}/annotations?page=${page}`
      : `${getApiBase()}/documents/${documentId}/annotations`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch annotations');
    return res.json();
  },

  async createAnnotation(
    documentId: string,
    annotation: {
      page_number: number;
      annotation_type: string;
      data: any;
    }
  ): Promise<Annotation> {
    const res = await fetch(`${getApiBase()}/documents/${documentId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation),
    });
    if (!res.ok) throw new Error('Failed to create annotation');
    return res.json();
  },

  async deleteAnnotation(documentId: string, annotationId: string): Promise<void> {
    const res = await fetch(`${getApiBase()}/documents/${documentId}/annotations/${annotationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete annotation');
  },

  // Comments
  async listComments(documentId: string): Promise<Comment[]> {
    const res = await fetch(`${getApiBase()}/documents/${documentId}/comments`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  },

  async createComment(
    documentId: string,
    comment: {
      page_number: number;
      position_x?: number | null;
      position_y?: number | null;
      author_name?: string;
      content: string;
    }
  ): Promise<Comment> {
    const res = await fetch(`${getApiBase()}/documents/${documentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
    if (!res.ok) throw new Error('Failed to create comment');
    return res.json();
  },

  async deleteComment(commentId: string): Promise<void> {
    const res = await fetch(`${getApiBase()}/comments/${commentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete comment');
  },

  // Attachments
  async uploadAttachment(commentId: string, file: File): Promise<CommentAttachment> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    const res = await fetch(`${getApiBase()}/comments/${commentId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload attachment');
    return res.json();
  },

  getAttachmentUrl(attachmentId: string): string {
    return `${getApiBase()}/attachments/${attachmentId}`;
  },
};
