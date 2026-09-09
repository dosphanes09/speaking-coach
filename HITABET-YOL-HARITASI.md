# Hitabet Modülü — Yol Haritası

Türkçe hitabet, anlatım ve sunum becerisi geliştirme modülü.
Mevcut İngilizce konuşma pratiği altyapısının üzerine kuruluyor.

---

## 1. Ne yapıyoruz?

**Akış:**

```
Kavram verilir  →  15 dk araştırma (AI yok, not al)  →  Kayıt (video)
                                                              ↓
      Puan + geri bildirim  ←  Ses analizi  ←  Ses parçası yüklenir
                                                              ↓
                                         Video yerelde kalır (kendini izle)
```

**Odak:** kendini ifade etme, akıcılık, dolgu sesleri ("ııı", "yani", "şey"),
hikâye anlatıcılığı, sunum yeteneği.

**Odak değil:** dil öğretimi. Türkçen zaten iyi; burada ölçtüğümüz şey dil
bilgisi değil, **etki**.

### Konu tipi değişikliği (sonradan alınan karar)

İlk sürümde konular görüş sorusuydu ("Fikrini değiştirdiğin bir konu").
Bu yanlış egzersizi ölçüyordu: zaten bildiğin şeyi anlatıyordun ve 15 dakika
sadece planlama süresine dönüşüyordu.

Konular artık **araştırılacak kavramlar**: bir etki, bir yasa, bir olgu, bir
tarihsel olay. *Dunning-Kruger etkisi*, *Jevons paradoksu*, *Vasa gemisinin
batışı* gibi. Bu, sosyal medyadaki "15 dakika araştır, sonra anlat" akımının
mantığı ve ölçtüğü beceri farklı:

| | Görüş konusu (eski) | Araştırma konusu (yeni) |
|---|---|---|
| 15 dakika ne işe yarıyor | Düşünceyi düzenleme | **Öğrenme ve sindirme** |
| Zorluk nerede | Akıcılık | Yeni bilgiyi kendi cümlelerinle kurmak |
| Başarısızlık nasıl görünür | Tutukluk, "ııı" | **Ezber tadında konuşma**, yarım anlaşılmış kavram |

Bunun getirdiği yeni özellik: **içerik doğruluğu denetimi**. Her konunun
bankada doğrulanmış bir tanımı ve beklenen noktaları var; bunlar kayıtla
birlikte analize gönderilir ve model anlattığının doğru olup olmadığını
denetler. Raporun tek "ne söyledin" bölümü budur; geri kalan her şey "nasıl
söyledin" ile ilgili.

---

## 2. Alınan kararlar

| Konu | Karar |
|---|---|
| Konuşma süresi | **En fazla 5 dakika** |
| Video | Kaydedilir, sen izlersin; **analiz sesten** yapılır |
| Konu tipi | **Araştırılacak kavram** (etki, yasa, olgu, olay) — görüş sorusu değil |
| Konu kaynağı | Hibrit: yerel Türkçe konu bankası + istenirse AI üretimi |
| Konu bankası | 48 kavram, 6 alan × 8 (psikoloji, ekonomi, bilim, tarih, teknoloji, toplum) |
| İçerik doğruluğu | Denetlenir — bankadaki tanım referans alınır, hafızadan değil |
| Hazırlık notları | Kaydedilir ve analize girdi olur |
| Öz değerlendirme | AI puanını görmeden önce kendine puan verirsin |
| İşaretlenmiş metin | Var — ses analizinin bulgularını metin üzerinde gösterir |
| Doğaçlama modu | Var — 60 saniye hazırlık |
| Aynı konuyu tekrar anlatma | Var — önce/sonra karşılaştırması |
| Türkçe kullanımı | **Sadece bu modülde.** İngilizce modül hiç değişmiyor |
| Arayüz dili | Hitabet modülünde **Türkçe** |
| İlerleme ve grafikler | **Tamamen ayrı.** İngilizce puanlarıyla karışmaz |
| Uygulama girişi | Açılışta **iki mod arasında seçim** ekranı |

### Uygulama artık iki modlu

Açılışta bir seçim ekranı gelir:

```
        Daily Speaking Coach
   ┌──────────────┐  ┌──────────────┐
   │   English    │  │   Türkçe     │
   │   Speaking   │  │   Hitabet    │
   └──────────────┘  └──────────────┘
```

Seçilen mod **her şeyi** belirler: hangi ekranlar açılır, arayüz hangi dilde
olur, kayıtlar nereye yazılır, hangi grafikler gösterilir.

> **Neden ayrı bir dil altyapısı (i18n) kurmuyoruz?** İki modun ekranları
> zaten ayrı dosyalar. İngilizce ekranlar İngilizce metin, Türkçe ekranlar
> Türkçe metin içerecek. Bir çeviri kütüphanesi eklemek, aynı ekranın iki dilde
> görünmesi gerekiyorsa mantıklıdır — burada öyle bir ihtiyaç yok. Gereksiz
> katman eklemek yerine her ekran kendi dilinde yazılır.

Mod seçimi hatırlanır ve istediğin an değiştirebilirsin; ayrıca ayarlardan
"her açılışta sor" davranışı kapatılabilir.

---

## 3. Mimari: neyi yeniden kullanıyoruz?

Bu modülün büyük kısmı **zaten yazılmış durumda**. Yeni yazılacak olan,
işin görünen ama küçük olan kısmı.

| Katman | Durum |
|---|---|
| Kayıt alma (mikrofon/kamera) | ✅ Var — `RecordingScreen` |
| Ses → WAV dönüşümü ve yükleme | ✅ Var — `uploadFile.web.ts` |
| Backend'e güvenli istek (CORS köprüsü) | ✅ Var — `apiClient` |
| Ses dosyasını modele gönderme | ✅ Var — `openaiClient.js`, `gpt-audio` |
| Yerel kayıt saklama ve oynatma | ✅ Var — `mediaStorage` + `app://media/` |
| Geçmiş, ilerleme grafikleri, PDF | ✅ Var |
| Puan kalibrasyonu | ✅ Var — `scoringCalibrator.js` |
| **Türkçe transkripsiyon** | ❌ `language: "en"` sabit kodlu |
| **Hitabet puanlama kriterleri** | ❌ Yeni |
| **Türkçe konu bankası** | ❌ Yeni |
| **Hazırlık ekranı ve zamanlayıcı** | ❌ Yeni |
| **Video + ses eşzamanlı kayıt** | ❌ Yeni |

### Bulunan somut engeller

**1. Transkripsiyon dili sabit kodlu.**
`backend/src/openaiClient.js` içinde:
```js
formData.append("language", "en");
```
Türkçe kayıt bu haliyle gönderilirse model Türkçeyi İngilizce sanıp anlamsız
bir metin üretir. Dil parametresi çağrıya göre değişebilmeli.

**2. Süre limiti 120 saniye.**
`MAX_AUDIO_DURATION_SECONDS=120`. 3–4 dakikalık konuşma buna sığmaz.
**330 saniyeye** çıkarıldı (5 dakika + pay).

> Dosya boyutu sorun değil: 16 kHz mono WAV saniyede 32 KB.
> 5 dakika = ~9.2 MB. Sunucu limiti güvenlik payı için 12 MB'tan **16 MB'a**
> çıkarıldı; sıfır maliyetli ve kırılgan bir sınırı ortadan kaldırıyor.

**3. Günlük limit 10 analiz.**
`MAX_DAILY_ANALYSES_PER_USER=10`, İngilizce pratikle paylaşılıyordu. Hitabet
seansları çok daha uzun ve pahalı; tek sayaç olsaydı birkaç uzun konuşma
günün tüm İngilizce pratiğini yiyebilirdi. Ayrı sayaç eklendi:
`MAX_DAILY_RHETORIC_ANALYSES_PER_USER=6`.

**4. Masaüstünde video kapalı.**
Chromium video'yu WebM olarak kaydediyor, backend sadece `video/mp4` kabul
ediyor. **Ama bu artık sorun değil:** videoyu hiç yüklemiyoruz.

### Video + ses: nasıl çözülüyor

Tek bir kamera+mikrofon akışından **iki ayrı kayıt** alınır:

```
getUserMedia({ video: true, audio: true })
        |
        ├──> MediaRecorder #1  (video + ses)  →  yerel diske  →  kendini izle
        |
        └──> MediaRecorder #2  (sadece ses)   →  WAV'a çevir  →  backend'e yolla
```

İkinci kayıt yalnızca ses parçasını alır (`stream.getAudioTracks()`). Böylece:

- Video hiç yüklenmiyor → boyut, maliyet ve `video/mp4` sorunu ortadan kalkıyor
- Ses zaten yazdığımız WAV dönüştürücüden geçiyor → yeni kod gerekmiyor
- Videoyu `app://media/` üzerinden oynatabiliyoruz → zaman damgasına tıklayınca
  o ana atlama mümkün

> **Telefon tarafı:** Android'de kamera ve mikrofonu aynı anda iki ayrı
> kaydediciye vermek Expo ile kolay değil. Hitabet modülü telefonda
> **sadece ses** ile çalışır. Bu modülün doğal yeri zaten masaüstü.

---

## 4. Puanlama sistemi

İngilizce modülünün kriterleri buraya uymuyor (orada dil doğruluğu ölçülüyor).
Hitabet için ayrı bir kriter seti gerekiyor.

### 4.1 Puanlanan boyutlar (model değerlendirir, 0–100)

| Boyut | Ne ölçüyor |
|---|---|
| **İçerik ve argüman** | Konu kavranmış mı, iddia net mi, gerekçe ve örnek var mı |
| **Yapı ve akış** | Giriş kancası, gövdenin sıralanışı, geçişler, kapanış |
| **Akıcılık ve tempo** | Dolgu sesleri, takılmalar, duraklamaların yerinde olması |
| **Dil ve üslup** | Kelime çeşitliliği, cümle kurulumu, klişeden kaçınma |
| **Etki ve anlatıcılık** | Hikâye, imge, ritim, dinleyiciyle kurulan bağ |
| **Ses kullanımı** | Tonlama, monotonluk, vurgu, hız değişimi |

Son ikisi **yalnızca sesten** anlaşılır — metinden asla çıkmaz. Bu yüzden ses
tabanlı analiz bu modülün olmazsa olmazı.

### 4.2 Ölçülen sayılar (yorum değil, hesap)

Bunlar modelin kanaati değil, doğrudan ölçüm. Zaman içinde karşılaştırılabilir
oldukları için asıl gelişim göstergesi bunlar:

| Ölçüm | Neden önemli |
|---|---|
| Konuşma hızı (kelime/dakika) | Türkçe sunumda rahat aralık ~130–160 |
| Dolgu sözcük sayısı ve oranı | "yani, şey, hani, işte, falan, aslında" |
| Dolgu sesi sayısı | "ııı, eee, mmm" — sadece sesten tespit edilir |
| Duraklama sayısı ve en uzun duraklama | Etkili duraklama ile takılma farkı |
| Sessizlik oranı | Toplam sürenin yüzde kaçı sessiz |
| Kelime çeşitliliği | Benzersiz kelime / toplam kelime |
| Ortalama cümle uzunluğu | Çok uzun cümle = takip edilmesi zor |

> **Neden bu ayrım önemli?** Model bugün "iyi" deyip yarın aynı konuşmaya
> "orta" diyebilir. Ama "dakikada 6 kez 'yani' dedin" tartışmaya kapalıdır.
> Gelişimi bu sayılardan takip edeceğiz, puanlardan değil.

### 4.3 Ek kıyaslamalar

- **Zaman yönetimi:** hedeflenen süreye ne kadar yaklaştın
- **Hazırlık uyumu:** notlarında planladığın başlıkların kaçını anlattın
- **Öz değerlendirme farkı:** kendine verdiğin puan ile AI puanı arasındaki fark

Sonuncusu sandığından daha değerli. Kendini sürekli olduğundan iyi görüyorsan
farkındalık sorunu var; sürekli kötü görüyorsan özgüven sorunu var. İkisi de
takip edilmeye değer.

---

## 5. Fazlar

Her faz kendi başına çalışan bir şey bırakır. Yarıda kalırsa elimizde
yarım bir şey olmaz.

### Faz 0 — Motor  ✅ TAMAMLANDI

Backend artık Türkçe bir ses kaydını alıp hitabet analizi döndürebiliyor.
Arayüzde hiçbir şey değişmedi.

| Dosya | Ne yapıldı |
|---|---|
| `src/rhetoricSchema.js` | **Yeni.** Cevap şeması: 6 puan boyutu, 9 ölçüm, işaretli segmentler |
| `src/rhetoricPrompt.js` | **Yeni.** Türkçe koç talimatı, puan bantları, dolgu tanımları |
| `src/openaiClient.js` | Transkripsiyon dili parametre oldu; `analyzeRhetoric()` eklendi; token kullanımı loglanıyor |
| `src/server.js` | `/api/analyze-rhetoric` uç noktası |
| `src/validation.js` | Süre tavanı çağrıya göre değişebiliyor; `validateRhetoricMode` |
| `src/config.js` | 330 sn süre, 16 MB dosya, ayrı günlük kota, daha büyük token bütçesi |
| `src/logger.js` | Token sayıları loglanabiliyor (kullanıcı içeriği hâlâ engelli) |
| `scripts/rhetoricSelfTest.js` | **Yeni.** 19 çevrimdışı kontrol (`npm run test:rhetoric`) |
| `scripts/rhetoricLiveTest.js` | **Yeni.** Gerçek kayıtla ölçüm betiği |

**Test sırasında yakalanan gerçek hata:** `validateOptionalDurationSeconds`
kendi içindeki çağrıya süre tavanını geçirmiyordu. Sonuç: 300 saniyelik geçerli
bir kayıt, süresi kabul edildikten sonra *hedef süre* kontrolünde İngilizce
modülün 120 saniyelik sınırına takılıp sebepsiz görünen bir 400 hatası
veriyordu. Düzeltildi ve teste bağlandı.

**Neden ayrı uç nokta, tek bir "dil" bayrağı değil?** İki akış arasında
neredeyse hiçbir şey ortak değil: farklı transkripsiyon dili, farklı süre
tavanı, farklı günlük kota, farklı rubrik, farklı cevap şeması. Bunları tek
route içinde bayrakla ayırmak, çalışan İngilizce yolu her değişiklikte riske
atmak demekti.

> **Önemli iş akışı notu:** Uygulama yalnızca Render'daki üretim adresine
> istek atabiliyor (`validateBackendBaseUrl` başka bir adresi reddediyor).
> Yani Faz 0 yerelde `rhetoricLiveTest.js` ile test edilir; arayüzden
> kullanılabilmesi için backend'in Render'a deploy edilmesi gerekir.

### Faz 1 — Uçtan uca en kısa tur  ✅ TAMAMLANDI

- **Mod seçimi altyapısı:** açılış ekranı, `AppMode` kavramı, `App.tsx`'in iki
  ayrı ekran ağacını yönetecek şekilde bölünmesi, seçimin hatırlanması
- Türkçe konu bankası (ilk sürüm: ~40 konu, kategorili, zorluk seviyeli)
- Yeni akış ekranları (arayüz dili Türkçe):
  `Konu` → `Hazırlık (15 dk + not alanı)` → `Kayıt` → `Analiz` → `Sonuç`
- Video + ses eşzamanlı kayıt (bölüm 3'teki iki-kaydedici yöntemi)
- Hitabet kayıtları için ayrı depo (İngilizce kayıtlarla karışmasın)
- Backend'in Render'a deploy edilmesi

> `App.tsx` şu an tek bir yönlendirme ağacı tutuyor. Mod seçimi bunu ikiye
> ayıracağı için Faz 1'in en dikkat isteyen kısmı burası; İngilizce tarafın
> davranışının birebir korunması gerekiyor.

**Sonuç:** Özellik baştan sona çalışıyor. Bir konu alıp konuşup puan
alabiliyorsun. Buradan sonrası derinleştirme.

### Faz 2 — Geri bildirimin derinleşmesi  ✅ TAMAMLANDI

- İşaretlenmiş konuşma metni (dolgu sesleri, uzun duraklamalar, tekrarlar)
- Zaman damgaları → işaretli yere tıklayınca video o ana atlıyor
- Ölçüm kartları (hız, dolgu oranı, duraklama dağılımı)
- Hazırlık notları ile konuşmanın karşılaştırılması

**Sonuç:** Geri bildirim soyut olmaktan çıkıp "şurada, şu anda, şu kelime"
seviyesine iniyor.

### Faz 3 — Öğrenme döngüsü  ✅ TAMAMLANDI

- Öz değerlendirme (AI puanını görmeden önce kendine puan ver)
- Aynı konuyu tekrar anlatma ve önce/sonra karşılaştırması
- Hitabete özel, tamamen ayrı ilerleme grafikleri (ölçüm sayıları zaman içinde)
- Tekrar eden zayıflıkların tespiti ("son 5 konuşmanın 4'ünde kapanış zayıf")

**Sonuç:** Uygulama artık tek seferlik puan vermiyor, gelişimini takip ediyor.

### Faz 4 — Cila  ✅ TAMAMLANDI (AI konu üretimi hariç)

- Doğaçlama modu (60 saniye hazırlık)
- AI ile taze konu üretimi
- Hitabet raporu PDF çıktısı
- Konu bankasının genişletilmesi (150+ konu)

---

## 6. Riskler ve bilinmeyenler

**Dolgu sesi tespiti ne kadar iyi çalışacak? — ÖLÇÜM HAZIR, SONUÇ BEKLENİYOR**
`gpt-audio` sesi duyuyor ama "ııı" seslerini ne kadar tutarlı sayacağı hâlâ
bilinmiyor. Ölçmek için betik yazıldı:

```
node scripts/rhetoricLiveTest.js --ses kayit.wav --konu "..." --beklenen-iii 12
```

Bilerek "ııı" içeren bir kayıt yapıp kaç tane söylediğini `--beklenen-iii` ile
ver; betik modelin kaçını yakaladığını yüzdeyle raporlar.
%80+ ise ölçüm modele bırakılabilir. %50'nin altındaysa yedek plana geçilir:
backend'de ffmpeg zaten kurulu, sessizlik aralarındaki ses enerjisi ölçülür —
sessiz boşluk = gerçek duraklama, sesli boşluk = dolgu sesi.

**Puanlar tutarlı olacak mı?**
Aynı konuşmayı iki kez gönderip farklı puan gelmesi olası. İngilizce
modülündeki `scoringCalibrator.js` bu iş için yazılmış; benzerini kuracağız.
Ayrıca bölüm 4.2'deki ölçümler zaten deterministik.

**Maliyet ne olacak? — ÖLÇÜM HAZIR**
Backend artık her model çağrısında token sayılarını logluyor. Canlı testi
çalıştırdıktan sonra backend konsolunda `openai_usage` satırına bak:
`input`, `output` ve ayrıca `audioInput` (ses girişi ayrı fiyatlanıyor).

**Uygulama şişiyor mu?**
Şu an 17 ekran var, bu modül 5 tane daha ekliyor. Ana ekranın kalabalıklaşmaması
için hitabet kendi bölümü altında toplanmalı, ana ekrana tek giriş konmalı.

---

## 7. Durum ve sıradaki adım

Tüm fazlar tamamlandı. Uygulama açıldığında iki modül arasında seçim yapıyor;
Türkçe Hitabet modülü konu vermeden PDF raporuna kadar uçtan uca çalışıyor.

### Yapılan doğrulamalar

| Test | Sonuç |
|---|---|
| Backend şema/prompt/limit kontrolleri | 19/19 |
| Hitabet ilerleme matematiği | 22/22 |
| Mevcut İngilizce modül testleri (regresyon) | tümü geçti |
| Electron'da arayüz akışı (mod seçimi → hazırlık) | 20/20 |
| Çift kaydedici + WAV dönüşümü (sahte kamera/mikrofon) | 13/13 |
| TypeScript | temiz |

Ölçülen gerçek değerler: 3 saniyelik kayıtta ses 46 KB, video 242 KB — yani
yüklenen dosya videonun beşte biri. 5.5 dakikalık en kötü durumda yüklenecek
WAV 11.7 MB, sunucu sınırı 16 MB.

### Yapılmayan tek şey

**AI ile taze konu üretimi.** Yerel bankada 40 konu var (6 kategori, 3 zorluk)
ve 30 gün içinde tekrar etmiyor. AI üretimi için ayrı bir backend uç noktası ve
yeni bir Render dağıtımı gerekiyordu; bankayı tüketmeden buna ihtiyaç yok.
İstediğinde eklenir.

### Sıradaki adım: backend'i Render'a dağıt

Uygulama yalnızca `https://daily-speaking-coach.onrender.com` adresine istek
atabiliyor (`validateBackendBaseUrl` başka adresi reddediyor). Yani hitabet
analizinin arayüzden çalışması için `backend/` klasöründeki değişikliklerin
Render'a gitmesi gerekiyor.

Dağıtımdan önce yerelde ölçüm yapmak istersen:

```
cd backend
npm start
node scripts/rhetoricLiveTest.js --ses kayit.wav --konu "Konu" --beklenen-iii 8
```

Bu, dolgu sesi tespitinin isabetini ve bir seansın token maliyetini gösterir.

---

## Faz 5 — Karar verildi, kalibrasyon testinden sonra başlanacak

Uygulamanın bugünkü döngüsü şu:

```
konu → konuş → ölç → rapor → (hiçbir şey)
```

`nextSessionFocus` yazılıyor, ekranda gösteriliyor ve orada bitiyor — bir
sonraki seansa hiç girmiyor. Yani elimizde çok iyi bir **ölçüm aleti** var ama
bir **antrenman programı** yok. Faz 5'in tamamı bu iki boşluğu kapatıyor.

### 5.1 — 60 saniyelik mikro-egzersizler

**Sorun:** Hitabet seansı 20 dakikalık bir taahhüt (15 hazırlık + 4 konuşma +
analiz). Bu, günde bir kez bile zor yapılır. Oysa diksiyon ve dolgu sesi motor
becerilerdir: uzun seansla değil **sık seansla** düzelirler. Haftada 1 kez 20
dakika, günde 3 kez 1 dakikadan daha az kazandırır.

**Çözüm:** Hitabetten ayrı, günde birkaç kez yapılabilen kısa alıştırmalar.

| Egzersiz | Ne yapılıyor | Ne ölçülüyor |
|---|---|---|
| Dolgu yasağı | 60 sn konuş, tek "ııı" bile yok | Dolgu sesi sayısı — hedef sıfır |
| Tempo tutturma | Verilen metni hedef hızda oku | Gerçek hız vs hedef |
| Tekerleme | Diksiyon tekerlemesi, giderek hızlanan | Hece netliği, hata sayısı |

**Neden ucuz:** 60 saniyelik ses, 5 dakikalık kaydın yaklaşık beşte biri kadar
maliyetli. Analiz şeması da tam rapor değil, 3-4 alanlık küçük bir yanıt.
Sonuç saniyeler içinde gelir.

**Tasarım notu:** Hitabet modülü "sınav", bu "antrenman". Bu yüzden ayrı bir
puan ölçeği kullanmalı ve hitabet ilerleme grafiğine karışmamalı — aynı gerekçe
İngilizce ile hitabeti ayırdığımızdaki gerekçe.

### 5.2 — Duraklama ve tempoyu ffmpeg'e devretmek

**Sorun:** `pauseCount`, `longestPauseSeconds`, `silenceRatio` ve
`wordsPerMinute` şu an modelin tahmini. Model aynı kayda bugün 4, yarın 6
duraklama diyebilir. İlerleme grafiği bu sayıların üzerine kurulu olduğu için,
grafikte görünen "iyileşme" gerçek gelişme değil model sapması olabilir.

**Çözüm:** Bu dört ölçümü ses dalgasından deterministik olarak ölçmek.

```
ffmpeg -i kayit.wav -af silencedetect=noise=-30dB:d=0.8 -f null -
→ silence_start: 12.4 / silence_end: 16.6 | silence_duration: 4.2
```

Aynı dosya 100 kez ölçülse 100 kez aynı sayıyı verir.

**Neden ucuz:** `ffmpeg-static` backend'de zaten kurulu ve her istekte WAV
dönüşümü için çalışıyor (`audioConversion.js`). Ek token maliyeti **sıfır**.

**Ayrım:** Ölçümler ffmpeg'e geçer, **yorum** modelde kalır. Model "2:14'te 4.2
saniye durdun, cümle ortasındaydı, takılma gibi duyuldu" demeye devam eder —
sadece "4.2" sayısını artık uydurmaz.

### Sıra ve bağımlılık

Kalibrasyon kaydı yapılmadan başlanmıyor. Gerekçe: doğrulanmamış bir ölçümün
üzerine özellik eklemek, terazinin ayarını kontrol etmeden diyet programı
yazmaktır. Test ayrıca 5.2'nin kapsamını belirliyor:

| Test sonucu | 5.2'nin kapsamı |
|---|---|
| Dolgu sesi sayımı tutuyor | Yalnızca duraklama + tempo ffmpeg'e geçer |
| Dolgu sesi sayımı tutmuyor | Ayrıca enerji/süre örüntüsüyle "ııı" adayı tespiti eklenir |

### Bu fazda bilinçli olarak yapılmayanlar

- **AI konu üretimi** — 48 konuluk banka aylarca yeter; üstelik bankadaki
  tanımlar doğrulanmış, AI ürettiğinde içerik doğruluğu denetimi de
  güvenilirliğini kaybeder.
- **Rozet / streak / oyunlaştırma** — tek kullanıcılı bir uygulamada kendini
  kandırma aracına dönüşür.
- **Paylaşım özellikleri** — kimseye gösterilmeyecek.
- **Günlük hak göstergesi, bekleyen analiz kuyruğu, haftalık özet** — gerçek
  boşluklar ama bu fazın dışında; sıra gelirse eklenir.
