import {
  DailyLesson,
  LessonLevel,
  LessonMatchingPair,
  LessonSpeakingTask,
  Topic,
  TopicLevel
} from "@/types/models";

/**
 * Pure logic behind the daily lesson feature.
 *
 * Everything here is deliberately free of React Native, storage and network imports so it can
 * be exercised by scripts/dailyLessonSelfTest.ts with plain tsx, the same way the other
 * services in this project are tested.
 */

export const MAX_RECENT_LESSON_TOPICS = 10;

/**
 * These caps mirror what the /api/analyze-speech endpoint accepts for each field. A lesson
 * instruction can easily run past them, and the backend rejects the whole recording when it
 * does, so the values are trimmed here rather than discovered as a failed analysis after the
 * learner has already spoken.
 */
const TOPIC_TITLE_MAX_LENGTH = 200;
const GRAMMAR_TOPIC_MAX_LENGTH = 120;
const SPEAKING_PROMPT_MAX_LENGTH = 300;
const EXPECTED_STRUCTURES_MAX_LENGTH = 800;

export interface MarkedTextSegment {
  text: string;
  /** True for the target words the reading marks with **double asterisks**. */
  marked: boolean;
}

/**
 * Lesson calibration is only defined for A2-C1, so a learner sitting at A1 or C2 is folded into
 * the nearest defined band rather than silently getting an uncalibrated text. The backend does
 * the same fold; doing it here too means the level shown on the picker is the level generated.
 */
export function toLessonLevel(level: TopicLevel): LessonLevel {
  if (level === "A1") {
    return "A2";
  }
  if (level === "C2") {
    return "C1";
  }
  return level;
}

export function stripLessonMarkers(text: string): string {
  return text.replace(/\*\*/g, "");
}

/**
 * Splits a reading text into plain and target-word segments so the screen can highlight the
 * target vocabulary inline instead of showing raw ** markers to the learner.
 */
export function parseMarkedText(text: string): MarkedTextSegment[] {
  const segments: MarkedTextSegment[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), marked: false });
    }
    segments.push({ text: match[1] ?? "", marked: true });
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), marked: false });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

export function splitLessonParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Newest-first history of lesson topics, fed back to the generator so it cannot quietly serve
 * the same subject twice. Without this, topic variety collapses within a few weeks.
 */
export function appendTopicSlug(history: string[], slug: string, limit = MAX_RECENT_LESSON_TOPICS): string[] {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return history.slice(0, limit);
  }

  const withoutDuplicate = history.filter((item) => item.trim().toLowerCase() !== normalized);
  return [normalized, ...withoutDuplicate].slice(0, limit);
}

export function isLessonForDate(lesson: DailyLesson | null, dateKey: string): boolean {
  return Boolean(lesson && lesson.dateKey === dateKey);
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function toTopicLevel(value: string, fallback: TopicLevel): TopicLevel {
  const normalized = value.trim().toUpperCase();
  const levels: TopicLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return levels.includes(normalized as TopicLevel) ? (normalized as TopicLevel) : fallback;
}

function buildSpeakingPrompt(task: LessonSpeakingTask): string {
  const roleplay = task.roleplay;
  if (roleplay.scenario) {
    const goals = roleplay.goals.length > 0 ? ` You must: ${roleplay.goals.join("; ")}.` : "";
    return truncate(
      `${roleplay.scenario} You are ${roleplay.learnerRole || "the learner"}.${goals}`,
      SPEAKING_PROMPT_MAX_LENGTH
    );
  }

  return truncate(task.instruction, SPEAKING_PROMPT_MAX_LENGTH);
}

/**
 * Turns a lesson speaking task into the Topic the existing thinking -> recording -> analysis
 * flow already understands, so a lesson task is recorded, scored, stored and charted exactly
 * like every other practice in the app instead of being a dead end inside the lesson screen.
 */
export function buildLessonSpeakingTopic(lesson: DailyLesson, task: LessonSpeakingTask): Topic {
  const level = toTopicLevel(lesson.core.level, lesson.level);
  const slug = lesson.core.topicSlug || lesson.id;
  // The analysis prompt calls this "expected structures": for a lesson task it is the target
  // language the learner is supposed to demonstrate, which is exactly what should be graded.
  const expectedStructures = [...task.assess.vocabulary, ...task.targetPhrases]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);

  return {
    id: `lesson-${slug}-task-${task.number}`,
    title: truncate(task.instruction, TOPIC_TITLE_MAX_LENGTH),
    level,
    category: task.number === 1 ? "personal" : task.number === 2 ? "opinion" : "story",
    grammarFocus: {
      cefrLevel: level,
      grammarTopic: truncate(task.assess.grammar || lesson.core.title, GRAMMAR_TOPIC_MAX_LENGTH),
      expectedStructures: capStructureList(expectedStructures),
      speakingPrompt: buildSpeakingPrompt(task)
    }
  };
}

function capStructureList(structures: string[]): string[] {
  const capped: string[] = [];
  let length = 0;

  for (const structure of structures) {
    // "; " is how analyzeSpeechService joins these before sending them.
    const nextLength = length + structure.length + 2;
    if (nextLength > EXPECTED_STRUCTURES_MAX_LENGTH) {
      break;
    }
    capped.push(structure);
    length = nextLength;
  }

  return capped;
}

export interface MatchingPrompt {
  number: number;
  left: string;
  /** The letter of the option that actually matches this half. */
  answerLetter: string;
}

export interface MatchingOption {
  letter: string;
  right: string;
}

export interface MatchingDisplay {
  prompts: MatchingPrompt[];
  options: MatchingOption[];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/**
 * The generator returns matching pairs already paired up, because asking a model to keep a
 * separate answer list in sync with a shuffled exercise is exactly where answer keys go wrong.
 * The shuffle happens here instead — deterministically, so the exercise does not rearrange
 * itself every time the screen re-renders, and the answer letters always stay correct.
 */
export function buildMatchingDisplay(pairs: LessonMatchingPair[]): MatchingDisplay {
  const count = pairs.length;
  if (count === 0) {
    return { prompts: [], options: [] };
  }

  let step = 3;
  while (step < count && greatestCommonDivisor(step, count) !== 1) {
    step += 1;
  }
  if (greatestCommonDivisor(step, count) !== 1) {
    step = 1;
  }

  // optionIndex -> the pair whose "right" half it shows.
  const orderedPairIndexes = Array.from({ length: count }, (_, index) => (index * step + 1) % count);

  const options: MatchingOption[] = orderedPairIndexes.map((pairIndex, optionIndex) => ({
    letter: LETTERS[optionIndex % LETTERS.length] ?? String(optionIndex + 1),
    right: pairs[pairIndex]?.right ?? ""
  }));

  const prompts: MatchingPrompt[] = pairs.map((pair, pairIndex) => {
    const optionIndex = orderedPairIndexes.indexOf(pairIndex);
    return {
      number: pairIndex + 1,
      left: pair.left,
      answerLetter: options[optionIndex]?.letter ?? "?"
    };
  });

  return { prompts, options };
}

/**
 * What the profile updater gets to read. Kept short and factual on purpose: the update rules
 * are conservative, so feeding it noise is worse than feeding it little.
 */
export function buildProfileSessionSummary(lesson: DailyLesson, profileAnswer: string): string {
  const lines = [
    `Today's lesson: ${lesson.core.title} (${lesson.core.subtitle}).`,
    lesson.todayContext ? `What the learner said they did today: ${lesson.todayContext}` : "",
    lesson.practice?.profileQuestion ? `Question asked: ${lesson.practice.profileQuestion}` : "",
    `Learner's answer: ${profileAnswer.trim()}`
  ];

  return lines.filter(Boolean).join("\n");
}
