import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Document, ReadingTheme } from './src/types';
import { DriveScreen } from './src/components/DriveScreen';
import { ReaderScreen } from './src/components/ReaderScreen';

export default function App() {
  const [theme, setTheme] = useState<ReadingTheme>('sepia');
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);

  return (
    <View style={styles.container}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {currentDoc ? (
        <ReaderScreen
          document={currentDoc}
          theme={theme}
          setTheme={setTheme}
          onBack={() => setCurrentDoc(null)}
        />
      ) : (
        <DriveScreen
          theme={theme}
          setTheme={setTheme}
          onSelectDocument={(doc) => setCurrentDoc(doc)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
