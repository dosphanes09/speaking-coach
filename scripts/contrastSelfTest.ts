/**
 * Contrast checks for every theme.
 *
 * This exists because the palette was wrong and nobody could see it. A colour
 * that is slightly too light does not look broken — it looks like a design
 * choice — and the only way to catch it is to compute the number. Measured
 * before the fix, the light theme had seven failing pairs; the worst was
 * warning text on its own tint at 2.71 against a 4.5 requirement, which is to
 * say the yellow warning box was the least readable element in the app.
 *
 * Every pair below is a combination the app actually renders. Adding a colour
 * without adding its pairing here is how the palette drifts back.
 *
 * Run: npm run test:contrast
 */
import assert from "node:assert/strict";

import { lightColors, darkColors, loveColors, AppColors } from "../src/theme/colors";

/**
 * WCAG 2.1 relative luminance. The odd-looking constants are the sRGB transfer
 * function and the coefficients for how much each channel contributes to
 * perceived brightness — green dominates, blue barely registers.
 */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 4.5 for body text, 3.0 for large text and for anything that outlines a control. */
type Pair = [label: string, foreground: keyof AppColors, background: keyof AppColors, required: number];

const PAIRS: Pair[] = [
  ["body text", "ink", "background", 4.5],
  ["text in a card", "ink", "surface", 4.5],
  ["text in a muted box", "ink", "surfaceMuted", 4.5],
  ["secondary text", "muted", "background", 4.5],
  ["card subtitle", "muted", "surface", 4.5],
  ["metric tile caption", "muted", "surfaceMuted", 4.5],
  ["selected chip label", "primaryDark", "primaryTint", 4.5],
  ["hint card label", "accent", "accentTint", 4.5],
  ["good badge text", "success", "successTint", 4.5],
  ["warning text", "warning", "warningTint", 4.5],
  ["error text", "danger", "dangerTint", 4.5],
  // Text sitting on a solid accent fill: buttons, verdict badges, score pills.
  ["label on a primary fill", "onAccent", "primary", 4.5],
  ["label on a success fill", "onAccent", "success", 4.5],
  ["label on a warning fill", "onAccent", "warning", 4.5],
  ["label on a danger fill", "onAccent", "danger", 4.5],
  ["label on an accent fill", "onAccent", "accent", 4.5],
  // 3.0 is what WCAG asks of a boundary that identifies a control.
  ["control outline", "lineStrong", "surface", 3.0]
];

/**
 * `line` is deliberately NOT held to 3.0. It draws decorative card edges, and a
 * 3:1 outline around every card boxes the whole interface in. It still has to be
 * visible — before this it sat at 1.31, which is to say invisible.
 */
const DECORATIVE_BORDER_MIN = 1.8;

const THEMES: Array<[string, AppColors]> = [
  ["light", lightColors],
  ["dark", darkColors],
  ["love", loveColors]
];

let checks = 0;
function check(name: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

for (const [themeName, theme] of THEMES) {
  console.log(`Theme: ${themeName}`);

  check(`${themeName}: every text pairing meets WCAG`, () => {
    const failures: string[] = [];
    for (const [label, fg, bg, required] of PAIRS) {
      const ratio = contrast(theme[fg] as string, theme[bg] as string);
      if (ratio < required) {
        failures.push(`${label} (${fg} on ${bg}): ${ratio.toFixed(2)}, needs ${required}`);
      }
    }
    assert.deepEqual(failures, [], `\n    ${failures.join("\n    ")}`);
  });

  check(`${themeName}: card borders are visible`, () => {
    const ratio = contrast(theme.line, theme.surface);
    assert.ok(
      ratio >= DECORATIVE_BORDER_MIN,
      `card border is ${ratio.toFixed(2)}, below ${DECORATIVE_BORDER_MIN} — the edge disappears`
    );
  });

  check(`${themeName}: the strong outline is stronger than the soft one`, () => {
    assert.ok(contrast(theme.lineStrong, theme.surface) > contrast(theme.line, theme.surface));
  });

  check(`${themeName}: every token is a full six-digit hex`, () => {
    // Shorthand or a named colour would break the luminance maths above
    // silently, producing a passing score for a colour nobody computed.
    for (const [token, value] of Object.entries(theme)) {
      assert.match(value as string, /^#[0-9A-Fa-f]{6}$/, `${token} is "${value}"`);
    }
  });
}

console.log("Consistency");

check("all themes define exactly the same tokens", () => {
  // A token missing from one theme is a crash in that theme only, and the light
  // theme is the one anybody testing tends to be looking at.
  const reference = Object.keys(lightColors).sort();
  for (const [name, theme] of THEMES) {
    assert.deepEqual(Object.keys(theme).sort(), reference, `${name} has different tokens`);
  }
});

check("onAccent is a real contrast decision, not white everywhere", () => {
  // The dark themes use light accent colours, so white on them measured
  // 1.67-2.43 — the verdict badges were unreadable in two themes out of three.
  assert.notEqual(darkColors.onAccent, "#FFFFFF");
  assert.notEqual(loveColors.onAccent, "#FFFFFF");
});

console.log(`\n${checks} checks passed.`);
