# Masaüstü Sürümü (Windows)

Bu belge, telefonda çalışan Daily Speaking Coach uygulamasının bilgisayarda nasıl
çalıştırıldığını ve nasıl `.exe` haline getirildiğini anlatır.

---

## 1. Hızlı başlangıç

Proje klasöründe **`start-desktop.bat`** dosyasına çift tıkla. Bu dosya sırayla:

1. Electron bağımlılıklarını kurar (sadece ilk seferde, birkaç dakika sürer)
2. Web paketini derler (`desktop/web/` klasörüne)
3. Uygulamayı bir masaüstü penceresinde açar

### Gerçek masaüstü uygulaması (önerilen)

**`build-desktop-app.bat`** dosyasına çift tıkla. Sonuç:

```
desktop\release\Daily Speaking Coach\Daily Speaking Coach.exe
```

Bu **gerçek bir uygulama** — `.bat` değil, konsol penceresi yok. Masaüstüne ve
Başlat menüsüne kendi ikonuyla kısayol da ekler. Çalışması için Node.js veya
npm gerekmez; klasörün tamamını başka bir bilgisayara kopyalasan da çalışır.
Boyut yaklaşık 250 MB (Chromium motorunu içerdiği için).

> Bu yöntem hiçbir paketleme aracı indirmez veya çalıştırmaz — sadece diskte
> zaten var olan dosyaları kopyalar. Bu yüzden Windows'un "Uygulama Denetimi"
> politikasına takılmaz. Nasıl çalıştığı bölüm 3'te.

### Diğer seçenekler

| Dosya | Ne yapar |
|---|---|
| `start-desktop.bat` | Geliştirme sırasında hızlı çalıştırma (konsol penceresiyle) |
| `create-desktop-shortcut.bat` | 250 MB'lık kopya oluşturmadan sadece masaüstü kısayolu koyar |
| `build-desktop-exe.bat` | Kurulum sihirbazlı `.exe` üretir — **Uygulama Denetimi açıksa çalışmaz** (bölüm 7) |

Komut satırını tercih edersen aynı şeyler:

```bat
npm run desktop:install    :: sadece ilk sefer
npm run desktop:start      :: web paketini derle + uygulamayı aç
npm run desktop:dist       :: kurulum .exe dosyasi uret
```

> **Önemli:** Kodda bir değişiklik yaptığında `npm run desktop:web` komutunu
> tekrar çalıştırman gerekir. `start-desktop.bat` bunu zaten her seferinde
> otomatik yapıyor.

---

## 2. Nasıl çalışıyor? (Mimari)

Telefon uygulaman **React Native** ile yazılmış. React Native'in bir de web
karşılığı var: **react-native-web** (React Native bileşenlerini tarayıcının
anlayacağı HTML/CSS'e çeviren kütüphane).

> **Örnek:** Kodunda `<View>` yazıyorsun. Telefonda bu Android'in gerçek
> `ViewGroup` bileşenine dönüşüyor; web'de ise `<div>` etiketine dönüşüyor.
> Sen aynı kodu yazıyorsun, çevirmeyi kütüphane yapıyor.

Yani ekranların, tema dosyaların, iş mantığın **hiç değişmedi**. Sadece
telefona özel modüllerin (mikrofon dosyası kaydetme, PDF üretme, güvenli
depolama) web karşılıkları yazıldı.

Zincir şöyle:

```
Aynı kaynak kod (src/, App.tsx)
        |
        v
Expo web derlemesi  ->  desktop/web/  (HTML + JS paketi)
        |
        v
Electron kabuğu     ->  masaüstü penceresi + .exe
```

**Electron** (Chromium tarayıcı motoru + Node.js'i tek bir masaüstü
uygulamasında birleştiren çatı) burada iki parçadan oluşuyor:

| Dosya | Rolü | Analoji |
|---|---|---|
| `desktop/main.js` | **Ana süreç.** Pencereyi açar, dosya yazar, internete çıkar. Node.js yetkisi burada. | Restoranın mutfağı |
| `desktop/preload.js` | **Köprü.** Sayfanın mutfaktan ne isteyebileceğini tanımlar. | Garson: sadece menüdeki 7 şeyi getirir |
| `desktop/web/` | **Sayfa.** Senin uygulaman. Node yetkisi yok. | Salon |

Salondaki müşteri (uygulama sayfası) mutfağa doğrudan giremez; sadece garsona
(preload) sipariş verir. Bu ayrım `contextIsolation: true` ayarıyla zorlanıyor
ve testte doğrulandı: sayfada `require`, `module`, `Buffer` **yok**.

---

## 3. Gerçek uygulama nasıl üretiliyor? (paketleme aracı olmadan)

Bir Electron çalıştırılabilir dosyası, açıldığında **yanındaki `resources\app`
klasöründe** çalıştıracağı uygulamayı arar. Paketleme araçlarının yaptığı iş
aslında büyük ölçüde budur. `build-desktop-app.bat` bu adımları elle uyguluyor:

| Adım | Ne oluyor | Neden |
|---|---|---|
| 1 | Electron'un çalışma zamanı (`node_modules\electron\dist`) kopyalanır | Chromium motoru + `electron.exe` burada |
| 2 | `resources\default_app.asar` **silinir** | Bu, Electron'un kendi örnek uygulaması. Silinmezse bizimki yerine o açılır |
| 3 | `main.js`, `preload.js`, `web/` → `resources\app\` | Electron'un arayacağı yer tam olarak burası |
| 4 | Sade bir `package.json` yazılır | `productName` uygulamanın adını **ve** veri klasörünü belirler |
| 5 | `electron.exe` → `Daily Speaking Coach.exe` olarak yeniden adlandırılır | Görev yöneticisinde ve pencerede doğru isim görünsün |
| 6 | Masaüstü + Başlat menüsü kısayolları oluşturulur | İkonla birlikte |

> **Önemli ayrıntı:** 4. adımdaki `productName` değeri önceki çalıştırmalarla
> **birebir aynı** ("Daily Speaking Coach"). Electron veri klasörünü bu isimden
> türetiyor (`%APPDATA%\Daily Speaking Coach`). Değiştirseydik, o ana kadar
> kaydettiğin pratikler ve ayarlar kaybolmuş gibi görünürdü.

### İkon hakkında

Projede hiç ikon yoktu; `tools/make_icon.py` uygulamanın kendi tema renklerinden
(`#205B4C` koyu yeşil, `#F7F7F2` fon) bir ikon üretiyor ve
`assets/icons/app-icon.ico` dosyasına yazıyor. Betiği tekrar çalıştırırsan aynı
dosyayı üretir — yani ikon kaynaktan yeniden oluşturulabilir.

İkon üç yerde görünür, ikisi bizde:

| Nerede | Durum |
|---|---|
| Masaüstü / Başlat menüsü kısayolu | ✅ Özel ikon |
| Pencere başlığı ve görev çubuğu | ✅ Özel ikon (`BrowserWindow`'un `icon` ayarı) |
| Dosya Gezgini'nde `.exe` dosyasının kendisi | ❌ Electron'un varsayılan ikonu |

Sonuncusu için `.exe` dosyasının içindeki kaynakları düzenlemek gerekiyor; bunu
yapan araç (`rcedit.exe`) yine Uygulama Denetimi'nin engellediği imzasız
programlardan biri. Pratikte uygulamayı kısayoldan açtığın ve görev çubuğunda
gördüğün için bu fark neredeyse hiç göze çarpmıyor.

---

## 4. Platforma özel dosyalar: `.web.ts` numarası

Expo'nun paketleyicisi **Metro**, bir dosyayı ararken önce platform ekini
kontrol eder. Web için derlerken `secureStorage.web.ts` varsa onu alır,
yoksa `secureStorage.ts` dosyasını alır.

> **Örnek:** `import { getSecret } from "@/services/platform/secureStorage"`
> satırı, telefonda `secureStorage.ts` (Android Keystore kullanır), masaüstünde
> `secureStorage.web.ts` (localStorage kullanır) dosyasına bağlanır. Çağıran
> kodun hangisinin geldiğinden haberi yok — bu yüzden ekranlarda tek bir `if`
> bile yazmak gerekmedi.

Yeni eklenen katman `src/services/platform/` altında:

| Modül | Telefonda | Masaüstünde |
|---|---|---|
| `secureStorage` | expo-secure-store (Keystore) | `localStorage` |
| `apiClient` | doğrudan `fetch` | istek Electron ana sürecinden gider |
| `uploadFile` | dosya URI'si olarak gönderilir | WAV'a çevrilip gerçek dosya olarak gönderilir |
| `documentStore` | expo-print + paylaş menüsü | Chromium `printToPDF` + Belgeler klasörü |
| `cameraView` | expo-camera | boş yer tutucu (masaüstünde video yok) |
| `mediaStorage` | expo-file-system | `app://media/...` dosyaları |

---

## 5. Çözülen dört gerçek problem

### 5.1 CORS: sunucu masaüstünü tanımıyordu

**Sorun:** Backend'in `FRONTEND_ORIGINS` listesi hangi web adreslerinin istek
atabileceğini belirliyor. Telefon uygulaması `Origin` başlığı göndermediği için
hiç etkilenmiyor; bir sayfa ise her zaman gönderir ve listede olmadığı için
**403 Forbidden** yerdi.

> **CORS** (Cross-Origin Resource Sharing — Kaynaklar Arası Kaynak Paylaşımı):
> tarayıcının "A sitesindeki kod B sunucusuna istek atabilir mi?" sorusunu
> yönettiği güvenlik kuralı.
>
> **Örnek:** Kötü niyetli bir site açıkken senin bankana istek atmasını
> engelleyen mekanizma budur. Tarayıcı isteğe "ben şu siteden geliyorum"
> anlamına gelen `Origin` başlığını ekler, sunucu da bunu kontrol eder.

**Çözüm:** İstek sayfadan değil, **Electron'un ana sürecinden** gönderiliyor.
Ana süreç bir tarayıcı sekmesi olmadığı için `Origin` başlığı eklemiyor —
yani sunucuya tıpkı telefon gibi görünüyor.

> **Neden bu yol?** Alternatif, Render panelinden `FRONTEND_ORIGINS` değişkenine
> masaüstü adresini eklemekti. Onu tercih etmedim çünkü (a) sunucu ayarına
> dokunmak gerekirdi, (b) her yeni geliştirme adresi için tekrar düzenleme
> gerekirdi, (c) sunucu tarafında hiçbir şey değişmemesi geri dönüşü kolaylaştırır.

`desktop/main.js` içindeki `ALLOWED_API_ORIGINS` listesi sayesinde bu köprü
yalnızca senin backend'ine istek atabilir; başka bir adres denenirse reddedilir.
(Testte doğrulandı.)

### 5.2 Ses formatı: Chrome WebM kaydediyor, sunucu WebM'i güvenilir bulmuyor

**Sorun:** Telefon `.m4a` kaydeder. Chromium ise `audio/webm;codecs=opus`
kaydeder. Backend yükleme kontrolü iki aşamalı:

1. Dosya adının uzantısı ve bildirilen MIME tipi izin listesinde mi?
2. Dosyanın **kendi baytlarından** tespit edilen tip izin listesinde mi?

WebM kabı ikinci adımda `video/webm` olarak tespit edilebiliyor — bu izin
listesinde yok, yani `400 invalid_file_type` riski var.

**Çözüm:** Kayıt, gönderilmeden önce tarayıcıda **16 kHz mono WAV**'a çevriliyor
(`uploadFile.web.ts`). Nedeni:

- WAV'ın dosya başlığı (`RIFF....WAVE`) tek anlamlı, yanlış tespit edilemez
- `audio/wav` ve `.wav` zaten sunucunun izin listesinde
- Sunucu nasılsa ffmpeg ile her şeyi 16 kHz mono WAV'a çeviriyor — yani bir
  dönüşüm eklemiş değil, **kaldırmış** oluyoruz

> **Boyut kontrolü:** 16 kHz × 1 kanal × 16 bit = saniyede 32 KB. Sunucunun
> izin verdiği en uzun kayıt 120 saniye → 3.6 MB. Sunucu sınırı 12 MB.
> Ölçülen gerçek değer: **3.61 MB**. Rahat sığıyor.

### 5.3 Mikrofon izni: `file://` yeterli değil

**Sorun:** Tarayıcılar mikrofonu yalnızca **güvenli bağlam**a (secure context)
verir. Electron'da alışılmış yöntem olan `file://` ile dosya açmak güvenli
bağlam sayılmaz — mikrofon çalışmazdı.

**Çözüm:** Uygulama `app://local/index.html` adresinden servis ediliyor.
`main.js` bu şemayı `secure: true` olarak kaydediyor, böylece Chromium onu
`https://` gibi görüyor. Yan fayda: paketin `/​_expo/...` şeklindeki mutlak
yolları da doğru çözülüyor.

### 5.4 PDF: `printToFileAsync` web'de yok

**Sorun:** `expo-print` web'de sadece yazdırma penceresi açabiliyor; uygulamanın
saklayabileceği bir dosya üretemiyor.

**Çözüm:** Electron, HTML'i görünmez bir pencerede açıp Chromium'un
`printToPDF` motoruyla gerçek PDF üretiyor ve şuraya yazıyor:

```
Belgeler\Daily Speaking Coach\daily-lessons\...
Belgeler\Daily Speaking Coach\speaking-reports\...
```

Bu aslında telefondan **daha iyi**: dosyalar Dosya Gezgini'nde bulabileceğin
gerçek bir klasörde duruyor. "Paylaş" düğmesi masaüstünde "dosyayı aç" anlamına
geliyor.

---

## 6. Neler farklı çalışıyor?

| Özellik | Durum |
|---|---|
| Ses kaydı + AI analizi | ✅ Çalışıyor (WAV'a çevrilerek) |
| Günlük ders + PDF | ✅ Çalışıyor (Belgeler klasörüne gerçek PDF) |
| Sohbet (Chat) | ✅ Çalışıyor |
| Gramer yol haritası, ilerleme, geçmiş | ✅ Çalışıyor |
| Resim betimleme, dinleme oyunu | ✅ Çalışıyor |
| **Video kaydı** | ❌ Masaüstünde kapalı — Chromium WebM video üretiyor, backend sadece `video/mp4` kabul ediyor. Kayıt ekranındaki Audio/Video seçici masaüstünde sadece "Audio" gösteriyor. |
| **Streak bildirimleri** | ❌ Masaüstünde yok — `streakReminderService` zaten `Platform.OS === "web"` durumunda sessizce çıkıyordu, o kod hiç değiştirilmedi. |
| **Geçmiş kayıtların senkronu** | ❌ Yok (senin tercihin). Masaüstü kendi geçmişini tutar, telefon kendi geçmişini. |

### Veriler nerede duruyor?

| Ne | Nerede |
|---|---|
| Ayarlar, kayıt geçmişi, streak | Electron'un `localStorage` alanı (uygulamanın kendi veri klasörü) |
| Ses kayıtları | `%APPDATA%\Daily Speaking Coach\recordings\` |
| PDF'ler | `Belgeler\Daily Speaking Coach\` |

---

## 7. Sorun giderme

**`npm error ERESOLVE unable to resolve dependency tree` hatası**
`react-dom` sürümü `react` sürümüyle uyuşmuyor demektir. `package.json` içinde
şu üç satırın **tam olarak** böyle olması gerekir:

```json
"react": "19.1.0",
"react-dom": "19.1.0",
"react-native-web": "~0.21.0",
```

> **Neden?** Expo SDK 54, React'i tam olarak `19.1.0` sürümüne sabitliyor.
> `react-dom` için `^19.1.0` yazarsan npm bunu "19.1.0 veya daha yenisi" diye
> okur ve `19.2.8` kurmaya çalışır. Ama `react-dom@19.2.8` kendi
> **peer dependency** (eş bağımlılık: "ben çalışmak için senden şu sürümü
> isterim" beyanı) olarak `react@^19.2.8` istiyor — projede ise `19.1.0` var.
> npm bu çelişkiyi çözemeyip durur.
>
> **Örnek:** İki kişilik bir dans gibi. React ve react-dom aynı adımı bilmek
> zorunda. Biri 19.1 adımlarını, diğeri 19.2 adımlarını biliyorsa npm
> "bu ikisi birlikte dans edemez" der ve kurulumu iptal eder.

`--force` veya `--legacy-peer-deps` kullanma; bunlar hatayı bastırır ama
uyumsuz sürümleri kurar ve uygulama çalışırken tuhaf hatalar verir.

Sürümleri düzelttikten sonra hâlâ hata alıyorsan, eski çözüm dosyasını temizle:

```bat
rmdir /s /q node_modules
del package-lock.json
npm install
```

**`Uygulama Denetimi ilkesi bu dosyayı engelledi` / `ERR_DLOPEN_FAILED`**

Bu bir bağımlılık hatası değil — **Windows'un kendisi** bir dosyayı yüklemeyi
reddediyor.

> **Smart App Control** (Akıllı Uygulama Denetimi): Windows 11'in, tanımadığı
> veya dijital olarak imzalanmamış çalıştırılabilir dosyaları çalıştırmayı
> engelleyen güvenlik özelliği. Yeni kurulumlarda genelde açık gelir.
>
> **Örnek:** Bir siteden indirdiğin imzasız bir `.exe`'yi Windows'un "bunu
> tanımıyorum, açmıyorum" diye reddetmesi gibi. Fark şu ki bu politika sadece
> `.exe` dosyalarını değil, programların içeriden yüklediği `.node` / `.dll`
> gibi **yerel eklenti** dosyalarını da kapsıyor.

**Neden oluyordu:** Electron 40 ve sonrası, indirdiği paketi açmak için
`@electron-internal/extract-zip` adlı bir eklenti kullanıyor. Bu eklenti saf
JavaScript değil, Rust ile derlenmiş bir Windows ikili dosyası
(`index.win32-x64-msvc.node`). Windows onu yüklemeyi reddedince Electron'un
kendi dosyaları hiç açılamıyor ve `Electron failed to install correctly`
hatası geliyor.

**Çözüm (uygulandı):** Proje Electron **39.8.10** sürümüne sabitlendi. Electron 39
ve öncesi, paket açma işini saf JavaScript ile yapan `extract-zip` (yauzl)
kütüphanesiyle hallediyor — ortada Windows'un engelleyebileceği yerel bir dosya
yok. Doğrulandı: Electron 39 kurulumunda `node_modules` içinde **sıfır** adet
`.node` dosyası var.

Sürüm düşürmek özellik kaybettirmiyor: uygulamanın kullandığı API'lerin hepsi
(`protocol.handle`, `net.fetch`, `printToPDF`, izin yöneticileri) Electron 39'da
mevcut ve test edildi. Electron 39, Chrome 142 motorunu kullanıyor.

**`.exe` üretimi hâlâ engelleniyorsa:** `electron-builder`, kurulum dosyası
üretmek için `7z.exe`, `rcedit.exe`, `nuget.exe`, `Squirrel.exe` gibi ~24 adet
imzasız yardımcı program çalıştırıyor. Aynı politika bunları da engelleyebilir.
İki seçeneğin var:

1. **`create-desktop-shortcut.bat` kullan** (önerilen). Masaüstüne doğrudan
   `electron.exe`'yi işaret eden bir kısayol koyar. Hiçbir paketleme aracı
   çalışmadığı için politikaya takılmaz. Çift tıklayınca uygulama açılır —
   pratikte `.exe` ile aynı sonuç.

2. **Smart App Control'ü kapat.** Windows Güvenliği → Uygulama ve tarayıcı
   denetimi → Akıllı Uygulama Denetimi ayarları → Kapalı.
   **Dikkat:** Bu ayar bir kez kapatılınca Windows'u yeniden kurmadan tekrar
   açılamaz. Sadece `.exe` üretmek için bunu yapmanı önermem; 1. seçenek aynı
   işi görüyor.

**Uygulama açılıyor ama beyaz ekran**
`npm run desktop:web` çalıştırılmamış olabilir. `start-desktop.bat` bunu her
seferinde yapıyor; komutu elle çalıştırdıysan atlamış olabilirsin.

**"Web build missing" hatası veriyor**
Aynı sebep — `desktop/web/index.html` yok. `npm run desktop:web` çalıştır.

**Mikrofon çalışmıyor**
Windows Ayarlar → Gizlilik ve güvenlik → Mikrofon → "Masaüstü uygulamalarının
mikrofonunuza erişmesine izin verin" açık olmalı. Uygulama ilk kayıtta izin
ister; reddettiysen Windows ayarından açman gerekir.

**"Could not reach the backend" hatası**
Render'daki backend uyuyor olabilir (ücretsiz katmanda ilk istek yavaştır).
Ayarlar ekranındaki **Test Connection** düğmesiyle kontrol et; ilk denemeden
sonra tekrar dene.

**Kod değiştirdim ama uygulamada görünmüyor**
Masaüstü sürümü canlı yenileme yapmıyor: `npm run desktop:web` ile paketi
yeniden derleyip uygulamayı kapatıp açman gerekir.

---

## 8. Telefon sürümü etkilendi mi?

Hayır. Yapılan değişiklikler iki türde:

1. **Yeni dosyalar** — `src/services/platform/`, `desktop/`, `.bat` dosyaları.
   Telefon derlemesinde `.web.ts` dosyaları hiç paketlenmez.
2. **Yönlendirme değişiklikleri** — örneğin `deviceAuthService.ts` artık
   `expo-secure-store` yerine `secureStorage` modülünü çağırıyor; o modül de
   telefonda `expo-secure-store` kullanıyor. Davranış birebir aynı.

`.easignore` dosyasına `/desktop/` eklendi, yani EAS ile APK üretirken Electron
dosyaları pakete girmez.

Telefon sürümünü her zamanki gibi `start-expo.bat` veya `npm start` ile
çalıştırmaya devam edebilirsin.
