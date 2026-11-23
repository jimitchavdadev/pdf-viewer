import { ReadingTheme } from '../types';

export const THEMES = {
  light: {
    bgApp: '#F8F9FA',
    bgSurface: '#FFFFFF',
    bgPaper: '#FFFFFF',
    textMain: '#18191B',
    textMuted: '#64748B',
    borderSubtle: '#E2E8F0',
    accentColor: '#2563EB',
  },
  sepia: {
    bgApp: '#EDE3D2',
    bgSurface: '#F5ECDD',
    bgPaper: '#F8F1E5',
    textMain: '#342823',
    textMuted: '#7E6C63',
    borderSubtle: '#DECDB8',
    accentColor: '#B45309',
  },
  dark: {
    bgApp: '#0F1012',
    bgSurface: '#18191C',
    bgPaper: '#1E2023',
    textMain: '#E2E4E8',
    textMuted: '#949BA4',
    borderSubtle: '#2B2E33',
    accentColor: '#38BDF8',
  },
};

export function getThemeColors(theme: ReadingTheme) {
  return THEMES[theme] || THEMES.sepia;
}
