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
          <Text style={styles.emptyText}>Henüz kayıt yok.</Text>
        </Card>
      ) : null}

      <HistorySection
        title="Genel Speaking Kayıtları"
        records={generalRecords}
        emptyText="Henüz genel speaking kaydı yok."
        onSelectRecord={onSelectRecord}
        styles={styles}
      />

      <HistorySection
        title="Picture Description Kayıtları"
        records={pictureRecords}
        emptyText="Henüz picture description kaydı yok."
        onSelectRecord={onSelectRecord}
        styles={styles}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grammar Practice Kayıtları</Text>
        {grammarRecords.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Henüz grammar practice kaydı yok.</Text>
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
                    {levelRecords.length} kayıt / Ortalama skor
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
      onPress={() => onSelectRecord(record)}
      style={({ pressed }) => pressed && styles.pressed}
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
          {record.pdfReportUri ? "hazır" : "yok"}
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
          <Text style={styles.emptyText}>Henüz listening picture match sonucu yok.</Text>
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.screen,
      gap: spacing.md
    },
    section: {
      gap: spacing.sm
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 20,
      lineHeight: 25,
      fontWeight: "800"
    },
    grammarGroup: {
      gap: spacing.sm
    },
    groupSummaryCard: {
      gap: spacing.xs,
      backgroundColor: colors.surface
    },
    groupTitle: {
      color: colors.ink,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "800"
    },
    list: {
      gap: spacing.sm
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }]
    },
    emptyText: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 22
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
      color: colors.muted,
      fontWeight: "600"
    },
    score: {
      color: colors.primaryDark,
      fontSize: 20,
      fontWeight: "800"
    },
    topic: {
      color: colors.ink,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "700"
    },
    grammarMeta: {
      color: colors.accent,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "700"
    },
    modeMeta: {
      color: colors.primaryDark,
      fontSize: 14,
      lineHeight: 17,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    meta: {
      color: colors.muted
    }
  });
}
