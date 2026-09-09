/**
 * Caches a screen's stylesheet per theme.
 *
 * Every component in this app ends with
 *
 *   function createStyles(colors: AppColors) { return StyleSheet.create({...}) }
 *
 * and calls it in the render body. That means a fresh `StyleSheet.create` on
 * every render — and the cost is not evenly spread: several components call it
 * from a child that renders once per row, so a history list of forty entries
 * built forty stylesheets, and rebuilt all forty on every keystroke or state
 * change anywhere above it.
 *
 * The theme object is a stable reference — the provider hands out the same
 * `lightColors`/`darkColors`/`loveColors` object until the user changes theme —
 * so it works as a cache key. A `WeakMap` means a theme that is no longer
 * referenced takes its cached sheets with it rather than pinning them forever.
 *
 * The alternative was `useMemo` in eighty-four render bodies, which is the same
 * saving spread across eighty-four chances to forget one.
 */

const caches = new WeakMap<object, WeakMap<object, unknown>>();

export function memoizeStyles<TColors extends object, TStyles>(
  build: (colors: TColors) => TStyles
): (colors: TColors) => TStyles {
  return (colors: TColors): TStyles => {
    let byBuilder = caches.get(colors);
    if (!byBuilder) {
      byBuilder = new WeakMap<object, unknown>();
      caches.set(colors, byBuilder);
    }

    // Keyed by the builder as well as the theme: every component has its own
    // `createStyles`, and they all receive the same theme object.
    const cached = byBuilder.get(build as unknown as object);
    if (cached !== undefined) {
      return cached as TStyles;
    }

    const styles = build(colors);
    byBuilder.set(build as unknown as object, styles as unknown as object);
    return styles;
  };
}
