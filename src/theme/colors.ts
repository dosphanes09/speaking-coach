export const lightColors = {
  background: "#F7F7F2",
  surface: "#FFFFFF",
  surfaceMuted: "#ECEFE8",
  ink: "#1D2521",
  muted: "#68736D",
  line: "#DDE2DB",
  primary: "#2E7D68",
  primaryDark: "#205B4C",
  secondary: "#D9893D",
  accent: "#4464AD",
  danger: "#B94A48",
  success: "#3B8C5A",
  warning: "#C58A21",
  primaryTint: "#EAF4F0",
  accentTint: "#EEF1FB",
  secondaryTint: "#FBF0E4",
  successTint: "#EAF6EE",
  warningTint: "#FBF3E7",
  dangerTint: "#FBEAEA"
};

export const darkColors: AppColors = {
  background: "#111714",
  surface: "#1B2420",
  surfaceMuted: "#25312C",
  ink: "#F2F5EF",
  muted: "#A7B0AA",
  line: "#35423C",
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
  dangerTint: "#2E1E1D"
};

export const loveColors: AppColors = {
  background: "#211018",
  surface: "#351B28",
  surfaceMuted: "#482335",
  ink: "#FFF3F6",
  muted: "#E9B9C6",
  line: "#6A334A",
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
  dangerTint: "#3A1B22"
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
