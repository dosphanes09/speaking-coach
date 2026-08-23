import {
  DailyLessonCore,
  DailyLessonPractice,
  LearnerProfile
} from "@/types/models";
import { validateBackendBaseUrl } from "@/config/backendConfig";
import { getDeviceAccessToken } from "@/services/auth/deviceAuthService";

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

interface LessonCoreResponse {
  stage: "core";
  lesson: DailyLessonCore;
  warnings?: string[];
}

interface LessonPracticeResponse {
  stage: "practice";
  practice: DailyLessonPractice;
  warnings?: string[];
}

interface LearnerProfileResponse {
  profile: Omit<LearnerProfile, "updatedAt">;
}

interface RequestParams {
  backendBaseUrl: string;
  clientId: string;
  profile: LearnerProfile;
}

// The profile is sent without its local bookkeeping field; the backend has no use for it.
function toBackendProfile(profile: LearnerProfile) {
  return {
    level: profile.level,
    nativeLanguage: profile.nativeLanguage,
    interests: profile.interests,
    goal: profile.goal,
    weakPoints: profile.weakPoints,
    context: profile.context
  };
}

async function postJson<T>(url: string, clientId: string, body: unknown, failureMessage: string): Promise<T> {
  const accessToken = await getDeviceAccessToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("Could not reach the backend. Run Test Connection in Settings and confirm the /health URL works.");
  }

  const text = await response.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Backend returned a non-JSON response. Check that the URL points to the speech backend.");
  }

  if (!response.ok) {
    const error = (json as ErrorResponse).error;
    if (response.status === 401) {
      throw new Error(
        error?.message || "This backend requires device activation. Activate it with an invite code in Settings."
      );
    }
    if (response.status === 429) {
      throw new Error(error?.message || "Daily lesson limit reached. Please try again tomorrow.");
    }
    if (error?.code === "openai_not_configured") {
      throw new Error(
        error.message ||
          "Backend reached, but lesson generation is not configured. Add the backend API key to backend/.env and restart the backend."
      );
    }
    throw new Error(error?.message || failureMessage);
  }

  return json as T;
}

/**
 * Stage 1: topic, reading text, vocabulary, pronunciation, collocations. This is what the
 * learner sees first — generation of the whole lesson in one call takes long enough that it
 * would mean a minute of blank screen.
 */
export async function fetchDailyLessonCore({
  backendBaseUrl,
  clientId,
  profile,
  recentTopics,
  todayContext
}: RequestParams & { recentTopics: string[]; todayContext: string }): Promise<{
  core: DailyLessonCore;
  warnings: string[];
}> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const json = await postJson<LessonCoreResponse>(
    `${baseUrl}/api/daily-lesson`,
    clientId,
    {
      stage: "core",
      profile: toBackendProfile(profile),
      recentTopics,
      todayContext: todayContext.trim()
    },
    "Today's lesson could not be created."
  );

  if (!json.lesson?.reading?.text) {
    throw new Error("Backend returned an empty lesson.");
  }

  return { core: json.lesson, warnings: json.warnings ?? [] };
}

/**
 * Stage 2: grammar, exercises, speaking tasks and answer key, generated with the finished
 * reading text as input so the answer key actually matches the exercises.
 */
export async function fetchDailyLessonPractice({
  backendBaseUrl,
  clientId,
  profile,
  core
}: RequestParams & { core: DailyLessonCore }): Promise<{
  practice: DailyLessonPractice;
  warnings: string[];
}> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const json = await postJson<LessonPracticeResponse>(
    `${baseUrl}/api/daily-lesson`,
    clientId,
    {
      stage: "practice",
      profile: toBackendProfile(profile),
      core: {
        topicSlug: core.topicSlug,
        title: core.title,
        subtitle: core.subtitle,
        level: core.level,
        reading: { text: core.reading.text },
        vocabulary: core.vocabulary.map((item) => ({
          word: item.word,
          pos: item.pos,
          definition: item.definition
        })),
        collocations: core.collocations.map((item) => ({
          phrase: item.phrase,
          register: item.register
        }))
      }
    },
    "The practice part of the lesson could not be created."
  );

  if (!json.practice?.speakingTasks) {
    throw new Error("Backend returned an empty practice part.");
  }

  return { practice: json.practice, warnings: json.warnings ?? [] };
}

export async function updateLearnerProfileWithBackend({
  backendBaseUrl,
  clientId,
  profile,
  sessionSummary,
  topicSlug
}: RequestParams & { sessionSummary: string; topicSlug: string }): Promise<Omit<LearnerProfile, "updatedAt">> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const json = await postJson<LearnerProfileResponse>(
    `${baseUrl}/api/learner-profile`,
    clientId,
    {
      profile: toBackendProfile(profile),
      sessionSummary,
      topicSlug
    },
    "Your learner profile could not be updated."
  );

  if (!json.profile) {
    throw new Error("Backend returned an empty profile.");
  }

  return json.profile;
}
