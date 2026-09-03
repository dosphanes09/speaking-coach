/**
 * The printable rhetoric report.
 *
 * Built as HTML because both platforms turn HTML into a PDF with the engine
 * they already have — expo-print on the phone, Chromium's own print pipeline in
 * the desktop build. No PDF library is involved on either side.
 *
 * What goes in is chosen for what survives on paper: the numbers, the quoted
 * examples, and the marked moments with their timestamps. A printed page cannot
 * play audio, so timestamps are written out so they can be found in the app.
 */
import { RhetoricRecord } from "@/types/rhetoric";
import { rhetoricCategoryLabels } from "@/data/rhetoricTopics";

const SCORE_LABELS: Array<{ key: keyof RhetoricRecord["analysis"]["scores"]; label: string }> = [
  { key: "content", label: "İçerik ve argüman" },
  { key: "structure", label: "Yapı ve akış" },
  { key: "fluency", label: "Akıcılık ve tempo" },
  { key: "language", label: "Dil ve üslup" },
  { key: "impact", label: "Etki ve anlatıcılık" },
  { key: "voice", label: "Ses kullanımı" }
];

const SEGMENT_LABELS: Record<string, string> = {
  filler_sound: "dolgu sesi",
  filler_word: "dolgu kelimesi",
  long_pause: "uzun duraklama",
  repetition: "tekrar",
  strong_moment: "güçlü an"
};

export function buildRhetoricReportFileName(record: RhetoricRecord): string {
  const date = record.createdAt.slice(0, 10);
  const topic = sanitize(record.topic.title).slice(0, 60) || "Konusma";
  return `Hitabet - ${date} - ${topic}.pdf`;
}

export function buildRhetoricReportHtml(record: RhetoricRecord): string {
  const { analysis } = record;
  const minutes = Math.max(record.recording.durationSeconds, 1) / 60;

  const marked = analysis.segments.filter((segment) => segment.kind !== "speech");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(buildRhetoricReportFileName(record))}</title>
<style>
  @page { margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1D2521;
    font-size: 11pt;
    line-height: 1.5;
    margin: 0;
  }
  h1 { font-size: 20pt; margin: 0 0 4px; color: #205B4C; }
  h2 { font-size: 13pt; margin: 22px 0 8px; color: #205B4C;
       border-bottom: 1px solid #DDE2DB; padding-bottom: 4px; }
  .meta { color: #68736D; font-size: 9.5pt; margin-bottom: 18px; }
  .summary { background: #EAF4F0; border-left: 4px solid #2E7D68;
             padding: 10px 12px; margin-bottom: 16px; }
  .overall { font-size: 34pt; font-weight: 800; color: #205B4C; line-height: 1; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .tile { flex: 1 1 30%; border: 1px solid #DDE2DB; border-radius: 6px; padding: 8px 10px; }
  .tile .label { font-size: 8.5pt; color: #68736D; text-transform: uppercase; letter-spacing: .5px; }
  .tile .value { font-size: 16pt; font-weight: 700; }
  .tile .hint { font-size: 8.5pt; color: #68736D; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td, th { padding: 5px 6px; border-bottom: 1px solid #EEF1EC; text-align: left; font-size: 10pt; }
  th { color: #68736D; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .5px; }
  .bar { height: 7px; background: #ECEFE8; border-radius: 4px; overflow: hidden; min-width: 90px; }
  .bar span { display: block; height: 7px; background: #2E7D68; }
  .point { border: 1px solid #DDE2DB; border-radius: 6px; padding: 9px 11px; margin-bottom: 8px; }
  .point.improve { border-left: 4px solid #C58A21; }
  .point.strength { border-left: 4px solid #3B8C5A; }
  .point .title { font-weight: 700; margin-bottom: 3px; }
  .quote { font-style: italic; color: #68736D; border-left: 3px solid #DDE2DB;
           padding-left: 8px; margin: 5px 0; }
  .action { background: #ECEFE8; border-radius: 4px; padding: 6px 8px; font-size: 10pt; }
  ul { margin: 4px 0 8px; padding-left: 18px; }
  .muted { color: #68736D; }
  .warn { background: #FBF3E7; border: 1px solid #C58A21; border-radius: 6px;
          padding: 8px 10px; margin-bottom: 14px; font-size: 10pt; }
  .foot { margin-top: 26px; padding-top: 8px; border-top: 1px solid #DDE2DB;
          color: #68736D; font-size: 8.5pt; }
</style>
</head>
<body>

<h1>${escapeHtml(record.topic.title)}</h1>
<div class="meta">
  ${formatDate(record.createdAt)} ·
  ${escapeHtml(rhetoricCategoryLabels[record.topic.category])} ·
  ${record.mode === "impromptu" ? "Doğaçlama" : "Hazırlıklı"} ·
  Süre ${formatDuration(record.recording.durationSeconds)}
  (hedef ${formatDuration(record.targetDurationSeconds)})
</div>

${
  analysis.audioAnalysisFallback
    ? `<div class="warn">Bu değerlendirme ses kaydından değil, yalnızca yazı dökümünden yapıldı.
       Dolgu sesi, duraklama ve tonlama ölçümleri güvenilir değil.</div>`
    : ""
}

<div class="summary">
  <div class="overall">${analysis.scores.overall}</div>
  <div>${escapeHtml(analysis.summary)}</div>
  ${
    record.selfAssessment
      ? `<div class="muted" style="margin-top:6px">Senin puanın: ${record.selfAssessment.score}/10${
          record.selfAssessment.note ? ` — “${escapeHtml(record.selfAssessment.note)}”` : ""
        }</div>`
      : ""
  }
</div>

<h2>Puanlar</h2>
<table>
${SCORE_LABELS.map(
  (item) => `<tr>
    <td style="width:40%">${escapeHtml(item.label)}</td>
    <td style="width:12%"><strong>${analysis.scores[item.key]}</strong></td>
    <td><div class="bar"><span style="width:${clampPercent(analysis.scores[item.key])}%"></span></div></td>
  </tr>`
).join("")}
</table>

<h2>Ölçümler</h2>
<div class="grid">
  ${tile("Dolgu sesi", String(analysis.metrics.fillerSoundCount), `dakikada ${(analysis.metrics.fillerSoundCount / minutes).toFixed(1)}`)}
  ${tile("Dolgu kelimesi", String(analysis.metrics.fillerWordCount), `dakikada ${(analysis.metrics.fillerWordCount / minutes).toFixed(1)}`)}
  ${tile("Konuşma hızı", String(Math.round(analysis.metrics.wordsPerMinute)), "kelime/dk · rahat aralık 130–160")}
  ${tile("Duraklama", String(analysis.metrics.pauseCount), `en uzunu ${analysis.metrics.longestPauseSeconds.toFixed(1)} sn`)}
  ${tile("Sessizlik", `%${Math.round(analysis.metrics.silenceRatio * 100)}`, "toplam sürenin oranı")}
  ${tile("Kelime çeşitliliği", `%${Math.round(analysis.metrics.uniqueWordRatio * 100)}`, "benzersiz / toplam")}
</div>
${
  analysis.metrics.topFillers.length > 0
    ? `<p class="muted">En sık dolgular: ${analysis.metrics.topFillers
        .map((filler) => `${escapeHtml(filler.text)} (${filler.count})`)
        .join(", ")}</p>`
    : ""
}

${
  analysis.improvements.length > 0
    ? `<h2>Geliştirilecekler</h2>${analysis.improvements.map((point) => renderPoint(point, "improve")).join("")}`
    : ""
}

${
  analysis.strengths.length > 0
    ? `<h2>Güçlü yanlar</h2>${analysis.strengths.map((point) => renderPoint(point, "strength")).join("")}`
    : ""
}

<h2>Yapı</h2>
<table>
  ${row("Giriş", analysis.structureFeedback.opening)}
  ${row("Gövde", analysis.structureFeedback.body)}
  ${row("Kapanış", analysis.structureFeedback.closing)}
  ${row("Geçişler", analysis.structureFeedback.transitions)}
</table>

<h2>Sunum</h2>
<table>
  ${row("Tempo", analysis.deliveryFeedback.pace)}
  ${row("Tonlama", analysis.deliveryFeedback.intonation)}
  ${row("Diksiyon", analysis.deliveryFeedback.articulation)}
  ${row("Enerji", analysis.deliveryFeedback.energy)}
</table>

${
  record.preparationNotes.trim()
    ? `<h2>Hazırlık karşılaştırması</h2>
       ${list("Anlattıkların", analysis.preparationFeedback.coveredPoints)}
       ${list("Atladıkların", analysis.preparationFeedback.missedPoints)}
       ${list("Doğaçlama eklediklerin", analysis.preparationFeedback.improvisedPoints)}
       <p>${escapeHtml(analysis.preparationFeedback.comment)}</p>
       <h2>Hazırlık notların</h2>
       <p class="muted" style="white-space:pre-wrap">${escapeHtml(record.preparationNotes.trim())}</p>`
    : ""
}

${
  marked.length > 0
    ? `<h2>İşaretlenen anlar</h2>
       <table>
         <tr><th>Zaman</th><th>Tür</th><th>İçerik</th></tr>
         ${marked
           .slice(0, 40)
           .map(
             (segment) => `<tr>
               <td>${formatDuration(Math.round(segment.startSeconds))}</td>
               <td class="muted">${escapeHtml(SEGMENT_LABELS[segment.kind] ?? segment.kind)}</td>
               <td>${escapeHtml(segment.text || "—")}${
                 segment.note ? ` <span class="muted">— ${escapeHtml(segment.note)}</span>` : ""
               }</td>
             </tr>`
           )
           .join("")}
       </table>`
    : ""
}

<h2>Konuşma metni</h2>
<p style="white-space:pre-wrap">${escapeHtml(analysis.transcript)}</p>

${
  analysis.nextSessionFocus.length > 0
    ? `<h2>Sonraki seansta odak</h2><ul>${analysis.nextSessionFocus
        .map((focus) => `<li>${escapeHtml(focus)}</li>`)
        .join("")}</ul>`
    : ""
}

<div class="foot">
  Daily Speaking Coach · Hitabet modülü ·
  Analiz kaynağı: ${analysis.analysisSource === "audio" ? "ses kaydı" : "yazı dökümü"}
</div>

</body>
</html>`;
}

/* ------------------------------------------------------------------ */

function renderPoint(point: { title: string; detail: string; quote: string; action: string }, tone: string): string {
  return `<div class="point ${tone}">
    <div class="title">${escapeHtml(point.title)}</div>
    <div>${escapeHtml(point.detail)}</div>
    ${point.quote ? `<div class="quote">“${escapeHtml(point.quote)}”</div>` : ""}
    ${point.action ? `<div class="action"><strong>Ne yapmalı:</strong> ${escapeHtml(point.action)}</div>` : ""}
  </div>`;
}

function tile(label: string, value: string, hint: string): string {
  return `<div class="tile">
    <div class="label">${escapeHtml(label)}</div>
    <div class="value">${escapeHtml(value)}</div>
    <div class="hint">${escapeHtml(hint)}</div>
  </div>`;
}

function row(label: string, value: string): string {
  if (!value) {
    return "";
  }
  return `<tr><td style="width:22%" class="muted">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
}

function list(label: string, items: string[]): string {
  if (items.length === 0) {
    return "";
  }
  return `<p><strong>${escapeHtml(label)}</strong></p><ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

/** The transcript is model output; it must never be able to inject markup. */
function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitize(value: string): string {
  return value
    .replace(/[<>:"/\\|?* -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
