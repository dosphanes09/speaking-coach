/**
 * Prompt construction for the Turkish rhetoric analysis.
 *
 * Two things this file is careful about:
 *
 * 1. The speaker is a competent native speaker who wants to get better, not a
 *    beginner who needs encouraging. Generic praise ("harika bir konuşmaydı")
 *    is worse than useless here — it costs a session and teaches nothing. The
 *    instructions below push hard for specific, quotable, actionable notes.
 *
 * 2. Scores drift between runs unless they are anchored to described bands.
 *    Without anchors an 80 one week and a 70 the next says nothing about the
 *    speaker. The bands below give the model a fixed ruler.
 */

const RHETORIC_SYSTEM_INSTRUCTION = [
  "Sen deneyimli bir Türkçe hitabet, diksiyon ve sunum koçusun.",
  "Karşındaki kişi anadili Türkçe olan, halihazırda yetkin bir konuşmacı;",
  "amacı iyi olmak değil, daha iyi olmak.",
  "Sadece şemaya uyan geçerli JSON döndür. Tüm metin alanları Türkçe olacak."
].join(" ");

/** Score bands, so the same performance gets roughly the same number twice. */
const SCORE_BANDS = `PUAN ARALIKLARI (her boyut için aynı ölçek):
90-100  Profesyonel sahne seviyesi. Kusur aramak zor.
80-89   Güçlü. Belirgin bir zayıflık yok, ince ayar meselesi.
70-79   İyi. Dinlenir, ama en az bir boyut konuşmayı geriye çekiyor.
60-69   Orta. Mesaj geçiyor ama akıcılık, yapı veya etkiden biri belirgin aksıyor.
50-59   Zayıf. Dinleyici zorlanıyor, takip kopuyor.
0-49    Konuşma amacına ulaşmıyor.

Bu kişi genelde 65-85 bandında olacak. 90+ vermeyi gerçekten hak eden bir
konuşma için sakla; 60 altını da ancak ciddi bir sorun varsa kullan.
Şişirilmiş puan bu kişiye zarar verir, çünkü neyi çalışacağını bilemez.`;

/** What counts as a filler, and what does not. */
const FILLER_DEFINITION = `DOLGU TESPİTİ — çok dikkatli ol, bu kullanıcının en önemli hedefi:

Dolgu SESLERİ (fillerSoundCount): "ııı", "eee", "mmm", "ee", "aa" gibi
anlamı olmayan, düşünürken çıkarılan sesler. Bunlar bir yazı dökümünde
GÖRÜNMEZ — sadece sesi dinleyerek sayılabilir. Her birini say, tahmini
yuvarlama yapma.

Dolgu KELİMELERİ (fillerWordCount): "yani", "şey", "hani", "işte", "falan",
"filan", "aslında", "açıkçası", "bir şekilde", "böyle", "ya".
ÖNEMLİ: Bu kelimeler her zaman dolgu değildir. Sadece cümleye anlam
katmadıkları, boşluk doldurdukları yerlerde say.
  - "Yani şunu demek istiyorum: ..."  -> dolgu DEĞİL, bağlaç görevinde.
  - "Bu konu yani şey biraz karışık"  -> dolgu, ikisi de.
Kararsız kaldığın yerde sayma; şişirilmiş bir sayı güveni bozar.

topFillers alanına en çok tekrarlanan dolguları gerçek sayılarıyla yaz.`;

/** How to build the marked-up transcript. */
const SEGMENT_RULES = `SEGMENT KURALLARI (işaretlenmiş metin için):

Konuşmayı baştan sona sırayla parçalara böl. Hiçbir bölümü atlama; parçaların
metinleri birleştirildiğinde konuşmanın tamamı çıkmalı.

kind değerleri:
  speech         Olağan konuşma. note = "".
  filler_sound   Dolgu sesi. text = duyduğun ses ("ııı"). note = "" olabilir.
  filler_word    Dolgu kelimesi. text = kelime. note = neden dolgu sayıldığı.
  long_pause     0.8 saniyeden uzun sessizlik. text = "" veya "…".
                 note = süresi ve etkisi ("1.9 sn — cümle ortasında, takılma").
  repetition     Fazla yaslanılan kelime/kalıp. note = kaç kez tekrarlandığı.
  strong_moment  Gerçekten iyi olan bir yer. note = neden işe yaradığı.

startSeconds her parçanın kayıttaki başlangıç anı (saniye). Kullanıcı bu
sayıya tıklayıp kendi kaydında o ana atlayacak, o yüzden olabildiğince
doğru ver.

speech parçalarını cümle veya birkaç cümlelik doğal bloklar halinde tut —
kelime kelime bölme.`;

const HONESTY_RULES = `GERİ BİLDİRİM KURALLARI:

- Her tespiti konuşmadan alınmış bir alıntıyla destekle (quote alanı).
  Alıntısız genel yorum yazma.
- improvements içindeki her madde için action alanına "bir dahaki sefere
  somut olarak ne yapsın" yaz. "Daha akıcı ol" değil; "Cümleye başlamadan
  önce nefes al, 'yani' yerine yarım saniye sessiz kal" gibi.
- strengths kısmını da ciddiye al ama uydurma. Gerçekten iyi bir şey yoksa
  az sayıda madde yaz, boş övgü üretme.
- 2-4 strengths, 2-4 improvements yeterli. Daha fazlası odağı dağıtır.
- nextSessionFocus en fazla 3 madde olsun ve improvements ile tutarlı olsun.
- summary 2-3 cümle: bu konuşmanın karakteri ve tek cümlelik ana mesaj.`;

function describeMode(mode) {
  if (mode === "impromptu") {
    return `MOD: Doğaçlama. Konuşmacı konuyu ancak 60 saniye önce gördü.
Bu modda yapı kusurlarına ve kelime arayışlarına daha toleranslı ol; asıl
baktığın şey panik anında akıcılığını koruyabilmesi ve bir fikri sıfırdan
ayakta kurabilmesi. Yine de dolgu sayımlarını olduğu gibi ver — bu modda
dolgu artışı normaldir ama ölçülmesi tam da bu yüzden değerlidir.`;
  }

  return `MOD: Hazırlıklı. Konuşmacının konuyu araştırmak için 15 dakikası vardı
ve bu sırada yapay zekâ kullanmadı. Bu modda yapı, argüman derinliği ve zaman
yönetimi tam olarak değerlendirilmeli — hazırlık için süresi vardı.`;
}

function describePreparationNotes(preparationNotes) {
  if (!preparationNotes) {
    return `HAZIRLIK NOTLARI: Yok.
preparationFeedback içindeki listeleri boş bırak ve comment alanına
"Hazırlık notu paylaşılmadı." yaz. Uydurma başlık üretme.`;
  }

  return `HAZIRLIK NOTLARI (konuşmacının 15 dakikada yazdıkları):
"""
${preparationNotes}
"""

Bu notları konuşmayla karşılaştır:
  coveredPoints    Notlarda olan ve gerçekten anlatılan başlıklar.
  missedPoints     Notlarda olan ama anlatılmayan başlıklar.
  improvisedPoints Notlarda olmayan ama konuşmada geçen, işe yaramış eklemeler.
  comment          Hazırlığını icraya ne kadar aktarabildiği üzerine kısa yorum.

Bu karşılaştırma bu kullanıcı için en değerli geri bildirimlerden biri:
genelde sorun hazırlıkta değil, hazırlananı aktarmakta olur.`;
}

/**
 * Builds the user-side prompt. `audioAttached` changes the instruction
 * meaningfully: with audio the model must trust its own ears over the
 * transcript, because a transcriber silently deletes exactly the hesitations
 * this feature exists to measure.
 */
function buildRhetoricAnalysisPrompt({
  topic,
  transcript,
  durationSeconds,
  targetDurationSeconds,
  preparationNotes,
  mode,
  audioAttached
}) {
  const sourceOfTruth = audioAttached
    ? `KAYNAK: Ses kaydı ekte ve ASIL KAYNAK ODUR.
Aşağıdaki yazı dökümü yalnızca yardımcıdır ve eksiktir: döküm çıkaran model
"ııı" gibi sesleri ve duraklamaları temizler. Sen sesi dinle, dolgu seslerini,
duraklamaları, tonlamayı ve tempoyu doğrudan oradan çıkar.
transcript alanına, duyduğun konuşmanın duraklama ve tereddütleri de
yansıtan kendi dökümünü yaz.`
    : `KAYNAK: Yalnızca yazı dökümü var, ses kaydı yok.
Bu yüzden fillerSoundCount, pauseCount, longestPauseSeconds, silenceRatio ve
voice puanını metinden çıkarabildiğin kadarıyla ver; emin olamadığın sayılar
için 0 yaz ve deliveryFeedback alanlarında sesin dinlenemediğini belirt.
Olmayan bir şeyi ölçmüş gibi yapma.`;

  return [
    `KONU: ${topic}`,
    describeMode(mode),
    `SÜRE: Konuşma ${durationSeconds} saniye sürdü. Hedeflenen süre ${targetDurationSeconds} saniyeydi.`,
    "",
    sourceOfTruth,
    "",
    describePreparationNotes(preparationNotes),
    "",
    SCORE_BANDS,
    "",
    FILLER_DEFINITION,
    "",
    SEGMENT_RULES,
    "",
    HONESTY_RULES,
    "",
    "YAZI DÖKÜMÜ:",
    '"""',
    transcript || "(döküm oluşturulamadı)",
    '"""'
  ].join("\n");
}

module.exports = {
  RHETORIC_SYSTEM_INSTRUCTION,
  buildRhetoricAnalysisPrompt
};
