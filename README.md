# Daily Speaking Coach

Expo / React Native mobil uygulama ve Node.js / Express backend ile guvenli speaking analizi MVP'si.

## Guvenli Mimari

```
Expo React Native App
  -> kendi backend API
  -> OpenAI API
```

Mobil uygulama OpenAI API key tutmaz, OpenAI endpointlerine dogrudan istek atmaz ve `EXPO_PUBLIC_OPENAI_API_KEY` gibi public secret kullanmaz. OpenAI API key yalnizca backend tarafinda `backend/.env` dosyasindaki `OPENAI_API_KEY` olarak bulunur.

## Tespit Edilen Eski Riskler

- Mobil tarafta OpenAI API key girilen Settings alani vardi.
- API key `expo-secure-store` ile mobil cihazda tutuluyordu.
- Frontend `https://api.openai.com` endpointlerine dogrudan istek atiyordu.
- Transkript, analiz ve chat icin frontend OpenAI servisleri bulunuyordu.

Bu akisim kaldirildi. Frontend artik yalnizca kendi backend endpointine dosya yukler.

## Proje Yapisi

- `App.tsx`: mobil ekran akisi.
- `src/screens`: Home, Recording, Transcript/Secure Analysis, Analysis, History, Progress, Settings, Chat.
- `src/services/backend/analyzeSpeechService.ts`: mobil uygulamanin backend `/api/analyze-speech` istemcisi.
- `src/services/storage`: yerel kayitlar, ayarlar ve anonim client id.
- `backend/src/server.js`: Express API.
- `backend/src/openaiClient.js`: OpenAI istekleri sadece backend tarafinda.
- `backend/src/validation.js`: upload, MIME, extension, sure ve input validasyonu.
- `backend/src/dailyLimitStore.js`: kullanici basina gunluk limit.

## Backend Guvenlik Kontrolleri

`POST /api/analyze-speech`:

- `OPENAI_API_KEY` sadece backend `.env` icinden okunur.
- `express-rate-limit` ile endpoint rate limit altindadir.
- `X-Client-Id` uzerinden kullanici basina gunluk analiz limiti uygulanir.
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
- Production deploy icin `REQUIRE_HTTPS=true` kullanilabilir.

Not: In-memory gunluk limit MVP icindir. Production icin Redis veya kalici rate-limit store kullanilmalidir.

## Mobil Kurulum

```bash
npm install
npm run start:clear
```

### Development Backend URL

Development buildlerde `Settings > Backend API URL` alani duzenlenebilir. Telefonla Expo Go kullanirken backend URL olarak bilgisayarinin LAN adresini kullan:

```text
http://192.168.x.x:3001
```

Development modunda `http://localhost`, `127.0.0.1` ve private LAN adresleri kabul edilir. URL'yi girdikten sonra `Save` ile kaydet. Settings ekranindaki `Aktif Backend URL`, analiz ekraninin kullanacagi kaydedilmis degeri gosterir. `Test Connection` butonu ayni URL ile `GET /health` istegi atar; telefon tarayicisinda `http://192.168.x.x:3001/health` aciliyorsa bu test de basarili olmalidir.

### Production Backend URL

Production buildlerde backend URL kullanici tarafindan degistirilemez. URL build-time public config ile verilir:

```bash
EXPO_PUBLIC_BACKEND_API_URL=https://api.example.com
EXPO_PUBLIC_ALLOWED_BACKEND_ORIGINS=https://api.example.com
```

Bu degerler secret degildir; sadece hangi backend domaininin kullanilacagini belirler. Production'da sadece allowlist icindeki HTTPS origin kabul edilir. `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x` ve diger local/private adresler production'da reddedilir. Hatalı URL durumunda uygulama ses dosyasini gondermeden hata verir.

`EXPO_PUBLIC_BACKEND_BASE_URL` eski ad olarak desteklenir, ancak yeni buildlerde `EXPO_PUBLIC_BACKEND_API_URL` kullan.

### PC'siz Tam Kullanim

Telefon uygulamasinin speech analysis ozelligini bilgisayarda backend calistirmadan kullanmak icin backend public HTTPS bir web service olarak deploy edilmelidir.

Onerilen basit akıs Render Web Service:

1. Bu projeyi GitHub'a push et.
2. Render Dashboard'da `New > Blueprint` sec ve repo'yu bagla.
3. Repo kokundeki `render.yaml` backend servisini `backend` klasorunden kurar.
4. Render environment variables icinde `OPENAI_API_KEY` degerini gir.
5. `REQUIRE_HTTPS=true` blueprint ile gelir.
6. Deploy bitince Render URL'sini al:

```text
https://daily-speaking-coach-backend.onrender.com
```

Deploy saglik kontrolu:

```bash
curl https://daily-speaking-coach-backend.onrender.com/health
```

Beklenen cevap:

```json
{ "ok": true, "speechAnalysisConfigured": true }
```

`speechAnalysisConfigured:false` gorursen backend ayakta ama `OPENAI_API_KEY` Render ortaminda eksik ya da servis yeniden baslatilmamis demektir.

Render disinda baska bir Node host kullanirsan ayni backend ayarlari yeterlidir:

```bash
cd backend
npm ci
npm start
```

Host tarafinda `OPENAI_API_KEY`, `NODE_ENV=production` ve `REQUIRE_HTTPS=true` tanimli olmalidir. Backend public HTTPS URL verdikten sonra APK'yi bu URL ile yeniden build et.

### Android APK (Expo Go'suz)

Telefona ikonla acilan APK kurmak icin EAS Build kullanilir. APK build Expo Go gerektirmez; mobil uygulama yine sadece kendi backend'ine istek atar.

Ilk kez kullanirken Expo hesabina gir:

```bash
npx eas-cli@latest login
```

Preview APK, production kurallariyla calisir. Bu nedenle backend URL HTTPS olmali ve allowlist ile ayni origin'e sahip olmalidir:

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_BACKEND_API_URL --value https://daily-speaking-coach-backend.onrender.com --visibility plaintext --force --non-interactive
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_ALLOWED_BACKEND_ORIGINS --value https://daily-speaking-coach-backend.onrender.com --visibility plaintext --force --non-interactive
npx eas-cli@latest build --platform android --profile preview
```

EAS preview environment kontrolu:

```bash
npx eas-cli@latest env:list --environment preview
```

Bu listede `EXPO_PUBLIC_BACKEND_API_URL` ve `EXPO_PUBLIC_ALLOWED_BACKEND_ORIGINS` gorunmelidir. Deger olarak kendi Render URL'ni kullan; `OPENAI_API_KEY` burada asla olmamalidir.

Build bitince EAS'in verdigi linkten `.apk` dosyasini indir. Android telefonda dosyayi ac, gerekirse `Install unknown apps` izni ver ve kur. Kurulumdan sonra uygulama telefonda normal ikonla acilir.

Local LAN backend (`http://192.168.x.x:3001`) destegi development akisi icin korunur. Expo Go yerine development build kullanmak istersen:

```bash
npx eas-cli@latest build --platform android --profile development
```

Bu profil Expo Go gerektirmez, ancak development client olarak kullanilir. Production veya preview APK icin local/private backend adresleri kabul edilmez.

## Backend Kurulum

```bash
cd backend
npm install
cp .env.example .env
```

`backend/.env` icine sadece backend tarafinda:

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

`Speech analysis service is not configured` hatasi gelirse mobil app backend'e ulasmistir, ancak backend `OPENAI_API_KEY` degerini okuyamiyordur. `backend/.env` dosyasini kontrol et ve backend'i yeniden baslat.

Backend'i calistir:

```bash
npm run dev
```

Saglik kontrolu:

```bash
curl http://localhost:3001/health
```

Beklenen cevap:

```json
{ "ok": true, "speechAnalysisConfigured": true }
```

Backend audit kontrolu:

```bash
npm audit
```

Root Expo projesi icin audit:

```bash
cd ..
npm audit
```

Not: Root Expo audit bulgulari Expo SDK zincirinden gelebilir. SDK major upgrade Expo Go uyumlulugunu etkileyebilecegi icin ayrica planlanmalidir.

## Backend Endpoint

`POST /api/analyze-speech`

Form data:

- `file`: `.m4a`, `.mp3`, `.mp4`, `.mpeg`, `.mpga`, `.wav`, `.webm`
- `topic`: speaking konusu
- `level`: `A2`, `B1`, `B2`, `C1`
- `durationSeconds`: mobil uygulamadaki kayit suresi

Header:

- `X-Client-Id`: mobil uygulamanin olusturdugu anonim cihaz id'si

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
    "improvementPlan": {},
    "generatedBy": "backend",
    "createdAt": "2026-05-24T..."
  }
}
```

## Secret Kurallari

- `.env` Git'e eklenmez.
- `backend/.env` Git'e eklenmez.
- API key, token, private URL veya Authorization header commitlenmez.
- Mobil uygulamada OpenAI key alani yoktur.
- Public Expo env degiskenleri secret icin kullanilmaz.

## OpenAI Kaynaklari

- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI audio transcriptions](https://platform.openai.com/docs/api-reference/audio/createTranscription)
