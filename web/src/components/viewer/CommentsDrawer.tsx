'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Send,
  Image as ImageIcon,
  Trash2,
  MapPin,
  Clock,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { Comment } from '@/types';
import { api } from '@/services/api';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentPage: number;
  comments: Comment[];
  onCommentAdded: (c: Comment) => void;
  onCommentDeleted: (id: string) => void;
  onImageClick: (url: string) => void;
  onJumpToPage: (page: number) => void;
  pendingPin: { x: number; y: number; page: number } | null;
  clearPendingPin: () => void;
}

export function CommentsDrawer({
  isOpen,
  onClose,
  documentId,
  currentPage,
  comments,
  onCommentAdded,
  onCommentDeleted,
  onImageClick,
  onJumpToPage,
  pendingPin,
  clearPendingPin,
}: CommentsDrawerProps) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('Reader');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterPage, setFilterPage] = useState<'all' | 'current'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('Image attachment exceeds the 10 MB limit.');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      const targetPage = pendingPin ? pendingPin.page : currentPage;
      const targetX = pendingPin ? pendingPin.x : null;
      const targetY = pendingPin ? pendingPin.y : null;

      // 1. Create comment
      const newComment = await api.createComment(documentId, {
        page_number: targetPage,
        position_x: targetX,
        position_y: targetY,
        author_name: authorName.trim() || 'Reader',
        content: content.trim(),
      });

      // 2. Upload image attachment if chosen
      if (selectedImage) {
        const attachment = await api.uploadAttachment(newComment.id, selectedImage);
        newComment.attachments = [attachment];
      }

      onCommentAdded(newComment);
      setContent('');
      removeSelectedImage();
      clearPendingPin();
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComments = comments.filter((c) =>
    filterPage === 'current' ? c.page_number === currentPage : true
  );

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 border-l shadow-2xl flex flex-col backdrop-blur-md transition-all duration-300 animate-slide-left"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h3 className="font-semibold text-sm">Notes & Comments</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {comments.length} {comments.length === 1 ? 'thread' : 'threads'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b flex items-center gap-2 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => setFilterPage('all')}
          className={`px-3 py-1 rounded-full transition-all ${
            filterPage === 'all'
              ? 'bg-blue-600 text-white font-medium'
              : 'opacity-70 hover:opacity-100'
          }`}
        >
          All Pages ({comments.length})
        </button>
        <button
          onClick={() => setFilterPage('current')}
          className={`px-3 py-1 rounded-full transition-all ${
            filterPage === 'current'
              ? 'bg-blue-600 text-white font-medium'
              : 'opacity-70 hover:opacity-100'
          }`}
        >
          This Page ({comments.filter((c) => c.page_number === currentPage).length})
        </button>
      </div>

      {/* Pending Pin Notification */}
      {pendingPin && (
        <div className="m-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Pinning to Page {pendingPin.page}</span>
          </div>
          <button
            onClick={clearPendingPin}
            className="text-[11px] underline opacity-70 hover:opacity-100"
          >
            Cancel pin
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm font-medium">No comments yet</p>
            <p className="text-xs mt-1">
              Add a general note below, or use the pin tool to comment directly on text.
            </p>
          </div>
        ) : (
          filteredComments.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl border space-y-2 transition-all hover:shadow-sm"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {/* Comment Header */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.author_name}</span>
                  <button
                    onClick={() => onJumpToPage(c.page_number)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-sky-400 hover:underline"
                  >
                    Page {c.page_number}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 opacity-60">
                  <span className="text-[10px]">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => onCommentDeleted(c.id)}
                    title="Delete Comment"
                    className="p-1 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Comment Body */}
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.content}</p>

              {/* Image Attachments */}
              {c.attachments && c.attachments.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {c.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => onImageClick(api.getAttachmentUrl(att.id))}
                      className="group/img relative rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <img
                        src={api.getAttachmentUrl(att.id)}
                        alt={att.file_name}
                        className="w-20 h-20 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-[10px] font-medium transition-opacity">
                        View
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Author Name */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-32 px-2.5 py-1 text-xs rounded-lg border outline-none"
            style={{
              backgroundColor: 'var(--bg-app)',
              borderColor: 'var(--border-subtle)',
            }}
          />
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Adding to Page {pendingPin ? pendingPin.page : currentPage}
          </span>
        </div>

        {/* Selected Image Thumbnail Preview */}
        {imagePreview && (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Attachment preview"
              className="w-16 h-16 rounded-lg object-cover border"
              style={{ borderColor: 'var(--border-subtle)' }}
            />
            <button
              type="button"
              onClick={removeSelectedImage}
              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Text Input & Submit */}
        <div className="relative">
          <textarea
            rows={2}
            placeholder="Write a note or comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2.5 pr-20 text-xs rounded-xl border outline-none resize-none"
            style={{
              backgroundColor: 'var(--bg-app)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />

          <div className="absolute right-2 bottom-3 flex items-center gap-1.5">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Image"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="p-1.5 rounded-lg text-white shadow-xs transition-transform active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}
