/**
 * Sends one real recording through /api/analyze-rhetoric and prints what came
 * back in a readable form.
 *
 * This is the test the offline suite cannot do. Two questions can only be
 * answered with a real recording and a real API key:
 *
 *   1. Does the model reliably hear hesitation sounds? Pass --beklenen-iii N
 *      with the number of "ııı" you know you made, and the script reports how
 *      many it caught. If that number is badly off, the whole filler-counting
 *      idea needs the ffmpeg energy fallback instead.
 *
 *   2. What does a session cost? The backend logs token counts on every model
 *      call (look for "openai_usage" in the backend's console output).
 *
 * Before running:
 *   1. backend/.env must contain OPENAI_API_KEY
 *   2. start the backend:  npm start        (in the backend folder)
 *   3. in another terminal, run this script
 *
 * Usage:
 *   node scripts/rhetoricLiveTest.js --ses kayit.wav --konu "Konu başlığı"
 *
 * Options:
 *   --ses <dosya>          Recording to send. Required. wav / m4a / mp3 / webm.
 *   --konu <metin>         The topic that was spoken about. Required.
 *   --notlar <dosya>       Text file with the preparation notes. Optional.
 *   --mod <tip>            prepared (default) or impromptu.
 *   --hedef <saniye>       Target duration. Defaults to the real duration.
 *   --beklenen-iii <sayi>  How many "ııı" you actually made, to check accuracy.
 *   --url <adres>          Backend base URL. Default http://localhost:8080
 *   --json <dosya>         Also write the raw response here, for comparing runs.
 */

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    args[key] = next && !next.startsWith("--") ? next : "true";
  }
  return args;
}

function fail(message) {
  console.error(`\nHATA: ${message}\n`);
  process.exit(1);
}

/** Reads the duration out of a WAV header, so --hedef can be optional. */
function readWavDurationSeconds(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") {
      return 0;
    }
    const byteRate = buffer.readUInt32LE(28);
    const dataSize = buffer.readUInt32LE(40);
    return byteRate > 0 ? Math.round(dataSize / byteRate) : 0;
  } catch {
    return 0;
  }
}

function contentTypeFor(filePath) {
  const types = {
    ".wav": "audio/wav",
    ".m4a": "audio/m4a",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".webm": "audio/webm"
  };
  return types[path.extname(filePath).toLowerCase()] || "";
}

function bar(value, max, width = 28) {
  const filled = Math.max(0, Math.min(width, Math.round((value / max) * width)));
  return "█".repeat(filled) + "·".repeat(width - filled);
}

function formatDuration(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const audioPath = args.ses;
  const topic = args.konu;
  if (!audioPath || audioPath === "true") {
    fail('Ses dosyası gerekli.  Örnek: node scripts/rhetoricLiveTest.js --ses kayit.wav --konu "Konu"');
  }
  if (!topic || topic === "true") {
    fail("--konu gerekli (konuşmanın konusu).");
  }
  if (!fs.existsSync(audioPath)) {
    fail(`Ses dosyası bulunamadı: ${audioPath}`);
  }

  const contentType = contentTypeFor(audioPath);
  if (!contentType) {
    fail("Desteklenmeyen dosya türü. wav, m4a, mp3, mp4 veya webm kullan.");
  }

  const baseUrl = (args.url && args.url !== "true" ? args.url : "http://localhost:8080").replace(/\/+$/, "");
  const mode = args.mod && args.mod !== "true" ? args.mod : "prepared";

  const stats = fs.statSync(audioPath);
  const detectedDuration = readWavDurationSeconds(audioPath);
  const durationSeconds = Number(args.sure) || detectedDuration;
  if (!durationSeconds) {
    fail("Süre belirlenemedi. WAV değilse --sure <saniye> ile elle ver.");
  }
  const targetDurationSeconds = Number(args.hedef) || durationSeconds;

  let preparationNotes = "";
  if (args.notlar && args.notlar !== "true") {
    if (!fs.existsSync(args.notlar)) {
      fail(`Not dosyası bulunamadı: ${args.notlar}`);
    }
    preparationNotes = fs.readFileSync(args.notlar, "utf8");
  }

  console.log("\nGÖNDERİLİYOR");
  console.log(`  Dosya   : ${audioPath}  (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  Süre    : ${formatDuration(durationSeconds)}  (hedef ${formatDuration(targetDurationSeconds)})`);
  console.log(`  Konu    : ${topic}`);
  console.log(`  Mod     : ${mode}`);
  console.log(`  Notlar  : ${preparationNotes ? `${preparationNotes.length} karakter` : "yok"}`);
  console.log(`  Sunucu  : ${baseUrl}`);

  const formData = new FormData();
  formData.append("topic", topic);
  formData.append("mode", mode);
  formData.append("durationSeconds", String(durationSeconds));
  formData.append("targetDurationSeconds", String(targetDurationSeconds));
  if (preparationNotes) {
    formData.append("preparationNotes", preparationNotes);
  }
  formData.append(
    "file",
    new Blob([fs.readFileSync(audioPath)], { type: contentType }),
    `hitabet-pratigi${path.extname(audioPath)}`
  );

  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(`${baseUrl}/api/analyze-rhetoric`, {
      method: "POST",
      headers: { "X-Client-Id": "rhetoric-live-test" },
      body: formData
    });
  } catch (error) {
    fail(`Sunucuya ulaşılamadı (${baseUrl}). Backend çalışıyor mu?  ${error.message}`);
  }

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const text = await response.text();

  if (!response.ok) {
    console.error(`\nSunucu ${response.status} döndü (${elapsedSeconds} sn):\n${text}\n`);
    process.exit(1);
  }

  const payload = JSON.parse(text);
  const analysis = payload.analysis;

  if (args.json && args.json !== "true") {
    fs.writeFileSync(args.json, JSON.stringify(payload, null, 2), "utf8");
    console.log(`\n  Ham cevap yazıldı: ${args.json}`);
  }

  /* ---------------- report ---------------- */

  console.log(`\nCEVAP GELDİ  (${elapsedSeconds} saniye)`);
  console.log(`  Analiz kaynağı : ${analysis.analysisSource === "audio" ? "SES ✓" : "sadece yazı dökümü ✗"}`);
  if (analysis.audioAnalysisFallback) {
    console.log("  UYARI: ses analizi başarısız oldu, metne düşüldü.");
    console.log("         Dolgu sesi ve tonlama ölçümleri bu durumda güvenilir değil.");
  }

  console.log("\nPUANLAR");
  const labels = {
    content: "İçerik ve argüman",
    structure: "Yapı ve akış",
    fluency: "Akıcılık ve tempo",
    language: "Dil ve üslup",
    impact: "Etki ve anlatıcılık",
    voice: "Ses kullanımı",
    overall: "GENEL"
  };
  for (const [key, label] of Object.entries(labels)) {
    const score = analysis.scores?.[key] ?? 0;
    console.log(`  ${label.padEnd(20)} ${String(score).padStart(3)}  ${bar(score, 100)}`);
  }

  console.log("\nÖLÇÜMLER");
  const metrics = analysis.metrics || {};
  console.log(`  Konuşma hızı        : ${metrics.wordsPerMinute} kelime/dk`);
  console.log(`  Dolgu SESİ (ııı)    : ${metrics.fillerSoundCount}`);
  console.log(`  Dolgu KELİMESİ      : ${metrics.fillerWordCount}`);
  console.log(`  Duraklama sayısı    : ${metrics.pauseCount}  (en uzun ${metrics.longestPauseSeconds} sn)`);
  console.log(`  Sessizlik oranı     : %${Math.round((metrics.silenceRatio || 0) * 100)}`);
  console.log(`  Kelime çeşitliliği  : %${Math.round((metrics.uniqueWordRatio || 0) * 100)}`);
  console.log(`  Ort. cümle uzunluğu : ${metrics.averageSentenceWords} kelime`);
  if (metrics.topFillers?.length) {
    const list = metrics.topFillers.map((item) => `${item.text} (${item.count})`).join(", ");
    console.log(`  En sık dolgular     : ${list}`);
  }

  // The measurement this whole phase exists to validate.
  const expectedFillers = Number(args["beklenen-iii"]);
  if (Number.isFinite(expectedFillers) && expectedFillers > 0) {
    const found = metrics.fillerSoundCount || 0;
    const accuracy = Math.round((Math.min(found, expectedFillers) / expectedFillers) * 100);
    console.log("\nDOLGU SESİ TESPİT DOĞRULUĞU");
    console.log(`  Sen söyledin : ${expectedFillers}`);
    console.log(`  Model buldu  : ${found}`);
    console.log(`  Yakalama     : %${accuracy}`);
    if (accuracy >= 80) {
      console.log("  → Yeterli. Dolgu sesi ölçümü modele bırakılabilir.");
    } else if (accuracy >= 50) {
      console.log("  → Sınırda. Ses enerjisi tabanlı yedek ölçüm düşünülmeli.");
    } else {
      console.log("  → Zayıf. Yedek plana geçilmeli: ffmpeg ile sessizlik/enerji analizi.");
    }
  }

  const segments = analysis.segments || [];
  if (segments.length) {
    const counts = segments.reduce((acc, segment) => {
      acc[segment.kind] = (acc[segment.kind] || 0) + 1;
      return acc;
    }, {});
    console.log("\nİŞARETLENMİŞ METİN");
    console.log(`  Toplam parça: ${segments.length}`);
    for (const [kind, count] of Object.entries(counts)) {
      console.log(`    ${kind.padEnd(14)} ${count}`);
    }
    const flagged = segments.filter((segment) => segment.kind !== "speech").slice(0, 8);
    if (flagged.length) {
      console.log("  İlk işaretler:");
      for (const segment of flagged) {
        const at = formatDuration(segment.startSeconds || 0);
        console.log(`    [${at}] ${segment.kind}: "${segment.text}" ${segment.note ? `— ${segment.note}` : ""}`);
      }
    }
  }

  if (analysis.improvements?.length) {
    console.log("\nGELİŞTİRİLECEKLER");
    for (const item of analysis.improvements) {
      console.log(`  • ${item.title}`);
      console.log(`      ${item.detail}`);
      if (item.quote) console.log(`      Alıntı : "${item.quote}"`);
      if (item.action) console.log(`      Yapılacak: ${item.action}`);
    }
  }

  if (analysis.strengths?.length) {
    console.log("\nGÜÇLÜ YANLAR");
    for (const item of analysis.strengths) {
      console.log(`  • ${item.title} — ${item.detail}`);
    }
  }

  const preparation = analysis.preparationFeedback;
  if (preparation && (preparation.coveredPoints?.length || preparation.missedPoints?.length)) {
    console.log("\nHAZIRLIK KARŞILAŞTIRMASI");
    console.log(`  Anlatılan : ${preparation.coveredPoints.join(", ") || "-"}`);
    console.log(`  Atlanan   : ${preparation.missedPoints.join(", ") || "-"}`);
    console.log(`  Doğaçlama : ${preparation.improvisedPoints.join(", ") || "-"}`);
    console.log(`  Yorum     : ${preparation.comment}`);
  }

  console.log(`\nÖZET\n  ${analysis.summary}`);

  if (analysis.nextSessionFocus?.length) {
    console.log("\nSONRAKİ SEANSTA ODAK");
    for (const focus of analysis.nextSessionFocus) {
      console.log(`  → ${focus}`);
    }
  }

  console.log("\nMALİYET: backend konsolunda \"openai_usage\" satırlarına bak.");
  console.log("         Orada input/output/audioInput token sayıları var.\n");
}

main().catch((error) => {
  console.error(`\nBeklenmeyen hata: ${error?.stack || error}\n`);
  process.exit(1);
});
