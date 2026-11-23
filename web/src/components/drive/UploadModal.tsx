'use client';

import React, { useRef, useState } from 'react';
import { X, UploadCloud, FileCheck, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { Document } from '@/types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (doc: Document) => void;
}

export function UploadModal({ isOpen, onClose, onUploaded }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit for Supabase 512MB capacity

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.type.includes('pdf') && !selected.name.endsWith('.pdf')) {
        setError('Only PDF files are supported.');
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setError(`File size (${(selected.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 10 MB.`);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.includes('pdf') && !selected.name.endsWith('.pdf')) {
        setError('Only PDF files are supported.');
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setError(`File size (${(selected.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 10 MB.`);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const newDoc = await api.uploadDocument(file);
      onUploaded(newDoc);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-lg font-semibold">Upload PDF Document</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Add a book, research paper, or document to your personal drive
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-5 p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-500/5' : ''
          }`}
          style={{
            borderColor: dragActive ? 'var(--accent-color)' : 'var(--border-subtle)',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}
              >
                <FileCheck className="w-6 h-6" />
              </div>
              <p className="font-medium text-sm text-center max-w-xs truncate">{file.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 opacity-80"
                style={{ backgroundColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              >
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="font-medium text-sm">Drag and drop your PDF here</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                PDF documents up to 10 MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg text-white shadow-sm transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isUploading ? 'Uploading & Processing...' : 'Upload Document'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
