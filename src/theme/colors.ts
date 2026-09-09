/**
 * Light theme.
 *
 * Several accents here are darker than an eye would pick them: `warning` in
 * particular reads as olive rather than gold. That was measured, not chosen.
 * The original #C58A21 gave warning text on its own tint a contrast of 2.71
 * where 4.5 is needed — the yellow warning box was the least readable thing in
 * the app — and white on it scored 2.99, so the badges printed on it were worse.
 * Each value below is the closest colour to the original, at the same hue and
 * saturation, that clears every pairing it is actually used in.
 */
export const lightColors = {
  background: "#F7F7F2",
  surface: "#FFFFFF",
  surfaceMuted: "#ECEFE8",
  ink: "#1D2521",
  muted: "#636E68",
  line: "#B4BFB0",
  primary: "#2E7D68",
  primaryDark: "#205B4C",
  secondary: "#D9893D",
  accent: "#4464AD",
  danger: "#B64846",
  success: "#347C50",
  warning: "#936719",
  primaryTint: "#EAF4F0",
  accentTint: "#EEF1FB",
  secondaryTint: "#FBF0E4",
  successTint: "#EAF6EE",
  warningTint: "#FBF3E7",
  dangerTint: "#FBEAEA",
  // The outline a control has when it has no fill of its own — a ghost button,
  // an unselected chip. WCAG asks 3:1 of anything that identifies a control,
  // which `line` deliberately does not meet: a 3:1 edge on every decorative
  // card would box the whole interface in.
  lineStrong: "#889981",
  // Text and icons placed ON a solid accent fill. White works in this theme
  // because the accents above were darkened until it does; the dark themes use
  // their own background instead, since their accents are light.
  onAccent: "#FFFFFF"
};

export const darkColors: AppColors = {
  background: "#111714",
  surface: "#1B2420",
  surfaceMuted: "#25312C",
  ink: "#F2F5EF",
  muted: "#A7B0AA",
  line: "#42524A",
  primary: "#54B99D",
  primaryDark: "#8DDBC8",
  secondary: "#E2A258",
  accent: "#8EA7F4",
  danger: "#EF8A86",
  success: "#75C894",
  warning: "#E3B552",
  primaryTint: "#1B2A26",
  accentTint: "#1E2436",
  secondaryTint: "#2E2519",
  successTint: "#1B2A22",
  warningTint: "#2E2718",
  dangerTint: "#2E1E1D",
  lineStrong: "#5B7267",
  onAccent: "#111714"
};

export const loveColors: AppColors = {
  background: "#211018",
  surface: "#351B28",
  surfaceMuted: "#482335",
  ink: "#FFF3F6",
  muted: "#E9B9C6",
  line: "#793A55",
  primary: "#E94B7A",
  primaryDark: "#FF8DAA",
  secondary: "#F2A07B",
  accent: "#FF6F9F",
  danger: "#FF5C78",
  success: "#F4A7B9",
  warning: "#F4C06A",
  primaryTint: "#3A1E2A",
  accentTint: "#3A1E30",
  secondaryTint: "#3A2820",
  successTint: "#3A222A",
  warningTint: "#3A2A18",
  dangerTint: "#3A1B22",
  lineStrong: "#A75074",
  onAccent: "#211018"
};

export type AppColors = typeof lightColors;

export type ThemeMode = "light" | "dark" | "love";

export const colors = lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  screen: 16
};

/**
 * Corner radius scale. Bumped up from the original (6/8/12) for a softer,
 * more premium card/button feel across the whole app. Existing screens that
 * reference `radius.sm/md/lg` pick this up automatically with no code change.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22
};
