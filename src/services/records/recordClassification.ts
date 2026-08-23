import { GrammarLevel, PracticeType, SpeakingRecord, Topic } from "@/types/models";

const GRAMMAR_TOPIC_ID_PATTERN = /^grammar-(a1|a2|b1|b2|c1|c2)-(.+)$/i;
const PICTURE_TOPIC_ID_PATTERN = /^picture-(.+)$/i;
/**
 * Daily lesson speaking tasks carry a grammarFocus so the analysis knows what to grade, but
 * they are not Grammar Roadmap practice: counting them there would inflate roadmap progress
 * with work the learner never did on the roadmap. They belong with general speaking practice.
 */
const LESSON_TOPIC_ID_PATTERN = /^lesson-(.+)$/i;

export function getPracticeTypeFromTopic(topic: Topic): PracticeType {
  if (topic.picturePromptContext || PICTURE_TOPIC_ID_PATTERN.test(topic.id)) {
    return "picture_description";
  }

  if (LESSON_TOPIC_ID_PATTERN.test(topic.id)) {
    return "general";
  }

  return topic.grammarFocus || GRAMMAR_TOPIC_ID_PATTERN.test(topic.id) ? "grammar" : "general";
}

export function getPracticeType(record: SpeakingRecord): PracticeType {
  return record.practiceType ?? getPracticeTypeFromTopic(record.topic);
}

export function isGrammarPracticeRecord(record: SpeakingRecord): boolean {
  return getPracticeType(record) === "grammar";
}

export function isPictureDescriptionRecord(record: SpeakingRecord): boolean {
  return getPracticeType(record) === "picture_description";
}

export function buildGrammarGroupFromTopic(topic: Topic): SpeakingRecord["grammarGroup"] | undefined {
  if (LESSON_TOPIC_ID_PATTERN.test(topic.id)) {
    return undefined;
  }

  if (!topic.grammarFocus && !GRAMMAR_TOPIC_ID_PATTERN.test(topic.id)) {
    return undefined;
  }

  const match = GRAMMAR_TOPIC_ID_PATTERN.exec(topic.id);
  const level = topic.grammarFocus?.cefrLevel ?? ((match?.[1]?.toUpperCase() as GrammarLevel | undefined) || topic.level);

  return {
    level,
    grammarTopic: topic.grammarFocus?.grammarTopic ?? "Grammar speaking challenge",
    challengeId: match?.[2]
  };
}

export function getGrammarRecordLevel(record: SpeakingRecord): GrammarLevel {
  return record.grammarGroup?.level ?? record.topic.grammarFocus?.cefrLevel ?? record.topic.level;
}
