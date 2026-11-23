import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Send, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { Comment, ReadingTheme } from '../types';
import { api } from '../services/api';
import { getThemeColors } from '../theme/colors';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  currentPage: number;
  comments: Comment[];
  theme: ReadingTheme;
  onCommentAdded: (c: Comment) => void;
  onCommentDeleted: (id: string) => void;
}

export function CommentsModal({
  visible,
  onClose,
  documentId,
  currentPage,
  comments,
  theme,
  onCommentAdded,
  onCommentDeleted,
}: CommentsModalProps) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('Mobile Reader');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = getThemeColors(theme);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Image Error', e.message);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      const newComment = await api.createComment(documentId, {
        page_number: currentPage,
        author_name: authorName.trim() || 'Reader',
        content: content.trim(),
      });

      if (selectedImageUri) {
        const fileName = selectedImageUri.split('/').pop() || 'image.jpg';
        const attachment = await api.uploadAttachment(newComment.id, selectedImageUri, fileName);
        newComment.attachments = [attachment];
      }

      onCommentAdded(newComment);
      setContent('');
      setSelectedImageUri(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <Text style={[styles.title, { color: colors.textMain }]}>Comments & Notes</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {comments.length} comments • Page {currentPage}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMain} />
            </TouchableOpacity>
          </View>

          {/* List of comments */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.commentItem, { backgroundColor: colors.bgApp, borderColor: colors.borderSubtle }]}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.author, { color: colors.textMain }]}>{item.author_name}</Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.pageBadge, { color: colors.accentColor }]}>
                      Page {item.page_number}
                    </Text>
                    <TouchableOpacity onPress={() => onCommentDeleted(item.id)} style={styles.delIcon}>
                      <Trash2 size={14} color="#e11d48" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.commentBody, { color: colors.textMain }]}>{item.content}</Text>

                {/* Attached image preview */}
                {item.attachments && item.attachments.length > 0 && (
                  <View style={styles.attachmentRow}>
                    {item.attachments.map((att) => (
                      <Image
                        key={att.id}
                        source={{ uri: api.getAttachmentUrl(att.id) }}
                        style={styles.attachmentThumb}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          />

          {/* Input Footer */}
          <View style={[styles.inputBox, { borderTopColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
            {selectedImageUri && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
                <TouchableOpacity onPress={() => setSelectedImageUri(null)} style={styles.removeImageBtn}>
                  <X size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.row}>
              <TextInput
                placeholder="Write a comment..."
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgApp,
                    color: colors.textMain,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              />
              <TouchableOpacity onPress={handlePickImage} style={styles.iconBtn}>
                <ImageIcon size={20} color={colors.accentColor} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                disabled={!content.trim() || isSubmitting}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: colors.accentColor,
                    opacity: !content.trim() || isSubmitting ? 0.4 : 1,
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '85%',
    minHeight: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  commentItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  delIcon: {
    padding: 2,
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  attachmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  attachmentThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  inputBox: {
    padding: 12,
    borderTopWidth: 1,
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    padding: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  iconBtn: {
    padding: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
