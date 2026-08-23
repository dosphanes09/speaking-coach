import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Speech from "expo-speech";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  AppSettings,
  DailyLesson,
  LESSON_LEVELS,
  LearnerProfile,
  LessonAngle,
  LessonLevel,
  LessonSpeakingTask,
  Topic
} from "@/types/models";
import {
  buildLessonSpeakingTopic,
  buildMatchingDisplay,
  buildProfileSessionSummary,
  isLessonForDate,
  parseMarkedText,
  splitLessonParagraphs,
  toLessonLevel
} from "@/services/lesson/dailyLessonLogic";
import {
  fetchDailyLessonAngles,
  fetchDailyLessonCore,
  fetchDailyLessonPractice,
  updateLearnerProfileWithBackend
} from "@/services/backend/dailyLessonService";
import { loadDailyLessonState, saveDailyLesson } from "@/services/storage/dailyLessonRepository";
import { loadLearnerProfile, saveLearnerProfile } from "@/services/storage/learnerProfileRepository";
import { getClientId } from "@/services/storage/clientIdentity";
import { createAndShareDailyLessonPdf } from "@/services/pdf/dailyLessonPdf";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { createId } from "@/utils/id";
import { toDateKey } from "@/utils/date";

/** Plain-language guide to what each level's text feels like, shown under the picker. */
const LEVEL_HINTS: Record<LessonLevel, string> = {
  A2: "Short, concrete text. Simple tenses, everyday words.",
  B1: "Medium text. Some abstraction, always tied to examples.",
  B2: "Longer text with a real argument. Idiomatic in places.",
  C1: "Long, demanding text. Nuance, irony, low-frequency words."
};

interface DailyLessonScreenProps {
  settings: AppSettings;
  onBack: () => void;
  onStartSpeakingTask: (topic: Topic) => void;
}

export function DailyLessonScreen({
  settings,
  onBack,
  onStartSpeakingTask
}: DailyLessonScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [todayContext, setTodayContext] = useState("");
  // The learner picks the level per lesson here rather than inheriting Settings silently —
  // some days you want an easy read, some days you want to be stretched.
  const [lessonLevel, setLessonLevel] = useState<LessonLevel>(() => toLessonLevel(settings.targetLevel));
  const [angles, setAngles] = useState<LessonAngle[]>([]);
  const [isLoadingAngles, setIsLoadingAngles] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCore, setIsGeneratingCore] = useState(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
  const [error, setError] = useState("");
  const [practiceError, setPracticeError] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [profileAnswer, setProfileAnswer] = useState("");
  const [isSavingProfileAnswer, setIsSavingProfileAnswer] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  // Lets the learner reopen the last lesson on a new day without spending a generation on it.
  const [isViewingPreviousLesson, setIsViewingPreviousLesson] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  // Guards every setState that can land after the learner has left the screen mid-generation.
  const isMountedRef = useRef(true);

  const todayKey = toDateKey();
  const isTodaysLesson = isLessonForDate(lesson, todayKey);
  const visibleLesson = lesson && (isTodaysLesson || isViewingPreviousLesson) ? lesson : null;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    async function loadState(): Promise<void> {
      try {
        const [lessonState, storedProfile] = await Promise.all([
          loadDailyLessonState(),
          loadLearnerProfile(settings.targetLevel)
        ]);

        if (!isMountedRef.current) {
          return;
        }

        setLesson(lessonState.lesson);
        setRecentTopics(lessonState.recentTopics);
        setProfile(storedProfile);
        setProfileAnswer(lessonState.lesson?.profileAnswer ?? "");
      } catch (caughtError) {
        if (isMountedRef.current) {
          setError(caughtError instanceof Error ? caughtError.message : "The lesson could not be loaded.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadState();
  }, [settings.targetLevel]);

  const generatePractice = useCallback(
    async (baseLesson: DailyLesson, currentProfile: LearnerProfile): Promise<void> => {
      setIsGeneratingPractice(true);
      setPracticeError("");

      try {
        const clientId = await getClientId();
        const { practice, warnings } = await fetchDailyLessonPractice({
          backendBaseUrl: settings.backendBaseUrl,
          clientId,
          profile: currentProfile,
          core: baseLesson.core
        });

        const nextLesson: DailyLesson = {
          ...baseLesson,
          practice,
          warnings: [...baseLesson.warnings, ...warnings]
        };

        await saveDailyLesson(nextLesson);
        if (isMountedRef.current) {
          setLesson(nextLesson);
        }
      } catch (caughtError) {
        if (isMountedRef.current) {
          // The reading part is already saved and useful on its own, so this failure is
          // reported next to a retry button instead of throwing the lesson away.
          setPracticeError(
            caughtError instanceof Error ? caughtError.message : "The practice part could not be created."
          );
        }
      } finally {
        if (isMountedRef.current) {
          setIsGeneratingPractice(false);
        }
      }
    },
    [settings.backendBaseUrl]
  );

  /**
   * Asks what specifically the learner wants to read about before writing anything. A bare
   * "Batman" would otherwise produce a general encyclopedia-style text; four narrow choices
   * turn it into a lesson about one thing.
   */
  const loadAngles = useCallback(async (): Promise<void> => {
    const trimmedContext = todayContext.trim();
    if (!trimmedContext) {
      return;
    }

    const currentProfile = profile ?? (await loadLearnerProfile(settings.targetLevel));
    setIsLoadingAngles(true);
    setError("");

    try {
      const clientId = await getClientId();
      const suggested = await fetchDailyLessonAngles({
        backendBaseUrl: settings.backendBaseUrl,
        clientId,
        profile: { ...currentProfile, level: lessonLevel },
        todayContext: trimmedContext,
        recentTopics
      });

      if (isMountedRef.current) {
        setAngles(suggested);
      }
    } catch (caughtError) {
      if (isMountedRef.current) {
        setError(
          caughtError instanceof Error ? caughtError.message : "Lesson directions could not be suggested."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingAngles(false);
      }
    }
  }, [lessonLevel, profile, recentTopics, settings.backendBaseUrl, settings.targetLevel, todayContext]);

  const generateLesson = useCallback(async (chosenAngle?: LessonAngle): Promise<void> => {
    const currentProfile = profile ?? (await loadLearnerProfile(settings.targetLevel));
    const lessonProfile: LearnerProfile = { ...currentProfile, level: lessonLevel };
    setIsGeneratingCore(true);
    setError("");
    setPracticeError("");
    setShowAnswers(false);
    setProfileStatus("");
    setIsViewingPreviousLesson(false);
    setAngles([]);

    try {
      const clientId = await getClientId();
      const { core, warnings } = await fetchDailyLessonCore({
        backendBaseUrl: settings.backendBaseUrl,
        clientId,
        profile: lessonProfile,
        recentTopics,
        todayContext,
        chosenAngle
      });

      const nextLesson: DailyLesson = {
        id: createId("lesson"),
        dateKey: todayKey,
        createdAt: new Date().toISOString(),
        level: lessonLevel,
        todayContext: todayContext.trim(),
        angle: chosenAngle,
        core,
        warnings
      };

      const state = await saveDailyLesson(nextLesson);
      if (!isMountedRef.current) {
        return;
      }

      setLesson(nextLesson);
      setRecentTopics(state.recentTopics);
      setProfileAnswer("");
      setIsGeneratingCore(false);

      await generatePractice(nextLesson, lessonProfile);
    } catch (caughtError) {
      if (isMountedRef.current) {
        setError(caughtError instanceof Error ? caughtError.message : "Today's lesson could not be created.");
        setIsGeneratingCore(false);
      }
    }
  }, [
    generatePractice,
    lessonLevel,
    profile,
    recentTopics,
    settings.backendBaseUrl,
    settings.targetLevel,
    todayContext,
    todayKey
  ]);

  async function saveProfileAnswer(): Promise<void> {
    const answer = profileAnswer.trim();
    if (!lesson || !profile || !answer) {
      return;
    }

    setIsSavingProfileAnswer(true);
    setProfileStatus("");

    try {
      const clientId = await getClientId();
      const updated = await updateLearnerProfileWithBackend({
        backendBaseUrl: settings.backendBaseUrl,
        clientId,
        profile,
        sessionSummary: buildProfileSessionSummary(lesson, answer),
        topicSlug: lesson.core.topicSlug
      });

      const savedProfile = await saveLearnerProfile({ ...updated, updatedAt: new Date().toISOString() }, settings.targetLevel);
      const nextLesson: DailyLesson = { ...lesson, profileAnswer: answer };
      await saveDailyLesson(nextLesson);

      if (isMountedRef.current) {
        setProfile(savedProfile);
        setLesson(nextLesson);
        setProfileStatus("Saved. Tomorrow's lesson will use this.");
      }
    } catch (caughtError) {
      if (isMountedRef.current) {
        setProfileStatus(
          caughtError instanceof Error ? caughtError.message : "Your answer could not be saved right now."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsSavingProfileAnswer(false);
      }
    }
  }

  async function exportPdf(): Promise<void> {
    if (!visibleLesson) {
      return;
    }

    setIsExportingPdf(true);
    setPdfStatus("");

    try {
      await createAndShareDailyLessonPdf(visibleLesson);
      if (isMountedRef.current) {
        setPdfStatus("Saved to your device.");
      }
    } catch (caughtError) {
      if (isMountedRef.current) {
        setPdfStatus(caughtError instanceof Error ? caughtError.message : "The PDF could not be created.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsExportingPdf(false);
      }
    }
  }

  function speak(text: string): void {
    Speech.stop();
    Speech.speak(text, { language: "en-US", rate: 0.9 });
  }

  function startTask(task: LessonSpeakingTask): void {
    if (!lesson) {
      return;
    }

    Speech.stop();
    onStartSpeakingTask(buildLessonSpeakingTopic(lesson, task));
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header
        title="Daily Lesson"
        subtitle={visibleLesson ? visibleLesson.core.subtitle : "One lesson a day, written around what you actually did."}
        onBack={onBack}
        rightLabel={lesson ? "New" : undefined}
        rightIcon="refresh-cw"
        onRightPress={lesson ? () => void generateLesson() : undefined}
      />

      {isLoading ? (
        <Card>
          <Text style={styles.mutedText}>Loading your lesson...</Text>
        </Card>
      ) : null}

      {!isLoading && !visibleLesson && angles.length === 0 ? (
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>
            {lesson ? "Ready for a new lesson?" : "Let's write today's lesson"}
          </Text>

          <Text style={styles.fieldLabel}>Level of today's text</Text>
          <SegmentedControl
            options={[...LESSON_LEVELS]}
            value={lessonLevel}
            onChange={setLessonLevel}
            disabled={isGeneratingCore || isLoadingAngles}
          />
          <Text style={styles.captionText}>{LEVEL_HINTS[lessonLevel]}</Text>

          <Text style={styles.fieldLabel}>What is on your mind today?</Text>
          <Text style={styles.mutedText}>
            One thing you did, watched, played or wondered about. Even a single word works — I pick
            a specific, interesting angle inside it and build the whole lesson on that.
          </Text>
          <TextInput
            value={todayContext}
            onChangeText={setTodayContext}
            multiline
            maxLength={600}
            placeholder="e.g. Batman, or: I watched a documentary about deep sea creatures"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <AppButton
            label={isGeneratingCore ? "Writing your lesson..." : "Generate today's lesson"}
            icon="book-open"
            onPress={() => void generateLesson()}
            loading={isGeneratingCore}
            disabled={isGeneratingCore || isLoadingAngles}
          />
          {todayContext.trim().length > 0 ? (
            <AppButton
              label={isLoadingAngles ? "Thinking of directions..." : "Let me pick the direction"}
              variant="ghost"
              icon="compass"
              onPress={() => void loadAngles()}
              loading={isLoadingAngles}
              disabled={isLoadingAngles || isGeneratingCore}
            />
          ) : null}

          <Text style={styles.captionText}>
            {lessonLevel} · takes about a minute · uses one of your daily lessons
          </Text>
          {lesson && !isTodaysLesson ? (
            <AppButton
              label="Open my previous lesson"
              variant="ghost"
              icon="clock"
              onPress={() => setIsViewingPreviousLesson(true)}
            />
          ) : null}
        </Card>
      ) : null}

      {!isLoading && !visibleLesson && angles.length > 0 ? (
        <Card style={styles.introCard}>
          <Text style={styles.kicker}>{todayContext.trim()}</Text>
          <Text style={styles.introTitle}>Which part interests you?</Text>
          <Text style={styles.mutedText}>
            Pick one and the whole lesson — text, vocabulary, exercises, speaking tasks — is built
            around it.
          </Text>

          {angles.map((angle) => (
            <Pressable
              key={angle.title}
              accessibilityRole="button"
              accessibilityLabel={angle.title}
              onPress={() => void generateLesson(angle)}
              disabled={isGeneratingCore}
              style={({ pressed }) => [styles.angleCard, pressed && styles.anglePressed]}
            >
              <Text style={styles.angleTitle}>{angle.title}</Text>
              {angle.description ? <Text style={styles.angleDescription}>{angle.description}</Text> : null}
            </Pressable>
          ))}

          {isGeneratingCore ? (
            <Text style={styles.captionText}>Writing your lesson...</Text>
          ) : (
            <>
              <AppButton
                label="Other suggestions"
                variant="ghost"
                icon="refresh-cw"
                onPress={() => void loadAngles()}
                loading={isLoadingAngles}
                disabled={isLoadingAngles}
              />
              <AppButton
                label="Back"
                variant="ghost"
                icon="arrow-left"
                onPress={() => setAngles([])}
                disabled={isLoadingAngles}
              />
            </>
          )}
        </Card>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {visibleLesson ? (
        <LessonBody
          lesson={visibleLesson}
          colors={colors}
          styles={styles}
          isGeneratingPractice={isGeneratingPractice}
          isExportingPdf={isExportingPdf}
          pdfStatus={pdfStatus}
          onExportPdf={() => void exportPdf()}
          practiceError={practiceError}
          showAnswers={showAnswers}
          profileAnswer={profileAnswer}
          isSavingProfileAnswer={isSavingProfileAnswer}
          profileStatus={profileStatus}
          onToggleAnswers={() => setShowAnswers((current) => !current)}
          onRetryPractice={() => {
            if (profile) {
              void generatePractice(visibleLesson, profile);
            }
          }}
          onChangeProfileAnswer={setProfileAnswer}
          onSaveProfileAnswer={() => void saveProfileAnswer()}
          onSpeak={speak}
          onStartTask={startTask}
        />
      ) : null}
    </ScrollView>
  );
}

type LessonStyles = ReturnType<typeof createStyles>;

interface LessonBodyProps {
  lesson: DailyLesson;
  colors: AppColors;
  styles: LessonStyles;
  isGeneratingPractice: boolean;
  isExportingPdf: boolean;
  pdfStatus: string;
  practiceError: string;
  showAnswers: boolean;
  profileAnswer: string;
  isSavingProfileAnswer: boolean;
  profileStatus: string;
  onToggleAnswers: () => void;
  onExportPdf: () => void;
  onRetryPractice: () => void;
  onChangeProfileAnswer: (value: string) => void;
  onSaveProfileAnswer: () => void;
  onSpeak: (text: string) => void;
  onStartTask: (task: LessonSpeakingTask) => void;
}

function LessonBody({
  lesson,
  colors,
  styles,
  isGeneratingPractice,
  isExportingPdf,
  pdfStatus,
  practiceError,
  showAnswers,
  profileAnswer,
  isSavingProfileAnswer,
  profileStatus,
  onToggleAnswers,
  onExportPdf,
  onRetryPractice,
  onChangeProfileAnswer,
  onSaveProfileAnswer,
  onSpeak,
  onStartTask
}: LessonBodyProps): React.JSX.Element {
  const { core, practice } = lesson;
  const matching = useMemo(
    () => buildMatchingDisplay(practice?.exercises.matching ?? []),
    [practice?.exercises.matching]
  );

  return (
    <View style={styles.stack}>
      <Card style={styles.titleCard}>
        <Text style={styles.kicker}>
          {core.level} · {core.reading.wordCount} words · about {core.estimatedMinutes} min
        </Text>
        <Text style={styles.lessonTitle}>{core.title}</Text>
        <Text style={styles.mutedText}>{core.subtitle}</Text>
        {lesson.angle ? (
          <Text style={styles.captionText}>Your choice: {lesson.angle.title}</Text>
        ) : null}
        {lesson.todayContext ? (
          <Text style={styles.captionText}>You wrote: {lesson.todayContext}</Text>
        ) : null}
        <AppButton
          label={isExportingPdf ? "Preparing PDF..." : "Save as PDF"}
          variant="ghost"
          icon="download"
          onPress={onExportPdf}
          loading={isExportingPdf}
          disabled={isExportingPdf}
        />
        {pdfStatus ? <Text style={styles.captionText}>{pdfStatus}</Text> : null}
      </Card>

      {lesson.warnings.length > 0 ? (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>Worth knowing about this lesson</Text>
          {lesson.warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>
              · {warning}
            </Text>
          ))}
        </Card>
      ) : null}

      <CollapsibleCard title="Warm-up" subtitle="Think about these before you read" badge="Step 1" defaultOpen>
        {core.warmUp.map((question, index) => (
          <Text key={question} style={styles.bodyText}>
            {index + 1}. {question}
          </Text>
        ))}
      </CollapsibleCard>

      <CollapsibleCard
        title="Reading"
        subtitle="Target words are highlighted"
        badge="Step 2"
        defaultOpen
      >
        {splitLessonParagraphs(core.reading.text).map((paragraph, paragraphIndex) => (
          <Text key={`paragraph-${paragraphIndex}`} style={styles.readingText}>
            {parseMarkedText(paragraph).map((segment, segmentIndex) =>
              segment.marked ? (
                <Text key={`segment-${segmentIndex}`} style={styles.markedWord}>
                  {segment.text}
                </Text>
              ) : (
                <Text key={`segment-${segmentIndex}`}>{segment.text}</Text>
              )
            )}
          </Text>
        ))}
        <AppButton
          label="Read it aloud to me"
          variant="ghost"
          icon="volume-2"
          onPress={() => onSpeak(core.reading.text.replace(/\*\*/g, ""))}
        />
      </CollapsibleCard>

      <CollapsibleCard title="Vocabulary" subtitle={`${core.vocabulary.length} words from the text`} badge="Step 3">
        {core.vocabulary.map((item) => (
          <View key={item.word} style={styles.entry}>
            <Text style={styles.entryTitle}>
              {item.word} <Text style={styles.entryMeta}>{item.pos}</Text>
            </Text>
            <Text style={styles.bodyText}>{item.definition}</Text>
            <Text style={styles.translationText}>{item.translation}</Text>
            <Text style={styles.exampleText}>{item.example}</Text>
          </View>
        ))}
      </CollapsibleCard>

      <CollapsibleCard title="Pronunciation" subtitle="The sounds your first language gets wrong" badge="Step 4">
        {core.pronunciation.words.map((item) => (
          <View key={item.word} style={styles.entry}>
            <Text style={styles.entryTitle}>{item.word}</Text>
            <Text style={styles.bodyText}>
              {item.respelling} · stress: {item.stress}
            </Text>
            <Text style={styles.warningText}>{item.l1Error}</Text>
            <AppButton label="Hear it" variant="ghost" size="compact" icon="volume-2" onPress={() => onSpeak(item.word)} />
          </View>
        ))}
        {core.pronunciation.shadowing.length > 0 ? (
          <View style={styles.entry}>
            <Text style={styles.entryTitle}>Shadowing</Text>
            {core.pronunciation.shadowing.map((sentence) => (
              <View key={sentence} style={styles.shadowRow}>
                <Text style={[styles.bodyText, styles.shadowText]}>{sentence}</Text>
                <AppButton
                  label="Play"
                  variant="ghost"
                  size="compact"
                  icon="play"
                  onPress={() => onSpeak(sentence)}
                />
              </View>
            ))}
          </View>
        ) : null}
      </CollapsibleCard>

      <CollapsibleCard title="Collocations & chunks" subtitle="Store these as single units" badge="Step 5">
        {core.collocations.map((item) => (
          <View key={item.phrase} style={styles.entry}>
            <Text style={styles.entryTitle}>
              {item.phrase} <Text style={styles.entryMeta}>{item.register}</Text>
            </Text>
            <Text style={styles.bodyText}>{item.meaning}</Text>
          </View>
        ))}
      </CollapsibleCard>

      {!practice ? (
        <Card style={styles.pendingCard}>
          <Icon name="loader" size={20} color={colors.primaryDark} />
          <Text style={styles.mutedText}>
            {isGeneratingPractice
              ? "Writing the grammar, exercises and speaking tasks from this text..."
              : practiceError || "The practice part has not been created yet."}
          </Text>
          {!isGeneratingPractice ? (
            <AppButton label="Create the practice part" variant="ghost" onPress={onRetryPractice} />
          ) : null}
        </Card>
      ) : null}

      {practice ? (
        <>
          <CollapsibleCard title="Grammar focus" subtitle={practice.grammar.structure} badge="Step 6">
            <Text style={styles.bodyText}>{practice.grammar.coreIdea}</Text>
            {practice.grammar.form.map((row) => (
              <View key={`${row.type}-${row.pattern}`} style={styles.entry}>
                <Text style={styles.entryTitle}>{row.type}</Text>
                <Text style={styles.patternText}>{row.pattern}</Text>
                <Text style={styles.exampleText}>{row.example}</Text>
              </View>
            ))}
            {practice.grammar.usage.map((usage) => (
              <View key={usage.context} style={styles.entry}>
                <Text style={styles.entryTitle}>{usage.context}</Text>
                <Text style={styles.bodyText}>{usage.explanation}</Text>
                <Text style={styles.exampleText}>{usage.example}</Text>
              </View>
            ))}
            {practice.grammar.commonErrors.map((item) => (
              <View key={item.wrong} style={styles.entry}>
                <Text style={styles.wrongText}>✗ {item.wrong}</Text>
                <Text style={styles.rightText}>✓ {item.right}</Text>
                <Text style={styles.bodyText}>{item.why}</Text>
              </View>
            ))}
          </CollapsibleCard>

          <CollapsibleCard title="Exercises" subtitle="Answers are at the bottom" badge="Step 7">
            <Text style={styles.exerciseHeading}>A. Comprehension</Text>
            {practice.exercises.comprehension.map((item, index) => (
              <View key={`comprehension-${index}`} style={styles.entry}>
                <Text style={styles.bodyText}>
                  {index + 1}. {item.question}
                </Text>
                {item.options.map((option, optionIndex) => (
                  <Text key={`option-${index}-${optionIndex}`} style={styles.optionText}>
                    {String.fromCharCode(97 + optionIndex)}) {option}
                  </Text>
                ))}
              </View>
            ))}

            {matching.prompts.length > 0 ? (
              <>
                <Text style={styles.exerciseHeading}>B. Match the halves</Text>
                {matching.prompts.map((prompt) => (
                  <Text key={`matching-left-${prompt.number}`} style={styles.bodyText}>
                    {prompt.number}. {prompt.left}
                  </Text>
                ))}
                <View style={styles.divider} />
                {matching.options.map((option) => (
                  <Text key={`matching-right-${option.letter}`} style={styles.optionText}>
                    {option.letter}) {option.right}
                  </Text>
                ))}
              </>
            ) : null}

            <Text style={styles.exerciseHeading}>C. Vocabulary in context</Text>
            {practice.exercises.gapFillVocab.wordBank.length > 0 ? (
              <Text style={styles.wordBankText}>
                Word bank: {practice.exercises.gapFillVocab.wordBank.join(" · ")}
              </Text>
            ) : null}
            {practice.exercises.gapFillVocab.items.map((item, index) => (
              <Text key={`vocab-gap-${index}`} style={styles.bodyText}>
                {index + 1}. {item}
              </Text>
            ))}

            <Text style={styles.exerciseHeading}>D. Grammar practice</Text>
            {practice.exercises.grammarPractice.gapFill.map((item, index) => (
              <Text key={`grammar-gap-${index}`} style={styles.bodyText}>
                {index + 1}. {item.sentence} <Text style={styles.entryMeta}>({item.verb})</Text>
              </Text>
            ))}
            {practice.exercises.grammarPractice.transformation.map((item, index) => (
              <View key={`transformation-${index}`} style={styles.entry}>
                <Text style={styles.bodyText}>
                  {index + 1}. {item.prompt}
                </Text>
                <Text style={styles.entryMeta}>{item.cue}</Text>
              </View>
            ))}

            <Text style={styles.exerciseHeading}>E. Find and fix the mistake</Text>
            {practice.exercises.errorCorrection.map((sentence, index) => (
              <Text key={`error-${index}`} style={styles.bodyText}>
                {index + 1}. {sentence}
              </Text>
            ))}
          </CollapsibleCard>

          <CollapsibleCard
            title="Speaking tasks"
            subtitle="Record these — they are scored like every other practice"
            badge="Step 8"
            defaultOpen
          >
            {practice.speakingTasks.map((task) => (
              <View key={`task-${task.number}`} style={styles.taskCard}>
                <Text style={styles.kicker}>
                  Task {task.number} · {task.duration}
                </Text>
                <Text style={styles.bodyText}>{task.instruction}</Text>
                {task.roleplay.scenario ? (
                  <View style={styles.entry}>
                    <Text style={styles.entryTitle}>Roleplay</Text>
                    <Text style={styles.bodyText}>{task.roleplay.scenario}</Text>
                    <Text style={styles.bodyText}>You: {task.roleplay.learnerRole}</Text>
                    <Text style={styles.bodyText}>The app: {task.roleplay.appRole}</Text>
                    {task.roleplay.goals.map((goal) => (
                      <Text key={goal} style={styles.optionText}>
                        · {goal}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {task.targetPhrases.length > 0 ? (
                  <Text style={styles.wordBankText}>Use: {task.targetPhrases.join(" · ")}</Text>
                ) : null}
                <AppButton label={`Record task ${task.number}`} icon="mic" onPress={() => onStartTask(task)} />
              </View>
            ))}
          </CollapsibleCard>

          <CollapsibleCard title="Keep talking" subtitle="Questions to extend the session" badge="Step 9">
            {practice.followUpQuestions.map((question, index) => (
              <Text key={`follow-up-${index}`} style={styles.bodyText}>
                {index + 1}. {question}
              </Text>
            ))}
          </CollapsibleCard>

          <Card style={styles.answerCard}>
            <AppButton
              label={showAnswers ? "Hide the answer key" : "Show the answer key"}
              variant="ghost"
              icon={showAnswers ? "eye-off" : "eye"}
              onPress={onToggleAnswers}
            />
            {showAnswers ? (
              <View style={styles.stack}>
                <Text style={styles.exerciseHeading}>A. Comprehension</Text>
                {practice.answerKey.comprehension.map((item, index) => (
                  <View key={`answer-comprehension-${index}`} style={styles.entry}>
                    <Text style={styles.bodyText}>
                      {index + 1}. {item.answer}
                    </Text>
                    {item.note ? <Text style={styles.entryMeta}>{item.note}</Text> : null}
                  </View>
                ))}

                {matching.prompts.length > 0 ? (
                  <>
                    <Text style={styles.exerciseHeading}>B. Match the halves</Text>
                    <Text style={styles.bodyText}>
                      {matching.prompts.map((prompt) => `${prompt.number}-${prompt.answerLetter}`).join("  ")}
                    </Text>
                  </>
                ) : null}

                <Text style={styles.exerciseHeading}>C. Vocabulary in context</Text>
                {practice.answerKey.gapFillVocab.map((answer, index) => (
                  <Text key={`answer-vocab-${index}`} style={styles.bodyText}>
                    {index + 1}. {answer}
                  </Text>
                ))}

                <Text style={styles.exerciseHeading}>D. Grammar practice</Text>
                {practice.answerKey.grammarPractice.gapFill.map((answer, index) => (
                  <Text key={`answer-grammar-${index}`} style={styles.bodyText}>
                    {index + 1}. {answer}
                  </Text>
                ))}
                {practice.answerKey.grammarPractice.transformation.map((answer, index) => (
                  <Text key={`answer-transformation-${index}`} style={styles.bodyText}>
                    {index + 1}. {answer}
                  </Text>
                ))}

                <Text style={styles.exerciseHeading}>E. Find and fix the mistake</Text>
                {practice.answerKey.errorCorrection.map((item, index) => (
                  <View key={`answer-error-${index}`} style={styles.entry}>
                    <Text style={styles.rightText}>
                      {index + 1}. {item.corrected}
                    </Text>
                    {item.note ? <Text style={styles.entryMeta}>{item.note}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          {practice.profileQuestion ? (
            <Card style={styles.profileCard}>
              <Text style={styles.kicker}>One question before you go</Text>
              <Text style={styles.bodyText}>{practice.profileQuestion}</Text>
              <TextInput
                value={profileAnswer}
                onChangeText={onChangeProfileAnswer}
                multiline
                maxLength={600}
                placeholder="Answer in English or in your own language..."
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <AppButton
                label={isSavingProfileAnswer ? "Saving..." : "Save for tomorrow's lesson"}
                variant="secondary"
                onPress={onSaveProfileAnswer}
                loading={isSavingProfileAnswer}
                disabled={isSavingProfileAnswer || profileAnswer.trim().length === 0}
              />
              {profileStatus ? <Text style={styles.captionText}>{profileStatus}</Text> : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: spacing.xl
    },
    stack: {
      gap: spacing.md
    },
    introCard: {
      gap: spacing.sm
    },
    introTitle: {
      ...typography.h1,
      color: colors.ink
    },
    fieldLabel: {
      ...typography.label,
      color: colors.accent,
      marginTop: spacing.xs
    },
    angleCard: {
      gap: 4,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted
    },
    anglePressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }]
    },
    angleTitle: {
      ...typography.bodyStrong,
      color: colors.ink,
      fontSize: 16
    },
    angleDescription: {
      ...typography.body,
      color: colors.muted
    },
    titleCard: {
      gap: spacing.xs
    },
    kicker: {
      ...typography.label,
      color: colors.primaryDark
    },
    lessonTitle: {
      ...typography.display,
      color: colors.ink
    },
    mutedText: {
      ...typography.bodyLarge,
      color: colors.muted
    },
    captionText: {
      ...typography.caption,
      color: colors.muted
    },
    bodyText: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    readingText: {
      ...typography.bodyLarge,
      color: colors.ink,
      lineHeight: 26
    },
    markedWord: {
      color: colors.primaryDark,
      fontWeight: "800"
    },
    entry: {
      gap: 2,
      paddingVertical: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.line
    },
    entryTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    entryMeta: {
      ...typography.caption,
      color: colors.muted
    },
    translationText: {
      ...typography.body,
      color: colors.accent
    },
    exampleText: {
      ...typography.body,
      color: colors.muted,
      fontStyle: "italic"
    },
    patternText: {
      ...typography.bodyStrong,
      color: colors.primaryDark
    },
    wrongText: {
      ...typography.bodyStrong,
      color: colors.danger
    },
    rightText: {
      ...typography.bodyStrong,
      color: colors.success
    },
    exerciseHeading: {
      ...typography.label,
      color: colors.accent,
      marginTop: spacing.xs
    },
    optionText: {
      ...typography.body,
      color: colors.muted,
      paddingLeft: spacing.sm
    },
    wordBankText: {
      ...typography.body,
      color: colors.primaryDark
    },
    divider: {
      height: 1,
      backgroundColor: colors.line,
      marginVertical: spacing.xs
    },
    taskCard: {
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted
    },
    shadowRow: {
      gap: spacing.xs,
      paddingVertical: spacing.xs
    },
    shadowText: {
      fontWeight: "600"
    },
    pendingCard: {
      gap: spacing.sm,
      alignItems: "flex-start"
    },
    answerCard: {
      gap: spacing.sm
    },
    profileCard: {
      gap: spacing.sm,
      backgroundColor: colors.primaryTint
    },
    warningCard: {
      gap: spacing.xs,
      backgroundColor: colors.warningTint
    },
    warningTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    warningText: {
      ...typography.body,
      color: colors.warning
    },
    errorText: {
      ...typography.bodyStrong,
      color: colors.danger,
      lineHeight: 20
    },
    input: {
      minHeight: 88,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.ink,
      fontSize: 16,
      lineHeight: 22,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      textAlignVertical: "top"
    }
  });
}
