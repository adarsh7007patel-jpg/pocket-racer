/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const palette = {
  text: '#F7F3EA',
  tint: '#FF5A4F',
  background: '#0B1220',
  foreground: '#F7F3EA',
  card: '#151F32',
  cardForeground: '#F7F3EA',
  primary: '#FF5A4F',
  primaryForeground: '#0B1220',
  secondary: '#1B2940',
  secondaryForeground: '#F7F3EA',
  muted: '#202C40',
  mutedForeground: '#AAB5C7',
  accent: '#FFC857',
  accentForeground: '#0B1220',
  destructive: '#FF5A4F',
  destructiveForeground: '#F7F3EA',
  border: '#2A3850',
  input: '#2A3850',
  road: '#252F3E',
  roadEdge: '#D7CBB6',
  laneDash: '#A9B4C4',
  teal: '#77D9D2',
  ink: '#111A2B',
} as const;

const colors = {
  light: palette,

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
