export type ReadingTheme = 'light' | 'sepia' | 'dark';

export type ToolType = 'select' | 'pen' | 'highlighter' | 'eraser' | 'comment';

export interface Document {
  id: string;
  title: string;
  file_size: number;
  mime_type: string;
  page_count: number;
  current_page: number;
  reading_percentage: number;
  zoom_level: number;
  scroll_position_y: number;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  id: string;
  document_id: string;
  current_page: number;
  total_pages: number;
  percentage: number;
  zoom_level: number;
  scroll_position_y: number;
  last_read_at: string;
}

export interface Annotation {
  id: string;
  document_id: string;
  page_number: number;
  annotation_type: 'scribble' | 'highlighter' | 'highlight' | 'text';
  data: any;
  created_at: string;
  updated_at: string;
}

export interface CommentAttachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export interface Comment {
  id: string;
  document_id: string;
  page_number: number;
  position_x: number | null;
  position_y: number | null;
  author_name: string;
  content: string;
  attachments: CommentAttachment[];
  created_at: string;
  updated_at: string;
}
