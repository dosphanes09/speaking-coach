# Daily Speaking Coach

Expo / React Native mobil uygulama ve Node.js / Express backend ile guvenli speaking analizi MVP'si.

## Mimari

```text
Mobile App
  -> Local backend veya Render HTTPS backend
  -> OpenAI API
```

Local gelistirme icin PC'de calisan backend kullanilabilir. Ben ve sevgilim gibi farkli telefonlardan ayni backend'i kullanmak icin backend Render Free Web Service olarak deploy edilebilir.

Mobil uygulama OpenAI API key tutmaz, OpenAI endpointlerine dogrudan istek atmaz ve `EXPO_PUBLIC_OPENAI_API_KEY` gibi public secret kullanmaz. OpenAI API key yalnizca backend tarafinda `backend/.env` dosyasindaki `OPENAI_API_KEY` olarak bulunur.

## Proje Yapisi

- `App.tsx`: mobil ekran akisi.
- `src/screens`: Home, Grammar Roadmap, Recording, Transcript/Secure Analysis, Analysis, History, Progress, Settings, Chat.
- `src/data/grammarRoadmap.ts`: A1-C2 tense content and level speaking challenges.
- `src/services/backend/analyzeSpeechService.ts`: mobil uygulamanin backend `/api/analyze-speech` istemcisi.
- `src/services/storage`: yerel kayitlar, ayarlar ve anonim client id.
- `backend/src/server.js`: Express API.
- `backend/src/openaiClient.js`: OpenAI istekleri sadece backend tarafinda.
- `backend/src/validation.js`: upload, MIME, extension, sure ve input validasyonu.
- `backend/src/auth.js`: opsiyonel davet kodu kaydi, imzali token dogrulama ve cihaz yetkilendirme.
- `backend/src/dailyLimitStore.js`: auth acikken Redis uzerinde dogrulanmis cihaz basina kalici gunluk limit; auth kapaliyken kolay paylasim modu icin in-memory fallback.

## Backend Guvenlik Kontrolleri

`POST /api/analyze-speech`:

- `OPENAI_API_KEY` sadece backend `.env` icinden okunur.
- `express-rate-limit` ile endpoint ve aktivasyon denemeleri rate limit altindadir.
- Davet kodu modu opsiyoneldir. `REQUIRE_APP_AUTH=true` iken ucretli analiz endpoint'i imzali Bearer token olmadan calismaz.
- Auth acikken davet kodu, aktif cihaz kaydi ve gunluk analiz kotasi Upstash Redis'te tutulur.
- Dosya boyutu `MAX_FILE_SIZE_BYTES` ile sinirlidir.
- Kayit suresi `MAX_AUDIO_DURATION_SECONDS` ile sinirlidir.
- Sadece izin verilen extension ve MIME type kabul edilir.
- Dosya icerigi `file-type` ile kontrol edilir.
- Medya suresi `music-metadata` ile kontrol edilmeye calisilir.
- Dosya gecici olarak `backend/tmp/uploads` altina yazilir ve islem sonunda silinir.
- OpenAI isteklerinde timeout ve sinirli retry vardir.
- Hata cevaplari API key, stack trace veya internal server detayi dondurmez.
- Loglar Authorization header, raw audio veya kisisel veri yazmaz.
- CORS `FRONTEND_ORIGINS` ile sinirlandirilir.

Production'da `REQUIRE_APP_AUTH=true` iken gunluk analiz kotasi dogrulanmis cihaz token'ina gore Upstash Redis'te kalici tutulur. `REQUIRE_APP_AUTH=false` iken kolay paylasim modu icin in-memory fallback kullanilir.

## Local Kurulum

Root mobil bagimliliklari:

```bash
npm install
```

Backend bagimliliklari:

```bash
cd backend
npm install
cp .env.example .env
```

`backend/.env` icine sadece backend tarafinda:

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

API key mobil uygulamaya, Expo public env degiskenlerine veya GitHub'a eklenmez.

## Local Calistirma

1. Backend'i baslat:

```bash
cd backend
npm run dev
```

2. Backend saglik kontrolu:

```bash
curl http://localhost:3001/health
```

Beklenen cevap:

```json
{ "ok": true }
```

3. Mobil uygulamayi baslat:

```bash
cd ..
npm run start:clear
```

Expo Go ile QR okut. Port sorarsa yeni portu kabul edebilirsin.

## Practice Flow

`Think` ekraninda 30 saniyelik hazirlik suresinde kisa notlar yazabilirsin. Bu notlar sadece cihaz ekraninda tutulur; ses/video kaydina, backend analizine, gecmis kayitlara veya PDF'e gonderilmez.

`Record` ekraninda hazirlik notlari okunabilir sekilde gosterilir. Konusma suresi konu uzunlugu, seviye ve hedef grammar yapilarina gore otomatik secilir:

- minimum: 90 saniye (eskiden 60 saniyeydi — anlamli, degerlendirilebilir bir cevap icin cok kisa kaldigi fark edildi, tum topic'ler icin taban 90 saniyeye cikarildi)
- orta zorluk: 105 saniye
- maksimum: 120 saniye

Backend guvenlik siniri de `MAX_AUDIO_DURATION_SECONDS=120` olacak sekilde ayarlanmistir. Eger kendi `backend/.env` dosyanda eski `75` degeri varsa 120 olarak guncelle ve backend'i yeniden baslat.

Android'de alt sistem navigasyon tuslari uygulama acikken gizlenmeye calisilir. Bazi cihazlarda kenardan kaydirinca gecici olarak tekrar gorunebilir; uygulama aktif olunca yeniden gizlenir.

**Ayni soruyu tekrar cevaplama:** `Practice Detail` ekraninda (Gecmis'ten bir kaydi actiginda) artik bir `Retry This Question` butonu var. Bu, o kaydin `topic` nesnesini birebir aynen tekrar `thinking` akisina sokar (ayni topic id, ayni grammar/picture context varsa o da dahil), yani gunluk konu rotasyonunun 14 gunluk "yakin zamanda sorulmus konulari tekrar onerme" filtresini bilerek atlar — kullanici bilerek ayni soruyu tekrar cevaplamak istiyor. Yeni deneme, `createId("record")` ile her zaman oldugu gibi ayri, yeni bir kayit olarak kaydedilir (eski kayit degistirilmez/uzerine yazilmaz), boylece ayni soru icin birden fazla puan/feedback tutulmus olur.

Bu zaten var olan iki mekanizmayi otomatik olarak devreye sokar:
- Yeni deneme kaydedilirken (`AnalysisScreen`), `beforeAfterService.buildLatestTopicComparison` ayni topic'e ait en son onceki denemeyi bulup skor/hata-paterni/WPM karsilastirmasini otomatik gosterir (Before/After karti) — kullanici feedback'in ise yarayip yaramadigini hemen gorur.
- `Practice Detail` ekraninda, yeni eklenen `findTopicAttempts` fonksiyonu ayni soruya ait TUM diger denemeleri (sadece en sonuncusunu degil) tarih ve puanla listeler; herhangi birine dokunup o denemenin detayina gecebilirsin, boylece zaman icindeki gelisimi tek tek karsilastirabilirsin.

Eslestirme once `topic.id` ile, o tutmazsa normalize edilmis `topic.title` ile yapilir (boylece ayni soru farkli id ile olussa bile eslesir). Hicbir schema/storage degisikligi gerekmedi — kayitlar zaten `id` (her zaman essiz) ile `topic` (tekrar edebilir) alanlarini ayri tuttugu icin bu tamamen mevcut veri modeliyle calisiyor.

## Tema ve Konu Cesitliligi

`Settings` ekranindan `light` veya `dark` tema secilebilir. Tema tercihi local settings icinde saklanir.

Gundelik speaking konulari son 14 gunde tamamlanan kayitlara gore filtrelenir. Ayni speaking konusu iki hafta icinde tekrar onerilmez; ilgili seviyedeki taze konu havuzu biterse uygulama bos kalmamak icin tekrar havuzuna geri doner. A2, B1, B2 ve C1 konu havuzlari iki haftalik cesitlilik icin genisletilmistir.

## Windows Tek Tik Development

Proje root klasorunde development icin uc yardimci `.bat` dosyasi vardir:

- `start-backend.bat`: yeni bir terminal acar, `backend` klasorunde `npm run dev` calistirir.
- `start-expo.bat`: proje root klasorunde `npm run start:lan` calistirir ve QR kodu ayni pencerede gosterir.
- `start-app.bat`: backend'i ayri pencerede baslatir, Expo'yu ise tikladigin ana pencerede acar; QR kod burada gorunur.

Tek tikla local backend + Expo baslatmak icin:

```text
start-app.bat
```

Bu scriptler sadece development kolayligi icindir. Production build, Android APK sureci ve backend guvenlik mimarisini etkilemez. Ek dependency eklenmedi; `concurrently` yerine Windows'un kendi terminal baslatma komutu kullanilir.

QR kod gorunmezse `Daily Speaking Expo` penceresinin acik oldugunu kontrol et veya root klasorde su komutu calistir:

```bash
npm run start:lan
```

## Render Free Backend Deploy

Render Web Service ayarlari root `render.yaml` icindedir:

- `rootDir`: `backend`
- `buildCommand`: `npm ci`
- `startCommand`: `npm start`
- `healthCheckPath`: `/health`
- `plan`: `free`

Render deploy adimlari:

1. Kodu GitHub'a push et. `.env`, `backend/.env`, API key veya token push etme.
2. Render Dashboard'da `New` > `Blueprint` sec ve repoyu bagla.
3. Root'taki `render.yaml` dosyasini sec.
4. Render env var ekraninda `sync: false` olan degerleri gir:

```text
OPENAI_API_KEY=<your-openai-api-key>
AUTH_TOKEN_SECRET=<generated-backend-secret>
APP_INVITE_CODES=<comma-separated-private-codes>
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
```

Native Android/iOS istekleri genelde browser `Origin` header'i gondermez. Bu yuzden `FRONTEND_ORIGINS` bos kalabilir. Expo Web veya browser tabanli bir frontend kullanirsan virgulle ayrilmis HTTPS originlerini ekle.

Render production icin onerilen env var listesi:

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

Deploy sonrasi Render URL'i su formatta olur:

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

Production backend gerekli auth, Redis veya OpenAI secret'lari eksikse baslamaz ve Render health check basarisiz olur.

Render ephemeral disk notu: Backend upload dosyasini sadece gecici olarak `backend/tmp/uploads` altina yazar. Analiz basarili veya basarisiz olsa da `finally` blogunda dosya silinir. Render Free disk kalici depolama olarak kullanilmaz.

Ucretsiz Render servisleri uykuya gecebilir; ilk istek gec cevap verebilir. `REQUIRE_APP_AUTH=true` iken gunluk cihaz kotasi Upstash Redis'te kalici tutulur ve Render yeniden baslasa da kaybolmaz.

## Production APK ile Render Backend Kullanimi

Mobil uygulama production build'de backend URL'ini sadece build-time public config'ten okur. Bu deger secret degildir; sadece backend adresidir.

Yeni APK almadan once EAS/Expo build ortaminda su public env degerlerini ayarla:

```text
EXPO_PUBLIC_API_URL=https://daily-speaking-coach.onrender.com
```

EAS CLI ile production ortamina eklemek icin:

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://daily-speaking-coach.onrender.com --environment production --visibility plaintext
```

Sonra APK build al:

```bash
eas build --platform android --profile apk
```

`apk` profili paylasilabilir bir Android APK uretir ve production EAS environment degerlerini kullanir. Backend URL tum build'lerde `https://daily-speaking-coach.onrender.com` olarak kilitlidir; kayitli eski localhost veya LAN ayarlari otomatik olarak degistirilir.

## Grammar Roadmap

Ana ekrandaki `Ogrenme Alani` butonu ayri Learning ekranini acar. Bu ekrandaki `Open Grammar Roadmap` butonu A1-C2 seviyelerine gore tense odakli grammar calisma ekranini acar. Her seviyede:

- tense topic kartlari
- core feeling, structure, usage, examples, common mistakes
- speaking patterns ve mini challenge
- level speaking challenges

Level ekraninda tek bir aktif speaking sorusu gosterilir. `Yeni Soru` ile ayni seviyede farkli bir soru alabilir, `Start Speaking Practice` ile mevcut speaking akisina gecebilirsin:

```text
Grammar challenge -> Thinking -> Recording -> Transcript -> Backend analysis
```

Grammar challenge context'i mobil uygulamada sadece normal form verisi olarak backend'e gonderilir:

- `grammarCefrLevel`
- `grammarTopic`
- `expectedGrammarStructures`
- `speakingPrompt`

Bu bilgiler secret degildir. OpenAI API key yine yalnizca backend `.env` icindedir. Backend context varsa grammar hedefini de analiz eder; context yoksa eski genel speech analysis akisi aynen calisir.

## PDF Raporu

Analiz sonucu geldikten sonra `PDF Raporu Oluştur` butonu gorunur. Bu islem backend'e yeni istek atmaz; mevcut transcript ve analysis sonucundan cihaz uzerinde PDF olusturur ve Android paylasim ekranini acar.

PDF raporu:

- speaking konusu, tarih ve transcript
- seviye tahmini ve skorlar
- grammar corrections
- vocabulary suggestions
- pronunciation ve fluency feedback
- native-like improved answer
- kisiye ozel alistirmalar
- `Bugünün Kişisel Çalışma Planı` bolumu

PDF icin OpenAI key, backend secret veya ekstra kullanici verisi mobil uygulamaya tasinmaz.

## Opsiyonel Public Config

Root `.env.example` dosyasindaki `EXPO_PUBLIC_API_URL` secret degildir ve `https://daily-speaking-coach.onrender.com` degerine ayarlanmistir. Uygulama eski kayitli URL'leri kullanmaz; tum mobil API istekleri bu HTTPS origin'ine gider.

Bu public env degiskenleri sadece ileride production/APK build dusunulurse backend URL sabitlemek icin vardir. OpenAI key icin kullanilmaz.

## Backend Endpoint

`POST /api/analyze-speech`

Form data:

- `file`: `.m4a`, `.mp3`, `.mp4`, `.mpeg`, `.mpga`, `.wav`, `.webm`
- `topic`: speaking konusu
- `level`: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`
- `durationSeconds`: mobil uygulamadaki kayit suresi
- `grammarCefrLevel` (opsiyonel): grammar challenge seviyesi
- `grammarTopic` (opsiyonel): hedef grammar konusu
- `expectedGrammarStructures` (opsiyonel): beklenen grammar yapilari
- `speakingPrompt` (opsiyonel): grammar challenge prompt'u

Header:

- `Authorization: Bearer <signed-device-token>`: aktivasyon sonrasi SecureStore'da tutulan cihaz token'i

Basarili cevap:

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

Backend analiz skorlarini 0-100 formatinda uretir. Mobil uygulama eski 1-10 kayitlari da desteklemek icin skorları ekranda normalize eder.

### Ses tabanli analiz (transkript degil, dogrudan ses)

Backend artik analiz icin (mumkunse) transkripti degil, doğrudan ses kaydinin kendisini `OPENAI_AUDIO_ANALYSIS_MODEL` (varsayilan `gpt-audio`) modeline gonderiyor; telaffuz, tonlama ve duraksama gibi degerlendirmeler artik gercekten dinlenen sesten cikariliyor. Kayit, gonderilmeden once `ffmpeg-static` ile mono 16kHz WAV'a donusturuluyor (mobil taraf genelde `.m4a` kaydediyor, ses modeli icin en guvenilir format WAV).

Bu yeni bir entegrasyon oldugu icin **otomatik yedekleme** var: ses tabanli analiz herhangi bir nedenle basarisiz olursa (donusturme hatasi, model hatasi, format sorunu), backend sessizce eski transkript-tabanli analiz yoluna dusuyor ve istek yine de basariyla tamamlaniyor — sadece backend loglarinda `audio_analysis_failed_falling_back_to_text` uyarisi gorursunuz. Ozelligi tamamen kapatmak icin `ENABLE_AUDIO_ANALYSIS=false` yapip backend'i yeniden baslatmaniz yeterli, kod degisikligi gerekmez.

Not: Bu, gercek OpenAI API'sine karsi bu ortamda test edilemedi (bu gelistirme ortaminin OpenAI erisimi yok) — ffmpeg donusturme adimi ve yedekleme mantigi gercek verilerle dogrulandi, ancak `gpt-audio` modelinin tam istek/yanit sekliyle ilk gercek denemeyi siz production'da veya yerel `npm run dev` ile yapacaksiniz. Bir sorun cikarsa backend loglarina bakin.

**Faz 3 — telaffuzun genel puana etkisi:** Ses tabanli analiz gercekten basarili oldugunda (yedeklemeye dusmeden), telaffuz artik "sadece gosterim" olmaktan cikip genel puana da %10 agirlikla katiliyor (grammar/fluency&coherence/content&relevance/vocabulary agirliklari buna gore hafifce azaltildi: 25/25/25/15/10 -> 22/22/22/14/10 + telaffuz %10). Analiz eski transkript-tabanli yola dustuyse veya ses hic gonderilmediyse, telaffuz oncekiyle birebir ayni sekilde genel puanin disinda kaliyor — cunku o durumda telaffuz hala sadece bir tahmin, gercek ses kanitina dayanmiyor. Kullaniciya da bu net simdi belirtiliyor: telaffuz notlarinin altinda "genel puana katiliyor mu, katilmiyor mu" aciklayan bir cumle otomatik ekleniyor.

**Madde 4 — konu uygunlugunun bagimsiz dogrulanmasi:** AI artik her analizde ayri, yapilandirilmis bir `topicRelevance` alani doldurur (`off_topic` / `partially_relevant` / `fully_relevant` + kisa aciklama), sadece verilen konuyu/prompt'u gercekten ele alip almadigina bakarak — gramer/akicilik kalitesinden tamamen bagimsiz. Konu tam olarak ele alinmamissa "Content & Relevance" bilesen puani (dolayisiyla genel puan) buna gore tavana carpar, ve kullaniciya "cevabin verilen konuyu tam olarak ele almadigi" seklinde bir geri bildirim ve improvement plan maddesi eklenir. Eski kayitlarda bu alan yoksa (veya `fully_relevant` ise) hicbir ceza uygulanmaz.

**Madde 13 — dolgu/tekrar kelimesi icin ozel egzersiz:** Doldurma/tekrar kelime yogunlugu esigi asildiginda (Faz 2'de eklenen ayni esik), artik sadece "bu puanini dusurdu" seklinde genel bir not degil, ogrencinin kendi tespit edilen kelimelerini (orn. "like", "um") kullanan somut, uygulanabilir bir pratik egzersizi otomatik olarak `improvementPlan.homework` alanina ekleniyor ("Extra drill: ... consciously avoid saying "like" and "um" more than once...").

**Tense analizi guclendirmesi:** `prompt.js`'teki mistakes talimati, AI'nin her cumleyi ozellikle yanlis tense kullanimi acisindan da taramasini ve tense hatalarini genel "grammar mistake" olarak birakmamasini artik acikca istiyor. Bir mistake tense hatasiysa `problem` alani hangi tense kullanildigini ve hangisinin kullanilmasi gerektigini isimlendirmek zorunda (orn. "Used present simple instead of past simple"), `explanation` alani ise o baglamda o tense'in neden gerekli oldugunu (bitmis/bitmemis zaman, belirli bir zaman zarfi, sequence vb.) kisaca acikladiktan sonra ogrencinin yanlis cumlesiyle duzeltilmis halini yan yana gostermek zorunda (orn. "Wrong: 'I go there yesterday.' Correct: 'I went there yesterday.'"). Bu, schema veya skorlama mantiginda degisiklik gerektirmiyor — sadece `mistakes[].problem` ve `mistakes[].explanation` alanlarinin icerigini zenginlestiren bir prompt guncellemesi, bu yuzden mevcut alan yapisiyla tam uyumlu; AI ciktisina bagli oldugu icin otomatik test yazilamaz, ilk gercek denemede ciktiyi gozden gecirmenizi tavsiye ederim.

Not: Incelememde bahsettigim ama hicbir fazda planlanmamis baska kucuk bir tutarsizlik da fark edildi — `prompt.js` icindeki resim tanimlama (picture description) talimati, semada hic bulunmayan `personalizedExercises` ve `dailyStudyPlan` alanlarina geri bildirim koymayi soyluyor; model bu alanlari `strict: true` semasi geregi zaten donduremiyor, yani bu talimat pratikte hicbir etki yaratmiyor (zararsiz ama gereksiz). Dokunmadim, isterseniz ayrica temizleyebiliriz.

## Secret Kurallari

- `.env` Git'e eklenmez.
- `backend/.env` Git'e eklenmez.
- API key, token, private URL veya Authorization header commitlenmez.
- Mobil uygulamada OpenAI key alani yoktur.
- Public Expo env degiskenleri secret icin kullanilmaz.

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

Not: Root Expo audit bulgulari Expo SDK zincirinden gelebilir. SDK major upgrade Expo Go uyumlulugunu etkileyebilecegi icin ayrica planlanmalidir.

Saf mantik (pure logic) self-testleri:

```bash
npm install
npm run test:logic
```

Bu komut `scoreUtils`, `streakService`, `recordClassification`, `analysisEnrichmentService`, `practiceTiming` ve `beforeAfterService` icin `node:assert` tabanli self-testleri `tsx` ile calistirir (Jest kurulumu gerektirmez). `analysisEnrichmentService` testi, bir mistake AI tarafindan siniflandirildiginda (category/severity/isTurkishTransferError) `errorPatterns[]` listesinin bu siniflandirmadan mekanik olarak turetildigini, ayrica bagimsiz uretilmis eski bir AI `errorPatterns` listesiyle celismedigini dogrular. `practiceTiming` testi, hicbir topic sekli icin onerilen konusma suresinin 90 saniyenin altina dusmedigini ve karmasiklik kademelerinin (90/105/120) hala birbirinden ayristigini dogrular. `beforeAfterService` testi, "Retry This Question" akisinin dayandigi `findTopicAttempts` (ayni soruya ait TUM diger denemeleri bulur) ile `buildLatestTopicComparison`'in halen kullandigi "sadece en son deneme" mantiginin, ortak `recordsForSameTopic` eslestirmesi factor edildikten sonra da birbiriyle tutarli kaldigini dogrular. Backend tarafinda ayni yaklasim zaten `scoringCalibrator` icin mevcuttu; oraya da birkac ek sinir-durum (bos transkript, kisa cevap kademeleri, sure kullanimi, doldurma/tekrar yogunlugu cezasi, hedef gramer yapisi kullanim cezasi) testi eklendi:

```bash
cd backend
npm run test:scoring
```
