/**
 * Type scale for the app. Replaces ad-hoc `fontSize`/`fontWeight` pairs that
 * were scattered per-screen (and leaned on `fontWeight: "900"` almost
 * everywhere, flattening the visual hierarchy). Spread one of these into a
 * StyleSheet entry, e.g.:
 *
 *   title: { ...typography.h1, color: colors.ink }
 */
export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.2
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700"
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500"
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500"
  },
  bodyStrong: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500"
  }
} as const;
