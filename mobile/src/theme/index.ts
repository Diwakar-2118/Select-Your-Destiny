// Design tokens from docs/CONTRACT.md
export const colors = {
  primary: '#2563EB',
  secondary: '#6D28D9',
  accent: '#F97316',
  background: '#FFFFFF',
  card: '#F3F4F6',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  seatAvailable: '#22C55E',
  seatBooked: '#9CA3AF',
  seatSelected: '#2563EB',
  seatLadies: '#EC4899',
  overlay: 'rgba(15,23,42,0.5)',
  glass: 'rgba(255,255,255,0.18)',
};

// 135deg gradient: start top-left, end bottom-right
export const gradient = {
  colors: ['#2563EB', '#6D28D9', '#F97316'] as const,
  locations: [0, 0.6, 1] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const touch = { min: 48 };

export const font = {
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  tiny: { fontSize: 11, color: colors.muted },
};

export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

export const theme = { colors, gradient, radius, spacing, font, shadow, touch };
export default theme;
