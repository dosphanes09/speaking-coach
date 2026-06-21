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
  warning: "#C58A21"
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
  warning: "#E3B552"
};

export type AppColors = typeof lightColors;

export type ThemeMode = "light" | "dark";

export const colors = lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12
};
