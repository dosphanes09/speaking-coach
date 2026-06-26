export const lightColors = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F6",
  ink: "#111111",
  muted: "#6B7280",
  line: "#E5E7EB",
  primary: "#2E7D68",
  primaryDark: "#205B4C",
  secondary: "#D9893D",
  accent: "#2E7D68",
  danger: "#B94A48",
  success: "#3B8C5A",
  warning: "#C58A21"
};

export const darkColors: AppColors = {
  background: "#0F1110",
  surface: "#171A18",
  surfaceMuted: "#222622",
  ink: "#F8FAF9",
  muted: "#A1A8A4",
  line: "#2C302D",
  primary: "#54B99D",
  primaryDark: "#8DDBC8",
  secondary: "#E2A258",
  accent: "#54B99D",
  danger: "#EF8A86",
  success: "#75C894",
  warning: "#E3B552"
};

export const loveColors: AppColors = {
  background: "#FFF7FA",
  surface: "#FFFFFF",
  surfaceMuted: "#FFECEF",
  ink: "#241116",
  muted: "#7A5360",
  line: "#F4CFDA",
  primary: "#D94B72",
  primaryDark: "#B8355B",
  secondary: "#E97892",
  accent: "#D94B72",
  danger: "#C43D58",
  success: "#B85F7A",
  warning: "#C9863D"
};

export type AppColors = typeof lightColors;

export type ThemeMode = "light" | "dark" | "love";

export const colors = lightColors;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  screen: 20,
  card: 20,
  section: 28
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999
};
