/**
 * Checks the rhetoric progress maths.
 *
 * This is the part of the module most likely to be quietly wrong: it decides
 * whether the app tells you that you are improving. Getting the direction
 * backwards on a "lower is better" metric would congratulate you for saying
 * "ııı" more often, and nothing in the UI would look broken.
 *
 * Run: npm run test:rhetoricStats
 */
import {
  buildRhetoricSummary,
  findRecurringWeaknesses,
  findRetakeSource,
  findSameTopicAttempts,
  toTrackedMetrics
} from "../src/services/rhetoric/rhetoricStats";
import { RhetoricRecord, RhetoricScores } from "../src/types/rhetoric";

let checks = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (!condition) {
    console.error(`  FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
    process.exitCode = 1;
    return;
  }
  checks += 1;
  console.log(`  ok  ${name}`);
}

function close(actual: number, expected: number, tolerance = 0.01): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

interface RecordOptions {
  id: string;
  daysAgo: number;
  durationSeconds: number;
  fillerSounds: number;
  fillerWords: number;
  wordsPerMinute?: number;
  pauses?: number;
  overall?: number;
  scores?: Partial<RhetoricScores>;
  selfScore?: number;
  topicId?: string;
  retakeOfRecordId?: string;
}

function makeRecord(options: RecordOptions): RhetoricRecord {
  const createdAt = new Date(Date.now() - options.daysAgo * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: options.id,
    createdAt,
    topic: {
      id: options.topicId ?? "gun-01",
      title: "Test konusu",
      category: "gundelik",
      level: "orta",
      angles: [],
      source: "bank"
    },
    mode: "prepared",
    targetDurationSeconds: 240,
    preparationNotes: "",
    recording: {
      uri: "app://media/x-video.webm",
      audioUri: "app://media/x-audio.webm",
      hasVideo: true,
      durationSeconds: options.durationSeconds,
      mimeType: "audio/webm"
    },
    analysis: {
      transcript: "",
      segments: [],
      scores: {
        content: 70,
        structure: 70,
        fluency: 70,
        language: 70,
        impact: 70,
        voice: 70,
        overall: options.overall ?? 70,
        ...options.scores
      },
      metrics: {
        wordsPerMinute: options.wordsPerMinute ?? 140,
        fillerWordCount: options.fillerWords,
        fillerSoundCount: options.fillerSounds,
        pauseCount: options.pauses ?? 6,
        longestPauseSeconds: 1.8,
        silenceRatio: 0.15,
        uniqueWordRatio: 0.45,
        averageSentenceWords: 14,
        topFillers: []
      },
      strengths: [],
      improvements: [],
      structureFeedback: { opening: "", body: "", closing: "", transitions: "" },
      deliveryFeedback: { pace: "", intonation: "", articulation: "", energy: "" },
      preparationFeedback: { coveredPoints: [], missedPoints: [], improvisedPoints: [], comment: "" },
      timeManagement: { targetSeconds: 240, actualSeconds: options.durationSeconds, comment: "" },
      nextSessionFocus: [],
      summary: "",
      analysisSource: "audio",
      audioAnalysisFallback: false
    },
    ...(options.selfScore !== undefined ? { selfAssessment: { score: options.selfScore, note: "" } } : {}),
    ...(options.retakeOfRecordId ? { retakeOfRecordId: options.retakeOfRecordId } : {})
  };
}

console.log("Per-minute normalisation");

check(
  "aynı sayı, farklı süre -> farklı oran",
  (() => {
    // 12 fillers in 2 minutes is twice as bad as 12 in 4 minutes. Comparing raw
    // counts across sessions of different lengths would hide real progress.
    const short = toTrackedMetrics(makeRecord({ id: "a", daysAgo: 0, durationSeconds: 120, fillerSounds: 12, fillerWords: 0 }));
    const long = toTrackedMetrics(makeRecord({ id: "b", daysAgo: 0, durationSeconds: 240, fillerSounds: 12, fillerWords: 0 }));
    return close(short.fillerSoundsPerMinute, 6) && close(long.fillerSoundsPerMinute, 3);
  })()
);

check(
  "sıfır süre çökertmiyor",
  Number.isFinite(
    toTrackedMetrics(makeRecord({ id: "c", daysAgo: 0, durationSeconds: 0, fillerSounds: 5, fillerWords: 5 }))
      .fillerSoundsPerMinute
  )
);

console.log("Trend direction");

const improving = [
  makeRecord({ id: "1", daysAgo: 20, durationSeconds: 240, fillerSounds: 20, fillerWords: 16 }),
  makeRecord({ id: "2", daysAgo: 18, durationSeconds: 240, fillerSounds: 18, fillerWords: 15 }),
  makeRecord({ id: "3", daysAgo: 16, durationSeconds: 240, fillerSounds: 22, fillerWords: 17 }),
  makeRecord({ id: "4", daysAgo: 4, durationSeconds: 240, fillerSounds: 8, fillerWords: 6 }),
  makeRecord({ id: "5", daysAgo: 2, durationSeconds: 240, fillerSounds: 6, fillerWords: 5 }),
  makeRecord({ id: "6", daysAgo: 1, durationSeconds: 240, fillerSounds: 7, fillerWords: 4 })
];

const improvingSummary = buildRhetoricSummary(improving);
const fillerTrend = improvingSummary.trends.find((trend) => trend.key === "fillerSoundsPerMinute");

check("dolgu azalması iyileşme sayılıyor", fillerTrend?.improved === true);
check("karşılaştırma yapılabiliyor", fillerTrend?.hasComparison === true);
check("değişim negatif", (fillerTrend?.change ?? 0) < 0, String(fillerTrend?.change));

const worsening = [...improving].reverse().map((record, index) =>
  makeRecord({
    id: `w${index}`,
    daysAgo: 20 - index * 3,
    durationSeconds: 240,
    fillerSounds: record.analysis.metrics.fillerSoundCount,
    fillerWords: record.analysis.metrics.fillerWordCount
  })
);
const worseningTrend = buildRhetoricSummary(worsening).trends.find(
  (trend) => trend.key === "fillerSoundsPerMinute"
);
check("dolgu artışı iyileşme sayılmıyor", worseningTrend?.improved === false);

const diversityTrend = buildRhetoricSummary([
  makeRecord({ id: "d1", daysAgo: 10, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "d2", daysAgo: 9, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "d3", daysAgo: 8, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "d4", daysAgo: 3, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "d5", daysAgo: 2, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "d6", daysAgo: 1, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 })
]).trends.find((trend) => trend.key === "uniqueWordRatio");
check("yüksek olması iyi olan ölçüt ters çevrilmiyor", diversityTrend?.lowerIsBetter === false);

console.log("Insufficient history");

const single = buildRhetoricSummary([
  makeRecord({ id: "s1", daysAgo: 0, durationSeconds: 240, fillerSounds: 10, fillerWords: 8 })
]);
check(
  "tek kayıtla karşılaştırma iddia edilmiyor",
  single.trends.every((trend) => trend.hasComparison === false)
);
check("tek kayıtta toplam doğru", single.totalSessions === 1);
check("boş listede çökmüyor", buildRhetoricSummary([]).totalSessions === 0);

console.log("Self assessment gap");

const gapSummary = buildRhetoricSummary([
  // Self 9/10 = 90 against a model score of 70 -> +20.
  makeRecord({ id: "g1", daysAgo: 2, durationSeconds: 240, fillerSounds: 5, fillerWords: 5, overall: 70, selfScore: 9 }),
  makeRecord({ id: "g2", daysAgo: 1, durationSeconds: 240, fillerSounds: 5, fillerWords: 5, overall: 70, selfScore: 9 })
]);
check(
  "öz değerlendirme aynı ölçeğe çevriliyor",
  close(gapSummary.averageSelfScoreGap ?? 0, 20, 0.5),
  String(gapSummary.averageSelfScoreGap)
);
check(
  "öz değerlendirme yoksa null",
  buildRhetoricSummary([
    makeRecord({ id: "n1", daysAgo: 1, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 })
  ]).averageSelfScoreGap === null
);

console.log("Recurring weaknesses");

const weakRecords = [1, 2, 3, 4, 5].map((index) =>
  makeRecord({
    id: `weak${index}`,
    daysAgo: index,
    durationSeconds: 240,
    fillerSounds: 5,
    fillerWords: 5,
    scores: { structure: 55, content: 82 }
  })
);
const weaknesses = findRecurringWeaknesses(weakRecords);
check("sürekli düşük boyut yakalanıyor", weaknesses.some((item) => item.key === "structure"));
check("iyi olan boyut zayıflık sayılmıyor", !weaknesses.some((item) => item.key === "content"));
check("genel puan zayıflık listesine girmiyor", !weaknesses.some((item) => item.key === "overall"));
check("tek kayıtta zayıflık iddia edilmiyor", findRecurringWeaknesses([weakRecords[0] as RhetoricRecord]).length === 0);

console.log("Retakes");

const original = makeRecord({ id: "orig", daysAgo: 5, durationSeconds: 240, fillerSounds: 14, fillerWords: 10, topicId: "fik-01" });
const retake = makeRecord({
  id: "retake",
  daysAgo: 1,
  durationSeconds: 240,
  fillerSounds: 6,
  fillerWords: 4,
  topicId: "fik-01",
  retakeOfRecordId: "orig"
});
const allRecords = [original, retake];

check("tekrar edilen kayıt bulunuyor", findRetakeSource(retake, allRecords)?.id === "orig");
check("tekrar olmayan kayıtta undefined", findRetakeSource(original, allRecords) === undefined);
check("aynı konudaki diğer denemeler bulunuyor", findSameTopicAttempts(retake, allRecords)[0]?.id === "orig");
check("kendini listelemiyor", !findSameTopicAttempts(retake, allRecords).some((item) => item.id === "retake"));

console.log("Streak");

const streak = buildRhetoricSummary([
  makeRecord({ id: "t0", daysAgo: 0, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "t1", daysAgo: 1, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "t2", daysAgo: 2, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 })
]);
check("ardışık günler seri sayılıyor", streak.currentStreakDays === 3, String(streak.currentStreakDays));

const brokenStreak = buildRhetoricSummary([
  makeRecord({ id: "b0", daysAgo: 0, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 }),
  makeRecord({ id: "b1", daysAgo: 4, durationSeconds: 240, fillerSounds: 5, fillerWords: 5 })
]);
check("boşluk seriyi kesiyor", brokenStreak.currentStreakDays === 1, String(brokenStreak.currentStreakDays));

console.log(`\n${checks} checks passed.`);
