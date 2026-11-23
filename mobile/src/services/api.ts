import { Annotation, Comment, CommentAttachment, Document, ReadingProgress } from '../types';
import { Platform } from 'react-native';

// Auto-select host:
// - Android Emulator: 10.0.2.2 maps to host machine localhost
// - iOS Simulator / Web: localhost
const DEFAULT_HOST =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'https://pdf-api.treezur.com/api' : 'https://pdf-api.treezur.com/api');

export const API_BASE = DEFAULT_HOST;

export const api = {
  async listDocuments(): Promise<Document[]> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async getDocument(id: string): Promise<Document> {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.json();
  },

  async uploadDocument(fileUri: string, fileName: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'application/pdf',
    } as any);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed: ${err}`);
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  getDocumentFileUrl(id: string): string {
    return `${API_BASE}/documents/${id}/file`;
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
    const res = await fetch(`${API_BASE}/documents/${documentId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });
    if (!res.ok) throw new Error('Failed to update progress');
    return res.json();
  },

  async listAnnotations(documentId: string, page?: number): Promise<Annotation[]> {
    const url = page
      ? `${API_BASE}/documents/${documentId}/annotations?page=${page}`
      : `${API_BASE}/documents/${documentId}/annotations`;
    const res = await fetch(url);
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
    const res = await fetch(`${API_BASE}/documents/${documentId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation),
    });
    if (!res.ok) throw new Error('Failed to create annotation');
    return res.json();
  },

  async deleteAnnotation(documentId: string, annotationId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/annotations/${annotationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete annotation');
  },

  async listComments(documentId: string): Promise<Comment[]> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/comments`);
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
    const res = await fetch(`${API_BASE}/documents/${documentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
    if (!res.ok) throw new Error('Failed to create comment');
    return res.json();
  },

  async deleteComment(commentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/comments/${commentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete comment');
  },

  async uploadAttachment(commentId: string, fileUri: string, fileName: string): Promise<CommentAttachment> {
    const formData = new FormData();
    formData.append('image', {
      uri: fileUri,
      name: fileName,
      type: 'image/jpeg',
    } as any);

    const res = await fetch(`${API_BASE}/comments/${commentId}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!res.ok) throw new Error('Failed to upload image attachment');
    return res.json();
  },

  getAttachmentUrl(attachmentId: string): string {
    return `${API_BASE}/attachments/${attachmentId}`;
  },
};
