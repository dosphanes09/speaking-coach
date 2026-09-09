import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/Card";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { Header } from "@/components/Header";
import { SectionTitle } from "@/components/SectionTitle";
import { MarkedTranscript } from "@/components/rhetoric/MarkedTranscript";
import { MetricGrid } from "@/components/rhetoric/MetricGrid";
import { RecordingPlayer, RecordingPlayerHandle } from "@/components/rhetoric/RecordingPlayer";
import { RhetoricScoreCard } from "@/components/rhetoric/RhetoricScoreCard";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { proseWidth } from "@/theme/layout";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricConceptAccuracy, RhetoricFeedbackPoint, RhetoricRecord } from "@/types/rhetoric";
import { createAndShareRhetoricPdf } from "@/services/pdf/rhetoricReportPdf";

interface RhetoricResultScreenProps {
  record: RhetoricRecord;
  /** The attempt this one repeats, when there is one. */
  previousAttempt?: RhetoricRecord;
  isSaved: boolean;
  onBack: () => void;
  onHome: () => void;
  onRetakeTopic: () => void;
  onDelete?: () => void;
}

export function RhetoricResultScreen({
  record,
  previousAttempt,
  isSaved,
  onBack,
  onHome,
  onRetakeTopic,
  onDelete
}: RhetoricResultScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const playerRef = useRef<RecordingPlayerHandle | null>(null);
  const [pdfState, setPdfState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [pdfMessage, setPdfMessage] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { analysis } = record;
  const measuredFromAudio = analysis.analysisSource === "audio";

  async function exportPdf(): Promise<void> {
    setPdfState("working");
    try {
      const location = await createAndShareRhetoricPdf(record);
      setPdfState("done");
      setPdfMessage(location ? `PDF kaydedildi: ${location}` : "PDF hazır.");
    } catch (error) {
      setPdfState("error");
      setPdfMessage(error instanceof Error ? error.message : "PDF oluşturulamadı.");
    }
  }

  return (
    <View style={styles.screen}>
      <Header
        title="Sonuç"
        subtitle={record.topic.title}
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {analysis.audioAnalysisFallback ? (
          <Card style={styles.fallbackCard}>
            <Text style={styles.fallbackText}>
              Ses analizi yapılamadı, değerlendirme yalnızca yazı dökümünden yapıldı. Dolgu sesi,
              duraklama ve tonlama ölçümleri bu sonuçta güvenilir değil.
            </Text>
          </Card>
        ) : null}

        {analysis.measurementUnreliable ? (
          <Card style={styles.fallbackCard}>
            <Text style={styles.fallbackText}>
              Kayıttaki arka plan gürültüsü konuşma seviyesine çok yakın olduğu için duraklamalar ses
              dalgasından ölçülemedi; aşağıdaki duraklama ve tempo değerleri tahmin. Daha sessiz bir
              odada veya mikrofona biraz daha yakın kaydedersen kesin ölçüm yapılabilir.
            </Text>
          </Card>
        ) : null}

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>ÖZET</Text>
          <Text style={styles.summaryText}>{analysis.summary}</Text>
        </Card>

        <Card>
          <RhetoricScoreCard
            scores={analysis.scores}
            selfScore={record.selfAssessment?.score}
            measuredFromAudio={measuredFromAudio}
          />
        </Card>

        {/*
          Placed directly under the score, above delivery and metrics, because
          it answers the question the exercise is actually about: did the
          fifteen minutes of research land? A speech can score well on every
          delivery dimension and still be an explanation of something the
          speaker misunderstood, and that ordering is what makes it visible.
        */}
        {analysis.conceptAccuracy ? (
          <ConceptAccuracyCard
            accuracy={analysis.conceptAccuracy}
            definition={record.topic.definition}
            colors={colors}
          />
        ) : null}

        {previousAttempt ? (
          <Card style={styles.compareCard}>
            <Text style={styles.compareLabel}>ÖNCEKİ DENEMEYLE KARŞILAŞTIRMA</Text>
            <View style={styles.compareRow}>
              <CompareCell
                label="Genel puan"
                before={previousAttempt.analysis.scores.overall}
                after={analysis.scores.overall}
                lowerIsBetter={false}
                colors={colors}
              />
              <CompareCell
                label="Dolgu sesi"
                before={previousAttempt.analysis.metrics.fillerSoundCount}
                after={analysis.metrics.fillerSoundCount}
                lowerIsBetter
                colors={colors}
              />
              <CompareCell
                label="Dolgu kelimesi"
                before={previousAttempt.analysis.metrics.fillerWordCount}
                after={analysis.metrics.fillerWordCount}
                lowerIsBetter
                colors={colors}
              />
            </View>
          </Card>
        ) : null}

        <SectionTitle>Kaydın</SectionTitle>
        <RecordingPlayer ref={playerRef} recording={record.recording} />

        <SectionTitle>Ölçümler</SectionTitle>
        <MetricGrid
          metrics={analysis.metrics}
          durationSeconds={record.recording.durationSeconds}
          measuredFromAudio={measuredFromAudio}
        />

        <SectionTitle>İşaretlenmiş konuşma</SectionTitle>
        <Card>
          <MarkedTranscript
            segments={analysis.segments}
            plainTranscript={analysis.transcript}
            onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
          />
        </Card>

        {analysis.improvements.length > 0 ? (
          <>
            <SectionTitle>Geliştirilecekler</SectionTitle>
            {analysis.improvements.map((point, index) => (
              <FeedbackCard key={`${point.title}-${index}`} point={point} tone="improve" colors={colors} />
            ))}
          </>
        ) : null}

        {analysis.strengths.length > 0 ? (
          <>
            <SectionTitle>Güçlü yanların</SectionTitle>
            {analysis.strengths.map((point, index) => (
              <FeedbackCard key={`${point.title}-${index}`} point={point} tone="strength" colors={colors} />
            ))}
          </>
        ) : null}

        <SectionTitle>Ayrıntılar</SectionTitle>

        <CollapsibleCard title="Yapı" subtitle="Giriş, gövde, kapanış, geçişler">
          <Detail label="Giriş" value={analysis.structureFeedback.opening} colors={colors} />
          <Detail label="Gövde" value={analysis.structureFeedback.body} colors={colors} />
          <Detail label="Kapanış" value={analysis.structureFeedback.closing} colors={colors} />
          <Detail label="Geçişler" value={analysis.structureFeedback.transitions} colors={colors} />
        </CollapsibleCard>

        <CollapsibleCard title="Sunum" subtitle="Tempo, tonlama, diksiyon, enerji">
          <Detail label="Tempo" value={analysis.deliveryFeedback.pace} colors={colors} />
          <Detail label="Tonlama" value={analysis.deliveryFeedback.intonation} colors={colors} />
          <Detail label="Diksiyon" value={analysis.deliveryFeedback.articulation} colors={colors} />
          <Detail label="Enerji" value={analysis.deliveryFeedback.energy} colors={colors} />
        </CollapsibleCard>

        <CollapsibleCard
          title="Hazırlık karşılaştırması"
          subtitle="Planladığının ne kadarını anlattın"
          defaultOpen={analysis.preparationFeedback.missedPoints.length > 0}
        >
          <PointList
            label="Anlattıkların"
            items={analysis.preparationFeedback.coveredPoints}
            tone="good"
            colors={colors}
          />
          <PointList
            label="Atladıkların"
            items={analysis.preparationFeedback.missedPoints}
            tone="warn"
            colors={colors}
          />
          <PointList
            label="Doğaçlama eklediklerin"
            items={analysis.preparationFeedback.improvisedPoints}
            tone="neutral"
            colors={colors}
          />
          <Detail label="Yorum" value={analysis.preparationFeedback.comment} colors={colors} />
        </CollapsibleCard>

        <CollapsibleCard title="Zaman yönetimi" subtitle={formatTimeSummary(record)}>
          <Detail label="Yorum" value={analysis.timeManagement.comment} colors={colors} />
        </CollapsibleCard>

        {record.topic.angles.length > 0 ? (
          <CollapsibleCard
            title="Anlatımda olması beklenen noktalar"
            subtitle="Referans liste — eksiksiz değil"
          >
            {record.topic.angles.map((angle) => (
              <Text key={angle} style={styles.angle}>
                • {angle}
              </Text>
            ))}
          </CollapsibleCard>
        ) : null}

        {analysis.nextSessionFocus.length > 0 ? (
          <Card style={styles.focusCard}>
            <Text style={styles.focusLabel}>SONRAKİ SEANSTA ODAK</Text>
            {analysis.nextSessionFocus.map((focus) => (
              <Text key={focus} style={styles.focusItem}>
                → {focus}
              </Text>
            ))}
          </Card>
        ) : null}

        {record.selfAssessment?.note ? (
          <Card style={styles.selfNoteCard}>
            <Text style={styles.selfNoteLabel}>KONUŞMADAN SONRA SEN NE DEMİŞTİN</Text>
            <Text style={styles.selfNoteText}>{record.selfAssessment.note}</Text>
          </Card>
        ) : null}

        {pdfMessage ? (
          <Text style={[styles.pdfMessage, pdfState === "error" && styles.pdfError]}>{pdfMessage}</Text>
        ) : null}

        <View style={styles.actions}>
          <AppButton label="Aynı konuyu tekrar anlat" onPress={onRetakeTopic} icon="refresh-cw" />
          <AppButton
            label="PDF olarak kaydet"
            onPress={exportPdf}
            variant="ghost"
            icon="download"
            loading={pdfState === "working"}
          />
          {isSaved ? <AppButton label="Ana ekran" onPress={onHome} variant="ghost" icon="home" /> : null}
          {onDelete ? (
            <AppButton
              label="Bu kaydı sil"
              onPress={() => setIsDeleteOpen(true)}
              variant="danger"
              icon="trash-2"
            />
          ) : null}
        </View>
      </ScrollView>

      {/* The recording, its video and the exported PDF all go with it, and none
          of them can be recovered — so this asks first. */}
      <ConfirmDialog
        visible={isDeleteOpen}
        title="Bu kaydı sil?"
        message="Kayıt, ses ve video dosyaları ve varsa PDF raporu kalıcı olarak silinir. Geri alınamaz."
        confirmLabel="Sil"
        destructive
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          setIsDeleteOpen(false);
          onDelete?.();
        }}
      />
    </View>
  );
}

function FeedbackCard({
  point,
  tone,
  colors
}: {
  point: RhetoricFeedbackPoint;
  tone: "improve" | "strength";
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  return (
    <Card style={tone === "improve" ? styles.improveCard : styles.strengthCard}>
      <Text style={tone === "improve" ? styles.improveTitle : styles.strengthTitle}>{point.title}</Text>
      <Text style={styles.pointDetail}>{point.detail}</Text>
      {point.quote ? <Text style={styles.quote}>“{point.quote}”</Text> : null}
      {point.action ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionLabel}>NE YAPMALI</Text>
          <Text style={styles.actionText}>{point.action}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function Detail({ label, value, colors }: { label: string; value: string; colors: AppColors }) {
  const styles = createStyles(colors);
  if (!value) {
    return null;
  }
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/**
 * The content check.
 *
 * The verdict is shown as a word, not a number, and deliberately so: "kısmen"
 * is the common and most useful outcome — the mechanism was roughly right but a
 * load-bearing piece was missing — and folding that into a score would hide it
 * among the six delivery scores right above.
 *
 * `errors` is rendered last and in the danger colour on purpose. It is the one
 * list here that says the speaker stated something untrue, and it should not be
 * possible to skim past it.
 */
function ConceptAccuracyCard({
  accuracy,
  definition,
  colors
}: {
  accuracy: RhetoricConceptAccuracy;
  definition?: string;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  const verdict = VERDICT_PRESENTATION[accuracy.verdict] ?? VERDICT_PRESENTATION.kismen;

  return (
    <Card style={[styles.accuracyCard, { borderColor: verdict.color(colors) }]}>
      <View style={styles.accuracyHeader}>
        <Text style={styles.accuracyLabel}>KAVRAMI ANLAMAN</Text>
        <View style={[styles.verdictBadge, { backgroundColor: verdict.color(colors) }]}>
          <Text style={styles.verdictText}>{verdict.label}</Text>
        </View>
      </View>

      {accuracy.comment ? <Text style={styles.accuracyComment}>{accuracy.comment}</Text> : null}

      <PointList label="Doğru anlattıkların" items={accuracy.correctPoints} tone="good" colors={colors} />
      <PointList label="Değinmediklerin" items={accuracy.missedPoints} tone="warn" colors={colors} />
      <PointList label="Listede olmayan doğru eklemelerin" items={accuracy.extraPoints} tone="info" colors={colors} />
      <PointList label="Yanlış anlattıkların" items={accuracy.errors} tone="bad" colors={colors} />

      {definition ? (
        <View style={styles.definitionBox}>
          <Text style={styles.definitionLabel}>KAVRAMIN DOĞRU TANIMI</Text>
          <Text style={styles.definitionText}>{definition}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const VERDICT_PRESENTATION: Record<
  RhetoricConceptAccuracy["verdict"],
  { label: string; color: (colors: AppColors) => string }
> = {
  dogru: { label: "DOĞRU", color: (colors) => colors.success },
  kismen: { label: "KISMEN", color: (colors) => colors.warning },
  yanlis: { label: "YANLIŞ", color: (colors) => colors.danger }
};

type PointTone = "good" | "warn" | "bad" | "info" | "neutral";

const POINT_TONE_COLORS: Record<PointTone, (colors: AppColors) => string> = {
  good: (colors) => colors.success,
  warn: (colors) => colors.warning,
  bad: (colors) => colors.danger,
  info: (colors) => colors.accent,
  neutral: (colors) => colors.muted
};

function PointList({
  label,
  items,
  tone,
  colors
}: {
  label: string;
  items: string[];
  tone: PointTone;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  if (items.length === 0) {
    return null;
  }
  const color = POINT_TONE_COLORS[tone](colors);
  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color }]}>{label}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.detailValue}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

function CompareCell({
  label,
  before,
  after,
  lowerIsBetter,
  colors
}: {
  label: string;
  before: number;
  after: number;
  lowerIsBetter: boolean;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  const change = after - before;
  const improved = lowerIsBetter ? change < 0 : change > 0;
  const unchanged = change === 0;
  const color = unchanged ? colors.muted : improved ? colors.success : colors.danger;

  return (
    <View style={styles.compareCell}>
      <Text style={styles.compareCellLabel}>{label}</Text>
      <Text style={styles.compareCellValue}>
        {before} → {after}
      </Text>
      <Text style={[styles.compareCellChange, { color }]}>
        {unchanged ? "değişmedi" : `${change > 0 ? "+" : ""}${change}`}
      </Text>
    </View>
  );
}

function formatTimeSummary(record: RhetoricRecord): string {
  const target = Math.round(record.targetDurationSeconds / 60);
  const actual = record.recording.durationSeconds;
  return `Hedef ${target} dk · gerçekleşen ${Math.floor(actual / 60)}:${String(actual % 60).padStart(2, "0")}`;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.screen
    },
    content: {
      paddingBottom: spacing.xl,
      gap: spacing.sm
    },
    fallbackCard: {
      backgroundColor: colors.warningTint,
      borderColor: colors.warning
    },
    fallbackText: {
      ...typography.body,
      color: colors.ink
    },
    accuracyCard: {
      gap: spacing.xs,
      borderWidth: 2
    },
    accuracyHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    accuracyLabel: {
      ...typography.label,
      color: colors.muted
    },
    verdictBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.lg
    },
    verdictText: {
      ...typography.label,
      color: colors.onAccent
    },
    accuracyComment: {
      ...typography.body,
      color: colors.ink
    },
    definitionBox: {
      marginTop: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      gap: 2
    },
    definitionLabel: {
      ...typography.label,
      color: colors.muted
    },
    definitionText: {
      ...typography.body,
      // Read start to finish, so capped tighter than the shell: past about
      // 90 characters per line the eye lands on the wrong line coming back.
      ...proseWidth,
      color: colors.ink
    },
    summaryCard: {
      gap: spacing.xs,
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary
    },
    summaryLabel: {
      ...typography.label,
      color: colors.primaryDark
    },
    summaryText: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    compareCard: {
      gap: spacing.sm,
      backgroundColor: colors.accentTint,
      borderColor: colors.accent
    },
    compareLabel: {
      ...typography.label,
      color: colors.accent
    },
    compareRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    compareCell: {
      flexGrow: 1,
      flexBasis: 110,
      gap: 2
    },
    compareCellLabel: {
      ...typography.caption,
      color: colors.muted
    },
    compareCellValue: {
      ...typography.h2,
      color: colors.ink
    },
    compareCellChange: {
      ...typography.bodyStrong
    },
    improveCard: {
      gap: spacing.xs,
      borderColor: colors.warning
    },
    strengthCard: {
      gap: spacing.xs,
      borderColor: colors.success
    },
    improveTitle: {
      ...typography.h2,
      color: colors.warning
    },
    strengthTitle: {
      ...typography.h2,
      color: colors.success
    },
    pointDetail: {
      ...typography.body,
      color: colors.ink
    },
    quote: {
      ...typography.bodyLarge,
      color: colors.muted,
      fontStyle: "italic",
      paddingLeft: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: colors.line
    },
    actionBox: {
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      gap: 2
    },
    actionLabel: {
      ...typography.label,
      color: colors.primaryDark
    },
    actionText: {
      ...typography.body,
      color: colors.ink
    },
    detail: {
      gap: 2,
      marginBottom: spacing.xs
    },
    detailLabel: {
      ...typography.label,
      color: colors.muted
    },
    detailValue: {
      ...typography.body,
      color: colors.ink
    },
    angle: {
      ...typography.body,
      color: colors.ink
    },
    focusCard: {
      gap: spacing.xs,
      backgroundColor: colors.successTint,
      borderColor: colors.success
    },
    focusLabel: {
      ...typography.label,
      color: colors.success
    },
    focusItem: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    selfNoteCard: {
      gap: spacing.xs,
      backgroundColor: colors.surfaceMuted
    },
    selfNoteLabel: {
      ...typography.label,
      color: colors.muted
    },
    selfNoteText: {
      ...typography.body,
      color: colors.ink,
      fontStyle: "italic"
    },
    pdfMessage: {
      ...typography.caption,
      color: colors.success
    },
    pdfError: {
      color: colors.danger
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.md
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
