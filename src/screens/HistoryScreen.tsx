import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import {
  getGrammarRecordLevel,
  getPracticeType,
  isGrammarPracticeRecord,
  isPictureDescriptionRecord
} from "@/services/records/recordClassification";
import { GrammarLevel, ListeningGameResult, SpeakingRecord } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatReadableDate } from "@/utils/date";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";

interface HistoryScreenProps {
  records: SpeakingRecord[];
  listeningResults: ListeningGameResult[];
  onBack: () => void;
  onSelectRecord: (record: SpeakingRecord) => void;
}

const GRAMMAR_LEVELS: GrammarLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function HistoryScreen({
  records,
  listeningResults,
  onBack,
  onSelectRecord
}: HistoryScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const generalRecords = records.filter(
    (record) => !isGrammarPracticeRecord(record) && !isPictureDescriptionRecord(record)
  );
  const pictureRecords = records.filter(isPictureDescriptionRecord);
  const grammarRecords = records.filter(isGrammarPracticeRecord);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="History" subtitle="General speaking, grammar, picture, and listening practices" onBack={onBack} />

      {records.length === 0 && listeningResults.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No recordings yet</Text>
          <Text style={styles.emptyText}>
            Every practice you record is kept here with its transcript, feedback and scores, so you
            can play an old attempt back and hear the difference. Start one from the home screen.
          </Text>
        </Card>
      ) : null}

      <HistorySection
        title="General Speaking Records"
        records={generalRecords}
        emptyText="No general speaking records yet."
        onSelectRecord={onSelectRecord}
        styles={styles}
      />

      <HistorySection
        title="Picture Description Records"
        records={pictureRecords}
        emptyText="No picture description records yet."
        onSelectRecord={onSelectRecord}
        styles={styles}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grammar Practice Records</Text>
        {grammarRecords.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No grammar practice records yet.</Text>
          </Card>
        ) : (
          GRAMMAR_LEVELS.map((level) => {
            const levelRecords = grammarRecords.filter((record) => getGrammarRecordLevel(record) === level);

            if (levelRecords.length === 0) {
              return null;
            }

            return (
              <View key={level} style={styles.grammarGroup}>
                <Card style={styles.groupSummaryCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.groupTitle}>{level} Grammar</Text>
                    <Text style={styles.score}>{formatScore100(averageOverallScore(levelRecords))}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {levelRecords.length} records / Average score
                  </Text>
                </Card>
                <View style={styles.list}>
                  {levelRecords.map((record) => (
                    <HistoryRecordCard
                      key={record.id}
                      record={record}
                      onSelectRecord={onSelectRecord}
                      styles={styles}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </View>

      <ListeningResultsSection results={listeningResults} styles={styles} />
    </ScrollView>
  );
}

function HistorySection({
  title,
  records,
  emptyText,
  onSelectRecord,
  styles
}: {
  title: string;
  records: SpeakingRecord[];
  emptyText: string;
  onSelectRecord: (record: SpeakingRecord) => void;
  styles: HistoryStyles;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {records.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {records.map((record) => (
            <HistoryRecordCard
              key={record.id}
              record={record}
              onSelectRecord={onSelectRecord}
              styles={styles}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function HistoryRecordCard({
  record,
  onSelectRecord,
  styles
}: {
  record: SpeakingRecord;
  onSelectRecord: (record: SpeakingRecord) => void;
  styles: HistoryStyles;
}): React.JSX.Element {
  const grammarLabel = record.grammarGroup?.grammarTopic ?? record.topic.grammarFocus?.grammarTopic;
  const modeLabel = getRecordModeLabel(record);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${record.topic.title}, ${formatReadableDate(record.createdAt)}`}
      onPress={() => onSelectRecord(record)}
    >
      <Card style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordDate}>{formatReadableDate(record.createdAt)}</Text>
          <Text style={styles.score}>{formatScore100(normalizeScores(record.scores).overall)}</Text>
        </View>
        <Text style={styles.topic}>{record.topic.title}</Text>
        <Text style={styles.modeMeta}>{modeLabel}</Text>
        {grammarLabel ? <Text style={styles.grammarMeta}>{grammarLabel}</Text> : null}
        <Text style={styles.meta}>
          {record.media.type} / {record.media.durationSeconds}s / {record.analysis.generatedBy} / PDF{" "}
          {record.pdfReportUri ? "ready" : "none"}
        </Text>
      </Card>
    </Pressable>
  );
}

function ListeningResultsSection({
  results,
  styles
}: {
  results: ListeningGameResult[];
  styles: HistoryStyles;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Listening Picture Match</Text>
      {results.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No listening picture match results yet.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {results.map((result) => (
            <Card key={result.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordDate}>{formatReadableDate(result.createdAt)}</Text>
                <Text style={styles.score}>{result.score}</Text>
              </View>
              <Text style={styles.topic}>{result.level} Listening Picture Match</Text>
              <Text style={styles.modeMeta}>listening_picture_match</Text>
              <Text style={styles.meta}>
                {result.isCorrect ? "Correct" : "Needs review"} / {result.explanation}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

function averageOverallScore(records: SpeakingRecord[]): number {
  if (records.length === 0) {
    return 0;
  }

  const total = records.reduce((sum, record) => sum + normalizeScores(record.scores).overall, 0);
  return total / records.length;
}

function getRecordModeLabel(record: SpeakingRecord): string {
  const practiceType = getPracticeType(record);

  if (practiceType === "grammar") {
    return "grammar_challenge";
  }

  if (practiceType === "picture_description") {
    return "picture_description";
  }

  return "free_speaking";
}

type HistoryStyles = ReturnType<typeof createStyles>;

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md
    },
    section: {
      gap: spacing.sm
    },
    sectionTitle: {
      ...typography.h1,
      color: colors.ink
    },
    grammarGroup: {
      gap: spacing.sm
    },
    groupSummaryCard: {
      gap: spacing.xs,
      backgroundColor: colors.surfaceMuted
    },
    groupTitle: {
      ...typography.h2,
      color: colors.ink
    },
    list: {
      gap: spacing.sm
    },
    emptyTitle: {
      ...typography.h2,
      color: colors.ink
    },
    emptyText: {
      ...typography.bodyLarge,
      color: colors.muted
    },
    recordCard: {
      gap: spacing.sm
    },
    recordHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md
    },
    recordDate: {
      ...typography.bodyStrong,
      color: colors.muted
    },
    score: {
      ...typography.h1,
      color: colors.primaryDark
    },
    topic: {
      ...typography.h2,
      color: colors.ink
    },
    grammarMeta: {
      ...typography.bodyStrong,
      color: colors.accent,
      fontSize: 13,
      lineHeight: 18
    },
    modeMeta: {
      ...typography.label,
      color: colors.primaryDark
    },
    meta: {
      ...typography.caption,
      color: colors.muted
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
