# Hitabet Modülü — İlk Test Protokolü

Amaç: sistemin **doğru ölçüp ölçmediğini kanıtlamak**. Bunun için sonucu
önceden bilinen bir konuşma yapıyoruz.

> **Neden böyle?** Normal bir konuşma yapıp "geri bildirim mantıklı görünüyor"
> demek hiçbir şeyi doğrulamaz — model inandırıcı ama yanlış sayılar üretebilir
> ve sen bunu anlayamazsın. Cevabı önceden bildiğimiz bir sınav hazırlarsak,
> yanlış cevabı da tanırız.

Bu ilk kayıtta konuşma kalitesi **önemli değil**. Bilerek kötü konuşacaksın.

---

## Ayarlar

| Ayar | Seçim | Neden |
|---|---|---|
| Modül | Türkçe Hitabet | — |
| Mod | **Hazırlıklı** | Hazırlık notu karşılaştırmasını da test edeceğiz |
| Zorluk | **Kolay** | Zihnin konuya değil, tuzakları uygulamaya odaklansın |
| Tür | **Gündelik** | Aynı sebep |
| Hedef süre | **4 dakika** | Zaman yönetimi testi için |

---

## Hazırlık ekranında (15 dakika)

Notlara **tam 5 madde** yaz, numaralandır. Örnek:

```
1) Giriş — konuya hangi soruyla başlayacağım
2) Kendi deneyimim
3) Bunun genel bir örüntü olduğu
4) Karşı görüş
5) Kapanış
```

15 dakikayı doldurmana gerek yok. Notlar hazırsa "Hazırım, kayda geç" de.

---

## Konuşurken uygulayacağın 6 tuzak

Bunları akılda tutmak zor gelirse **not kâğıdının kenarına yaz**. Konuşurken
sayman gerekmiyor — sayımı sonra videodan yapacaksın.

| # | Ne yapacaksın | Neyi sınıyor |
|---|---|---|
| 1 | **4. maddeyi (karşı görüş) hiç anlatma** | Hazırlık karşılaştırması: atlanan başlık |
| 2 | Notlarda olmayan **bir örnek** anlat (mesela bir arkadaşından bahset) | Doğaçlama eklenen içerik |
| 3 | Bol bol **"ııı"** de — özellikle her yeni maddeye geçerken | Dolgu sesi tespiti |
| 4 | **"yani"**yi iki türlü kullan: bir kez düzgün bağlaç olarak (*"Yani şunu demek istiyorum:..."*), birkaç kez boşluk doldurmak için | Dolgu ile normal kullanım ayrımı |
| 5 | Bir yerde **4–5 saniye tamamen sus** — sonrasında hatırlayacağın bir cümlenin ardından | Uzun duraklama + zaman damgası |
| 6 | Belirgin bir kalıbı **4 kez tekrarla** (örn. *"şunu görüyoruz ki"*) | Tekrar tespiti |

Ve: **hedef 4 dakikayken 3 dakikada bitir.** Zaman yönetimi yorumunu test eder.

---

## Kayıt bittikten sonra — SIRALAMA ÖNEMLİ

Uygulama seni "Kendini değerlendir" ekranına götürecek. **Analizi görmeden
önce** şunu yap:

### Adım 1: Videodan kendi sayımını yap

O ekranda kaydını izleyebiliyorsun. İzle ve kâğıda yaz:

```
Kaç kez "ııı" dedim?            : ____
Kaç kez dolgu olarak "yani"?    : ____
Uzun sessizlik hangi dakikada?  : ____ : ____
Tekrarladığım kalıp             : ____________
Konuşma kaç dakika sürdü?       : ____
```

> Bu sayımı **analizden önce** yapman şart. Sonra yaparsan modelin sayısı
> senin sayını etkiler — kendi kendini kandırmış olursun.

### Adım 2: Kendine puan ver

Dürüstçe. Bu bilerek kötü bir konuşma, muhtemelen 3-5 arası.

---

## Analiz geldiğinde kontrol listesi

### A) Önce en kritik satır

Sonuç ekranının en üstünde **sarı bir uyarı kutusu var mı?**

- **Uyarı yoksa** → ✅ analiz sesten yapıldı, devam et
- **"Ses analizi yapılamadı" uyarısı varsa** → ❌ **DUR.** Diğer sayıların
  hiçbiri güvenilir değil. Bunu bana bildir.

### B) Ölçümler senin sayımınla uyuşuyor mu?

| Ölçüm | Senin sayın | Modelin sayısı | Karar |
|---|---|---|---|
| Dolgu sesi (ııı) | | | ±%30 içinde ise ✅ |
| Dolgu kelimesi | | | ±%40 içinde ise ✅ |
| Konuşma hızı | — | | 110–180 arası makul ✅ |

Dolgu sesi sayısı sende 10, modelde 2 çıkarsa ölçüm işe yaramıyor demektir —
o zaman yedek plana geçeriz (backend'de ffmpeg ile sessizlik/enerji analizi).

### C) "yani" ayrımı doğru mu?

"En sık dolgular" listesinde **"yani" var mı**? Olmalı. Ama sayısı senin
*dolgu olarak* kullandığın sayıya yakın olmalı — düzgün bağlaç olarak
kullandığın da sayılmışsa model ayrımı yapamıyor demektir.

### D) İşaretlenmiş konuşma

- Uzun sustuğun yerde **"uzun duraklama"** işareti var mı?
- Yanındaki zaman damgası senin not ettiğin dakikaya yakın mı? (±10 saniye)
- **O işarete tıkla** → video o ana atlıyor mu? ← bu ayrı bir özellik testi
- Tekrarladığın kalıp **"tekrar"** olarak işaretlenmiş mi?

### E) Hazırlık karşılaştırması

"Ayrıntılar" bölümündeki **Hazırlık karşılaştırması** kartını aç:

- **Atladıkların** listesinde 4. madde (karşı görüş) var mı? ← olmalı
- **Doğaçlama eklediklerin** listesinde senin eklediğin örnek var mı? ← olmalı
- **Anlattıkların** listesinde 4 madde var mı?

Bu, en değerli özelliğin çalıştığının kanıtı.

### F) Zaman yönetimi

Kartın "Zaman yönetimi" bölümünde erken bitirdiğinden bahsediyor mu?

### G) Öz değerlendirme

Puan kartında senin verdiğin puan ve aradaki fark görünüyor mu?

---

## Ayrıca not et

| Ne | Nereye bakılır |
|---|---|
| Analiz kaç saniye sürdü? | Kabaca say. 150 saniyeyi aşarsa zaman aşımı riski var |
| Maliyet | Render → Logs → `openai_usage` satırı (`input`, `output`, `audioInput`) |
| PDF çalışıyor mu | "PDF olarak kaydet" → Belgeler\Daily Speaking Coach\hitabet-raporlari\ |

---

## Bana ne bildireceksin

1. Sarı uyarı var mıydı (ses analizi yapıldı mı)
2. Senin "ııı" sayın ve modelin sayısı
3. Atlanan / doğaçlama maddeler doğru tespit edildi mi
4. Uzun duraklamanın zaman damgası tuttu mu, tıklayınca video atladı mı
5. Analiz kaç saniye sürdü
6. `openai_usage` satırındaki token sayıları

Bu altısıyla sistemin gerçekten çalışıp çalışmadığını kesin olarak biliriz.

---

## Sonra: ikinci kayıt

Kalibrasyon kaydı makinenin doğruluğunu ölçer, geri bildirimin **işe yarayıp
yaramadığını** ölçmez. Onu anlamak için ikinci bir kayıt yap — bu sefer
tuzaksız, gerçekten iyi bir konuşma çıkarmaya çalışarak. O kayıtta bakacağın
şey sayılar değil: *"Geliştirilecekler" bölümündeki maddeler benim gerçekten
farkında olmadığım şeyler mi, yoksa herkese söylenebilecek genel laflar mı?*
