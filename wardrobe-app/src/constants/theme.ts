/**
 * "Capsule" design tokens — extracted from references/Wardrobe Design/Capsule.dc.html.
 * Warm cream surfaces, near-black ink, terracotta accent, Instrument Serif display
 * over Hanken Grotesk UI text. The design is light-only; both schemes resolve to it.
 */

export const Colors = {
  light: {
    text: '#1b1815',
    textSecondary: '#8a8377',
    textTertiary: '#b3ada3',
    textOverline: '#a89f90',
    background: '#fbfaf7',
    backgroundElement: '#f4efe6',
    backgroundElementAlt: '#f1ebe1',
    backgroundInput: '#efeae1',
    backgroundImage: '#ece4d6',
    backgroundSelected: '#faf3eb',
    card: '#ffffff',
    border: '#ece7df',
    borderSelected: '#d8a572',
    accent: '#1b1815',
    /** Softer warm charcoal — for dark surfaces that felt too harsh at pure ink. */
    accentSoft: '#3c352d',
    accentText: '#fbfaf7',
    terracotta: '#b06a44',
    terracottaSoft: '#f7eee4',
    heart: '#e0556b',
    positive: '#3f8a5f',
    positiveSoft: '#7bb98f',
    warning: '#b06a44',
    danger: '#b42318',
    ringStart: '#c8895c',
    ringEnd: '#e8cb9d',
    tabBar: 'rgba(251,250,247,0.95)',
  },
} as const;

// Light-only by design — dark scheme mirrors the cream palette.
export const Theme = Colors.light;

export type ThemeColors = typeof Colors.light;

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
  sm: 11,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  hero: 26,
  pill: 999,
} as const;

export const Fonts = {
  /** Display serif — headings like "Good morning", "What's the occasion?" */
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  /** UI sans — everything else */
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemiBold: 'HankenGrotesk_600SemiBold',
  sansBold: 'HankenGrotesk_700Bold',
  sansExtraBold: 'HankenGrotesk_800ExtraBold',
} as const;
