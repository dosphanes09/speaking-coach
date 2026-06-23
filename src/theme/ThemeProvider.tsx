import React, { createContext, useContext, useMemo } from "react";
import { AppColors, darkColors, lightColors, loveColors, ThemeMode } from "./colors";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: AppColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  colors: lightColors
});

interface ThemeProviderProps {
  mode: ThemeMode;
  children: React.ReactNode;
}

export function ThemeProvider({ mode, children }: ThemeProviderProps): React.JSX.Element {
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: resolveThemeColors(mode)
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function resolveThemeColors(mode: ThemeMode): AppColors {
  if (mode === "dark") {
    return darkColors;
  }
  if (mode === "love") {
    return loveColors;
  }
  return lightColors;
}

export function useThemeColors(): AppColors {
  return useContext(ThemeContext).colors;
}

export function useThemeMode(): ThemeMode {
  return useContext(ThemeContext).mode;
}
