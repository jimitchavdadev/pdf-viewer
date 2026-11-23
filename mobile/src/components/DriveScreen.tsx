import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BookOpen, Sun, Coffee, Moon, UploadCloud, Trash2, Clock, ChevronRight } from 'lucide-react-native';
import { Document, ReadingTheme } from '../types';
import { api } from '../services/api';
import { getThemeColors } from '../theme/colors';

interface DriveScreenProps {
  theme: ReadingTheme;
  setTheme: (t: ReadingTheme) => void;
  onSelectDocument: (doc: Document) => void;
}

export function DriveScreen({ theme, setTheme, onSelectDocument }: DriveScreenProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const colors = getThemeColors(theme);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (e: any) {
      console.error('Failed to load documents:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handlePickAndUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert(
            'File Too Large',
            `Selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The maximum allowed limit is 10 MB to protect database capacity.`
          );
          return;
        }
        setIsUploading(true);
        const uploaded = await api.uploadDocument(file.uri, file.name);
        setDocuments((prev) => [uploaded, ...prev]);
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Could not upload PDF');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert('Delete Document', `Are you sure you want to delete "${doc.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteDocument(doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          } catch (e) {
            Alert.alert('Error', 'Failed to delete document');
          }
        },
      },
    ]);
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgApp }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <View style={styles.brandContainer}>
          <View style={[styles.logoIcon, { backgroundColor: colors.accentColor }]}>
            <BookOpen size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textMain }]}>Aura Drive</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
            </Text>
          </View>
        </View>

        {/* Theme Switcher */}
        <View style={[styles.themeRow, { borderColor: colors.borderSubtle, backgroundColor: colors.bgApp }]}>
          <TouchableOpacity
            onPress={() => setTheme('light')}
            style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]}
          >
            <Sun size={15} color={theme === 'light' ? '#000' : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTheme('sepia')}
            style={[styles.themeBtn, theme === 'sepia' && styles.themeBtnActiveSepia]}
          >
            <Coffee size={15} color={theme === 'sepia' ? '#342823' : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTheme('dark')}
            style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActiveDark]}
          >
            <Moon size={15} color={theme === 'dark' ? '#FFF' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar & Upload Button */}
      <View style={styles.actionRow}>
        <TextInput
          placeholder="Search documents..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.bgSurface,
              color: colors.textMain,
              borderColor: colors.borderSubtle,
            },
          ]}
        />
        <TouchableOpacity
          onPress={handlePickAndUpload}
          disabled={isUploading}
          style={[styles.uploadButton, { backgroundColor: colors.accentColor }]}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <UploadCloud size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Documents List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accentColor} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading library...</Text>
        </View>
      ) : filteredDocs.length === 0 ? (
        <View style={styles.centerBox}>
          <BookOpen size={48} color={colors.accentColor} />
          <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Documents</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Upload a PDF document from your phone to start reading with progress sync & markups.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const percent = Math.min(Math.max(Number(item.reading_percentage) || 0, 0), 100);
            return (
              <TouchableOpacity
                onPress={() => onSelectDocument(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.textMain }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                    <Trash2 size={16} color="#e11d48" />
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressInfo}>
                    <Text style={[styles.progressText, { color: colors.textMuted }]}>
                      Page {item.current_page || 1} of {item.page_count}
                    </Text>
                    <Text style={[styles.percentText, { color: colors.accentColor }]}>
                      {percent.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: colors.bgApp }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${percent}%`,
                          backgroundColor: colors.accentColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Card footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.clockRow}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>
                      {item.last_read_at ? 'Read recently' : 'Unopened'}
                    </Text>
                  </View>
                  <View style={styles.readMoreRow}>
                    <Text style={[styles.readNowText, { color: colors.accentColor }]}>Read</Text>
                    <ChevronRight size={14} color={colors.accentColor} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
  },
  themeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  themeBtn: {
    padding: 6,
    borderRadius: 6,
  },
  themeBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  themeBtnActiveSepia: {
    backgroundColor: '#DECDB8',
  },
  themeBtnActiveDark: {
    backgroundColor: '#27272A',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  uploadButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.2)',
    paddingTop: 8,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readNowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
