import { scaleType } from "@/theme/layout";

/**
 * Type scale for the app. Replaces ad-hoc `fontSize`/`fontWeight` pairs that
 * were scattered per-screen (and leaned on `fontWeight: "900"` almost
 * everywhere, flattening the visual hierarchy). Spread one of these into a
 * StyleSheet entry, e.g.:
 *
 *   title: { ...typography.h1, color: colors.ink }
 *
 * Every size passes through `scaleType`, which enlarges the whole scale by 12%
 * on the desktop build. The numbers below were chosen for a phone held at arm's
 * length; the same 14px body text on a 1180px desktop window reads as small,
 * and shrinking the content column alone would have left it looking cramped
 * rather than comfortable. Scaling at the source means no screen has to know
 * which platform it is on.
 */
export const typography = {
  display: {
    fontSize: scaleType(28),
    lineHeight: scaleType(34),
    fontWeight: "800",
    letterSpacing: -0.3
  },
  h1: {
    fontSize: scaleType(22),
    lineHeight: scaleType(28),
    fontWeight: "800",
    letterSpacing: -0.2
  },
  h2: {
    fontSize: scaleType(18),
    lineHeight: scaleType(24),
    fontWeight: "700"
  },
  bodyLarge: {
    fontSize: scaleType(16),
    lineHeight: scaleType(23),
    fontWeight: "500"
  },
  body: {
    fontSize: scaleType(14),
    lineHeight: scaleType(21),
    fontWeight: "500"
  },
  bodyStrong: {
    fontSize: scaleType(14),
    lineHeight: scaleType(21),
    fontWeight: "700"
  },
  label: {
    fontSize: scaleType(12),
    lineHeight: scaleType(16),
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  caption: {
    fontSize: scaleType(12),
    lineHeight: scaleType(17),
    fontWeight: "500"
  }
} as const;
