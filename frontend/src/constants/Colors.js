const common = {
  primary: '#7C6FE0',       // Soft indigo/violet
  primaryLight: '#9F95E8',
  primaryDark: '#5A4FBA',
  accent: '#E0A96F',        // Warm amber accent
  
  // Scan Type Colors (softer, desaturated)
  order: '#52C98A',         // Soft mint green
  return: '#E8A550',        // Warm amber
  product: '#6BA6E8',       // Soft blue
  duplicate: '#E8D250',     // Soft yellow
  error: '#E86E6E',         // Soft red
  unknown: '#7C6FE0',       // Indigo (primary)
};

export const dark = {
  ...common,
  // Backgrounds
  background: '#0C0C10',    // Near-black with a cool undertone
  surface: '#16161D',       // Card surface
  surfaceElevated: '#1E1E28', // Raised card
  border: '#282830',         // Subtle borders

  // Text
  text: '#F0EFF5',
  textSecondary: '#7A798A',
  textMuted: '#48475A',
};

export const light = {
  ...common,
  // Backgrounds
  background: '#F8F9FA',    // Light grey background
  surface: '#FFFFFF',       // Pure white card surface
  surfaceElevated: '#F2F2F2', // Slightly grey raised card
  border: '#E0E0E0',         // Subtle light borders

  // Text
  text: '#121212',          // Dark text
  textSecondary: '#4A4A4A', // Medium grey text
  textMuted: '#8E8E8E',     // Lighter grey text
};

export default dark;

