# Kontrolsüzlük — Amor'un yeni veri ve keşif modeli

> Durum: fikir / tasarım. Henüz kod yok.
> Tarih: 2026-10-17

## 1. Fikir

Bugün her kişiyi ben kuruyorum: fotoğrafı seçiyorum, `characters/` klasörüne koyuyorum, `build-photos.ps1` çalıştırıyorum, gerekirse `karakter-ekle.bat` ile kişiliğini veriyorum. Kim olduğunu, neye benzediğini, nasıl konuşacağını biliyorum. Bu yüzden sohbet **gerçekçi hissettirmiyor**: karşımdakini ben yarattım.

Yeni model: **küratör ile oyuncuyu ayırmak.**

- **Küratör** (Amor Searcher ve benzeri araçlar) sadece *ham malzeme* üretir: fotoğraf setleri + fotoğraftan görülen fiziksel özellikler (fenotip).
- **Oyuncu** (Amor uygulaması) bu havuzdan, benim görmediğim ve seçmediğim bir şekilde, kişileri çalışma anında *kurar*: isim, yaş, meslek, şehir, kişilik, ruh hali, ne zaman ortaya çıkacağı.
- Veri, uygulamadan bağımsız bir **GitHub reposunda** yaşar. Uygulama oradan okur.

Sonuç: kiminle mesajlaşacağım **sürpriz** olur. Havuzu ben besliyorum ama havuzdan kimin, hangi kimlikle ve ne zaman çıkacağını ben belirlemiyorum.

### Üç uygulama

| Uygulama | Görevi | Repoya erişimi |
|---|---|---|
| **Amor Admin** | Havuzları yönetir: **fenotip havuzu** (hangi görünüşte kişiler olacak) ve **kişilik havuzu** (arketipler, konuşma tarzları). Havuzları denetler, eksikleri görür, büyütür. | Okuma + yazma (`pools/`) |
| **Amor Searcher** | Admin'den aldığı fenotip havuzuna göre fotoğraf toplar (Pinterest) ya da elle eklenen fotoğrafları alır. Kişi klasörleri oluşturup repoya gönderir. | Okuma + yazma (`people/`, index) |
| **Amor** | Ana uygulama. Private repodaki kişileri ve kişilik havuzunu okuyup dünyayı kurar. | Sadece okuma |

Akış:

```
Amor Admin ──(pools/phenotypes, pools/personalities)──▶ amor-data
                                                          │
Amor Searcher ◀──── fenotip havuzunu okur ────────────────┘
      │  fotoğraf topla / elle ekle → kişi klasörü
      └──────────────── push ─────────────────────────▶ amor-data/people
                                                          │
Amor ◀──── people + personalities okur ───────────────────┘
```

---

## 2. Temel ilke: "Ben neyi bilmemeliyim?"

Kontrolsüzlüğün çalışması için tasarım her adımda şu soruyu sormalı. Önerdiğim sınır:

| Küratör bilir / belirler | Küratör bilmez / belirlemez |
|---|---|
| Fotoğraflar (aynı kişiye ait bir set) | Kişinin adı (klasör adı uygulamada **hiç görünmez**) |
| Fenotip (saç, göz, ten, boy hissi, stil…) | Kişiliği (arketip), konuşma tarzı |
| İsteğe bağlı: kaba yaş görünümü | Mesleği, şehri, yaşı, burcu |
| | Ne zaman uygulamaya "katılacağı" |
| | Benimle ilgilenip ilgilenmeyeceği, ilk kimin yazacağı |

Kişilik ve kimlik **cihazda, rastgele tohumla** üretilir. Aynı fotoğraf seti başka bir kurulumda bambaşka biri olur.

### Kontrol seviyeleri

Kontrolsüzlüğü bir ayar olarak düşünmek faydalı. Bazen bir kişiyi bilerek eklemek isteyebilirim:

- **Seviye 0 – Tam kontrol:** bugünkü `karakter-ekle.bat`. Elle tanımlanan kişiler (`custom-characters.js`) bu seviyede kalır.
- **Seviye 1 – Yarı kör:** fotoğrafları ben seçerim, kimliği uygulama kurar. **Varsayılan bu.**
- **Seviye 2 – Kör ekleme:** Searcher'a sadece bir sorgu verilir ("sarışın kız kahve", "esmer kız spor salonu"). Searcher seti kendisi toplar, fenotipi kendisi etiketler ve yükler. Sonuçlara ben bakmam. En büyük sürpriz bu seviyede.

---

## 3. Mimari

```
┌──────────────────┐  şifrele + push           ┌──────────────────────┐
│  Amor Searcher   │  (yazma token'ı)          │ amor-data (private)  │
│  + diğer araçlar │ ────────────────────────▶ │ people/…/*.bin       │
└──────────────────┘                           │ index.bin, crypto.json│
                                               └──────────┬───────────┘
                                                          │ Contents API
                                                          │ (okuma token'ı)
┌──────────────────┐  parola → AES-GCM çöz                ▼
│  Amor (Pages)    │ ◀────────────────────────── şifreli dosyalar
│  SW önbelleği    │  (önbellekte şifreli kalır)
└──────────────────┘
```

### 3.1 Ayrı veri reposu: `amor-data`

Uygulama kodu (`Amor`) ile veriyi ayırıyoruz. Gerekçeler:

- Fotoğraf ekledikçe uygulama reposu şişmez, uygulama sürümü (`sw.js` VERSION) her fotoğrafta artmaz.
- Birden çok araç (Searcher, ileride başka araçlar) aynı yere yazar.
- Kodu açıkça paylaşabilirim, veriyi gizli tutabilirim (bkz. §7).

Önerilen yapı:

```
amor-data/
  people/
    p_7f3a9c/               # rastgele id; insan adı yok
      person.json
      01.webp               # 01 = profil fotoğrafı
      02.webp
      03.webp
  pools/
    phenotypes.json         # Amor Admin yazar, Searcher okur
    personalities.json      # Amor Admin yazar, Amor okur (bugünkü archetypes.js'in yerine)
  index.json                # Searcher üretir, elle düzenlenmez
  schema/person.schema.json
  .github/workflows/index.yml
```

- **Klasör adı rastgele id.** "Aisha_2" gibi adlar beni etkiler; uygulama zaten isim havuzundan isim veriyor.
- **Fotoğraflar `webp`, uzun kenar ~1080px.** Searcher yüklemeden önce küçültür. Repo boyutu GitHub için önemli (önerilen < 1 GB, dosya < 100 MB). Kişi başı ~5 foto × ~120 KB ile 1000 kişi ≈ 600 MB.
- **`index.json`'u Searcher üretir.** Bugünkü `build-photos.ps1`'in işini yapar. Veri şifreli olduğu için bu iş Action'a verilemez (bkz. §7.1).
- Şifreleme ile dosyalar `.bin` uzantılı olur (`person.bin`, `01.bin`…). Aşağıdaki şema, şifre çözüldükten sonraki içeriği gösterir.

### 3.2 Repoya giriş yolları (elle ekleme dahil)

Repoya sadece Searcher değil, ben de elle ekleme yapabilmeliyim. Sorun şu: veri şifreli (§7.1). GitHub web arayüzünden düz bir `.jpg` sürüklersem uygulama onu okuyamaz. Ayrıca düz dosya git geçmişinde kalıcı olarak durur; silsem bile geçmişte görünür.

Çözüm: **her giriş yolu aynı şifreli biçimde biter.** Şifreleme her zaman repoya girmeden önce, benim cihazımda yapılır.

| Yol | Nerede | Ne zaman |
|---|---|---|
| **A. Searcher → Yayınla** | PC | Pinterest'ten toplu toplama, kör ekleme |
| **B. Amor Yükleyici (web sayfası)** | Telefon / PC tarayıcısı | Elle tek tek kişi ekleme. **Elle eklemenin ana yolu.** |
| **C. Gelen kutusu (`amor-inbox`)** | GitHub web/mobil uygulaması | Hızlıca bir şey atıp sonra işlemek |

**B. Amor Yükleyici**

- Pages'te ayrı bir sayfa (ör. `tools/uploader.html`). Uygulamanın içinde görünmez, kontrolsüzlüğü bozmaz.
- Fotoğrafları seç veya sürükle → ilkini profil yap, sırala → isteğe bağlı fenotip formu (boş bırakılabilir) → **Yükle**.
- Tarayıcı fotoğrafı webp'ye küçültür (canvas), parolayla AES-GCM ile şifreler, rastgele id verir. Ardından Contents API ile `people/<id>/` altına yazar ve `index.bin`'i günceller.
- Yazma token'ı (*Contents: Read and write*) sadece bu sayfanın localStorage'ında durur. Amor uygulaması okuma token'ıyla kalır.
- Tarayıcıda CLIP olmadığı için fenotip elle girilmezse `by: "none"` kalır. Searcher'daki **Yeniden etiketle** komutu bu kişileri bulur, çözer, CLIP ile etiketler ve geri yazar.
- Kontrol seviyesi seçilebilir: *"Kimliği uygulama kursun"* (Seviye 1, varsayılan) ya da *"İsim/kişilik ben vereyim"* (Seviye 0). Seviye 0'da verilen alanlar `person.json`'a `fixed` altında yazılır; uygulama bunlara dokunmaz (bugünkü `custom-characters.js`'in yerini alır).
- Mevcut kişiyi düzenleme: id ile aç → fotoğraf ekle/çıkar, fenotip düzelt, sil.

**C. Gelen kutusu**

- Ayrı bir private repo: `amor-inbox`. Buraya GitHub web veya mobil uygulamasıyla düz fotoğraf klasörleri atılır (`<herhangi-ad>/*.jpg`), istenirse yanına `not.txt` ("sarışın, mavi göz") eklenir.
- Searcher açılınca (ya da **Gelen kutusunu işle** butonuyla) inbox'ı çeker, A yolundaki gibi işler (küçült, etiketle, şifrele, yayınla) ve inbox'ı boşaltır.
- Ayrı repo olmasının nedeni: düz fotoğraflar git geçmişinde kalır. `amor-data` hiç düz veri görmez. `amor-inbox`'ın geçmişi gerektiğinde tek commit'e ezilir ya da repo silinip yeniden açılır.
- Bu yol en rahatı ama en az güvenlisi (düz veri geçici olarak private repoda durur). B varken yedek yol olarak kalır.

**Ortak kurallar**

- `index.bin`'i yazan herkes (Searcher, Yükleyici) önce son halini indirir, birleştirir, sonra Contents API'nin `sha` alanıyla yazar. `409/422` (arada başkası yazmış) gelirse baştan dener. Böylece iki araç birbirinin eklediğini silmez.
- Bir kişinin klasörü elle silinirse (GitHub web'den), index'te kalsa bile uygulama dosyayı bulamayınca kişiyi "hesabını kapattı" sayar. Searcher'daki **Index'i onar** komutu index'i klasörlerle eşitler.
- Aynı fotoğraf iki kez eklenmesin: `person.json`'da her fotoğrafın şifresiz halinin hash'i (`sha256`) tutulur. Yükleyici ve Searcher yüklemeden önce index'teki hash'lerle karşılaştırır.

### 3.3 `person.json` şeması (taslak)

```json
{
  "id": "p_7f3a9c",
  "added": "2026-10-17",
  "source": { "tool": "amor-searcher", "mode": "blind", "query": "blonde girl coffee aesthetic" },
  "gender": "f",
  "photos": [
    { "file": "01.bin", "sha256": "…" },
    { "file": "02.bin", "sha256": "…" },
    { "file": "03.bin", "sha256": "…" }
  ],
  "fixed": null,
  "phenotype": {
    "hair_color":  { "v": "blonde",   "by": "clip", "conf": 0.81 },
    "hair_length": { "v": "long",     "by": "clip", "conf": 0.74 },
    "hair_type":   { "v": "wavy",     "by": "manual" },
    "eye_color":   { "v": "blue",     "by": "manual" },
    "skin_tone":   { "v": "fair",     "by": "clip", "conf": 0.66 },
    "build":       { "v": "slim",     "by": "clip", "conf": 0.58 },
    "height_feel": { "v": "average" },
    "age_look":    { "v": "20-25",    "by": "clip", "conf": 0.62 },
    "style":       { "v": ["casual", "minimal"], "by": "clip" },
    "glasses": false, "tattoo": false, "piercing": "nose"
  },
  "flags": { "consistent": 0.92, "nsfw": false }
}
```

Notlar:

- **Her özellikte kaynak (`by`) ve güven (`conf`) var.** Elle girilen değer CLIP tahmininin önüne geçer. Düşük güvenli değerleri uygulama "kesin" saymaz (bkz. §5).
- **Kişilik alanı yok.** Bilerek. Arketip, isim ve meslek uygulamada üretilir. İstisna `fixed`: Seviye 0 ile elle kurulan kişilerde `{ "name": "…", "archetype": "…", "job": "…" }` gibi sabit alanlar taşır; boş bırakılan alanlar yine rastgele üretilir.
- `source.tool`: `amor-searcher`, `uploader` ya da `inbox`.
- `gender` ileride erkek profilleri ya da tercih ayarı için yer tutar.
- `flags.consistent`: setteki fotoğrafların aynı kişiye ait olma skoru (bkz. §4.2).

### 3.4 Fenotip sözlüğü

Değerler serbest metin değil, **sabit bir sözlük** olmalı. Uygulama bunları Türkçe ifadelere çevirir ("blonde" → "sarışın"):

| Alan | Değerler |
|---|---|
| hair_color | blonde, light_brown, brown, dark, black, red, dyed |
| hair_length | short, shoulder, long |
| hair_type | straight, wavy, curly |
| eye_color | blue, green, hazel, brown, dark |
| skin_tone | fair, light, medium, tan, dark |
| build | slim, average, athletic, curvy |
| height_feel | petite, average, tall |
| age_look | 18-20, 20-25, 25-30, 30-35, 35+ |
| style | casual, sporty, elegant, minimal, alternative, boho, street |

Göz rengi ve boy fotoğraftan güvenilir çıkmaz. Bunlar elle girilir ya da boş bırakılır; boş olanı uygulama rastgele ama tutarlı doldurur.

---

## 4. Amor Searcher'a katkılar

Searcher'ın hâli hazırda Pinterest Lens araması, anahtar kelime araması, CLIP benzerlik sıralaması ve `pool/<klasör>` kaydı var. Önerilen eklemeler:

### 4.1 "Yayınla" (GitHub'a gönder)

- `pool/<klasör>` için yeni bir **Yayınla** butonu: fotoğrafları webp'ye küçültür, rastgele id verir, `person.json` yazar, `amor-data`'ya commit eder.
- GitHub Contents API ya da yerel `git` klonu + push. Toplu yüklemede tek commit için yerel klon daha temiz.
- Yazma token'ı (fine-grained PAT, sadece `amor-data`, contents:write) Searcher'ın yerel ayarında durur. **Asla repoya girmez.**
- Yayınlanan klasör `pool/`'dan arşive taşınır; aynı set iki kez yüklenmez. Searcher zaten hash ile tekrarları eliyor, bu mantık yayın tarafına da genişler.

### 4.2 CLIP ile otomatik fenotip ve tutarlılık

`similarity.py` zaten CLIP modelini yüklüyor. Aynı modelle bedavaya iki şey daha gelir:

1. **Zero-shot etiketleme:** her alan için metin istemleri ("a photo of a woman with blonde hair", "… with black hair" …). En yüksek skor değer, skor farkı `conf` olur. Setteki tüm fotoğrafların ortalaması alınır.
2. **Set tutarlılığı:** setteki fotoğrafların birbirine benzerliği. Düşük çıkarsa "bu set iki farklı kişi olabilir" uyarısı verilir. Gerçekçilik için kritik: profil fotoğrafı sarışın, albümdeki esmer olursa büyü bozulur.

Ayrıca:

- **Profil fotoğrafı seçimi:** yüzün en net ve büyük olduğu kare. CLIP istemi "a selfie portrait" en yüksek olan karedir.
- **Kalite filtresi:** çok küçük, yazılı/kolaj, birden çok kişili kareleri ele ("a group photo", "text meme" istemleri).

### 4.3 Kör ekleme modu (Seviye 2)

- Girdi: sorgu listesi + kişi başı foto sayısı + toplam kişi sayısı.
- Searcher bir "tohum" fotoğraf bulur, Lens ile benzerlerini toplar, tutarlılık eşiğini geçen 4–6 kareyi set yapar, etiketler, yayınlar.
- Arayüz sonuçları **göstermez**, sadece "12 kişi eklendi, 3 set tutarsız olduğu için atıldı" der.
- Sorgu şablonları fenotip çeşitliliği için rastgele birleştirilebilir: `{saç} + {stil} + {mekân}`.

### 4.4 Manuel düzeltme ekranı

Seviye 1'de yayınlamadan önce küçük bir form: CLIP tahminleri ön dolu, ben sadece yanlışı düzeltirim (göz rengi, boy hissi). Kimlik alanı yok.

---

## 5. Uygulamaya katkılar

### 5.1 Veri katmanı

- Açılışta `index.json` çekilir. `PHOTO_SETS` artık build-time değil runtime.
- **İnternetsiz çalışmaya devam:** son `index.json` ve görülmüş fotoğraflar SW önbelleğinde (bugünkü `IMG_CACHE` genişler). Ağ yoksa son bilinen dünya kullanılır.
- Bir kişi repodan silinirse: sohbet ettiğim kişi "hesabını kapattı" olur, sohbet geçmişi kalır. Bu da gerçekçi bir an. Sohbet etmediklerim sessizce düşer.
- `generator.js` zaten "set silinirse boştaki sete ata" ve "en az kullanılan setten seç" mantığına sahip; set kaynağı değişir, mantık büyük ölçüde aynı kalır.

### 5.2 Fenotipi kimliğe bağlamak

Fenotip sadece etiket olarak kalmamalı, kişiyi tutarlı kılmalı:

- **Kendini anlatma:** "nasıl biriyim" / "saçın ne renk" gibi sorulara fenotipten cevap verir: "sarışınım, saçlarım uzun ve dalgalı 😊". Bilinmeyen alanlar ilk sorulduğunda üretilir ve kimliğe yazılır, sonra hep aynı kalır.
- **İltifatı doğrulama:** "mavi gözlerin çok güzel" yazınca gözleri kahverengiyse "aslında kahverengi ama sağ ol 😅" der. Bu, karşı tarafın fotoğraflarını *gerçekten* biliyormuş hissini verir. NLU'ya fenotip kelimeleri eklenir.
- **İsim/yaş uyumu:** `age_look` yaş aralığını daraltır (`ageRange`). Stil meslek seçimini hafifçe etkiler (sporty → antrenör/fizyoterapist olasılığı artar). Bu bir zorlama değil, ağırlık.
- **Değişim olayları:** nadiren "saçlarımı kestirdim" / "boyattım" gibi hikâyeler. Sadece söylenir, fotoğraf değişmez; küme sistemine küçük bir konu olarak bağlanabilir.
- **Kişilik bağımsız kalır:** fenotip arketipi belirlemez. "Sarışın = neşeli" gibi klişe bağlar kurmuyoruz; sürprizi öldürür.

### 5.3 Sürpriz mekanikleri

Havuzun hepsi bir anda görünürse sürpriz yine kaybolur. Öneriler:

- **Damla damla katılım:** havuzda 300 kişi olsa bile uygulama günde 2–5 "yeni katılan" açar. Ana sayfada "Bugün 3 yeni kişi katıldı". Hangi setin ne zaman açılacağı cihaz tohumuyla belirlenir; ben hesaplayamam.
- **İlk mesaj onlardan:** bazı yeni kişiler beni kendileri bulur ve ilk yazar. Kimin yazacağı ilgi ve arketipe bağlı, rastgele.
- **Kör tanışma (opsiyonel):** "Gizemli eşleşme" kartı. Fotoğraf bulanık, birkaç mesajdan sonra ya da kalp düzeyi 2'de açılır. Ekonomide yer bulabilir (coin ile erken aç).
- **Fenotip tercihi filtre değil ağırlık:** ayarlarda "tercihlerim" (ör. sarışın ↑) sadece olasılığı artırır, garantilemez. Kesin filtre istenirse günlük sınırlı ya da coin karşılığı olur. Hem ekonomiye bağlanır hem kontrolsüzlüğü korur.
- **Cihaza özel dünya:** kurulum tohumu farklıysa aynı havuz başka eşleşmeler, isimler ve kişilikler verir. Sıfırlama = yeni bir dünya.
- **Ayrılma ve geri dönüş:** düşük ilgide bazı kişiler zamanla "çevrimdışı uzun süre" olur, nadiren geri döner. (Mevcut ilgi/ruh hali sistemine bağlanır.)

### 5.4 Bana neyi göstermemeli

- Klasör adları, `source.query`, CLIP güven skorları uygulamada görünmez.
- Debug/hafıza paneli ("Bugünkü programı" gibi) bir **geliştirici modu** arkasına alınabilir. Normal kullanımda iç işleyişi görmek sürprizi azaltır.

---

## 6. Geçiş planı

1. **Searcher ↔ private repo (İLK ADIM):**
   - Searcher'a repo ayarları: kullanıcı, repo, branch, yazma token'ı, parola. Token ve parola sadece yerelde (`%LOCALAPPDATA%\AmorSearcher`), repoya girmez.
   - Fenotip havuzunu repodan okuma (Admin hazır olana kadar `pools/phenotypes.json` elle yazılır).
   - Havuzdaki bir fenotip girdisine göre fotoğraf toplama (fenotip → arama eşlemesi kullanıcı tarafından tanımlanacak, bkz. §8).
   - Elle fotoğraf ekleme (PC'den klasör/dosya seç).
   - Kişi klasörü oluşturup (`people/<id>/person.json` + fotoğraflar) repoya gönderme ve index'i güncelleme.
   - Mevcut `characters/` setlerini bir kez repoya taşıma.
2. **Amor Admin:** fenotip ve kişilik havuzlarını görüntüleme, denetleme (hangi fenotipte kaç kişi var, eksikler), ekleme/düzenleme.
3. **Uygulama veri katmanı:** `index.json` runtime yükleme + önbellek + "hesabını kapattı" akışı. `build-photos.ps1` emekliye ayrılır. Mevcut kayıtlardaki `setId` → yeni `id` eşleme tablosu, sohbet geçmişi kaybolmasın.
4. **Searcher geliştirmeleri:** Yeniden etiketle / Index'i onar / Gelen kutusunu işle, otomatik fenotip (CLIP), tutarlılık kontrolü.
5. **Fenotip ↔ diyalog:** kendini anlatma, iltifat doğrulama, yaş/meslek ağırlıkları.
6. **Sürpriz mekanikleri:** damla katılım, ilk mesaj onlardan, tercih ağırlıkları, kör tanışma.
7. **Kör ekleme modu** (Seviye 2).

Her adım tek başına çalışır; 1–2 bittiğinde uygulama bugünkü gibi davranır ama veri artık repodan gelir.

---

## 7. Riskler ve dikkat edilecekler

- **Kişisel kullanım, gizli veri.** Uygulama sadece kişisel test için; hiçbir yerde paylaşılmayacak. Fotoğraflar gerçek kişilere ait olduğu için verinin de kazara herkese açılmaması gerekir. Public bir GitHub reposu ya da public Pages sitesi, "paylaşmasam da" fiilen yayındır (aranabilir, indekslenir). Çözüm iki katman (bkz. §7.1).
  - Mevcut `characters/` klasörü uygulama reposundaysa ve repo/Pages public ise, geçişte (adım 1) bu fotoğraflar uygulama reposundan çıkarılır.
- **Token güvenliği:** yazma token'ı sadece Searcher'da, okuma token'ı sadece uygulamada. İkisi de repoya girmez. Okuma token'ı sızarsa veri okunur ama değiştirilemez.
- **Rate limit:** GitHub API token'lı 5000 istek/saat; açılışta tek `index.json` + tembel fotoğraf yükleme ile sorun olmaz.
- **Etiket hataları:** CLIP yanlış etiketlerse kişi kendini yanlış anlatır. Düşük güvenli alanlar "söylenmez", sorulursa kaçamak cevap verilir ("fotoğraflarda görüyorsun işte 😄").
- **Tutarsız setler:** gerçekçiliğin en büyük düşmanı. Tutarlılık eşiğinin altındaki setler yayınlanmaz.
- **Repo boyutu:** webp + 1080px + kişi başı foto sınırı. 1 GB'a yaklaşınca eski/hiç açılmamış setler arşivlenir.
- **Çocuk/reşit olmayan görüntüsü:** `age_look` 18 altı tahmin edilen ya da şüpheli setler otomatik reddedilir. Kör ekleme modunda bu filtre zorunlu.

### 7.1 Gizlilik modeli: private repo + şifreleme

**Katman 1 – Private repo + token (Web/MR modeli).** Leiden'de (`Web/MR`) çalışan yapının aynısı:

- Uygulama public Pages'te durur, veri private `amor-data`'da.
- Ayarlar ekranında kullanıcı adı, repo, branch ve **fine-grained token** (sadece `amor-data`, *Contents: Read*) girilir. Token sadece o tarayıcının localStorage'ında durur, repoya yazılmaz, her cihazda bir kez girilir.
- Okuma GitHub Contents API ile yapılır (`Accept: application/vnd.github.raw+json`). `index.json` tek istek, fotoğraflar ihtiyaç oldukça.
- Hata kodları MR'daki gibi gösterilir: `401` token geçersiz, `403` izin yok, `404` repo/branch/yol yanlış.
- Searcher yazma için ayrı bir token kullanır (*Contents: Read and write*). İki token ayrı tutulur.

**Katman 2 – İstemci tarafı şifreleme.** Repo yanlışlıkla public olsa ya da token sızsa bile veri okunamaz.

- **Algoritma:** AES-256-GCM. Anahtar, bir **parolatan** PBKDF2-SHA256 ile türetilir (≥ 200k iterasyon, repoda duran sabit bir `salt`). Tarayıcıda Web Crypto (`crypto.subtle`), Searcher'da Python `cryptography` paketi. Bu yeni bir bağımlılık, eklemeden önce onay gerekir.
- **Dosya biçimi:** `[12 bayt IV][şifreli veri + 16 bayt GCM etiketi]`. Her dosya için ayrı rastgele IV.
- **Ne şifrelenir:** `index.json`, her `person.json` ve tüm fotoğraflar (`01.webp` → `01.bin`). Dosya adları zaten rastgele id olduğu için bilgi sızdırmaz.
- **Ne şifrelenmez:** `crypto.json` (salt, iterasyon sayısı, şema sürümü) ve bir `check.bin`. `check.bin`, bilinen bir metnin şifrelisidir; parola doğru mu diye bakmak için kullanılır.
- **index.json'u kim üretir?** Action parolayı bilmemeli. Bu yüzden şifreli index'i Action değil **Searcher üretir**. Yayınlarken mevcut index'i indirir, çözer, yeni kişiyi ekler, yeniden şifreler ve push eder. Action ya hiç olmaz ya da sadece biçim/boyut kontrolü yapar. (§3.1'deki "index'i Action üretir" fikrinin yerine geçer.)
- **Uygulamada:** parola açılışta bir kez sorulur. Türetilen anahtar `extractable: false` bir `CryptoKey` olarak IndexedDB'de saklanır; böylece her açılışta tekrar sorulmaz, ham anahtar da okunamaz. "Kilitle" butonu anahtarı siler.
- **Önbellek:** SW, şifreli dosyaları olduğu gibi önbelleğe alır. Sayfa çözer ve `blob:` URL olarak `<img>`'e verir. Diskte hep şifreli veri durur; internetsiz çalışma bozulmaz.
- **Maliyet:** 120 KB'lık bir fotoğrafı çözmek telefonda milisaniyeler sürer, fark edilmez. Asıl maliyet blob URL yönetimi: ekrandan çıkan görsellerin `URL.revokeObjectURL` ile serbest bırakılması gerekir.

**Bu ikisi birlikte ne sağlar?**

| Durum | Sadece private repo | + şifreleme |
|---|---|---|
| Repo yanlışlıkla public olur | Fotoğraflar açık | Okunamaz |
| Okuma token'ı sızar | Fotoğraflar indirilir | İndirilir ama okunamaz |
| Cihaz başkasının elinde | Uygulamadan görülür | "Kilitle" sonrası görülmez |
| Parola unutulur | — | Veri kurtarılamaz (Searcher tarafında şifresiz `pool/` arşivi yedek olarak kalır) |

İstersen ileride katman 1 kaldırılıp şifreli veri public bir repoya ve CDN'e (jsDelivr) konabilir; daha hızlı ve token'sız olur. Ama gerçek kişilerin fotoğrafları için ikisini birlikte kullanmak daha güvenli. **Öneri: ikisi birlikte.**

---

## 8. Açık sorular

1. Erkek profilleri ya da tercih ayarı olacak mı? `gender` alanı buna göre kullanılır.
2. Kör tanışma ekonomiye bağlansın mı, yoksa tamamen ücretsiz bir sürpriz mi?
3. Günlük kaç yeni kişi açılsın? (Öneri: 3, hafta sonu 5.)
4. Mevcut elle kurulmuş kişiler (`custom-characters.js`) yeni dünyada kalsın mı, yoksa sıfırdan mı başlanacak?
5. ~~Veri reposu private mı public mi?~~ → Karar: private repo + salt-okunur token (MR modeli) + AES-GCM şifreleme (§7.1).
