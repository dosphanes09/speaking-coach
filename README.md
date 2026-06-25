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

- minimum: 60 saniye
- orta zorluk: 90 saniye
- maksimum: 120 saniye

Backend guvenlik siniri de `MAX_AUDIO_DURATION_SECONDS=120` olacak sekilde ayarlanmistir. Eger kendi `backend/.env` dosyanda eski `75` degeri varsa 120 olarak guncelle ve backend'i yeniden baslat.

Android'de alt sistem navigasyon tuslari uygulama acikken gizlenmeye calisilir. Bazi cihazlarda kenardan kaydirinca gecici olarak tekrar gorunebilir; uygulama aktif olunca yeniden gizlenir.

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
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=30
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_ANALYSIS_MODEL=gpt-5.4-mini
OPENAI_TIMEOUT_MS=30000
OPENAI_MAX_RETRIES=1
OPENAI_MAX_OUTPUT_TOKENS=8000
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
