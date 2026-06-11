import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1E',
    textSecondary: '#60646C',
    background: '#FFFFFF',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    border: '#E0E1E6',
    accent: '#1A1A1E',
    accentText: '#FFFFFF',
    positive: '#1D7A46',
    warning: '#B54708',
    danger: '#B42318',
  },
  dark: {
    text: '#F4F4F5',
    textSecondary: '#B0B4BA',
    background: '#0E0E10',
    backgroundElement: '#1C1C21',
    backgroundSelected: '#2E3135',
    border: '#2E3135',
    accent: '#F4F4F5',
    accentText: '#111113',
    positive: '#4CC38A',
    warning: '#F5A623',
    danger: '#F2555A',
  },
} as const;

export type ThemeColors = Record<keyof typeof Colors.light, string>;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui, -apple-system, sans-serif', mono: 'monospace' },
});
