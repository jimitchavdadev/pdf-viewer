import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sun,
  Coffee,
  Moon,
  PenTool,
  Highlighter,
  Eraser,
  MessageSquare,
  RotateCcw,
} from 'lucide-react-native';
import { Annotation, Comment, Document, ReadingTheme, ToolType } from '../types';
import { api } from '../services/api';
import { getThemeColors } from '../theme/colors';
import { CommentsModal } from './CommentsModal';

interface ReaderScreenProps {
  document: Document;
  theme: ReadingTheme;
  setTheme: (t: ReadingTheme) => void;
  onBack: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - 32;
const PAGE_HEIGHT = PAGE_WIDTH * 1.414; // A4 aspect ratio

export function ReaderScreen({ document, theme, setTheme, onBack }: ReaderScreenProps) {
  const [currentPage, setCurrentPage] = useState(document.current_page || 1);
  const totalPages = document.page_count || 1;

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColor] = useState('#E11D48');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);

  // Live touch path state
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);

  const colors = getThemeColors(theme);

  // Load annotations & comments from Rust backend
  useEffect(() => {
    async function loadData() {
      try {
        const [annos, comms] = await Promise.all([
          api.listAnnotations(document.id),
          api.listComments(document.id),
        ]);
        setAnnotations(annos);
        setComments(comms);
      } catch (e) {
        console.error('Failed to load viewer data:', e);
      }
    }
    loadData();
  }, [document.id]);

  // Sync reading progress with Rust backend on page change
  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const percent = Math.min(100, Number(((newPage / totalPages) * 100).toFixed(1)));
    try {
      await api.updateProgress(document.id, {
        current_page: newPage,
        total_pages: totalPages,
        percentage: percent,
        zoom_level: 1.0,
        scroll_position_y: 0,
      });
    } catch (e) {
      console.error('Failed to update progress on mobile:', e);
    }
  };

  // Touch drawing responders
  const handleTouchStart = (evt: any) => {
    if (activeTool !== 'pen' && activeTool !== 'highlighter') return;
    const { locationX, locationY } = evt.nativeEvent;
    setCurrentPath([{ x: locationX, y: locationY }]);
  };

  const handleTouchMove = (evt: any) => {
    if (activeTool !== 'pen' && activeTool !== 'highlighter') return;
    const { locationX, locationY } = evt.nativeEvent;
    setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
  };

  const handleTouchEnd = async () => {
    if (currentPath.length < 2) {
      setCurrentPath([]);
      return;
    }

    try {
      const created = await api.createAnnotation(document.id, {
        page_number: currentPage,
        annotation_type: activeTool === 'highlighter' ? 'highlighter' : 'scribble',
        data: {
          points: currentPath,
          color: strokeColor,
          strokeWidth: activeTool === 'highlighter' ? 14 : 3,
        },
      });
      setAnnotations((prev) => [...prev, created]);
    } catch (e) {
      console.error('Failed to save annotation:', e);
    } finally {
      setCurrentPath([]);
    }
  };

  const handleClearPage = async () => {
    const pageAnnos = annotations.filter((a) => a.page_number === currentPage);
    if (pageAnnos.length === 0) return;

    Alert.alert('Clear Markups', 'Remove all scribbles on this page?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          for (const a of pageAnnos) {
            await api.deleteAnnotation(document.id, a.id);
          }
          setAnnotations((prev) => prev.filter((a) => a.page_number !== currentPage));
        },
      },
    ]);
  };

  const currentAnnos = annotations.filter((a) => a.page_number === currentPage);
  const currentComments = comments.filter((c) => c.page_number === currentPage);

  // SVG path helper
  const pointsToSvgPath = (points: Array<{ x: number; y: number }>) => {
    if (!points || points.length === 0) return '';
    return points.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgApp }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={18} color={colors.textMain} />
        </TouchableOpacity>

        <View style={styles.titleBox}>
          <Text style={[styles.docTitle, { color: colors.textMain }]} numberOfLines={1}>
            {document.title}
          </Text>
          <Text style={[styles.pageInfo, { color: colors.textMuted }]}>
            Page {currentPage} of {totalPages} • {Math.round((currentPage / totalPages) * 100)}%
          </Text>
        </View>

        {/* Theme & Comments toggles */}
        <View style={styles.headerRight}>
          <View style={[styles.themeRow, { borderColor: colors.borderSubtle, backgroundColor: colors.bgApp }]}>
            <TouchableOpacity onPress={() => setTheme('light')} style={styles.smallThemeBtn}>
              <Sun size={13} color={theme === 'light' ? '#000' : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTheme('sepia')} style={styles.smallThemeBtn}>
              <Coffee size={13} color={theme === 'sepia' ? '#342823' : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTheme('dark')} style={styles.smallThemeBtn}>
              <Moon size={13} color={theme === 'dark' ? '#FFF' : colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setIsCommentsVisible(true)}
            style={[styles.commentBtn, { backgroundColor: colors.bgApp, borderColor: colors.borderSubtle }]}
          >
            <MessageSquare size={16} color={colors.accentColor} />
            {comments.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accentColor }]}>
                <Text style={styles.badgeText}>{comments.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Reading Canvas Page */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.pageSheet,
            {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              backgroundColor: colors.bgPaper,
              borderColor: colors.borderSubtle,
            },
          ]}
          onStartShouldSetResponder={() => activeTool === 'pen' || activeTool === 'highlighter'}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
        >
          {/* Simulated Printed PDF Content for reading comfort */}
          <View style={styles.documentBody}>
            <Text style={[styles.docPageTitle, { color: colors.textMain }]}>
              {document.title}
            </Text>
            <Text style={[styles.docSectionHeader, { color: colors.accentColor }]}>
              Section {currentPage}: Reading & Markup View
            </Text>
            <Text style={[styles.docParagraph, { color: colors.textMain }]}>
              This document is synchronized in real-time with the common Rust Axum and SeaORM backend. Any annotations, reading progress, and comments you make on mobile are saved instantly to Supabase.
            </Text>
            <Text style={[styles.docParagraph, { color: colors.textMain }]}>
              Reading comfort mode is active. Sepia tones warm the background, while deep charcoal provides high-legibility text with zero blue-light eye strain.
            </Text>
            <View style={[styles.calloutBox, { backgroundColor: colors.bgApp, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.calloutText, { color: colors.textMuted }]}>
                Tip: Select the Pen or Highlighter tool below to draw scribbles directly onto the page with your finger.
              </Text>
            </View>
          </View>

          {/* SVG Vector Annotations Layer */}
          <Svg style={StyleSheet.absoluteFill}>
            {/* Saved annotations */}
            {currentAnnos.map((anno) => {
              const pts = anno.data?.points;
              if (!pts) return null;
              const isHigh = anno.annotation_type === 'highlighter' || anno.annotation_type === 'highlight';
              return (
                <Path
                  key={anno.id}
                  d={pointsToSvgPath(pts)}
                  stroke={anno.data.color || '#E11D48'}
                  strokeWidth={isHigh ? 14 : 3}
                  strokeLinecap={isHigh ? 'square' : 'round'}
                  strokeLinejoin="round"
                  opacity={isHigh ? 0.45 : 1}
                  fill="none"
                />
              );
            })}

            {/* In-progress live touch path */}
            {currentPath.length > 1 && (
              <Path
                d={pointsToSvgPath(currentPath)}
                stroke={strokeColor}
                strokeWidth={activeTool === 'highlighter' ? 14 : 3}
                strokeLinecap={activeTool === 'highlighter' ? 'square' : 'round'}
                strokeLinejoin="round"
                opacity={activeTool === 'highlighter' ? 0.45 : 1}
                fill="none"
              />
            )}
          </Svg>

          {/* Page number watermark */}
          <View style={styles.pageWatermark}>
            <Text style={[styles.watermarkText, { color: colors.textMuted }]}>
              Page {currentPage} of {totalPages}
            </Text>
          </View>
        </View>

        {/* Page Switcher Buttons */}
        <View style={styles.paginationRow}>
          <TouchableOpacity
            disabled={currentPage <= 1}
            onPress={() => handlePageChange(currentPage - 1)}
            style={[styles.pageNavBtn, { opacity: currentPage <= 1 ? 0.3 : 1 }]}
          >
            <ChevronLeft size={20} color={colors.textMain} />
            <Text style={[styles.pageNavText, { color: colors.textMain }]}>Previous</Text>
          </TouchableOpacity>

          <Text style={[styles.pageIndicator, { color: colors.textMuted }]}>
            {currentPage} / {totalPages}
          </Text>

          <TouchableOpacity
            disabled={currentPage >= totalPages}
            onPress={() => handlePageChange(currentPage + 1)}
            style={[styles.pageNavBtn, { opacity: currentPage >= totalPages ? 0.3 : 1 }]}
          >
            <Text style={[styles.pageNavText, { color: colors.textMain }]}>Next</Text>
            <ChevronRight size={20} color={colors.textMain} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Markup Dock */}
      <View style={[styles.toolbarDock, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity
          onPress={() => setActiveTool('select')}
          style={[styles.toolBtn, activeTool === 'select' && styles.toolActive]}
        >
          <Text style={[styles.toolLabel, activeTool === 'select' && styles.toolLabelActive]}>Read</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTool('pen');
            setStrokeColor('#E11D48');
          }}
          style={[styles.toolBtn, activeTool === 'pen' && styles.toolActive]}
        >
          <PenTool size={16} color={activeTool === 'pen' ? '#FFF' : colors.textMain} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTool('highlighter');
            setStrokeColor('#FEF08A');
          }}
          style={[styles.toolBtn, activeTool === 'highlighter' && styles.toolActive]}
        >
          <Highlighter size={16} color={activeTool === 'highlighter' ? '#FFF' : colors.textMain} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleClearPage} style={styles.toolBtn}>
          <RotateCcw size={16} color="#e11d48" />
        </TouchableOpacity>
      </View>

      {/* Comments Drawer Modal */}
      <CommentsModal
        visible={isCommentsVisible}
        onClose={() => setIsCommentsVisible(false)}
        documentId={document.id}
        currentPage={currentPage}
        comments={comments}
        theme={theme}
        onCommentAdded={(c) => setComments((prev) => [...prev, c])}
        onCommentDeleted={async (id) => {
          await api.deleteComment(id);
          setComments((prev) => prev.filter((c) => c.id !== id));
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    padding: 6,
  },
  titleBox: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pageInfo: {
    fontSize: 11,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 2,
  },
  smallThemeBtn: {
    padding: 4,
  },
  commentBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  pageSheet: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  documentBody: {
    flex: 1,
  },
  docPageTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  docSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  docParagraph: {
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 14,
  },
  calloutBox: {
    borderLeftWidth: 3,
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  calloutText: {
    fontSize: 12,
    lineHeight: 18,
  },
  pageWatermark: {
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
  watermarkText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: PAGE_WIDTH,
    marginTop: 16,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  pageNavText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '500',
  },
  toolbarDock: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toolActive: {
    backgroundColor: '#2563EB',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  toolLabelActive: {
    color: '#FFF',
  },
});
