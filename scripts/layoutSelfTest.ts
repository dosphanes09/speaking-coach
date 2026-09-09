/**
 * Layout checks.
 *
 * The app was written for a phone and later shipped as a desktop application
 * without anything in between adjusting. This file pins down the arithmetic
 * that fixed it, so a future change to a width or a font size cannot quietly
 * put the app back to 190-character lines.
 *
 * The checks are on numbers rather than on rendered output, because the numbers
 * are where the mistake was: nothing was broken, everything just stretched.
 *
 * Run: npm run test:layout
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONTENT_MAX_WIDTH,
  PROSE_MAX_WIDTH,
  MAX_GRID_COLUMNS,
  NARROW_BREAKPOINT,
  scaleType,
  TYPE_SCALE,
  DESKTOP_TYPE_SCALE
} from "../src/theme/layout";
import { spacing } from "../src/theme/colors";
import { typography } from "../src/theme/typography";
import { memoizeStyles } from "../src/theme/memoizeStyles";

let checks = 0;
function check(name: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

/**
 * Characters that fit on one line.
 *
 * 0.5em per character is the usual working figure for a proportional Latin
 * face: some letters are much wider, most are narrower, and it averages out
 * close enough to size a column with.
 */
function charactersPerLine(pixelWidth: number, fontSize: number): number {
  return pixelWidth / (fontSize * 0.5);
}

const DESKTOP_WINDOW_WIDTH = 1180; // desktop/main.js

/**
 * The body size as the desktop build actually renders it.
 *
 * This test runs in Node, where `isDesktop` is false and the applied scale is
 * 1 — so reading `typography.body.fontSize` directly would measure the phone
 * case against the desktop container, a combination that never exists. The
 * ratio converts whichever scale is in force into the desktop one.
 */
const desktopBodySize = Math.round(
  (typography.body.fontSize / TYPE_SCALE) * DESKTOP_TYPE_SCALE
);
const READABLE_MAX = 90; // past this the eye starts landing on the wrong line
const COMFORTABLE_MAX = 75; // the classic typographic ceiling

console.log("Line length");

check("an unconstrained desktop window would be unreadable", () => {
  // The bug this whole phase exists for, stated as a number so nobody has to
  // take it on faith.
  const before = charactersPerLine(DESKTOP_WINDOW_WIDTH - spacing.screen * 2, 14);
  assert.ok(before > 150, `expected the old layout to be extreme, got ${Math.round(before)} chars`);
});

check("the constrained shell brings body text into the readable range", () => {
  const textWidth = CONTENT_MAX_WIDTH - spacing.screen * 2 - spacing.md * 2;
  const chars = charactersPerLine(textWidth, desktopBodySize);
  assert.ok(chars <= READABLE_MAX, `shell body text is ${Math.round(chars)} chars, over ${READABLE_MAX}`);
});

check("prose blocks reach the comfortable range", () => {
  // Transcripts, definitions and passages to read aloud are read start to
  // finish, so they get the tighter cap rather than the shell's.
  const chars = charactersPerLine(PROSE_MAX_WIDTH, desktopBodySize);
  assert.ok(chars <= COMFORTABLE_MAX, `prose is ${Math.round(chars)} chars, over ${COMFORTABLE_MAX}`);
});

check("prose is narrower than the shell, and both are narrower than the window", () => {
  assert.ok(PROSE_MAX_WIDTH < CONTENT_MAX_WIDTH);
  assert.ok(CONTENT_MAX_WIDTH < DESKTOP_WINDOW_WIDTH);
});

check("the shell does not constrain a phone-sized window", () => {
  // A 390pt phone must not end up with margins down both sides.
  assert.ok(NARROW_BREAKPOINT < CONTENT_MAX_WIDTH);
  assert.ok(CONTENT_MAX_WIDTH > 390);
});

console.log("Type scale");

check("the desktop scale enlarges without breaking the hierarchy", () => {
  assert.ok(TYPE_SCALE >= 1);
  // Order has to survive rounding: two steps that collapse into the same size
  // would flatten headings into body text.
  const sizes = [
    typography.caption.fontSize,
    typography.body.fontSize,
    typography.bodyLarge.fontSize,
    typography.h2.fontSize,
    typography.h1.fontSize,
    typography.display.fontSize
  ];
  for (let i = 1; i < sizes.length; i += 1) {
    assert.ok(sizes[i] > sizes[i - 1], `type step ${i} did not grow: ${sizes.join(", ")}`);
  }
});

check("line heights stay above their font sizes", () => {
  // Rounding each independently could, in principle, invert them.
  for (const [name, style] of Object.entries(typography)) {
    assert.ok(
      style.lineHeight > style.fontSize,
      `${name}: lineHeight ${style.lineHeight} is not above fontSize ${style.fontSize}`
    );
  }
});

check("scaleType is stable and returns whole pixels", () => {
  assert.equal(scaleType(14), scaleType(14));
  assert.equal(scaleType(14) % 1, 0);
});

console.log("Grids");

check("tile grids stop adding columns", () => {
  // `flexBasis: 150` alone produced seven columns in a desktop window.
  const gutter = spacing.sm * (MAX_GRID_COLUMNS - 1);
  const tileWidth = (CONTENT_MAX_WIDTH - spacing.screen * 2 - gutter) / MAX_GRID_COLUMNS;
  assert.ok(MAX_GRID_COLUMNS <= 4);
  assert.ok(tileWidth >= 150, `capped tile is ${Math.round(tileWidth)}px, below the 150px basis`);
});

console.log("Wiring");

const appSource = readFileSync(join(__dirname, "..", "App.tsx"), "utf8");

check("both app shells are centred, not just one", () => {
  // The original bug was exactly this: the mode picker had thought about wide
  // windows and the other 37 screens had not. Constraining the shells means no
  // screen has to opt in — and none can forget.
  assert.match(appSource, /centeredContent/);
  const uses = appSource.match(/\.\.\.centeredContent/g) ?? [];
  assert.ok(uses.length >= 2, `expected the content and the bottom bar to be centred, found ${uses.length}`);
});

check("the type scale is applied at the source, not per screen", () => {
  const typographySource = readFileSync(join(__dirname, "..", "src", "theme", "typography.ts"), "utf8");
  assert.match(typographySource, /scaleType\(/);
  // A raw numeric fontSize would be a size that silently skips the scale.
  assert.doesNotMatch(typographySource, /fontSize: \d+/);
  assert.doesNotMatch(typographySource, /lineHeight: \d+/);
});


/* ------------------------------------------------------------------ *
 * Stylesheet caching
 * ------------------------------------------------------------------ */

console.log("Stylesheet caching");


const themeA = { ink: "#000000" };
const themeB = { ink: "#FFFFFF" };

check("a stylesheet is built once per theme, not once per render", () => {
  // 84 call sites ran StyleSheet.create on every render, several of them from a
  // child that renders once per list row.
  let builds = 0;
  const build = memoizeStyles((colors: typeof themeA) => {
    builds += 1;
    return { text: { color: colors.ink } };
  });

  const first = build(themeA);
  for (let i = 0; i < 50; i += 1) {
    build(themeA);
  }
  assert.equal(builds, 1, `expected one build, got ${builds}`);
  assert.equal(build(themeA), first, "the same theme must return the identical object");
});

check("switching theme rebuilds rather than returning the old sheet", () => {
  const build = memoizeStyles((colors: typeof themeA) => ({ text: { color: colors.ink } }));
  assert.notEqual(build(themeA), build(themeB));
  assert.equal(build(themeB).text.color, themeB.ink);
});

check("two components sharing a theme do not share a stylesheet", () => {
  // The cache is keyed on the builder as well as the theme; without that every
  // component in the app would receive whichever sheet was built first.
  const one = memoizeStyles((colors: typeof themeA) => ({ tag: "one", color: colors.ink }));
  const two = memoizeStyles((colors: typeof themeA) => ({ tag: "two", color: colors.ink }));
  assert.equal(one(themeA).tag, "one");
  assert.equal(two(themeA).tag, "two");
});

console.log(`\n${checks} checks passed.`);
