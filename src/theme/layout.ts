/**
 * Layout constants for a codebase that now runs on two very different screens.
 *
 * The app was written for a phone and later packaged as a desktop application.
 * Nothing in between adjusted: the desktop window opens at 1180x860 and every
 * screen but one stretched its cards edge to edge. At that width a line of body
 * text runs to roughly 190 characters.
 *
 * Typography has a well-established readable range of 45-75 characters per
 * line. The reason is mechanical rather than aesthetic — at the end of a long
 * line the eye has to travel back and find the start of the next one, and past
 * about 90 characters it starts landing on the wrong line. This is why books
 * set wide pages in narrow columns and why newspapers use columns at all.
 *
 * Two widths, because the app has two kinds of content:
 *
 *   CONTENT_MAX_WIDTH  The shell. Wide enough for a two- or three-column grid
 *                      of small tiles, which is content the eye scans rather
 *                      than reads.
 *   PROSE_MAX_WIDTH    Paragraphs meant to be read start to finish — a
 *                      transcript, a concept definition, a passage to read
 *                      aloud. Capped tighter, into the readable range.
 */
/**
 * The shell. Beyond this, extra window width becomes margin.
 *
 * 700 rather than a rounder 760, and the difference was measured rather than
 * chosen: at 760 the shell still produced 99 characters per line, past the
 * point where the eye reliably finds the next line. 700 lands near 79, and
 * still leaves room for a three-column tile grid.
 */
export const CONTENT_MAX_WIDTH = 700;

/**
 * Long-form text: transcripts, concept definitions, passages read aloud.
 *
 * 600 puts a desktop line at ~75 characters, the classic typographic ceiling.
 * 620 measured at 78 — close, and close is the wrong side of a limit that only
 * matters when someone is reading a five-minute transcript start to finish.
 */
export const PROSE_MAX_WIDTH = 600;

/** Below this the window is phone-shaped and nothing should be constrained. */
export const NARROW_BREAKPOINT = 620;

/**
 * Tile grids stop adding columns here.
 *
 * Without a cap the metric grid's `flexBasis: 150` produced seven columns in a
 * wide window: technically a grid, practically a row of disconnected numbers
 * with no shape to scan.
 */
export const MAX_GRID_COLUMNS = 3;

/**
 * How wide a full-width button is allowed to get.
 *
 * Above any phone width, so nothing changes on a phone; below the content
 * column, so a desktop button stops being a bar with a label lost in the middle.
 */
export const BUTTON_MAX_WIDTH = 440;

/**
 * Whether this is the desktop build.
 *
 * Detected through `document` rather than react-native's `Platform`, and
 * deliberately: importing react-native here would pull its Flow-typed entry
 * point into every consumer, including the plain-Node test runner, which cannot
 * parse it. A layout constant that cannot be unit-tested is a layout constant
 * that silently rots.
 *
 * The check is sound. React Native has no `document`; react-native-web runs in
 * the Electron renderer, which does. And web is only ever the desktop app here
 * — the phone build is native and Expo web is not used — so this really does
 * mean "desktop", which deserves larger text than a phone held at arm's length.
 */
export const isDesktop = typeof document !== "undefined";

/**
 * How much larger type is on the desktop build.
 *
 * Exported separately from `TYPE_SCALE` so the desktop case can be checked from
 * a plain Node test, where `isDesktop` is false and the applied scale is 1.
 */
export const DESKTOP_TYPE_SCALE = 1.12;

/** Applied to every font size and line height at module load. */
export const TYPE_SCALE = isDesktop ? DESKTOP_TYPE_SCALE : 1;

export function scaleType(value: number): number {
  return Math.round(value * TYPE_SCALE);
}

/**
 * The style that centres a screen inside a wide window.
 *
 * `width: "100%"` matters: without it a flex child with only `maxWidth` and
 * `alignSelf: "center"` collapses to its content width on some layouts, which
 * looks like a random narrow column rather than a centred page.
 */
export const centeredContent = {
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: "center"
} as const;

export const proseWidth = {
  width: "100%",
  maxWidth: PROSE_MAX_WIDTH
} as const;
