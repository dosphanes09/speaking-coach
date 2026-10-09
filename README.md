# Daily Speaking Coach

Expo / React Native mobil uygulama ve Node.js / Express backend ile güvenli speaking analizi MVP'si.

## Mimari

```text
Mobile App
  -> Local backend veya Render HTTPS backend
  -> OpenAI API
```

Local geliştirme için PC'de çalışan backend kullanılabilir. Ben ve sevgilim gibi farklı telefonlardan aynı backend'i kullanmak için backend Render Free Web Service olarak deploy edilebilir.

Mobil uygulama OpenAI API key tutmaz, OpenAI endpointlerine doğrudan istek atmaz ve `EXPO_PUBLIC_OPENAI_API_KEY` gibi public secret kullanmaz. OpenAI API key yalnızca backend tarafında `backend/.env` dosyasındaki `OPENAI_API_KEY` olarak bulunur.

## Proje Yapısı

- `App.tsx`: mobil ekran akışı.
- `src/screens`: Home, Grammar Roadmap, Recording, Transcript/Secure Analysis, Analysis, History, Progress, Settings, Chat.
- `src/data/grammarRoadmap.ts`: A1-C2 tense content and level speaking challenges.
- `src/services/backend/analyzeSpeechService.ts`: mobil uygulamanın backend `/api/analyze-speech` istemcisi.
- `src/services/storage`: yerel kayıtlar, ayarlar ve anonim client id.
- `backend/src/server.js`: Express API.
- `backend/src/openaiClient.js`: OpenAI istekleri sadece backend tarafında.
- `backend/src/validation.js`: upload, MIME, extension, süre ve input validasyonu.
- `backend/src/auth.js`: opsiyonel davet kodu kaydı, imzalı token doğrulama ve cihaz yetkilendirme.
- `backend/src/dailyLimitStore.js`: auth açıkken Redis üzerinde doğrulanmış cihaz başına kalıcı günlük limit; auth kapalıyken kolay paylaşım modu için in-memory fallback.

## Backend Güvenlik Kontrolleri

`POST /api/analyze-speech`:

- `OPENAI_API_KEY` sadece backend `.env` içinden okunur.
- `express-rate-limit` ile endpoint ve aktivasyon denemeleri rate limit altındadır.
- Davet kodu modu opsiyoneldir. `REQUIRE_APP_AUTH=true` iken ücretli analiz endpoint'i imzalı Bearer token olmadan çalışmaz.
- Auth açıkken davet kodu, aktif cihaz kaydı ve günlük analiz kotası Upstash Redis'te tutulur.
- Dosya boyutu `MAX_FILE_SIZE_BYTES` ile sınırlıdır.
- Kayıt süresi `MAX_AUDIO_DURATION_SECONDS` ile sınırlıdır.
- Sadece izin verilen extension ve MIME type kabul edilir.
- Dosya içeriği `file-type` ile kontrol edilir.
- Medya süresi `music-metadata` ile kontrol edilmeye çalışılır.
- Dosya geçici olarak `backend/tmp/uploads` altına yazılır ve işlem sonunda silinir.
- OpenAI isteklerinde timeout ve sınırlı retry vardır.
- Hata cevapları API key, stack trace veya internal server detayı döndürmez.
- Loglar Authorization header, raw audio veya kişisel veri yazmaz.
- CORS `FRONTEND_ORIGINS` ile sınırlandırılır.

Production'da `REQUIRE_APP_AUTH=true` iken günlük analiz kotası doğrulanmış cihaz token'ına göre Upstash Redis'te kalıcı tutulur. `REQUIRE_APP_AUTH=false` iken kolay paylaşım modu için in-memory fallback kullanılır.

## Local Kurulum

Root mobil bağımlılıkları:

```bash
npm install
```

Backend bağımlılıkları:

```bash
cd backend
npm install
cp .env.example .env
```

`backend/.env` içine sadece backend tarafında:

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

API key mobil uygulamaya, Expo public env değişkenlerine veya GitHub'a eklenmez.

## Local Çalıştırma

1. Backend'i başlat:

```bash
cd backend
npm run dev
```

2. Backend sağlık kontrolü:

```bash
curl http://localhost:3001/health
```

Beklenen cevap:

```json
{ "ok": true }
```

3. Mobil uygulamayı başlat:

```bash
cd ..
npm run start:clear
```

Expo Go ile QR okut. Port sorarsa yeni portu kabul edebilirsin.

## Practice Flow

`Think` ekranında 30 saniyelik hazırlık süresinde kısa notlar yazabilirsin. Bu notlar sadece cihaz ekranında tutulur; ses/video kaydına, backend analizine, geçmiş kayıtlara veya PDF'e gönderilmez.

`Record` ekranında hazırlık notları okunabilir şekilde gösterilir. Konuşma süresi konu uzunluğu, seviye ve hedef grammar yapılarına göre otomatik seçilir:

- minimum: 90 saniye (eskiden 60 saniyeydi — anlamlı, değerlendirilebilir bir cevap için çok kısa kaldığı fark edildi, tüm topic'ler için taban 90 saniyeye çıkarıldı)
- orta zorluk: 105 saniye
- maksimum: 120 saniye

Backend güvenlik sınırı de `MAX_AUDIO_DURATION_SECONDS=120` olacak şekilde ayarlanmıştır. Eğer kendi `backend/.env` dosyanda eski `75` değeri varsa 120 olarak güncelle ve backend'i yeniden başlat.

Android'de alt sistem navigasyon tuşları uygulama açıkken gizlenmeye çalışılır. Bazı cihazlarda kenardan kaydırınca geçici olarak tekrar görünebilir; uygulama aktif olunca yeniden gizlenir.

**Aynı soruyu tekrar cevaplama:** `Practice Detail` ekranında (Geçmiş'ten bir kaydı açtığında) artık bir `Retry This Question` butonu var. Bu, o kaydın `topic` nesnesini birebir aynen tekrar `thinking` akışına sokar (aynı topic id, aynı grammar/picture context varsa o da dahil), yani günlük konu rotasyonunun 14 günlük "yakın zamanda sorulmuş konuları tekrar önerme" filtresini bilerek atlar — kullanıcı bilerek aynı soruyu tekrar cevaplamak istiyor. Yeni deneme, `createId("record")` ile her zaman olduğu gibi ayrı, yeni bir kayıt olarak kaydedilir (eski kayıt değiştirilmez/üzerine yazılmaz), böylece aynı soru için birden fazla puan/feedback tutulmuş olur.

Bu zaten var olan iki mekanizmayı otomatik olarak devreye sokar:
- Yeni deneme kaydedilirken (`AnalysisScreen`), `beforeAfterService.buildLatestTopicComparison` aynı topic'e ait en son önceki denemeyi bulup skor/hata-paterni/WPM karşılaştırmasını otomatik gösterir (Before/After kartı) — kullanıcı feedback'in işe yarayıp yaramadığını hemen görür.
- `Practice Detail` ekranında, yeni eklenen `findTopicAttempts` fonksiyonu aynı soruya ait TÜM diğer denemeleri (sadece en sonuncusunu değil) tarih ve puanla listeler; herhangi birine dokunup o denemenin detayına geçebilirsin, böylece zaman içindeki gelişimi tek tek karşılaştırabilirsin.

Eşleştirme önce `topic.id` ile, o tutmazsa normalize edilmiş `topic.title` ile yapılır (böylece aynı soru farklı id ile oluşsa bile eşleşir). Hiçbir schema/storage değişikliği gerekmedi — kayıtlar zaten `id` (her zaman eşsiz) ile `topic` (tekrar edebilir) alanlarını ayrı tuttuğu için bu tamamen mevcut veri modeliyle çalışıyor.

## Tema ve Konu Çeşitliliği

`Settings` ekranından `light` veya `dark` tema seçilebilir. Tema tercihi local settings içinde saklanır.

Gündelik speaking konuları son 14 günde tamamlanan kayıtlara göre filtrelenir. Aynı speaking konusu iki hafta içinde tekrar önerilmez; ilgili seviyedeki taze konu havuzu biterse uygulama boş kalmamak için tekrar havuzuna geri döner. A2, B1, B2 ve C1 konu havuzları iki haftalık çeşitlilik için genişletilmiştir.

## Windows Tek Tık Development

Proje root klasöründe development için üç yardımcı `.bat` dosyası vardır:

- `start-backend.bat`: yeni bir terminal açar, `backend` klasöründe `npm run dev` çalıştırır.
- `start-expo.bat`: proje root klasöründe `npm run start:lan` çalıştırır ve QR kodu aynı pencerede gösterir.
- `start-app.bat`: backend'i ayrı pencerede başlatır, Expo'yu ise tıkladığın ana pencerede açar; QR kod burada görünür.

Tek tıkla local backend + Expo başlatmak için:

```text
start-app.bat
```

Bu scriptler sadece development kolaylığı içindir. Production build, Android APK süreci ve backend güvenlik mimarisini etkilemez. Ek dependency eklenmedi; `concurrently` yerine Windows'un kendi terminal başlatma komutu kullanılır.

QR kod görünmezse `Daily Speaking Expo` penceresinin açık olduğunu kontrol et veya root klasörde şu komutu çalıştır:

```bash
npm run start:lan
```

## Render Free Backend Deploy

Render Web Service ayarları root `render.yaml` içindedir:

- `rootDir`: `backend`
- `buildCommand`: `npm ci`
- `startCommand`: `npm start`
- `healthCheckPath`: `/health`
- `plan`: `free`

Render deploy adımları:

1. Kodu GitHub'a push et. `.env`, `backend/.env`, API key veya token push etme.
2. Render Dashboard'da `New` > `Blueprint` seç ve repoyu bağla.
3. Root'taki `render.yaml` dosyasını seç.
4. Render env var ekranında `sync: false` olan değerleri gir:

```text
OPENAI_API_KEY=<your-openai-api-key>
AUTH_TOKEN_SECRET=<generated-backend-secret>
APP_INVITE_CODES=<comma-separated-private-codes>
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
```

Native Android/iOS istekleri genelde browser `Origin` header'ı göndermez. Bu yüzden `FRONTEND_ORIGINS` boş kalabilir. Expo Web veya browser tabanlı bir frontend kullanırsan virgülle ayrılmış HTTPS originlerini ekle.

Render production için önerilen env var listesi:

```text
NODE_ENV=production
SERVICE_NAME=daily-speaking-coach-api
OPENAI_API_KEY=<Render secret env var>
FRONTEND_ORIGINS=
REQUIRE_HTTPS=true
REQUIRE_APP_AUTH=false
MAX_FILE_SIZE_BYTES=12582912
MAX_AUDIO_DURATION_SECONDS=120
MAX_DAILY_ANALYSES_PER_USER=10
MAX_DAILY_CHAT_MESSAGES_PER_USER=60
MAX_CHAT_MESSAGE_LENGTH=1200
MAX_CHAT_HISTORY_MESSAGES=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=30
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_ANALYSIS_MODEL=gpt-5.4-mini
OPENAI_CHAT_MODEL=gpt-5.4-mini
OPENAI_TIMEOUT_MS=30000
OPENAI_MAX_RETRIES=1
OPENAI_MAX_OUTPUT_TOKENS=8000
OPENAI_CHAT_MAX_OUTPUT_TOKENS=700
ENABLE_AUDIO_ANALYSIS=true
OPENAI_AUDIO_ANALYSIS_MODEL=gpt-audio
```

Deploy sonrası Render URL'i şu formatta olur:

```text
https://daily-speaking-coach.onrender.com
```

Kendi Render URL'inle health check yap:

```bash
curl https://daily-speaking-coach.onrender.com/health
```

Beklenen cevap:

```json
{ "ok": true, "service": "daily-speaking-coach-api", "openaiConfigured": true }
```

Production backend gerekli auth, Redis veya OpenAI secret'ları eksikse başlamaz ve Render health check başarısız olur.

Render ephemeral disk notu: Backend upload dosyasını sadece geçici olarak `backend/tmp/uploads` altına yazar. Analiz başarılı veya başarısız olsa da `finally` bloğunda dosya silinir. Render Free disk kalıcı depolama olarak kullanılmaz.

Ücretsiz Render servisleri uykuya geçebilir; ilk istek geç cevap verebilir. `REQUIRE_APP_AUTH=true` iken günlük cihaz kotası Upstash Redis'te kalıcı tutulur ve Render yeniden başlasa da kaybolmaz.

## Production APK ile Render Backend Kullanımı

Mobil uygulama production build'de backend URL'ini sadece build-time public config'ten okur. Bu değer secret değildir; sadece backend adresidir.

Yeni APK almadan önce EAS/Expo build ortamında şu public env değerlerini ayarla:

```text
EXPO_PUBLIC_API_URL=https://daily-speaking-coach.onrender.com
```

EAS CLI ile production ortamına eklemek için:

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://daily-speaking-coach.onrender.com --environment production --visibility plaintext
```

Sonra APK build al:

```bash
eas build --platform android --profile apk
```

`apk` profili paylaşılabilir bir Android APK üretir ve production EAS environment değerlerini kullanır. Backend URL tüm build'lerde `https://daily-speaking-coach.onrender.com` olarak kilitlidir; kayıtlı eski localhost veya LAN ayarları otomatik olarak değiştirilir.

## Grammar Roadmap

Ana ekrandaki `Ogrenme Alani` butonu ayrı Learning ekranını açar. Bu ekrandaki `Open Grammar Roadmap` butonu A1-C2 seviyelerine göre tense odaklı grammar çalışma ekranını açar. Her seviyede:

- tense topic kartları
- core feeling, structure, usage, examples, common mistakes
- speaking patterns ve mini challenge
- level speaking challenges

Level ekranında tek bir aktif speaking sorusu gösterilir. `Yeni Soru` ile aynı seviyede farklı bir soru alabilir, `Start Speaking Practice` ile mevcut speaking akışına geçebilirsin:

```text
Grammar challenge -> Thinking -> Recording -> Transcript -> Backend analysis
```

Grammar challenge context'i mobil uygulamada sadece normal form verisi olarak backend'e gönderilir:

- `grammarCefrLevel`
- `grammarTopic`
- `expectedGrammarStructures`
- `speakingPrompt`

Bu bilgiler secret değildir. OpenAI API key yine yalnızca backend `.env` içindedir. Backend context varsa grammar hedefini de analiz eder; context yoksa eski genel speech analysis akışı aynen çalışır.

## PDF Raporu

Analiz sonucu geldikten sonra `PDF Raporu Oluştur` butonu görünür. Bu işlem backend'e yeni istek atmaz; mevcut transcript ve analysis sonucundan cihaz üzerinde PDF oluşturur ve Android paylaşım ekranını açar.

PDF raporu:

- speaking konusu, tarih ve transcript
- seviye tahmini ve skorlar
- grammar corrections
- vocabulary suggestions
- pronunciation ve fluency feedback
- native-like improved answer
- kişiye özel alıştırmalar
- `Bugünün Kişisel Çalışma Planı` bölümü

PDF için OpenAI key, backend secret veya ekstra kullanıcı verisi mobil uygulamaya taşınmaz.

## Opsiyonel Public Config

Root `.env.example` dosyasındaki `EXPO_PUBLIC_API_URL` secret değildir ve `https://daily-speaking-coach.onrender.com` değerine ayarlanmıştır. Uygulama eski kayıtlı URL'leri kullanmaz; tüm mobil API istekleri bu HTTPS origin'ine gider.

Bu public env değişkenleri sadece ileride production/APK build düşünülürse backend URL sabitlemek için vardır. OpenAI key için kullanılmaz.

## Backend Endpoint

`POST /api/analyze-speech`

Form data:

- `file`: `.m4a`, `.mp3`, `.mp4`, `.mpeg`, `.mpga`, `.wav`, `.webm`
- `topic`: speaking konusu
- `level`: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`
- `durationSeconds`: mobil uygulamadaki kayıt süresi
- `grammarCefrLevel` (opsiyonel): grammar challenge seviyesi
- `grammarTopic` (opsiyonel): hedef grammar konusu
- `expectedGrammarStructures` (opsiyonel): beklenen grammar yapıları
- `speakingPrompt` (opsiyonel): grammar challenge prompt'u

Header:

- `Authorization: Bearer <signed-device-token>`: aktivasyon sonrası SecureStore'da tutulan cihaz token'ı

Başarılı cevap:

```json
{
  "transcript": "The user transcript...",
  "analysis": {
    "originalTranscript": "...",
    "correctedVersion": "...",
    "mistakes": [],
    "vocabularySuggestions": [],
    "connectorSuggestions": [],
    "sentenceStructureSuggestions": [],
    "speakingFeedback": {},
    "scores": {},
    "speakingAnalytics": {},
    "errorPatterns": [],
    "progressTags": [],
    "repeatedMistakeCandidates": [],
    "grammarFocusFeedback": {},
    "improvementPlan": {},
    "generatedBy": "backend",
    "createdAt": "2026-05-24T..."
  }
}
```

Backend analiz skorlarını 0-100 formatında üretir. Mobil uygulama eski 1-10 kayıtları da desteklemek için skorları ekranda normalize eder.

### Ses tabanlı analiz (transkript değil, doğrudan ses)

Backend artık analiz için (mümkünse) transkripti değil, doğrudan ses kaydının kendisini `OPENAI_AUDIO_ANALYSIS_MODEL` (varsayılan `gpt-audio`) modeline gönderiyor; telaffuz, tonlama ve duraksama gibi değerlendirmeler artık gerçekten dinlenen sesten çıkarılıyor. Kayıt, gönderilmeden önce `ffmpeg-static` ile mono 16kHz WAV'a dönüştürülüyor (mobil taraf genelde `.m4a` kaydediyor, ses modeli için en güvenilir format WAV).

Bu yeni bir entegrasyon olduğu için **otomatik yedekleme** var: ses tabanlı analiz herhangi bir nedenle başarısız olursa (dönüştürme hatası, model hatası, format sorunu), backend sessizce eski transkript-tabanlı analiz yoluna düşüyor ve istek yine de başarıyla tamamlanıyor — sadece backend loglarında `audio_analysis_failed_falling_back_to_text` uyarısı görürsünüz. Özelliği tamamen kapatmak için `ENABLE_AUDIO_ANALYSIS=false` yapıp backend'i yeniden başlatmanız yeterli, kod değişikliği gerekmez.

Not: Bu, gerçek OpenAI API'sine karşı bu ortamda test edilemedi (bu geliştirme ortamının OpenAI erişimi yok) — ffmpeg dönüştürme adımı ve yedekleme mantığı gerçek verilerle doğrulandı, ancak `gpt-audio` modelinin tam istek/yanıt şekliyle ilk gerçek denemeyi siz production'da veya yerel `npm run dev` ile yapacaksınız. Bir sorun çıkarsa backend loglarına bakın.

**Faz 3 — telaffuzun genel puana etkisi:** Ses tabanlı analiz gerçekten başarılı olduğunda (yedeklemeye düşmeden), telaffuz artık "sadece gösterim" olmaktan çıkıp genel puana da %10 ağırlıkla katılıyor (grammar/fluency&coherence/content&relevance/vocabulary ağırlıkları buna göre hafifçe azaltıldı: 25/25/25/15/10 -> 22/22/22/14/10 + telaffuz %10). Analiz eski transkript-tabanlı yola düştüyse veya ses hiç gönderilmediyse, telaffuz öncekiyle birebir aynı şekilde genel puanın dışında kalıyor — çünkü o durumda telaffuz hâlâ sadece bir tahmin, gerçek ses kanıtına dayanmıyor. Kullanıcıya da bu net şimdi belirtiliyor: telaffuz notlarının altında "genel puana katılıyor mu, katılmıyor mu" açıklayan bir cümle otomatik ekleniyor.

**Madde 4 — konu uygunluğunun bağımsız doğrulanması:** AI artık her analizde ayrı, yapılandırılmış bir `topicRelevance` alanı doldurur (`off_topic` / `partially_relevant` / `fully_relevant` + kısa açıklama), sadece verilen konuyu/prompt'u gerçekten ele alıp almadığına bakarak — gramer/akıcılık kalitesinden tamamen bağımsız. Konu tam olarak ele alınmamışsa "Content & Relevance" bileşen puanı (dolayısıyla genel puan) buna göre tavana çarpar, ve kullanıcıya "cevabın verilen konuyu tam olarak ele almadığı" şeklinde bir geri bildirim ve improvement plan maddesi eklenir. Eski kayıtlarda bu alan yoksa (veya `fully_relevant` ise) hiçbir ceza uygulanmaz.

**Madde 13 — dolgu/tekrar kelimesi için özel egzersiz:** Doldurma/tekrar kelime yoğunluğu eşiği aşıldığında (Faz 2'de eklenen aynı eşik), artık sadece "bu puanını düşürdü" şeklinde genel bir not değil, öğrencinin kendi tespit edilen kelimelerini (örn. "like", "um") kullanan somut, uygulanabilir bir pratik egzersizi otomatik olarak `improvementPlan.homework` alanına ekleniyor ("Extra drill: ... consciously avoid saying "like" and "um" more than once...").

**Tense analizi güçlendirmesi:** `prompt.js`'teki mistakes talimatı, AI'nin her cümleyi özellikle yanlış tense kullanımı açısından da taramasını ve tense hatalarını genel "grammar mistake" olarak bırakmamasını artık açıkça istiyor. Bir mistake tense hatasıysa `problem` alanı hangi tense kullanıldığını ve hangisinin kullanılması gerektiğini isimlendirmek zorunda (örn. "Used present simple instead of past simple"), `explanation` alanı ise o bağlamda o tense'in neden gerekli olduğunu (bitmiş/bitmemiş zaman, belirli bir zaman zarfı, sequence vb.) kısaca açıkladıktan sonra öğrencinin yanlış cümlesiyle düzeltilmiş hâlini yan yana göstermek zorunda (örn. "Wrong: 'I go there yesterday.' Correct: 'I went there yesterday.'"). Bu, schema veya skorlama mantığında değişiklik gerektirmiyor — sadece `mistakes[].problem` ve `mistakes[].explanation` alanlarının içeriğini zenginleştiren bir prompt güncellemesi, bu yüzden mevcut alan yapısıyla tam uyumlu; AI çıktısına bağlı olduğu için otomatik test yazılamaz, ilk gerçek denemede çıktıyı gözden geçirmenizi tavsiye ederim.

Not: İncelememde bahsettiğim ama hiçbir fazda planlanmamış başka küçük bir tutarsızlık da fark edildi — `prompt.js` içindeki resim tanımlama (picture description) talimatı, şemada hiç bulunmayan `personalizedExercises` ve `dailyStudyPlan` alanlarına geri bildirim koymayı söylüyor; model bu alanları `strict: true` şeması gereği zaten döndüremiyor, yani bu talimat pratikte hiçbir etki yaratmıyor (zararsız ama gereksiz). Dokunmadım, isterseniz ayrıca temizleyebiliriz.

## Secret Kuralları

- `.env` Git'e eklenmez.
- `backend/.env` Git'e eklenmez.
- API key, token, private URL veya Authorization header commitlenmez.
- Mobil uygulamada OpenAI key alanı yoktur.
- Public Expo env değişkenleri secret için kullanılmaz.

## Kontroller

Backend audit:

```bash
cd backend
npm audit
```

Root Expo audit:

```bash
cd ..
npm audit
```

Not: Root Expo audit bulguları Expo SDK zincirinden gelebilir. SDK major upgrade Expo Go uyumluluğunu etkileyebileceği için ayrıca planlanmalıdır.

Saf mantık (pure logic) self-testleri:

```bash
npm install
npm run test:logic
```

Bu komut `scoreUtils`, `streakService`, `recordClassification`, `analysisEnrichmentService`, `practiceTiming` ve `beforeAfterService` için `node:assert` tabanlı self-testleri `tsx` ile çalıştırır (Jest kurulumu gerektirmez). `analysisEnrichmentService` testi, bir mistake AI tarafından sınıflandırıldığında (category/severity/isTurkishTransferError) `errorPatterns[]` listesinin bu sınıflandırmadan mekanik olarak türetildiğini, ayrıca bağımsız üretilmiş eski bir AI `errorPatterns` listesiyle çelişmediğini doğrular. `practiceTiming` testi, hiçbir topic şekli için önerilen konuşma süresinin 90 saniyenin altına düşmediğini ve karmaşıklık kademelerinin (90/105/120) hâlâ birbirinden ayrıştığını doğrular. `beforeAfterService` testi, "Retry This Question" akışının dayandığı `findTopicAttempts` (aynı soruya ait TÜM diğer denemeleri bulur) ile `buildLatestTopicComparison`'in halen kullandığı "sadece en son deneme" mantığının, ortak `recordsForSameTopic` eşleştirmesi factor edildikten sonra da birbiriyle tutarlı kaldığını doğrular. Backend tarafında aynı yaklaşım zaten `scoringCalibrator` için mevcuttu; oraya da birkaç ek sınır-durum (boş transkript, kısa cevap kademeleri, süre kullanımı, doldurma/tekrar yoğunluğu cezası, hedef gramer yapısı kullanım cezası) testi eklendi:

```bash
cd backend
npm run test:scoring
```

## Telif Hakkı / Copyright

© 2026 Yağız Ali Küçük. Tüm hakları saklıdır.

Bu depodaki kaynak kod ve içerik yalnızca incelenmek üzere herkese açık paylaşılmıştır. Yazılı izin olmadan kopyalanamaz, değiştirilemez, dağıtılamaz veya başka bir projede kullanılamaz.

This repository is publicly visible for reference only. No license is granted: the source code and content may not be copied, modified, distributed, or used in other projects without written permission.
