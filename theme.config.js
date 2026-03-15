/** @type {const} */
const themeColors = {
  // Primary accent - deeper rose for clearer CTA contrast
  primary: { light: '#D97A87', dark: '#D97A87' },
  // Backgrounds
  background: { light: '#FDFBF9', dark: '#1A1A1A' },
  surface: { light: '#FFFFFF', dark: '#2D2D2D' },
  // Text colors
  foreground: { light: '#2D3436', dark: '#ECEDEE' },
  muted: { light: '#636E72', dark: '#9BA1A6' },
  // Borders
  border: { light: '#D6C2C8', dark: '#404040' },
  // Status colors
  success: { light: '#A8E6CF', dark: '#A8E6CF' },
  warning: { light: '#FFD93D', dark: '#FFD93D' },
  error: { light: '#FF8B8B', dark: '#FF8B8B' },
  // Wellness-specific colors
  period: { light: '#E88F9B', dark: '#E88F9B' },
  fertility: { light: '#D4A5D9', dark: '#D4A5D9' },
  ovulation: { light: '#B794F4', dark: '#B794F4' },
  migraine: { light: '#FF8B8B', dark: '#FF8B8B' },
  // Gradient colors for headers
  gradientStart: { light: '#E8D5E8', dark: '#3D3D3D' },
  gradientEnd: { light: '#F5E6E8', dark: '#2D2D2D' },
};

module.exports = { themeColors };
