import AsyncStorage from "@react-native-async-storage/async-storage";
import { DailyLesson } from "@/types/models";
import { MAX_RECENT_LESSON_TOPICS, appendTopicSlug } from "@/services/lesson/dailyLessonLogic";

const DAILY_LESSON_KEY = "daily-speaking-coach:daily-lesson:v1";

export interface DailyLessonState {
  /** The most recently generated lesson, whatever day it belongs to. */
  lesson: DailyLesson | null;
  /** Newest-first topic slugs, sent to the generator so it stops repeating itself. */
  recentTopics: string[];
}

const emptyState: DailyLessonState = {
  lesson: null,
  recentTopics: []
};

function normalizeState(value: unknown): DailyLessonState {
  const state = value as Partial<DailyLessonState> | null;
  if (!state || typeof state !== "object") {
    return emptyState;
  }

  return {
    lesson: state.lesson ?? null,
    recentTopics: Array.isArray(state.recentTopics)
      ? state.recentTopics.filter((topic): topic is string => typeof topic === "string").slice(0, MAX_RECENT_LESSON_TOPICS)
      : []
  };
}

export async function loadDailyLessonState(): Promise<DailyLessonState> {
  const raw = await AsyncStorage.getItem(DAILY_LESSON_KEY);
  if (!raw) {
    return emptyState;
  }

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState;
  }
}

/**
 * Stores the lesson and records its topic. The practice part arrives in a second call, so the
 * same lesson is saved more than once; appendTopicSlug de-duplicates, which keeps the topic
 * history honest instead of filling it with one repeated slug.
 */
export async function saveDailyLesson(lesson: DailyLesson): Promise<DailyLessonState> {
  const current = await loadDailyLessonState();
  const nextState: DailyLessonState = {
    lesson,
    recentTopics: appendTopicSlug(current.recentTopics, lesson.core.topicSlug)
  };

  await AsyncStorage.setItem(DAILY_LESSON_KEY, JSON.stringify(nextState));
  return nextState;
}

export async function clearDailyLesson(): Promise<void> {
  await AsyncStorage.removeItem(DAILY_LESSON_KEY);
}
