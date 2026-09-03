/**
 * The Turkish topic bank.
 *
 * Written rather than generated so the module works with no network, costs
 * nothing per session, and — more importantly — so the topics are actually
 * good. A speaking prompt has to be narrow enough to say something specific
 * about in four minutes and open enough that two people would answer it
 * differently. "Teknoloji" fails both tests; "Bir teknolojinin hayatını
 * kolaylaştırdığını sandığın ama aslında zorlaştırdığı bir an" passes.
 *
 * `angles` are shown only AFTER the recording. Showing them during preparation
 * would do the thinking for the speaker, which is the one thing this exercise
 * is training.
 */
import { RhetoricCategory, RhetoricLevel, RhetoricTopic } from "@/types/rhetoric";

export const rhetoricCategoryLabels: Record<RhetoricCategory, string> = {
  gundelik: "Gündelik",
  fikir: "Fikir ve tartışma",
  teknik: "Açıklama ve öğretme",
  hikaye: "Hikâye anlatımı",
  ikna: "İkna",
  kariyer: "Kariyer ve iş"
};

export const rhetoricLevelLabels: Record<RhetoricLevel, string> = {
  kolay: "Kolay",
  orta: "Orta",
  zor: "Zor"
};

export const rhetoricCategoryDescriptions: Record<RhetoricCategory, string> = {
  gundelik: "Kendi deneyiminden yola çıkarak akıcı konuşma",
  fikir: "Bir pozisyon alıp gerekçelendirme",
  teknik: "Karmaşık bir şeyi anlaşılır anlatma",
  hikaye: "Kurgu, gerilim ve kapanışla anlatı kurma",
  ikna: "Dinleyiciyi bir eyleme yöneltme",
  kariyer: "Profesyonel ortamda kendini ifade etme"
};

function topic(
  id: string,
  category: RhetoricCategory,
  level: RhetoricLevel,
  title: string,
  angles: string[]
): RhetoricTopic {
  return { id, title, category, level, angles, source: "bank" };
}

export const rhetoricTopics: RhetoricTopic[] = [
  /* ---------------- Gündelik ---------------- */
  topic("gun-01", "gundelik", "kolay", "Son bir yılda fikrini değiştirdiğin bir konu ve seni değiştiren şey", [
    "Eski görüşünü savunurken kullandığın gerekçe neydi",
    "Değişimi tetikleyen tek bir an mı, birikim mi",
    "Bu değişim başka neleri değiştirdi"
  ]),
  topic("gun-02", "gundelik", "kolay", "Herkesin sevdiği ama senin sevmediğin bir şey ve nedenleri", [
    "Sevmeme sebebin estetik mi, ahlaki mi, pratik mi",
    "Karşı tarafın haklı olduğu nokta",
    "Bu konuda yanılıyor olabileceğin ihtimali"
  ]),
  topic("gun-03", "gundelik", "kolay", "Bugüne kadar aldığın en işe yaramaz tavsiye ve neden işe yaramadığı", [
    "Tavsiyeyi veren kişi neyi görmüyordu",
    "Aynı tavsiye kimin için doğru olurdu",
    "Yerine ne söylenmeliydi"
  ]),
  topic("gun-04", "gundelik", "orta", "Bir teknolojinin hayatını kolaylaştırdığını sandığın ama zorlaştırdığı bir an", [
    "Vaat edilen ile teslim edilen arasındaki fark",
    "Kolaylığın gizli maliyeti",
    "Geri dönebilir miydin, döner miydin"
  ]),
  topic("gun-05", "gundelik", "orta", "Alışkanlık haline getirdiğin ve gerçekten işe yarayan bir şey", [
    "Başlangıçtaki direnç neydi",
    "Kaç denemede oturdu",
    "Bırakınca ne oluyor"
  ]),
  topic("gun-06", "gundelik", "orta", "Bir şeyi bırakmanın devam etmekten daha cesur olduğu bir durum", [
    "Devam etmeni söyleyen ses kimindi",
    "Bırakma anındaki en somut korku",
    "Sonradan ne öğrendin"
  ]),
  topic("gun-07", "gundelik", "zor", "Kendinle ilgili en zor kabul ettiğin gerçek", [
    "Bunu ne zaman fark ettin",
    "Kabul etmemek sana ne kazandırıyordu",
    "Kabul ettikten sonra ne değişti"
  ]),
  topic("gun-08", "gundelik", "kolay", "Bugün sabah uyandığından beri dikkatini çeken bir ayrıntı", [
    "Neden onu fark ettin de başkası fark etmedi",
    "Bu ayrıntı neyin göstergesi",
    "Genelleştirilebilir mi"
  ]),

  /* ---------------- Fikir ve tartışma ---------------- */
  topic("fik-01", "fikir", "orta", "Yapay zekâ araçları düşünme becerimizi geliştiriyor mu, köreltiyor mu?", [
    "Hesap makinesi matematiği köreltti mi",
    "Hangi beceri devrediliyor, hangisi kalıyor",
    "Ölçmek için neye bakmalıyız"
  ]),
  topic("fik-02", "fikir", "orta", "Uzaktan çalışma bir kazanım mı, yoksa gizli bir kayıp mı?", [
    "Kim kazanıyor, kim kaybediyor",
    "Kaybedilen şey ölçülebilir mi",
    "Hibrit bir orta yol gerçekten var mı"
  ]),
  topic("fik-03", "fikir", "zor", "Bir toplumda ifade özgürlüğünün sınırı nerede başlamalı?", [
    "Zarar ilkesi nasıl tanımlanır",
    "Sınırı kim çizecek sorusu",
    "Kendi görüşünün en güçlü karşı argümanı"
  ]),
  topic("fik-04", "fikir", "orta", "Başarı ölçülebilir mi? Ölçtüğümüz anda bozuluyor mu?", [
    "Goodhart yasası: ölçüt hedefe dönüşünce",
    "Ölçmediğimizde ne kaybediyoruz",
    "Kendi hayatında hangi ölçütü kullanıyorsun"
  ]),
  topic("fik-05", "fikir", "zor", "Meritokrasi adil bir sistem mi, yoksa şansın kılığını değiştirmesi mi?", [
    "Doğuştan gelen avantajların payı",
    "Alternatifi ne, o daha mı iyi",
    "Sistemi savunanların en güçlü noktası"
  ]),
  topic("fik-06", "fikir", "orta", "Sosyal medya kutuplaşmanın sebebi mi, yoksa aynası mı?", [
    "Kutuplaşma internetten önce de var mıydı",
    "Algoritmanın rolü ne kadar belirleyici",
    "Çözüm tasarımda mı, kullanıcıda mı"
  ]),
  topic("fik-07", "fikir", "zor", "Bir şeyi anlamak için ona katılmak gerekir mi?", [
    "Empati ile onay arasındaki fark",
    "Anlamanın sınırı nerede",
    "Bu ayrımı kaybettiğimizde ne oluyor"
  ]),
  topic("fik-08", "fikir", "orta", "Çok çalışmak mı akıllı çalışmak mı? Bu ayrım gerçek mi?", [
    "İkisinin de yeterli olmadığı durumlar",
    "Kimin işine yarıyor bu ayrım",
    "Kendi deneyiminden bir karşı örnek"
  ]),

  /* ---------------- Açıklama ve öğretme ---------------- */
  topic("tek-01", "teknik", "orta", "Bildiğin bir konuyu, o konuyu hiç bilmeyen birine anlat", [
    "Hangi ön bilgiyi varsaydın",
    "Kullandığın benzetme nereye kadar doğru",
    "Yanlış anlaşılmaya en açık kısım"
  ]),
  topic("tek-02", "teknik", "orta", "İşinde her gün kullandığın bir kavramı, meslekten olmayan birine açıkla", [
    "Jargonu nasıl çıkardın",
    "Gerçek hayattan karşılığı",
    "Neden önemli olduğunu söyledin mi"
  ]),
  topic("tek-03", "teknik", "zor", "Karmaşık bir sistemin nasıl çalıştığını üç dakikada anlat", [
    "Hangi ayrıntıyı bilerek atladın",
    "Sıralama mantığı doğru muydu",
    "Dinleyici nerede kaybolabilirdi"
  ]),
  topic("tek-04", "teknik", "kolay", "Bir şeyi nasıl yapacağını adım adım tarif et (yemek, tamir, kurulum)", [
    "Adımlar gerçekten sıralı mıydı",
    "Atlanan bir ön koşul var mı",
    "En sık yapılan hatayı uyardın mı"
  ]),
  topic("tek-05", "teknik", "zor", "Yaygın bir yanlış bilgiyi düzelt ve neden yayıldığını açıkla", [
    "Yanlış olan neden inandırıcı",
    "Doğrusunu anlatmak neden daha zor",
    "Kanıtın ne"
  ]),
  topic("tek-06", "teknik", "orta", "Bir kararın arkasındaki gerekçeyi, karara katılmayan birine anlat", [
    "Karşı tarafın endişesini adlandırdın mı",
    "Hangi alternatifleri elediniz",
    "Geri dönülebilir mi"
  ]),

  /* ---------------- Hikâye anlatımı ---------------- */
  topic("hik-01", "hikaye", "kolay", "Beklenmedik bir şekilde sonuçlanan bir gün", [
    "Gerilimi nerede kurdun",
    "Dinleyici ne zaman merak etmeye başladı",
    "Kapanış tatmin edici miydi"
  ]),
  topic("hik-02", "hikaye", "orta", "Hayatında bir şeyi ikiye bölen an: öncesi ve sonrası", [
    "O anı ne kadar somut anlattın",
    "Duyguyu söyledin mi, gösterdin mi",
    "Öncesi ile sonrası arasındaki fark net miydi"
  ]),
  topic("hik-03", "hikaye", "orta", "Tanıdığın en ilginç insan ve onu ilginç yapan tek bir sahne", [
    "Sıfat sayarak mı anlattın, sahne kurarak mı",
    "Bir diyalog kullandın mı",
    "Neden bu kişi seni etkiledi"
  ]),
  topic("hik-04", "hikaye", "zor", "Utandığın bir hata ve ondan çıkardığın ders", [
    "Kendini savunmadan anlatabildin mi",
    "Ders klişeye kaçtı mı",
    "Dinleyici kendini bulabildi mi"
  ]),
  topic("hik-05", "hikaye", "orta", "Bir yolculuk: gitmek istemediğin ama gitmene sevindiğin", [
    "Direncin sebebi neydi",
    "Dönüm noktası hangi an",
    "Geri dönüşte ne değişmişti"
  ]),
  topic("hik-06", "hikaye", "zor", "Kaybettiğin bir şey ve onun yerini alan şey", [
    "Kayıp somut muydu, soyut mu",
    "Duyguyu abartmadan taşıyabildin mi",
    "Kapanış umut mu, kabullenme mi"
  ]),
  topic("hik-07", "hikaye", "kolay", "Çocukken inandığın ve sonradan yanlış çıkan bir şey", [
    "Çocuk mantığını yeniden kurabildin mi",
    "Mizah kullandın mı",
    "Bugüne bağladın mı"
  ]),

  /* ---------------- İkna ---------------- */
  topic("ikn-01", "ikna", "orta", "Bir kişiyi, hiç ilgilenmediği bir alışkanlığı denemeye ikna et", [
    "Onun ilgisinden mi başladın, kendi ilgin den mi",
    "İlk adımı yeterince küçük tuttun mu",
    "İtirazı önceden karşıladın mı"
  ]),
  topic("ikn-02", "ikna", "zor", "Bir yöneticiyi, maliyeti olan bir değişikliğe ikna et", [
    "Maliyeti sen mi söyledin, o mu fark etti",
    "Riski nasıl çerçeveledin",
    "Karar vermesi için ne kadar bilgi yeterliydi"
  ]),
  topic("ikn-03", "ikna", "orta", "Bir ekibi, işe yaramayan bir alışkanlığı bırakmaya ikna et", [
    "Alışkanlığı savunanları suçlamadan anlattın mı",
    "Geçiş planı verdin mi",
    "Ne kaybedeceklerini kabul ettin mi"
  ]),
  topic("ikn-04", "ikna", "zor", "Senin de tam emin olmadığın bir görüşü savun", [
    "Belirsizliği sakladın mı, kullandın mı",
    "En güçlü karşı argümana yer verdin mi",
    "Dürüstlük ikna gücünü artırdı mı azalttı mı"
  ]),
  topic("ikn-05", "ikna", "orta", "Kendini bir işe alım görüşmesinde iki dakikada anlat", [
    "Neyi seçtin, neyi eledin",
    "Kanıt verdin mi yoksa iddia mı ettin",
    "Kapanışta ne istedin"
  ]),
  topic("ikn-06", "ikna", "kolay", "Sevdiğin bir kitabı, filmi veya alışkanlığı birine öner", [
    "Neden onun hoşuna gideceğini söyledin mi",
    "Spoiler vermeden merak uyandırdın mı",
    "Somut bir ilk adım verdin mi"
  ]),

  /* ---------------- Kariyer ---------------- */
  topic("kar-01", "kariyer", "orta", "Bitirdiğin bir projeyi, sonuçlarıyla birlikte anlat", [
    "Problem, çözüm, sonuç sırası kurulmuş muydu",
    "Rakam kullandın mı",
    "Kendi payını abartmadan söyledin mi"
  ]),
  topic("kar-02", "kariyer", "zor", "Yaptığın bir hatayı bir üst yöneticiye anlat", [
    "Savunmaya mı geçtin, sahiplendin mi",
    "Etkiyi net söyledin mi",
    "Önlem planın var mıydı"
  ]),
  topic("kar-03", "kariyer", "orta", "Bir ekip arkadaşına yapıcı ve zor bir geri bildirim ver", [
    "Davranışı mı eleştirdin, kişiyi mi",
    "Somut örnek verdin mi",
    "Karşı tarafa alan bıraktın mı"
  ]),
  topic("kar-04", "kariyer", "orta", "Kariyerinde aldığın en riskli karar ve gerekçesi", [
    "Riski nasıl hesapladın",
    "En kötü senaryo neydi",
    "Bugün aynısını yapar mıydın"
  ]),
  topic("kar-05", "kariyer", "kolay", "Bir toplantıyı iki dakikada özetle ve kararları aktar", [
    "Karar ile tartışmayı ayırdın mı",
    "Kim ne yapacak belli mi",
    "Gereksiz ayrıntıyı elediniz mi"
  ]),
  topic("kar-06", "kariyer", "zor", "Bir fikrini, seni dinlemek istemeyen bir odaya sun", [
    "İlk 15 saniyede dikkati nasıl aldın",
    "Direnci kabul ettin mi",
    "Kısa tutmayı başardın mı"
  ]),
  topic("kar-07", "kariyer", "orta", "Beş yıl sonra nerede olmak istediğini ve neden orada olmadığını anlat", [
    "Hedef somut muydu",
    "Bugünkü engeli adlandırdın mı",
    "İlk adım ne"
  ])
];

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

export interface TopicFilter {
  level?: RhetoricLevel;
  category?: RhetoricCategory;
  /** Topic ids used recently, so the same prompt does not come back too soon. */
  recentTopicIds?: string[];
}

/**
 * Picks a random topic, avoiding recent ones. Falls back to the full matching
 * set when every match has been used recently — running out of unseen topics
 * should mean a repeat, not an error.
 */
export function pickRhetoricTopic(filter: TopicFilter = {}): RhetoricTopic {
  const matching = rhetoricTopics.filter((item) => {
    if (filter.level && item.level !== filter.level) {
      return false;
    }
    if (filter.category && item.category !== filter.category) {
      return false;
    }
    return true;
  });

  const pool = matching.length > 0 ? matching : rhetoricTopics;
  const recent = new Set(filter.recentTopicIds ?? []);
  const unseen = pool.filter((item) => !recent.has(item.id));
  const candidates = unseen.length > 0 ? unseen : pool;

  return candidates[Math.floor(Math.random() * candidates.length)] as RhetoricTopic;
}

export function findRhetoricTopic(topicId: string): RhetoricTopic | undefined {
  return rhetoricTopics.find((item) => item.id === topicId);
}

export function countTopicsByLevel(level: RhetoricLevel): number {
  return rhetoricTopics.filter((item) => item.level === level).length;
}
