/**
 * Prompts for the micro-drills.
 *
 * The tone is different from the rhetoric coach on purpose. A rhetoric report
 * is read once, carefully, and can afford nuance. A drill result is glanced at
 * between two reps, so it has to land in a sentence — and it has to be honest
 * about a bad rep without being discouraging, because the whole value of the
 * feature is that the speaker does another one immediately.
 *
 * The model is never asked whether the rep passed. That is arithmetic, and it
 * is already decided before this prompt is built; the facts are handed over so
 * the coaching cannot contradict the verdict shown next to it.
 */

const DRILL_SYSTEM_INSTRUCTION = [
  "Sen kısa diksiyon ve konuşma egzersizlerini değerlendiren bir koçsun.",
  "Kısa konuşursun: iki cümle açıklama, bir cümle öneri.",
  "Abartılı övgü ya da genel geçir laf etmezsin.",
  "Sadece şemaya uyan geçerli JSON döndür. Tüm metin alanları Türkçe olacak."
].join(" ");

/* ------------------------------------------------------------------ *
 * Listening step — only for the filler-ban drill
 * ------------------------------------------------------------------ */

const DRILL_LISTENING_SYSTEM_INSTRUCTION =
  "Kısa bir konuşma kaydını dinleyip duyduğun tereddüt seslerini eksiksiz not edersin. " +
  "Yorum yapmaz, puan vermezsin. Türkçe yazarsın.";

/**
 * Deliberately narrow: this step exists for one measurement.
 *
 * The rhetoric version of this prompt asks for eight categories because a
 * five-minute speech has eight things worth hearing. Asking for all of them
 * here would cost tokens and attention on a drill whose entire pass condition
 * is "did any hesitation sound come out of your mouth".
 */
function buildDrillListeningPrompt({ durationSeconds }) {
  return `Ekteki ${durationSeconds} saniyelik Türkçe kaydı dinle. Tek işin var:
tereddüt seslerini bulmak.

Zaman damgalarını d:ss biçiminde yaz (örn. 0:14).

DOLGU SESLERİ:
Anlamı olmayan her tereddüt sesi için bir satır: "- 0:12 ııı"
"ııı", "eee", "mmm", "ee", "aa" gibi sesler. Kelime değiller, ses onlar.
Hiç yoksa "- yok" yaz. Tahmin etme, yuvarlama yapma, gerçekten duyduğunu yaz.

DOLGU KELİMELERİ:
Cümleye anlam katmayan, boşluk dolduran kelimeler: yani, şey, hani, işte,
falan, aslında, böyle, ya. Her biri için: "- 0:31 yani"
DİKKAT: Bu kelimeler her zaman dolgu değildir. "Yani şunu demek istiyorum:"
bir bağlaçtır ve dolgu DEĞİLDİR — onu yazma.
Hiç yoksa "- yok" yaz.

DÖKÜM:
Konuşmanın tam metni. Tereddütleri temizleme, duyduğun yere olduğu gibi yaz.`;
}

/* ------------------------------------------------------------------ *
 * Structured step
 * ------------------------------------------------------------------ */

function describeDrillTask({ kind, targetText, targetWordsPerMinute, durationSeconds }) {
  if (kind === "tempo") {
    return `EGZERSİZ: Tempo tutturma.
Konuşmacıya bir metin ve bir hedef hız verildi; metni o hızda okuması istendi.
Hedef hız: ${targetWordsPerMinute} kelime/dakika.

OKUMASI İSTENEN METİN:
"""
${targetText}
"""

Bu egzersizde dolgu sesi ölçülmedi (kayıt bu amaçla dinlenmedi).
fillerSoundCount ve fillerWordCount alanlarına 0 yaz, fillerMoments boş kalsın.
Uydurma sayı yazma.`;
  }

  if (kind === "tekerleme") {
    return `EGZERSİZ: Tekerleme.
Konuşmacıdan aşağıdaki tekerlemeyi üç kez, giderek hızlanarak söylemesi istendi.
Ölçülen şey hız değil, hızlanırken hecelerin korunması.

TEKERLEME:
"""
${targetText}
"""

Dökümde tekerlemenin tekrarlandığını göreceksin, bu normal.
Bu egzersizde dolgu sesi ölçülmedi (kayıt bu amaçla dinlenmedi).
fillerSoundCount ve fillerWordCount alanlarına 0 yaz, fillerMoments boş kalsın.`;
  }

  return `EGZERSİZ: Dolgu yasağı.
Konuşmacıdan ${durationSeconds} saniye serbest konuşması ve bu sırada HİÇ
dolgu sesi ("ııı", "eee") çıkarmaması istendi. Takıldığı yerde ses çıkarmak
yerine susması söylendi — bu egzersizde sessizlik iyi bir şeydir.

fillerSoundCount, fillerWordCount ve fillerMoments alanlarını aşağıdaki
DİNLEME TUTANAĞI'ndan doldur. Tutanakta olmayan bir dolgu ekleme.`;
}

/**
 * The user-side prompt for the structured step.
 *
 * `evaluation` is the verdict that has already been computed. It is passed in
 * rather than left implicit so the coaching cannot say "tempoyu tutturdun" next
 * to a result that says the opposite — a contradiction the speaker would notice
 * immediately and which would cost the whole feature its credibility.
 */
function buildDrillAnalysisPrompt({
  kind,
  targetText = "",
  targetWordsPerMinute = null,
  durationSeconds,
  transcript,
  listeningReport = "",
  evaluation,
  measurementBlock = ""
}) {
  const verdict = evaluation.undecided
    ? "SONUÇ: Ölçülemedi."
    : `SONUÇ: ${evaluation.passed ? "GEÇTİ" : "GEÇMEDİ"} — ${evaluation.headline}`;

  return [
    describeDrillTask({ kind, targetText, targetWordsPerMinute, durationSeconds }),
    "",
    "ÖLÇÜLEN GERÇEKLER (bunlar hesaplandı, tartışmaya açık değil):",
    verdict,
    ...evaluation.facts.map((fact) => `  - ${fact}`),
    "",
    measurementBlock,
    listeningReport
      ? `DİNLEME TUTANAĞI (kaydı dinleyen modelin notu):\n"""\n${listeningReport}\n"""\n`
      : "",
    "KAYIT DÖKÜMÜ:",
    '"""',
    transcript || "(döküm oluşturulamadı)",
    '"""',
    "",
    `NE YAZACAKSIN:

detail  Bir veya iki cümle. Yukarıdaki sonuca UYGUN olmalı — geçmediyse geçti
        deme, geçtiyse kusur arama. Sayıları tekrar etme, ne anlama geldiğini
        söyle.

tip     Bir sonraki tekrarda somut olarak ne yapacağı. Tek cümle.
        "Daha dikkatli ol" değil. Örnekler:
          - "Cümleye başlamadan önce nefes al; 'ııı' genelde nefessiz
             başlangıçta çıkıyor."
          - "Virgülde yarım saniye dur, hız kendiliğinden düşecek."
          - "Son heceyi bitirmeden diğer kelimeye geçme."

transcript  Kayıtta söylenenler. Tereddütleri temizleme.

Bu bir egzersiz, sınav değil. Kısa tut; konuşmacı birazdan bir tekrar daha
yapacak ve uzun bir metni okumayacak.`
  ]
    .filter((part) => part !== "")
    .join("\n");
}

module.exports = {
  DRILL_SYSTEM_INSTRUCTION,
  DRILL_LISTENING_SYSTEM_INSTRUCTION,
  buildDrillListeningPrompt,
  buildDrillAnalysisPrompt
};
