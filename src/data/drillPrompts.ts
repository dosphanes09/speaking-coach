/**
 * The drill bank.
 *
 * Three kinds, each training one thing and nothing else:
 *
 *   dolgu_yasagi  Speak for a minute with no hesitation sounds. The prompts are
 *                 deliberately trivial — "describe your morning" — because the
 *                 attention has to go on monitoring your own mouth, not on
 *                 finding something to say. A hard topic would train the wrong
 *                 muscle and produce more "ııı", not less.
 *
 *   tempo         Read a fixed passage at a set pace. The same passage appears
 *                 at three speeds on purpose: the skill is not "talk faster" or
 *                 "talk slower", it is being able to choose. A speaker who can
 *                 only run at one speed cannot slow down for the sentence that
 *                 matters.
 *
 *   tekerleme     Turkish tongue twisters, for articulation. Scored by
 *                 comparing what was transcribed against what was written, so
 *                 a swallowed syllable shows up as a mismatch rather than as
 *                 someone's opinion.
 *
 * Word counts are computed rather than written down: a hand-typed count drifts
 * the moment anyone edits a passage, and the tempo target depends on it.
 */
import { DrillKind, DrillPrompt } from "@/types/drill";

export const drillKindLabels: Record<DrillKind, string> = {
  dolgu_yasagi: "Dolgu yasağı",
  tempo: "Tempo tutturma",
  tekerleme: "Tekerleme"
};

export const drillKindDescriptions: Record<DrillKind, string> = {
  dolgu_yasagi: "60 saniye konuş, tek 'ııı' bile yok",
  tempo: "Verilen metni hedef hızda oku",
  tekerleme: "Hızlan ama heceleri yutma"
};

export const drillKindGoals: Record<DrillKind, string> = {
  dolgu_yasagi: "Tereddüt anında ses çıkarmak yerine susmayı öğretir.",
  tempo: "Konuşma hızını isteyerek değiştirebilmeyi öğretir.",
  tekerleme: "Diksiyon: hızlanırken hece netliğini korumayı öğretir."
};

/* ------------------------------------------------------------------ *
 * Filler ban
 * ------------------------------------------------------------------ */

const FILLER_BAN_TOPICS: Array<[string, string, DrillPrompt["difficulty"]]> = [
  ["Bu sabah uyandığından beri ne yaptın?", "Sırayla anlat. Süslemeye çalışma.", "kolay"],
  ["Bulunduğun odayı tarif et.", "Gözünle gez ve gördüğünü söyle.", "kolay"],
  ["En son yediğin yemeği anlat.", "Nasıl yapıldığını da anlatabilirsin.", "kolay"],
  ["Evden çıkıp bir markete nasıl gidilir?", "Yol tarifi verir gibi anlat.", "kolay"],
  ["En son izlediğin film veya diziyi anlat.", "Konusunu değil, neden izlediğini anlat.", "orta"],
  ["Bugün yapman gereken işleri say.", "Her biri için bir cümle.", "orta"],
  ["Bir arkadaşını tarif et.", "Sıfat sıralama; bir sahne anlat.", "orta"],
  ["Telefonunu nasıl kullandığını anlat.", "Sabahtan akşama, hangi uygulamayı ne için.", "orta"],
  ["Bir hafta sonunu nasıl geçirmek istersin?", "Saat saat anlat.", "zor"],
  ["Öğrendiğin son yeni şeyi anlat.", "Ne olduğunu ve nasıl öğrendiğini.", "zor"]
];

/* ------------------------------------------------------------------ *
 * Tempo passages
 * ------------------------------------------------------------------ */

/**
 * Neutral, information-dense prose. Deliberately not literary: a passage with
 * emotional weight invites performance, and performance changes tempo, which
 * is the one thing being measured here.
 */
const TEMPO_PASSAGES: Array<{ id: string; text: string }> = [
  {
    id: "kopru",
    text: `Bir asma köprünün taşıyıcı sistemi, ilk bakışta göründüğünden çok daha basit bir fikre dayanır. İki kule arasına gerilen ana halat, üzerine binen yükü kendi eğrisi boyunca dağıtır ve bu yükü kulelere aktarır. Kuleler de yükü zemine indirir. Tabliye, yani üzerinden geçtiğimiz yol, aslında ana halattan sarkan dikey askılara asılıdır; kendi başına taşıyıcı değildir. Bu yüzden asma köprüler çok uzun açıklıkları, arada hiç ayak olmadan geçebilir. Sistemin zayıf noktası ağırlık değil, rüzgârdır. Belirli bir hızda esen yan rüzgâr, tabliyeyi kendi doğal titreşim frekansında salınmaya zorlarsa, salınımın genliği her turda büyür. Modern köprülerde tabliye bu yüzden rüzgârı içinden geçirecek biçimde tasarlanır ve titreşimi söndüren ek elemanlarla desteklenir.`
  },
  {
    id: "uyku",
    text: `Uyku, dinlenmekten ibaret pasif bir süreç değildir. Gece boyunca beyin birbirinden farklı evreler arasında birkaç kez gidip gelir ve her evrenin ayrı bir işi vardır. Derin uyku sırasında vücut onarım işlerini yürütür; büyüme hormonu salgılanır, bağışıklık sistemi güçlenir. Hızlı göz hareketi evresinde ise beyin neredeyse uyanıkken olduğu kadar etkindir. Gün içinde öğrenilen bilgi bu evrede yeniden işlenir, işe yarayanlar uzun süreli belleğe aktarılır, gereksiz olanlar zayıflatılır. Bu yüzden bir konuyu öğrendikten sonra uyumak, aynı süre boyunca tekrar etmekten çoğu zaman daha etkilidir. Uykusuz geçen bir gecenin bedeli sadece yorgunluk değildir; o gün öğrenilenlerin önemli bir kısmı hiç kaydedilmemiş olur.`
  }
];

const TEMPO_TARGETS: Array<{ wpm: number; label: string; difficulty: DrillPrompt["difficulty"] }> = [
  { wpm: 120, label: "ağır ve vurgulu", difficulty: "orta" },
  { wpm: 145, label: "normal sunum temposu", difficulty: "kolay" },
  { wpm: 170, label: "hızlı ama anlaşılır", difficulty: "zor" }
];

/* ------------------------------------------------------------------ *
 * Tongue twisters
 * ------------------------------------------------------------------ */

const TONGUE_TWISTERS: Array<[string, DrillPrompt["difficulty"]]> = [
  ["Dal kalkar kartal sarkar, kartal kalkar dal sarkar.", "kolay"],
  ["Kırk küp, kırkının da kulpu kırık küp.", "kolay"],
  ["Şu köşe yaz köşesi, şu köşe kış köşesi, ortada su şişesi.", "kolay"],
  ["Bir berber bir berbere gel beraber bir berber dükkânı açalım demiş.", "orta"],
  ["Bu yoğurdu sarımsaklasak da mı saklasak, sarımsaklamasak da mı saklasak?", "orta"],
  [
    "Değirmene girdi köpek, değirmenci vurdu kötek; hem kepek yedi köpek, hem kötek yedi köpek.",
    "orta"
  ],
  [
    "Al bu takatukaları takatukacıya takatukalatmaya götür. Takatukacı takatukaları takatukalatmam derse takatukaları takatukacıdan takatukalatmadan geri getir.",
    "zor"
  ],
  [
    "Şu yoğurtçu Yorgo'nun yoğurdu, bizim yoğurtçunun yoğurdundan daha yoğurtlu bir yoğurttur.",
    "zor"
  ]
];

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

/** Whitespace-delimited tokens containing a letter. Matches the backend's rule. */
export function countDrillWords(text: string): number {
  return String(text || "")
    .replace(/\[[^\]]*\]/g, " ")
    .split(/\s+/)
    .filter((token) => /\p{L}/u.test(token)).length;
}

function buildDrillPrompts(): DrillPrompt[] {
  const prompts: DrillPrompt[] = [];

  FILLER_BAN_TOPICS.forEach(([title, instruction, difficulty], index) => {
    prompts.push({
      id: `dolgu-${String(index + 1).padStart(2, "0")}`,
      kind: "dolgu_yasagi",
      title,
      instruction: `${instruction} Takıldığın yerde "ııı" deme — sus. Sessizlik cezalandırılmıyor, dolgu sesi cezalandırılıyor.`,
      durationSeconds: 60,
      difficulty
    });
  });

  TEMPO_PASSAGES.forEach((passage) => {
    TEMPO_TARGETS.forEach((target) => {
      const words = countDrillWords(passage.text);
      // The window is sized from the passage and the target, plus a margin, so
      // hitting the pace is what ends the drill rather than the clock running out.
      const idealSeconds = (words / target.wpm) * 60;
      prompts.push({
        id: `tempo-${passage.id}-${target.wpm}`,
        kind: "tempo",
        title: `${target.wpm} kelime/dk — ${target.label}`,
        instruction: `Metni bu hızda oku. ${words} kelime, yaklaşık ${Math.round(
          idealSeconds
        )} saniye sürmeli. Hızlanmak için heceleri yutma; yavaşlamak için araya boşluk koyma.`,
        text: passage.text,
        targetWordsPerMinute: target.wpm,
        durationSeconds: Math.min(90, Math.round(idealSeconds * 1.6)),
        difficulty: target.difficulty
      });
    });
  });

  TONGUE_TWISTERS.forEach(([text, difficulty], index) => {
    prompts.push({
      id: `tekerleme-${String(index + 1).padStart(2, "0")}`,
      kind: "tekerleme",
      title: "Tekerleme",
      instruction:
        "Üç kez arka arkaya söyle, her seferinde biraz hızlan. Hata yaparsan durma, devam et — ölçülen şey heceleri koruyup koruyamadığın.",
      text,
      durationSeconds: 45,
      difficulty
    });
  });

  return prompts;
}

export const drillPrompts: DrillPrompt[] = buildDrillPrompts();

export interface DrillFilter {
  kind?: DrillKind;
  difficulty?: DrillPrompt["difficulty"];
  /** Recently used prompt ids, so the same one does not come straight back. */
  recentPromptIds?: string[];
}

export function pickDrillPrompt(filter: DrillFilter = {}): DrillPrompt {
  const matching = drillPrompts.filter((prompt) => {
    if (filter.kind && prompt.kind !== filter.kind) {
      return false;
    }
    if (filter.difficulty && prompt.difficulty !== filter.difficulty) {
      return false;
    }
    return true;
  });

  const pool = matching.length > 0 ? matching : drillPrompts;
  const recent = new Set(filter.recentPromptIds ?? []);
  const unseen = pool.filter((prompt) => !recent.has(prompt.id));
  const candidates = unseen.length > 0 ? unseen : pool;

  return candidates[Math.floor(Math.random() * candidates.length)] as DrillPrompt;
}

export function findDrillPrompt(promptId: string): DrillPrompt | undefined {
  return drillPrompts.find((prompt) => prompt.id === promptId);
}
