/**
 * The Turkish topic bank.
 *
 * Every entry is a concept, effect, law or episode that can be learned from
 * scratch in fifteen minutes and explained in four. That constraint is the
 * whole design: the exercise being trained is not "say what you already think"
 * but "understand something new, then make someone else understand it".
 *
 * That is why a topic here is never a question. "Uzaktan çalışma iyi mi?" only
 * asks for an opinion the speaker already had, and fifteen minutes of research
 * changes nothing about the answer. "Baumol maliyet hastalığı" cannot be
 * answered without actually going and finding out what it is.
 *
 * Written rather than generated, for three reasons: the module works with no
 * network, a session costs nothing extra, and — the real one — a generated list
 * would be full of concepts that sound researchable and turn out to be empty or
 * wrong. Each `definition` below is the reference the backend grades against,
 * so it has to be right.
 *
 * `definition` and `angles` are shown only AFTER the recording. Showing either
 * during preparation would hand over the very thing the fifteen minutes exist
 * to produce.
 */
import { RhetoricCategory, RhetoricLevel, RhetoricTopic } from "@/types/rhetoric";

export const rhetoricCategoryLabels: Record<RhetoricCategory, string> = {
  psikoloji: "Psikoloji",
  ekonomi: "Ekonomi",
  bilim: "Bilim ve doğa",
  tarih: "Tarih",
  teknoloji: "Teknoloji",
  toplum: "Toplum"
};

export const rhetoricLevelLabels: Record<RhetoricLevel, string> = {
  kolay: "Kolay",
  orta: "Orta",
  zor: "Zor"
};

/**
 * What difficulty means here is not "how hard is the word" but "how much has to
 * be held in your head at once while you explain it".
 */
export const rhetoricLevelDescriptions: Record<RhetoricLevel, string> = {
  kolay: "Tek mekanizma, sezgiye yakın. Anlatması kolay, iyi anlatması yine de zor.",
  orta: "Birkaç parçanın birbirine bağlanması gerekiyor.",
  zor: "Soyut ya da sezgiye ters. Yanlış anlatmak çok kolay."
};

export const rhetoricCategoryDescriptions: Record<RhetoricCategory, string> = {
  psikoloji: "Zihnin sistematik olarak yanıldığı yerler",
  ekonomi: "Teşvikler, piyasalar ve ters tepen kurallar",
  bilim: "Fiziksel ve biyolojik olgular",
  tarih: "Bir olaydan çıkmış ve adı kalmış kavramlar",
  teknoloji: "Sistemlerin ve yazılımın kendi yasaları",
  toplum: "Grupların, kurumların ve normların işleyişi"
};

function topic(
  id: string,
  category: RhetoricCategory,
  level: RhetoricLevel,
  title: string,
  definition: string,
  angles: string[]
): RhetoricTopic {
  return { id, title, category, level, definition, angles, source: "bank" };
}

export const rhetoricTopics: RhetoricTopic[] = [
  /* ============================== PSİKOLOJİ ============================== */

  topic(
    "psi-01",
    "psikoloji",
    "kolay",
    "Dunning-Kruger etkisi",
    "Bir konuda yetersiz olan kişinin, kendi yetersizliğini fark etmek için gereken bilgiye de sahip olmaması; bu yüzden becerisini olduğundan yüksek tahmin etmesi. Kruger ve Dunning'in 1999 tarihli çalışmasıyla adlandırıldı. Asıl iddia \"cahiller kendini akıllı sanır\" değil, bir işi yapmak için gereken bilginin o işi değerlendirmek için gereken bilgiyle aynı olmasıdır. Uzmanların kendini hafife alması da aynı grafiğin diğer ucudur.",
    [
      "Yetersizliğin kendisinin, yetersizliği görmeyi engellemesi — ölçüt ile beceri aynı bilgi",
      "Grafiğin diğer ucu: uzmanın kendini olduğundan düşük görmesi",
      "Yaygın yanlış anlama: bunun bir zekâ değil bir kalibrasyon meselesi olması",
      "Yönteme yönelik eleştiri: ortalamaya dönüş ve otokorelasyonun etkiyi bir kısmıyla açıklayabildiği"
    ]
  ),
  topic(
    "psi-02",
    "psikoloji",
    "kolay",
    "Doğrulama yanlılığı",
    "İnsanların mevcut inançlarını destekleyen bilgiyi arama, ona daha çok inanma ve daha iyi hatırlama; çelişen bilgiyi ise daha sıkı eleştirme eğilimi. Sadece bilgi seçme aşamasında değil, yorumlama ve hatırlama aşamalarında da çalışır. Wason'ın 2-4-6 görevi klasik göstergesidir: denekler kuralı çürütmeye değil doğrulamaya çalışır.",
    [
      "Üç ayrı aşamada işlemesi: arama, yorumlama, hatırlama",
      "Wason'ın 2-4-6 deneyi veya kart seçme görevi",
      "Çürütmeye çalışmanın doğrulamaya çalışmaktan neden daha bilgilendirici olduğu",
      "Somut sonuçları: yankı odaları, yanlış teşhis, mahkeme kararları"
    ]
  ),
  topic(
    "psi-03",
    "psikoloji",
    "kolay",
    "Zeigarnik etkisi",
    "Yarım kalmış işlerin, tamamlanmış işlerden daha iyi hatırlanması. Bluma Zeigarnik 1927'de, garsonların henüz ödenmemiş siparişleri ayrıntısıyla hatırlayıp ödeme yapılır yapılmaz unuttuklarını gözlemleyerek adlandırdı. Tamamlanmamış görevin zihinde bir gerilim bıraktığı, tamamlanınca bu gerilimin çözüldüğü öne sürülür. Sonraki replikasyonlar tutarsız sonuçlar verdi, etkinin gücü tartışmalıdır.",
    [
      "Zeigarnik'in garson gözlemi ve deneye dönüştürülmesi",
      "Önerilen mekanizma: tamamlanmamış görevin bıraktığı zihinsel gerilim",
      "Kullanım alanları: dizilerde bölüm sonu, yarım bırakılan çalışma seansı",
      "Replikasyon sorunları — etkinin sanıldığı kadar sağlam olmaması"
    ]
  ),
  topic(
    "psi-04",
    "psikoloji",
    "orta",
    "Batık maliyet yanılgısı",
    "Geri alınamayacak biçimde harcanmış zaman, para veya emek yüzünden kötü bir işe devam etme eğilimi. Rasyonel karar yalnızca bundan sonraki maliyet ve faydaya bakmalıdır; geçmiş harcama hangi seçeneği seçersen seç değişmez, dolayısıyla karara girmemelidir. Concorde projesi yüzünden \"Concorde yanılgısı\" da denir.",
    [
      "Batık maliyetin tanımı: geri alınamayan, seçenekler arasında fark yaratmayan harcama",
      "Neden mantıksız olduğu — kararın sadece ileriye bakması gerektiği",
      "Psikolojik sebep: kaybı kabullenmemek, tutarlı görünme isteği",
      "Concorde gibi somut bir örnek veya günlük hayattan bir karşılığı"
    ]
  ),
  topic(
    "psi-05",
    "psikoloji",
    "orta",
    "Seyirci etkisi",
    "Bir acil durumda tanık sayısı arttıkça, herhangi bir kişinin müdahale etme olasılığının azalması. Darley ve Latané'nin 1968 sonrası deneyleriyle gösterildi. İki mekanizma önerilir: sorumluluğun kalabalığa dağılması ve çoğulcu cehalet — kimse tepki vermediği için herkesin durumu acil saymaması. Kavramı popülerleştiren Kitty Genovese cinayeti anlatısının gazete ayrıntıları sonradan büyük ölçüde yanlış çıktı.",
    [
      "Tanık sayısı arttıkça müdahale olasılığının düşmesi",
      "İki mekanizma: sorumluluğun dağılması ve çoğulcu cehalet",
      "Darley-Latané deneylerinden en az biri",
      "Kitty Genovese anlatısının abartıldığının sonradan ortaya çıkması",
      "Pratik sonuç: yardım isterken belirli bir kişiye seslenmek"
    ]
  ),
  topic(
    "psi-06",
    "psikoloji",
    "orta",
    "Hawthorne etkisi",
    "İnsanların gözlendiklerini bildikleri için davranışlarını değiştirmesi; dolayısıyla ölçümün ölçtüğü şeyi bozması. Adını 1920-30'larda Western Electric'in Hawthorne fabrikasında yapılan, aydınlatma ve çalışma koşullarının verimliliğe etkisini arayan deneylerden alır: koşullar iyileştirildiğinde de kötüleştirildiğinde de verim arttı. Orijinal verilerin sonraki yeniden analizleri etkinin büyüklüğünün ciddi biçimde abartıldığını gösterdi.",
    [
      "Gözlemin gözlenen davranışı değiştirmesi",
      "Hawthorne fabrikası deneylerinin sonucu: her iki yönde de verim artışı",
      "Araştırma yöntemi açısından sonucu: kontrol grubunun neden zorunlu olduğu",
      "Etkinin sonradan abartılı bulunması — kavramın kendisinden daha zayıf bir kanıt tabanı"
    ]
  ),
  topic(
    "psi-07",
    "psikoloji",
    "orta",
    "Görünmezlik körlüğü",
    "Dikkat başka bir şeye yoğunlaştığında, görüş alanının tam ortasındaki belirgin bir nesnenin fark edilmemesi. Simons ve Chabris'in 1999 tarihli \"görünmez goril\" deneyinde, izleyicilerin yaklaşık yarısı pas sayarken sahneden geçen goril kostümlü kişiyi görmedi. Gösterdiği şey, görmenin gözle değil dikkatle olduğu; bakmak ile görmenin ayrı şeyler olduğudur.",
    [
      "Görünmez goril deneyinin kurgusu ve sonucu",
      "Bakmak ile görmek arasındaki fark — dikkatin darboğaz olması",
      "Değişim körlüğüyle ilişkisi ya da farkı",
      "Gerçek hayattaki sonuçları: sürüş, radyoloji, tanıklık ifadeleri"
    ]
  ),
  topic(
    "psi-08",
    "psikoloji",
    "zor",
    "Flynn etkisi",
    "20. yüzyıl boyunca zekâ testi ham puanlarının nesiller arasında düzenli biçimde yükselmesi — kabaca on yılda üç puan. James Flynn'in farklı ülkelerdeki test standardizasyon verilerini karşılaştırmasıyla belgelendi. Testler bu yüzden düzenli olarak yeniden ölçeklenir; ortalama 100 sabit tutulur. Artışın en çok soyut ve sınıflandırmaya dayalı alt testlerde olması, insanların daha zeki olmasından çok soyut düşünme biçimine alışmasına işaret eder. Bazı ülkelerde 1990'lardan sonra artış durdu veya tersine döndü.",
    [
      "Ham puanların nesiller arası düzenli artışı ve testlerin yeniden ölçeklenmesi",
      "Artışın her alt testte eşit olmaması — soyut akıl yürütmede yoğunlaşması",
      "Önerilen sebepler: beslenme, eğitim süresi, soyut düşünme alışkanlığı, test aşinalığı",
      "Bazı ülkelerdeki tersine dönüş",
      "Kavramın kalıtım tartışmasında neden önemli olduğu"
    ]
  ),

  /* =============================== EKONOMİ =============================== */

  topic(
    "eko-01",
    "ekonomi",
    "kolay",
    "Gresham yasası",
    "\"Kötü para iyi parayı kovar\": iki para birimi yasa gereği eşit değerde kabul ediliyorsa, insanlar değeri düşük olanla ödeme yapar, değerli olanı saklar veya eritir; tedavülde kötü para kalır. Kritik koşul, kurun yasayla dayatılmış olmasıdır. Kur serbestçe belirleniyorsa tersi olur, buna Thiers yasası denir.",
    [
      "Mekanizma: yasal olarak eşit sayılan iki paradan değersizinin harcanması",
      "Zorunlu koşul — dayatılmış sabit kur olmadan yasa işlemez",
      "Tarihsel örnek: gümüş oranı düşürülmüş sikkeler, madeni para eritilmesi",
      "Ters durum (serbest kurda iyi paranın kazanması)"
    ]
  ),
  topic(
    "eko-02",
    "ekonomi",
    "kolay",
    "Kobra etkisi",
    "Bir sorunu çözmek için konulan teşvikin sorunu büyütmesi. Adı, İngiliz yönetimindeki Hindistan'da kobra başına ödül konulunca insanların ödül için kobra yetiştirmeye başlaması, ödül kaldırılınca da yılanların salıverilmesi anlatısından gelir. Bu belirli hikâyenin tarihsel kaydı zayıftır; Fransız yönetimindeki Hanoi'de fare kuyruğu başına ödeme yapılması ve kuyruğu kesilmiş farelerin çoğalmak üzere salıverilmesi ise belgelidir.",
    [
      "Teşvikin, çözmek istediği sorunu üretmeye başlaması",
      "Kobra veya Hanoi fareleri anlatısı",
      "Genel ilke: insanlar hedefi değil ödüllendirilen ölçütü optimize eder",
      "Güncel karşılıkları: hata başına prim, çağrı süresi hedefleri, atık toplama primleri"
    ]
  ),
  topic(
    "eko-03",
    "ekonomi",
    "kolay",
    "Lale çılgınlığı",
    "1630'ların Hollanda'sında lale soğanı fiyatlarının hızla yükselip Şubat 1637'de çökmesi; genellikle tarihteki ilk spekülatif balon örneği olarak anlatılır. Fiyatlar vadeli sözleşmeler üzerinden yükseldi ve çöküş sonrası sözleşmelerin çoğu tasfiye edilmedi. Anne Goldgar'ın arşiv çalışması, işlemlerin dar bir tüccar çevresiyle sınırlı kaldığını ve toplu iflas anlatısının büyük ölçüde sonraki ahlakçı broşürlerden geldiğini gösterdi.",
    [
      "Balonun mekanizması: fiyatın kullanım değerinden kopup beklentiyle sürüklenmesi",
      "Vadeli sözleşmelerin rolü",
      "Çöküşün 1637 Şubat'ında olması ve ekonomik yıkımın abartılmış olması",
      "Bir efsanenin nasıl kalıcı bir ders anlatısına dönüştüğü"
    ]
  ),
  topic(
    "eko-04",
    "ekonomi",
    "orta",
    "Jevons paradoksu",
    "Bir kaynağın kullanımı verimli hale geldiğinde toplam tüketiminin azalmak yerine artabilmesi. William Stanley Jevons 1865'te, daha verimli buhar makinelerinin İngiltere'nin kömür tüketimini düşürmediğini, artırdığını gösterdi. Mekanizma: verim birim maliyeti düşürür, düşen maliyet talebi ve yeni kullanım alanlarını genişletir. Bu her zaman olmaz; ancak geri tepme etkisi %100'ü aştığında paradoks ortaya çıkar.",
    [
      "Verimlilik → birim maliyet düşüşü → talep artışı zinciri",
      "Jevons'un kömür örneği",
      "Geri tepme etkisi kavramı ve paradoksun onun uç hali olması",
      "Her durumda geçerli olmadığı — koşula bağlı olduğu",
      "Güncel tartışma: enerji verimliliği politikaları, veri merkezleri"
    ]
  ),
  topic(
    "eko-05",
    "ekonomi",
    "orta",
    "Goodhart yasası",
    "\"Bir ölçüt hedef haline geldiğinde iyi bir ölçüt olmaktan çıkar.\" Charles Goodhart 1975'te para politikası bağlamında formüle etti; bugünkü yaygın cümleyi Marilyn Strathern yazdı. Sebep, ölçütün ölçmek istediği şeyin tamamı değil bir temsilcisi olmasıdır: insanlar hedefi verilince temsilciyi optimize eder ve temsilci ile asıl şey arasındaki bağ kopar.",
    [
      "Ölçütün bir temsilci (vekil gösterge) olması ve asıl amaçla arasındaki bağın kopması",
      "Goodhart'ın orijinal para politikası bağlamı ya da Strathern'in formülasyonu",
      "Somut örnek: sınav puanı hedefi, hastane bekleme süresi hedefi, çağrı merkezi süresi",
      "Campbell yasası veya Kobra etkisiyle ilişkisi",
      "Ne yapılabileceği: birden çok ölçüt, ölçütü değiştirmek, hedef koymamak"
    ]
  ),
  topic(
    "eko-06",
    "ekonomi",
    "orta",
    "Limon piyasası",
    "George Akerlof'un 1970 tarihli makalesinde tanımladığı, asimetrik bilginin bir piyasayı çökertme mekanizması. Satıcı malın kalitesini alıcıdan iyi biliyorsa alıcı ancak ortalama kaliteye göre fiyat verir; iyi mal sahipleri bu fiyata satmaz ve piyasadan çekilir, ortalama kalite düşer, fiyat daha da düşer. İkinci el araba piyasasından örneklendiği için \"limon\" (bozuk araba) adını taşır. Akerlof bu çalışmayla 2001 Nobel'ini paylaştı.",
    [
      "Asimetrik bilgi: taraflardan birinin daha çok bilmesi",
      "Ters seçim sarmalı — iyi malın piyasadan çekilmesi",
      "İkinci el araba örneği",
      "Çözüm mekanizmaları: garanti, sertifikasyon, itibar, ekspertiz",
      "Sigorta veya kredi piyasasına uyarlanması"
    ]
  ),
  topic(
    "eko-07",
    "ekonomi",
    "zor",
    "Baumol maliyet hastalığı",
    "Verimliliğin hızla arttığı sektörlerdeki ücret artışının, verimliliğin doğası gereği artamadığı sektörlerdeki ücretleri de yukarı çekmesi; sonuçta bu hizmetlerin göreli maliyetinin sürekli yükselmesi. William Baumol ve William Bowen 1966'da sahne sanatlarından yola çıktı: bir yaylı dörtlüsünü çalmak 1800'de de dört müzisyen ve aynı süreyi gerektiriyordu, bugün de. İşgücü aynı havuzdan geldiği için, üretkenliği artan sektör ücreti yükselttikçe orkestra da ödemek zorunda kalır. Eğitim, sağlık ve bakım hizmetlerinin uzun vadeli pahalılaşmasının bir açıklaması olarak kullanılır.",
    [
      "Verimlilik artışının bazı işlerde yapısal olarak mümkün olmaması",
      "Yaylı dörtlüsü örneği veya eşdeğeri",
      "Ücretlerin sektörler arasında bağlı olması — işgücü aynı havuzdan geliyor",
      "Sonuç: bu hizmetlerin göreli fiyatının yükselmesi",
      "Önemli nüans: bu bir israf ya da kötü yönetim değil, verimlilik artışının kaçınılmaz yan etkisi"
    ]
  ),
  topic(
    "eko-08",
    "ekonomi",
    "zor",
    "Cantillon etkisi",
    "Ekonomiye yeni giren paranın herkese aynı anda ulaşmaması ve bu sıranın bir yeniden dağılım yaratması. Richard Cantillon 18. yüzyılda tarif etti: paraya önce ulaşanlar, fiyatlar henüz yükselmemişken harcayabilir; paraya en son ulaşanlar ise gelirleri artmadan fiyatların yükseldiğini görür. Enflasyonun yalnızca bir \"genel fiyat seviyesi\" olayı olmadığını, kimin ne zaman aldığına bağlı bir sıra meselesi de olduğunu söyler.",
    [
      "Paranın ekonomiye tek noktadan girmesi ve dalga gibi yayılması",
      "Erken alan ile geç alan arasındaki fark — asıl mesele bu",
      "Enflasyonun dağılım etkisi: nötr olmaması",
      "Hangi fiyatların önce yükseldiği (varlık fiyatları tartışması)",
      "Miktar teorisinin basit halinden nerede ayrıldığı"
    ]
  ),

  /* ============================= BİLİM VE DOĞA ============================= */

  topic(
    "bil-01",
    "bilim",
    "kolay",
    "Doppler etkisi",
    "Kaynak ile gözlemci arasındaki göreli hareket nedeniyle algılanan dalga frekansının değişmesi. Kaynak yaklaşırken dalgalar sıkışır ve frekans yükselir, uzaklaşırken seyrelir ve düşer — yaklaşan ambulans sireninin tiz, uzaklaşırken pes duyulmasının sebebi budur. Christian Doppler 1842'de tarif etti. Ses için de ışık için de geçerlidir; astronomide kırmızıya kayma, radarda hız ölçümü ve tıpta kan akışı ölçümü aynı ilkeye dayanır.",
    [
      "Dalgaların yaklaşırken sıkışması, uzaklaşırken seyrelmesi",
      "Ambulans sireni gibi duyulabilir bir örnek",
      "Değişenin kaynağın ürettiği frekans değil, algılanan frekans olması",
      "En az bir uygulama: kırmızıya kayma, radar veya Doppler ultrason"
    ]
  ),
  topic(
    "bil-02",
    "bilim",
    "kolay",
    "Mpemba etkisi",
    "Belirli koşullar altında sıcak suyun soğuk sudan daha kısa sürede donabilmesi. Aristoteles'e kadar giden gözlemler vardır; adı, 1963'te bunu dondurma yaparken fark eden ve ısrarla savunan Tanzanyalı lise öğrencisi Erasto Mpemba'dan gelir. Buharlaşmayla kütle kaybı, çözünmüş gazlar, konveksiyon akımları ve aşırı soğuma gibi açıklamalar önerildi ama üzerinde uzlaşılmış bir mekanizma yok. Bazı dikkatli çalışmalar etkiyi hiç üretemedi; tekrarlanabilirliği tartışmalı.",
    [
      "Etkinin ne olduğu ve hangi koşullara bağlı göründüğü",
      "Mpemba'nın hikâyesi ve etkiye adını vermesi",
      "Önerilen açıklamalardan en az ikisi",
      "Uzlaşılmış bir açıklama olmaması ve tekrarlanabilirlik tartışması",
      "İyi bir örnek olarak: bilimin bir soruyu açık bırakabilmesi"
    ]
  ),
  topic(
    "bil-03",
    "bilim",
    "kolay",
    "Leidenfrost etkisi",
    "Bir sıvı, kaynama noktasının çok üzerindeki bir yüzeye değdiğinde alt yüzeyinin anında buharlaşıp yalıtkan bir buhar tabakası oluşturması; damlanın bu yastığın üzerinde yüzerek kayması ve beklenenden çok daha yavaş buharlaşması. Johann Gottlob Leidenfrost 1756'da tarif etti. Sıcak tavaya damlatılan suyun top gibi kayması budur. Pratik sonucu ters yönde: aşırı ısınan bir yüzeyde ısı transferi aniden düşer, bu da soğutma sistemlerinde tehlikeli bir sınırdır.",
    [
      "Buhar tabakasının yalıtkan görevi görmesi",
      "Leidenfrost sıcaklığı — belirli bir eşiğin üzerinde ortaya çıkması",
      "Gözle görülür örnek: tavada kayan su damlası",
      "Ters etkisi: ısı transferinin azalması ve bunun mühendislikteki önemi"
    ]
  ),
  topic(
    "bil-04",
    "bilim",
    "orta",
    "Coriolis etkisi",
    "Dönen bir referans sisteminde serbestçe hareket eden bir cismin, o sistemle birlikte dönen bir gözlemciye göre yoldan sapıyor görünmesi. Gerçek bir kuvvet değil, dönen çerçevede hareketi tarif edebilmek için eklenen görünür bir kuvvettir. Dünya üzerinde kuzey yarımkürede sağa, güney yarımkürede sola sapma olarak görünür; hava sistemlerinin dönüş yönünü, okyanus akıntılarını ve uzun menzilli topçu atışını etkiler. Yaygın bir yanlış inanışın aksine lavabo giderindeki dönüş yönünü belirlemez — o ölçekte etki musluğun ve leğenin biçiminin yanında ihmal edilebilir.",
    [
      "Dönen referans sistemi ve görünür (atalet) kuvvet olması",
      "Kuzey ve güney yarımkürede ters yönlerde görünmesi",
      "Ölçeğe bağlı olması: büyük ve uzun süreli hareketlerde belirgin",
      "Lavabo efsanesinin neden yanlış olduğu",
      "Gerçek etkileri: siklonların dönüş yönü, okyanus akıntıları, balistik"
    ]
  ),
  topic(
    "bil-05",
    "bilim",
    "orta",
    "Antibiyotik direnci",
    "Antibiyotik kullanımının, dirençli bakterileri seçerek çoğalmalarına yol açması. Bakteri antibiyotiğe \"alışmaz\" ve insan vücudu direnç kazanmaz; popülasyonda rastlantısal mutasyonlarla zaten var olan dirençli bireyler hayatta kalır ve boşalan yeri doldurur. Bu doğrudan doğal seçilimdir. Bakteriler direnç genlerini yatay gen aktarımıyla akraba olmayan türlere de aktarabildiği için yayılma hızlıdır. Tedaviyi erken kesmek, gereksiz reçete ve hayvancılıkta büyütme amaçlı kullanım süreci hızlandıran başlıca etkenlerdir.",
    [
      "Mekanizmanın doğal seçilim olması — bireyin değil popülasyonun değişmesi",
      "\"Vücut direnç kazanır\" yanlış anlamasının düzeltilmesi",
      "Yatay gen aktarımı",
      "Süreci hızlandıran insan davranışları",
      "Sonuç: yeni antibiyotik geliştirmenin neden yetmediği"
    ]
  ),
  topic(
    "bil-06",
    "bilim",
    "orta",
    "Plasebo ve nosebo",
    "Etken madde içermeyen bir uygulamanın, yalnızca beklenti yoluyla ölçülebilir öznel ve bazı fizyolojik etkiler üretmesi plasebo; olumsuz beklentinin yan etki üretmesi nosebo etkisidir. Etki ağrı, bulantı, uykusuzluk ve ruh hali gibi öznel uçlarda güçlüdür; tümör küçültmek gibi nesnel sonuçlarda yoktur. Bu yüzden ilaç denemeleri çift kör yapılır: hangi grubun gerçek ilacı aldığını ne hasta ne de uygulayan bilir. Ölçülen iyileşmenin bir kısmının hastalığın kendi seyri ve ortalamaya dönüş olduğunu ayırt etmek de ayrı bir sorundur.",
    [
      "Plasebo ve nosebonun tanımları",
      "Etkinin hangi tür sonuçlarda güçlü, hangilerinde yok olduğu",
      "Çift kör denemenin neden gerekli olduğu",
      "Plasebo etkisiyle doğal iyileşme/ortalamaya dönüşün karıştırılması",
      "Etik sorun: hekimin bilerek plasebo vermesi"
    ]
  ),
  topic(
    "bil-07",
    "bilim",
    "zor",
    "Simpson paradoksu",
    "Ayrı ayrı bakıldığında her alt grupta görülen bir eğilimin, gruplar birleştirildiğinde tersine dönmesi. Sebebi, grup büyüklüklerini dengesiz dağıtan bir karıştırıcı değişkendir. Klasik örnek 1973 Berkeley lisansüstü kabul verileridir: toplamda erkeklerin kabul oranı kadınlardan yüksek görünüyordu, ancak bölüm bazında bakıldığında çoğu bölümde fark yoktu ya da kadınların lehineydi; kadınlar kabul oranı düşük bölümlere daha çok başvuruyordu. Verinin hangi düzeyde toplandığının sonucu tersine çevirebileceğini gösterir.",
    [
      "Alt gruplardaki eğilimin toplamda tersine dönmesi",
      "Karıştırıcı değişkenin ve dengesiz grup büyüklüklerinin rolü",
      "Berkeley örneği veya benzer bir gerçek veri örneği",
      "Sonucun \"hangi tablo doğru\" değil \"hangi soruyu soruyorsun\" olması",
      "Nedensellik-korelasyon tartışmasındaki yeri"
    ]
  ),
  topic(
    "bil-08",
    "bilim",
    "zor",
    "Fermi paradoksu",
    "Evrenin büyüklüğü ve yaşı düşünüldüğünde gelişmiş uygarlıkların yaygın olması beklenirken hiçbir kanıta rastlanmaması arasındaki çelişki. Enrico Fermi'nin 1950'de sorduğu \"Peki neredeler?\" sorusundan gelir. Drake denklemi sorunun terimlerini ayrıştırmaya çalışır ama terimlerin çoğu bilinmez. Önerilen çözümler arasında Büyük Filtre (uygarlığın önünde geçilmesi çok zor bir aşama olması), nadir dünya hipotezi, teknolojik uygarlıkların kısa ömürlü olması, algılama menzilimizin yetersizliği ve karanlık orman hipotezi sayılır.",
    [
      "Paradoksun kuruluşu: beklenen bolluk ile gözlenen sessizlik",
      "Drake denkleminin ne işe yaradığı ve sınırı",
      "En az iki önerilen çözüm",
      "Büyük Filtre'nin arkamızda mı önümüzde mi olduğu sorusu",
      "Bunun neden test edilmesi zor bir soru olduğu"
    ]
  ),

  /* ================================ TARİH ================================ */

  topic(
    "tar-01",
    "tarih",
    "kolay",
    "Pyrrhus zaferi",
    "Kazanana o kadar pahalıya mal olan bir zafer ki sonuç bakımından yenilgiden farkı kalmaz. Epir kralı Pyrrhus MÖ 280 ve 279'da Heraclea ve Asculum'da Romalıları yendi ama en iyi askerlerini ve komutanlarını kaybetti; kendisine atfedilen söz \"Romalılara karşı bir zafer daha kazanırsak tamamen mahvoluruz\" biçimindedir. Asıl mesele kayıp sayısı değil, kaybı telafi edebilme kapasitesidir: Roma yerine yeni asker koyabiliyordu, Pyrrhus koyamıyordu.",
    [
      "Kavramın tanımı ve Pyrrhus'un savaşları",
      "Kritik nokta: mutlak kayıp değil, kaybı yenileyebilme farkı",
      "Sözün kendisi ve nereden geldiği",
      "Modern bir karşılığı: kazanılan ama şirketi bitiren dava, alınan ama tüketen pazar payı"
    ]
  ),
  topic(
    "tar-02",
    "tarih",
    "kolay",
    "Vasa gemisinin batışı",
    "İsveç savaş gemisi Vasa, 10 Ağustos 1628'de ilk seferinde Stockholm limanında yaklaşık 1300 metre gittikten sonra hafif bir rüzgârda yan yatıp battı. Gemi çok yüksek ve dar inşa edilmişti, iki top güvertesi ağırlık merkezini yükseltmişti ve safrası yetersizdi. Denize indirilmeden önce yapılan stabilite denemesi — otuz adamın güverteden güverteye koşturulması — gemi tehlikeli biçimde sallandığı için yarıda kesildi, ama sefer ertelenmedi. 1961'de neredeyse bütün halde çıkarıldı; Baltık'ın düşük tuzluluğu ahşabı yiyen gemi kurdunu barındırmadığı için gövde korunmuştu.",
    [
      "Batışın teknik sebebi: yüksek ağırlık merkezi ve yetersiz safra",
      "Yarıda kesilen stabilite testi ve buna rağmen devam edilmesi",
      "Kralın baskısı ve değişen tasarım taleplerinin rolü",
      "1961'deki çıkarılma ve neden bu kadar iyi korunduğu",
      "Proje yönetimi dersi olarak neden anlatıldığı"
    ]
  ),
  topic(
    "tar-03",
    "tarih",
    "kolay",
    "Emu Savaşı",
    "1932'de Batı Avustralya'da, ekinlere zarar veren emu sürülerine karşı ordunun makineli tüfeklerle yürüttüğü ve başarısızlıkla sonuçlanan operasyon. Emular büyük sürüler halinde durmayıp küçük gruplara dağıldığı, hızlı koştuğu ve isabet alsa bile devam edebildiği için etkili atış yapılamadı; harcanan mermiye oranla öldürülen kuş sayısı çok düşük kaldı ve operasyon kamuoyu alay konusu olunca geri çekildi. Sonrasında çitleme ve kuş başına ödül sistemine dönüldü, uzun vadede işe yarayan da bu oldu.",
    [
      "Operasyonun sebebi: savaş gazisi çiftçiler ve ekin zararı",
      "Neden başarısız olduğu — emuların dağılması ve dayanıklılığı",
      "Sonuçların sayısal olarak ne kadar düşük kaldığı",
      "Sonrasında işe yarayan çözüm: çit ve ödül sistemi",
      "Askerî araçların yanlış soruna uygulanması dersi"
    ]
  ),
  topic(
    "tar-04",
    "tarih",
    "orta",
    "Semmelweis refleksi",
    "Yerleşik inanca ters düşen yeni bir bulgunun, kanıtına bakılmadan reddedilmesi eğilimi. Ignaz Semmelweis 1847'de Viyana'da, otopsiden doğrudan doğum servisine geçen hekimlerin ellerini kireç kaymağı çözeltisiyle yıkamasını zorunlu kılınca lohusa humması ölümlerinin çarpıcı biçimde düştüğünü gösterdi. Meslektaşları bunu kabul etmedi; kendisi görevinden uzaklaştırıldı ve bir akıl hastanesinde öldü. Reddedilmesinin sebeplerinden biri, mikrop teorisi henüz olmadığı için mekanizmayı açıklayamaması, diğeri de bulgunun hekimleri ölümlerden sorumlu tutmasıydı.",
    [
      "Semmelweis'in gözlemi ve uyguladığı müdahale",
      "Ölüm oranlarındaki düşüşün büyüklüğü",
      "Neden reddedildiği: mekanizma açıklaması yokluğu ve mesleki gurur",
      "Kavramın bugünkü kullanımı ve kötüye kullanımı — her reddedilen iddia Semmelweis değildir",
      "Pasteur ve Lister'le birlikte mikrop teorisinin sonradan gelmesi"
    ]
  ),
  topic(
    "tar-05",
    "tarih",
    "orta",
    "Radyum kızları",
    "1917'den itibaren ABD'de saat kadranlarını karanlıkta parlayan radyumlu boyayla boyayan ve fırçanın ucunu sivriltmek için dudaklarıyla düzelten kadın işçiler. Radyum vücutta kalsiyum gibi davranıp kemiklerde biriktiği için çene nekrozu, kansızlık ve kemik kanserlerine yol açtı. Şirket yönetimi tehlikeyi biliyordu ve kendi kimyagerleri korunma önlemi kullanırken işçilere boyanın zararsız olduğu söylenmişti. İşçilerin açtığı davalar, meslek hastalığında işverenin sorumluluğunu kuran ve iş sağlığı düzenlemelerinin önünü açan bir dönüm noktası oldu.",
    [
      "İşin nasıl yapıldığı ve maruziyetin yolu",
      "Radyumun kemikte birikmesi — kalsiyum benzeri davranışı",
      "Şirketin bilgiyi saklaması ve çifte standart",
      "Davaların hukuki sonucu: meslek hastalığında işveren sorumluluğu",
      "Zamanaşımı gibi hukuki engellerin nasıl aşıldığı"
    ]
  ),
  topic(
    "tar-06",
    "tarih",
    "orta",
    "Ludditler",
    "1811-1816 arasında İngiltere'de dokuma makinelerini kıran zanaatkâr tekstil işçileri. Bugün \"teknoloji düşmanı\" anlamında kullanılsa da makinenin kendisine değil, ücretleri düşüren, çıraklık düzenini bozan ve niteliksiz işçiyle düşük kaliteli üretim yapılmasını sağlayan kullanım biçimine karşıydılar. Ad, muhtemelen kurgusal bir figür olan \"Ned Ludd\"dan gelir. Devletin tepkisi sertti: makine kırmak idam cezası kapsamına alındı ve hareketi bastırmak için bölgeye ciddi bir askerî güç sevk edildi.",
    [
      "Hareketin kim olduğu ve neye karşı çıktığı",
      "Yaygın yanlış anlama: teknoloji düşmanlığı değil, teknolojinin kullanılma biçimine itiraz",
      "Dönemin bağlamı: Napolyon savaşları, gıda fiyatları, çıraklık düzeninin çözülmesi",
      "Devletin tepkisi ve makine kırmanın idamlık suç haline gelmesi",
      "Bugünkü otomasyon tartışmasıyla bağı"
    ]
  ),
  topic(
    "tar-07",
    "tarih",
    "orta",
    "1952 Büyük Londra Sisi",
    "5-9 Aralık 1952'de Londra'da, soğuk ve durgun havanın yarattığı sıcaklık terselmesi nedeniyle kömür dumanının kent üzerinde hapsolması. Görüş yer yer birkaç metreye düştü, ulaşım durdu, kapalı mekânlara bile sis girdi. Dönemin resmî tahmini yaklaşık dört bin fazladan ölümdü; sonraki çalışmalar bu sayının çok daha yüksek olduğunu öne sürdü. Doğrudan sonucu 1956 tarihli Temiz Hava Yasası oldu — hava kirliliğinin bir rahatsızlık değil ölümcül bir halk sağlığı sorunu olarak düzenlendiği eşik.",
    [
      "Sıcaklık terselmesinin ne olduğu ve kirliliği neden hapsettiği",
      "Kömür yakıtının ve kükürt dioksitin rolü",
      "Ölüm sayısının büyüklüğü ve sonradan yukarı revize edilmesi",
      "1956 Temiz Hava Yasası ve getirdiği düzenlemeler",
      "Bugünkü hava kalitesi tartışmasıyla bağlantısı"
    ]
  ),
  topic(
    "tar-08",
    "tarih",
    "zor",
    "Bretton Woods sistemi",
    "1944'te 44 ülkenin ABD'nin New Hampshire eyaletinde kurduğu savaş sonrası uluslararası para düzeni. Dolar altına sabitlendi (ons başına 35 dolar), diğer paralar da dolara sabit ama gerektiğinde ayarlanabilir kurlarla bağlandı; IMF ve Dünya Bankası bu konferansta doğdu. Sistem 1971'de Nixon'ın doların altına çevrilebilirliğini askıya almasıyla fiilen sona erdi. Çöküşün yapısal sebebi Triffin ikilemidir: rezerv para basan ülkenin dünyaya likidite sağlamak için açık vermesi, ama paraya güveni korumak için açık vermemesi gerekiyordu; ikisi aynı anda mümkün değildi.",
    [
      "Sistemin temel kurgusu: dolar-altın çıpası ve ayarlanabilir sabit kurlar",
      "IMF ve Dünya Bankası'nın bu konferansta kurulması",
      "Triffin ikilemi — sistemin içindeki yapısal çelişki",
      "1971 Nixon şoku ve sistemin sona ermesi",
      "Sonrasında geçilen dalgalı kur düzeni"
    ]
  ),

  /* ============================== TEKNOLOJİ ============================== */

  topic(
    "tek-01",
    "teknoloji",
    "kolay",
    "Moore yasası",
    "Gordon Moore'un 1965'te yaptığı gözlem: bir entegre devreye ekonomik olarak sığdırılabilen transistör sayısı düzenli aralıklarla ikiye katlanıyor. Moore ilk yazısında bir yıl demiş, 1975'te bunu yaklaşık iki yıla revize etmişti. Bir doğa yasası değildir; sektör kendi yatırım ve ürün planlarını bu eğriye göre yaptığı için büyük ölçüde kendini gerçekleştiren bir hedef haline geldi. Son yıllarda küçültme fiziksel ve maliyet sınırlarına yaklaştığı için tempo yavaşladı; performans artışı artık çekirdek sayısı, paketleme ve özel amaçlı çipler üzerinden geliyor.",
    [
      "Yasanın tam ifadesi: transistör sayısı, hız değil",
      "Moore'un kendi revizyonu ve tarihler",
      "Doğa yasası olmaması — sektörün hedefi haline gelmesi",
      "Yavaşlamanın sebepleri ve alternatif performans kaynakları",
      "Dennard ölçeklemesiyle karıştırılmaması"
    ]
  ),
  topic(
    "tek-02",
    "teknoloji",
    "kolay",
    "Streisand etkisi",
    "Bir bilgiyi bastırma veya kaldırtma girişiminin, o bilginin çok daha geniş biçimde yayılmasına yol açması. Adı 2003'te Barbra Streisand'ın, Kaliforniya kıyı erozyonunu belgeleyen bir fotoğraf arşivinde evi göründüğü için açtığı davadan gelir; dava açılmadan önce fotoğraf yalnızca birkaç kez indirilmişti, davanın duyulmasından sonra yüz binlerce kez görüntülendi. Terimi Mike Masnick adlandırdı. Mekanizma, bastırma girişiminin bilgiyi haber değeri taşıyan bir olaya dönüştürmesidir.",
    [
      "Streisand davasının hikâyesi ve rakamların tersine dönmesi",
      "Mekanizma: sansür girişiminin bilgiye haber değeri kazandırması",
      "Terimin kim tarafından adlandırıldığı",
      "Başka bir örnek — kaldırma talebi, dava veya erişim engeli sonrası yayılma",
      "Sınırı: her bastırma girişimi bu etkiyi doğurmaz"
    ]
  ),
  topic(
    "tek-03",
    "teknoloji",
    "kolay",
    "Tekinsiz vadi",
    "Bir figür insana benzedikçe ona duyulan sempatinin artması, ama neredeyse-insan noktasında ani bir rahatsızlık ve tiksinti çukuruna düşmesi; tam insan benzerliğine ulaşıldığında yeniden yükselmesi. Masahiro Mori 1970'te robotik bağlamında öne sürdü. Hareket eklendiğinde hem tepe hem çukur derinleşir. Önerilen açıklamalar arasında hastalık ya da ölüm sezgisi, beynin kategorize edemediği belirsizlik ve beklenti ihlali sayılır. Animasyon, oyun ve robot tasarımında bilinçli olarak stilize kalma kararlarının sebebidir.",
    [
      "Eğrinin biçimi: yükselme, ani düşüş, yeniden yükselme",
      "Mori'nin hareketin etkiyi büyüttüğü gözlemi",
      "En az bir açıklama önerisi",
      "Tasarımda sonucu: gerçekçiliğe gitmek yerine stilize kalmak",
      "Kanıt durumunun tartışmalı olması"
    ]
  ),
  topic(
    "tek-04",
    "teknoloji",
    "orta",
    "Ağ etkisi",
    "Bir ürünün her kullanıcı için değerinin, kullanıcı sayısı arttıkça artması. Tek telefonun değeri yoktur, ikincisi birincisini de değerli yapar. Metcalfe yasası bu değeri kullanıcı sayısının karesiyle orantılar; bu genellikle fazla iyimser bulunur. Sonuçları: kazananın çoğunu aldığı piyasalar, kullanıcıların taşınma maliyeti yüzünden kilitlenmesi ve iki taraflı pazar yerlerinde soğuk başlangıç sorunu. Olumsuz ağ etkisi de vardır: kalabalıklaşma, gürültü ve kalite düşüşü.",
    [
      "Tanım: değerin kullanıcı sayısıyla artması",
      "Doğrudan ve dolaylı (iki taraflı) ağ etkisi ayrımı",
      "Metcalfe yasası ve ona yönelik eleştiri",
      "Soğuk başlangıç sorunu ve nasıl aşıldığı",
      "Olumsuz ağ etkisi — her büyüme iyi değildir"
    ]
  ),
  topic(
    "tek-05",
    "teknoloji",
    "orta",
    "Teknik borç",
    "Bugün hızlı ilerlemek için bilerek seçilen basit veya geçici çözümün, ileride ödenmesi gereken birikimli maliyeti. Benzetmeyi Ward Cunningham finansal borçtan kurdu ve vurgusu şuydu: borcun kendisi kötü değildir, ödenmeyen faizi kötüdür — bilinçli alınan borç işi hızlandırır, ödenmedikçe her yeni değişikliği pahalılaştırır. Benzetmenin en sık kaçırılan yanı, farkında olunarak alınan borç ile bilgisizlikten doğan karmaşanın aynı şey olmamasıdır; ikincisi borç değil, sadece kötü iştir.",
    [
      "Benzetmenin kurulusu: anapara ve faiz",
      "Cunningham'ın asıl vurgusu — bilinçli borcun meşru bir seçenek olması",
      "Kasıtlı borç ile bilgisizlikten doğan karmaşanın farkı",
      "Faizin somut görünümü: her değişikliğin giderek yavaşlaması",
      "Borcun nasıl ödendiği: yeniden düzenleme, test, sınır çekme"
    ]
  ),
  topic(
    "tek-06",
    "teknoloji",
    "orta",
    "Brooks yasası",
    "\"Geciken bir yazılım projesine yeni insan eklemek onu daha da geciktirir.\" Fred Brooks, 1975 tarihli The Mythical Man-Month kitabında formüle etti. Üç sebep sayar: yeni gelenlerin eğitilmesi mevcut ekibin zamanını alır; iletişim kanallarının sayısı kişi sayısıyla n(n-1)/2 hızında artar; ve bazı işler bölünemez. Kitabın en bilinen cümlesi bu son noktayı özetler: dokuz kadın bir bebeği bir ayda doğuramaz.",
    [
      "Yasanın tam ifadesi ve kaynağı",
      "Üç sebepten en az ikisi: eğitim maliyeti, iletişim yükü, bölünemez işler",
      "İletişim kanallarının karesel artışı",
      "\"Adam-ay\" ölçüsünün neden yanıltıcı olduğu",
      "Yasanın sınırı: her projede ve her aşamada geçerli olmaması"
    ]
  ),
  topic(
    "tek-07",
    "teknoloji",
    "zor",
    "Braess paradoksu",
    "Bir yol ağına yeni bir bağlantı eklemenin, herkes kendi seyahat süresini en aza indirmeye çalıştığında toplam seyahat süresini uzatabilmesi. Dietrich Braess 1968'de gösterdi. Sebebi, bireysel olarak en iyi seçimlerin oluşturduğu dengenin (Nash dengesi) sistem için en iyi çözümle aynı olmamasıdır: yeni kısayol herkes için cazip olduğu için herkesin ona yığılmasına ve eski dengeli dağılımın bozulmasına yol açar. Tersi de gözlenmiştir: Seul'de Cheonggyecheon otoyolunun kaldırılması ve New York'ta 42. Cadde'nin kapatılması sonrası trafik iyileşti. Aynı mantık elektrik şebekelerinde ve veri ağlarında da geçerlidir.",
    [
      "Paradoksun ifadesi: kapasite eklemenin sonucu kötüleştirebilmesi",
      "Nash dengesi ile sistem optimumunun ayrışması",
      "Bireysel rasyonellikten kolektif kötü sonuç çıkması",
      "Gerçek bir örnek: yol kapatınca trafiğin iyileşmesi",
      "Trafik dışı uygulamalar: elektrik ve veri ağları"
    ]
  ),
  topic(
    "tek-08",
    "teknoloji",
    "zor",
    "Conway yasası",
    "\"Bir sistem tasarlayan kuruluşlar, kaçınılmaz olarak kendi iletişim yapılarının kopyası olan tasarımlar üretir.\" Melvin Conway 1967'de formüle etti. Mantığı basit: iki modülün birbiriyle konuşabilmesi için onları yazan iki kişinin de konuşabilmesi gerekir, dolayısıyla arayüzler organizasyon şemasının sınırlarında oluşur. Pratik sonucu, bir mimari sorununun çoğu zaman aslında bir ekip yapısı sorunu olmasıdır. \"Ters Conway manevrası\" bunu tersine çevirir: istenen mimariyi elde etmek için önce ekipleri o mimariye göre düzenlemek.",
    [
      "Yasanın ifadesi ve arkasındaki mantık",
      "Arayüzlerin ekip sınırlarında oluşması",
      "Sonuç: mimari sorunun organizasyon sorunu olabileceği",
      "Ters Conway manevrası",
      "Somut bir örnek: ekip bölünmesinin ürüne yansıması"
    ]
  ),

  /* =============================== TOPLUM =============================== */

  topic(
    "top-01",
    "toplum",
    "kolay",
    "Dunbar sayısı",
    "Robin Dunbar'ın, primatlarda neokorteks büyüklüğü ile ortalama grup büyüklüğü arasındaki ilişkiden yola çıkarak insan için önerdiği istikrarlı sosyal ilişki üst sınırı: yaklaşık 150. Dunbar bunu iç içe katmanlar halinde de tarif eder — kabaca 5 çok yakın, 15, 50, 150, 500 ve 1500. Sayı kültürde kesin bir gerçek gibi dolaşsa da dayandığı korelasyon zayıftır; sonraki istatistiksel çalışmalar tahminin güven aralığının çok geniş olduğunu, yani tek bir sayı vermenin desteklenmediğini gösterdi.",
    [
      "Sayının nereden geldiği: neokorteks-grup büyüklüğü korelasyonu",
      "150 rakamı ve iç içe katmanlar",
      "Desteklendiği öne sürülen örnekler: köy nüfusları, askerî birlikler",
      "Eleştiri: geniş güven aralığı, tek bir sayının savunulamaz olması",
      "Sosyal medyadaki takipçi sayılarıyla ilişkisi ve bu ilişkinin sınırı"
    ]
  ),
  topic(
    "top-02",
    "toplum",
    "kolay",
    "Parkinson yasası",
    "\"İş, tamamlanması için ayrılan süreyi doldurmak üzere genişler.\" Cyril Northcote Parkinson 1955'te The Economist'te yazdı. Gözlemi bürokrasiden çıkmıştı: İngiliz Donanması'nda gemi ve personel sayısı azalırken idari memur sayısı yılda düzenli bir oranda artmaya devam ediyordu. Parkinson bunu iki eğilime bağladı — bir memurun rakip değil ast istemesi ve memurların birbirine iş üretmesi. Aynı yazıda \"önemsizlik yasası\" da vardır: bir komite en uzun tartışmayı, herkesin anlayabildiği en küçük kalem üzerinde yapar.",
    [
      "Yasanın ifadesi ve nereden geldiği",
      "Donanma bürokrasisi gözlemi ve sayılar",
      "Parkinson'un önerdiği iki mekanizma",
      "Önemsizlik yasası (bisiklet sundurması etkisi)",
      "Pratik sonucu: süre kısıtı koymanın işi nasıl değiştirdiği"
    ]
  ),
  topic(
    "top-03",
    "toplum",
    "kolay",
    "Peter ilkesi",
    "Hiyerarşik bir örgütte çalışanların, mevcut işlerindeki başarıya göre terfi ettirildikleri için yetersiz kaldıkları düzeye kadar yükselmesi ve orada kalması. Laurence J. Peter 1969'da mizahi bir kitapta ortaya attı ama gözlem ciddiye alındı. Sebep basittir: terfi kararı bir sonraki işin gerektirdiği beceriyi değil, önceki işin performansını ödüllendirir — iyi bir satışçı olmak iyi bir satış müdürü olmayı gerektirmez. 2018'de büyük bir satış temsilcisi veri seti üzerinde yapılan çalışma bu örüntüyü ampirik olarak destekledi.",
    [
      "İlkenin ifadesi ve arkasındaki terfi mantığı",
      "Neden yanlış beceriyi ödüllendirdiği",
      "Ampirik desteğin varlığı — sadece bir espri olmadığı",
      "Önerilen çözümler: ayrı uzmanlık kariyer yolu, deneme süresi, geri dönüşün mümkün olması",
      "Dilbert ilkesiyle farkı"
    ]
  ),
  topic(
    "top-04",
    "toplum",
    "orta",
    "Kırık camlar teorisi",
    "Kırık cam, grafiti ve çöp gibi küçük düzensizlik işaretlerinin \"burada kimse ilgilenmiyor\" sinyali verdiği, bunun da daha ağır suçu davet ettiği iddiası; dolayısıyla küçük ihlallerin de takip edilmesi gerektiği önerisi. Wilson ve Kelling 1982'de ortaya attı. 1990'lar New York polis uygulamalarıyla anılır, ancak o dönemdeki suç düşüşünün bu politikadan kaynaklandığı ampirik olarak tartışmalıdır: aynı yıllarda suç ABD genelinde düştü ve pek çok başka etken değişti. \"Sıfır tolerans\" biçimindeki uygulaması orantısız ve ayrımcı polislik eleştirisi aldı.",
    [
      "Teorinin iddiası ve önerdiği mekanizma (düzensizlik sinyali)",
      "Wilson ve Kelling'in makalesi",
      "New York uygulaması ve nedensellik tartışması",
      "Alternatif açıklamalar: genel suç düşüşü, demografi, ekonomi",
      "Uygulamanın yarattığı eleştiriler"
    ]
  ),
  topic(
    "top-05",
    "toplum",
    "orta",
    "Ortak malların trajedisi",
    "Herkesin erişebildiği ve sınırlı olan bir kaynağın, her bireyin kendi çıkarına göre davranması sonucunda tükenmesi: fazladan bir hayvanı meraya salmanın faydası tümüyle sahibine, maliyeti ise tüm topluluğa dağılır. Garrett Hardin 1968'de bu adla popülerleştirdi, benzetme William Forster Lloyd'un 1833 tarihli örneğine dayanır. Elinor Ostrom bunun kaçınılmaz olmadığını saha çalışmalarıyla gösterdi: topluluklar açık sınırlar, izleme, kademeli yaptırım ve yerel karar mekanizmalarıyla ortak kaynakları yüzyıllarca sürdürebiliyor. Ostrom bu çalışmayla 2009 Nobel'ini aldı.",
    [
      "Mekanizma: faydanın özelleşmesi, maliyetin dağılması",
      "Somut örnekler: aşırı avlanma, yeraltı suyu, atmosfer",
      "Hardin'in önerdiği çözümler (özelleştirme veya düzenleme)",
      "Ostrom'un itirazı ve topluluk yönetimi ilkeleri",
      "\"Kaçınılmaz\" olmadığının neden önemli olduğu"
    ]
  ),
  topic(
    "top-06",
    "toplum",
    "orta",
    "Overton penceresi",
    "Bir toplumda belirli bir anda siyaseten konuşulabilir ve savunulabilir sayılan fikirlerin aralığı. Joseph Overton'ın adını taşır. Fikirler düşünülemez, radikal, kabul edilebilir, makul, yaygın ve politika biçiminde bir eksende konumlanır; pencere zamanla kayar. Önemli nokta, siyasetçilerin pencereyi genellikle takip etmesi, tek başına itmemesidir — pencereyi kaydıran şey daha çok kamuoyu, medya ve uçlardaki söylemdir. Bu yüzden uç bir görüşün işlevi kabul edilmek değil, kendinden daha ılımlı bir görüşü makul göstermek olabilir.",
    [
      "Pencerenin tanımı ve kabul edilebilirlik ekseni",
      "Pencerenin kayabilir olması",
      "Siyasetçinin pencereyi genelde takip ettiği, itmediği",
      "Uç söylemin pencereyi kaydırma işlevi",
      "Tarihsel bir örnek: bir zamanlar düşünülemez olan bir politikanın yaygın hale gelmesi"
    ]
  ),
  topic(
    "top-07",
    "toplum",
    "orta",
    "Matta etkisi",
    "Avantajın kendini büyütmesi: zaten sahip olana daha çok verilir, olmayandan ise elindeki de alınır. Robert K. Merton 1968'de bilim sosyolojisinde adlandırdı — ortak bir çalışmadan ünlü olan bilim insanının orantısız kredi alması, bunun da kaynak ve görünürlüğünü daha da artırması. Ad, İncil'deki Matta pasajından gelir. Aynı birikimli avantaj örüntüsü atıf sayılarında, servet birikiminde ve spor akademilerinde doğum ayı etkisinde de görülür.",
    [
      "Birikimli avantaj mekanizması",
      "Merton'ın bilim sosyolojisindeki orijinal gözlemi",
      "Adın nereden geldiği",
      "Bilim dışı bir örnek: servet, atıf veya doğum ayı etkisi",
      "Politika sonucu: erken küçük farkların neden büyüdüğü"
    ]
  ),
  topic(
    "top-08",
    "toplum",
    "zor",
    "Anomi",
    "Toplumsal normların zayıfladığı, bireyin davranışını ve beklentilerini yönlendirecek ortak ölçütlerin bulanıklaştığı durum. Émile Durkheim kavramı İşbölümü (1893) ve İntihar (1897) çalışmalarında geliştirdi. Sık kaçırılan nüans, anominin yalnızca kriz ve yoksullukta değil ani refah artışında da ortaya çıkmasıdır: arzuları sınırlayan çerçeve çökünce ulaşılabilir olanın ölçüsü kaybolur. Robert Merton daha sonra kavramı yeniden tanımladı — kültürün dayattığı hedefler ile bu hedeflere ulaşmanın meşru araçları arasındaki uyumsuzluk.",
    [
      "Durkheim'ın tanımı: normların düzenleyici gücünü yitirmesi",
      "Refah artışında da görülmesi — sadece kriz kavramı olmadığı",
      "İntihar çalışmasındaki yeri",
      "Merton'ın yeniden tanımı: hedefler ve meşru araçlar uyumsuzluğu",
      "Güncel bir uygulama alanı"
    ]
  )
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

/**
 * Category label that survives an old saved record.
 *
 * The first version of this module used speech-type categories ("gundelik",
 * "ikna"). Those ids are still sitting in history entries on disk, and a plain
 * lookup would render the string "undefined" in the history list rather than
 * fail loudly. Anything unrecognised is simply shown as-is.
 */
export function rhetoricCategoryLabel(category: string): string {
  return rhetoricCategoryLabels[category as RhetoricCategory] ?? category;
}
