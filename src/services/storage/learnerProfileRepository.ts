import AsyncStorage from "@react-native-async-storage/async-storage";
import { LearnerProfile, TopicLevel } from "@/types/models";

const LEARNER_PROFILE_KEY = "daily-speaking-coach:learner-profile:v1";

const MAX_INTERESTS = 12;
const MAX_WEAK_POINTS = 8;
const MAX_CONTEXT = 12;

/**
 * The app is built for Turkish speakers (the whole analysis prompt is written around Turkish
 * transfer errors), so this is the default rather than an empty field the learner has to fill
 * in before the pronunciation section can say anything useful.
 */
const DEFAULT_NATIVE_LANGUAGE = "Turkish";

export function defaultLearnerProfile(level: TopicLevel): LearnerProfile {
  return {
    level,
    nativeLanguage: DEFAULT_NATIVE_LANGUAGE,
    interests: [],
    goal: "",
    weakPoints: [],
    context: [],
    updatedAt: new Date().toISOString()
  };
}

function toStringList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * `level` always comes from the app's own settings rather than from the stored profile or the
 * model: the learner picks their level in Settings, and having two places that can each move
 * it produces lessons that drift away from what the learner chose.
 */
export function normalizeLearnerProfile(value: unknown, level: TopicLevel): LearnerProfile {
  const profile = (value ?? {}) as Partial<LearnerProfile>;

  return {
    level,
    nativeLanguage:
      typeof profile.nativeLanguage === "string" && profile.nativeLanguage.trim()
        ? profile.nativeLanguage.trim()
        : DEFAULT_NATIVE_LANGUAGE,
    interests: toStringList(profile.interests, MAX_INTERESTS),
    goal: typeof profile.goal === "string" ? profile.goal.trim() : "",
    weakPoints: toStringList(profile.weakPoints, MAX_WEAK_POINTS),
    context: toStringList(profile.context, MAX_CONTEXT),
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : new Date().toISOString()
  };
}

export async function loadLearnerProfile(level: TopicLevel): Promise<LearnerProfile> {
  const raw = await AsyncStorage.getItem(LEARNER_PROFILE_KEY);
  if (!raw) {
    return defaultLearnerProfile(level);
  }

  try {
    return normalizeLearnerProfile(JSON.parse(raw), level);
  } catch {
    return defaultLearnerProfile(level);
  }
}

export async function saveLearnerProfile(profile: LearnerProfile, level: TopicLevel): Promise<LearnerProfile> {
  const normalized = { ...normalizeLearnerProfile(profile, level), updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(LEARNER_PROFILE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function clearLearnerProfile(): Promise<void> {
  await AsyncStorage.removeItem(LEARNER_PROFILE_KEY);
}
