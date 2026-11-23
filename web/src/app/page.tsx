'use client';

import React, { useEffect, useState } from 'react';
import { Document, ReadingTheme } from '@/types';
import { api } from '@/services/api';
import { DriveHeader } from '@/components/drive/DriveHeader';
import { DocumentCard } from '@/components/drive/DocumentCard';
import { UploadModal } from '@/components/drive/UploadModal';
import { EmptyDrive } from '@/components/drive/EmptyDrive';
import { Loader2 } from 'lucide-react';

export default function DrivePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<ReadingTheme>('sepia'); // Sepia default for warm reading comfort!
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('aura_reading_theme') as ReadingTheme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const handleSetTheme = (t: ReadingTheme) => {
    setTheme(t);
    localStorage.setItem('aura_reading_theme', t);
  };

  const fetchDocs = async () => {
    try {
      setIsLoading(true);
      const data = await api.listDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDocumentDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDocumentUploaded = (newDoc: Document) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`min-h-screen transition-colors duration-300 theme-${theme}`}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* Top Header */}
      <DriveHeader
        theme={theme}
        setTheme={handleSetTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onUploadClick={() => setIsUploadOpen(true)}
        totalDocuments={documents.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Loading your library...
            </p>
          </div>
        ) : documents.length === 0 ? (
          <EmptyDrive onUploadClick={() => setIsUploadOpen(true)} />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold tracking-tight">Your Library</h2>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Showing {filteredDocs.length} of {documents.length} items
              </span>
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDeleted={handleDocumentDeleted}
                />
              ))}
            </div>

            {filteredDocs.length === 0 && searchQuery && (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm font-medium">No documents match &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={handleDocumentUploaded}
      />
    </div>
  );
}
