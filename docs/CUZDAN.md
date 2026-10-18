# Cüzdan ve ekonomi (kazanç – harcama)

> Amor'daki bütün para birimleri sanaldır: ₺ cüzdanı bir simülasyondur, coin ile gerçek para alınamaz ve çekilemez.
> Bu belge sistemin nasıl işlediğini ve rakamların nerede durduğunu anlatır.

İlgili dosyalar:

| Dosya | İçerik |
|---|---|
| [js/wallet.js](../js/wallet.js) | Cüzdan, coin, kartlar, VIP, görevler, hediye gönderme |
| [js/data/shop.js](../js/data/shop.js) | Bütün fiyatlar ve ödüller (paketler, hediyeler, VIP, görevler, çark) |
| [js/shop.js](../js/shop.js) | Yükleme ekranı, cüzdan menüsü, ödüller, mağaza, hediye paneli |
| [js/call.js](../js/call.js) | Arama dakika ücreti |
| [js/games.js](../js/games.js) | Blackjack ve slot |

---

## 1. Genel akış

```
 dokunma (₺ kazan)          paket al                     harca
 ─────────────────▶  CÜZDAN  ─────────▶  COIN  ─────────────────────────▶  mesaj, arama, hediye,
   (cüzdan menüsü)    (₺)               (♥)                                 yakınlık, mağaza, oyun
                                         ▲
                                         │ ücretsiz coin: giriş ödülü, görevler, başarımlar,
                                         │ şans çarkı, VIP bonusu, aylık hedefler, oyun kazancı
```

İki ayrı bakiye var:

- **Cüzdan (₺):** dokunarak kazanılır, sadece coin paketi almaya yarar. Kuruş olarak saklanır (`wallet.purse`).
- **Coin (♥):** uygulamadaki her şeyin parası (`wallet.coins`). Yeni hesap **200 coin** ile başlar (`START_COINS`).

Ayrıca **ücretsiz sohbet kartları** var: her kart bir mesajı coin harcamadan gönderir.

---

## 2. Cüzdan: ₺ kazanma

Yükleme ekranının altındaki **👛 Cüzdanım** kartına dokununca cüzdan menüsü açılır. Menüdeki büyük ₺ düğmesine her dokunuş bakiyeye para ekler.

### 2.1 Dokunuş başına miktar

| Durum | Miktar |
|---|---|
| Açılış katkısı: hesabın ilk **100** dokunuşu | **1,00 ₺** |
| Sonrası | **0,40 ₺** |
| Aşırı hızlı dokunma | adım adım düşer, en az **0,20 ₺** |

**Aşırı dokunma:** son 10 saniyedeki dokunuş sayısına bakılır.

- 8 dokunuşa kadar: tam miktar.
- 8'den sonra her dokunuşta miktar biraz düşer; 25 dokunuşta 0,20 ₺'ye iner.
- Yavaşlayınca (10 saniyelik pencere boşaldıkça) miktar kendiliğinden toparlanır.
- Bu sırada düğmenin çerçevesi turuncu olur, "Çok hızlı dokunuyorsun" uyarısı çıkar.

Açılış katkısı hesap başına bir kez verilir. Bu sistem gelmeden önce cüzdanı kullanmış eski hesaplarda katkı kullanılmış sayılır.

### 2.2 Dokunma sınırları

Son dakikalardaki dokunuşlar sayılır; bir pencere dolunca o pencere boşalana kadar düğme kilitlenir ve geri sayım gösterilir.

| Pencere | En fazla dokunuş |
|---|---|
| 5 dakika | 90 |
| 10 dakika | 150 |
| 30 dakika | 300 |

### 2.3 Ne kadar kazanılabilir?

Açılış katkısı bittikten sonra, sınırlar tam kullanıldığında:

- 30 dakikada en fazla 300 × 0,40 = **120 ₺**
- Saatte en fazla **≈240 ₺** (≈4.900 coin)

Sabitler [js/wallet.js](../js/wallet.js) içinde tek satırda:
`TAP_FIRST` (1 ₺), `TAP_BASE` (0,40 ₺), `TAP_MIN` (0,20 ₺), `TAP_BONUS` (100 dokunuş), `TAP_CALM` / `TAP_HARD` (8 / 25 dokunuş), `TAP_LIMITS`.

### ⚡ Gelişimler

Cüzdan menüsünün altında, cüzdandaki parayla alınır (`TAP_UPGRADES`). Alınan seviye kalıcıdır, harcanan para "Toplam harcama"ya eklenir.

| Gelişim | Her seviyede | En üst | Fiyat (seviye 0 → 1, sonra her seviye ×) |
|---|---|---|---|
| 💰 Dokunuş değeri | dokunuş başı miktar ve en düşük miktar +%25 (0,40 ₺ → 0,50 ₺ …) | Sv.10 (1,00 ₺) | 15 ₺, ×1,75 (hepsi ≈5.370 ₺) |
| 📈 Limitler | 5 / 10 / 30 dk sınırlarındaki en fazla dokunuş +%20 (90 → 108 …) | Sv.10 (×3) | 25 ₺, ×1,8 (hepsi ≈11.100 ₺) |

Açılış katkısı (1 ₺) sürerken dokunuş değeri en az 1 ₺'dir; gelişim onu geçince yüksek olan kullanılır.

---

## 3. Coin paketleri (₺ → coin)

Yükleme ekranındaki paketler cüzdandan alınır. Cüzdan yetmiyorsa paket soluk görünür, ödeme penceresinde eksik tutar yazar.

| Coin | Bonus | Fiyat | ₺ başına coin |
|---:|---:|---:|---:|
| 300 | – | 14,65 ₺ | 20,5 |
| 1.000 | – | 48,82 ₺ | 20,5 |
| 3.000 | – | 146,46 ₺ | 20,5 |
| 7.000 | +200 | 341,74 ₺ | 21,1 |
| 14.000 | +500 | 683,48 ₺ | 21,2 |
| 35.000 | +1.500 | 1.708,70 ₺ | 21,4 |
| 100.000 | +5.000 | 4.881,99 ₺ | 21,5 |
| 150.000 | +9.000 | 7.322,99 ₺ | 21,7 |
| 250.000 | +18.000 | 12.204,98 ₺ | 22,0 |

Gösterimlerde kullanılan kur en küçük paketinkidir: **1 coin ≈ 0,049 ₺** (300 coin = 14,65 ₺).

Cüzdan kartında **toplam harcama** (paketlere ödenen ₺) görünür (`wallet.purseSpent`).

### Yüklemeye bağlı ödüller

- **VIP:** toplam yüklenen coine göre seviye: 300 → VIP1, 5.000 → VIP2, 20.000 → VIP3, 50.000 → VIP4, 150.000 → VIP5, 500.000 → VIP6.
  Ayrıcalıklar: VIP çerçevesi, ziyaretçileri görme, günlük bonus (VIP2+: seviye × 50 coin), renkli isim, hediyelerde %5 indirim (VIP4+), VIP taç hediyesi (VIP5+), günde 2 çark (VIP6).
- **Yükleme Yıldızı (aylık):** ay içinde yüklenen coine göre ödüller:
  5.000 → 300 coin · 15.000 → Yıldız çerçeve (3 gün) · 30.000 → 1.000 coin + Altın roket · 50.000 → 3.000 coin + Gül kalesi.
- **İlk yükleme başarımı:** Altın çerçeve (3 gün).

---

## 4. Ücretsiz coin ve kart kaynakları

| Kaynak | Ne verir |
|---|---|
| **Günlük giriş** (7 günlük seri) | 1–7. gün: 5, 5, 10, 10, 15, 20, 30 coin + 5, 5, 5, 6, 7, 8, 10 sohbet kartı; 7. gün ayrıca 3 gül. Bir hafta: 95 coin + 46 kart. Uygulama açılınca ödül penceresi çıkar. Bir gün kaçarsa seri baştan başlar. |
| **Günlük görevler** | 10 mesaj (20) · 3 kişiyle konuş (25) · 3 profil ziyareti (15) · 1 hediye (30) · çarkı çevir (10) = günde 100 coin |
| **Başarımlar** (bir kez) | Adını yaz (20) · 5 kişiyi takip et (50) · biriyle Lv.3 (100) · ilk yükleme (çerçeve) |
| **Şans çarkı** | Günde 1 ücretsiz (VIP6: 2). 10–500 coin; ortalama ≈42 coin |
| **VIP günlük bonus** | VIP2+: seviye × 50 coin |
| **Oyunlar** | Blackjack ve slot kazançları (bkz. §5.7) |

---

## 5. Coin harcama

Aşağıdaki ₺ karşılıkları 1 coin ≈ 0,049 ₺ kuruyla, yaklaşık değerlerdir.

### 5.1 Mesaj

- Mesaj ücreti kızın **cazibe seviyesine** göre artar (popüler kızla yazışmak pahalı):

  | Cazibe | Lv.1 | Lv.2 | Lv.3 | Lv.4 | Lv.5 | Lv.6 | Lv.7 | Lv.8 | Lv.9 | Lv.10 | Lv.11 |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | Coin | 40 | 50 | 60 | 80 | 100 | 120 | 150 | 200 | 250 | 300 | 400 |
  | ≈₺ | 2 | 2,4 | 2,9 | 3,9 | 4,9 | 5,9 | 7,3 | 9,8 | 12 | 15 | 20 |

  Kızın cazibesi hediye aldıkça yükseldiği için ücret zamanla değişebilir. Ücret mesaj kutusunda ve profildeki "mesaj gönder" düğmesinde yazar. Tablo: `Amor.MSG_COST_BY_CHARM` ([js/data/shop.js](../js/data/shop.js)).
- Sohbet kartı varsa önce kart kullanılır; mesaj kutusunun sol üstünde "🎟️ 5 ücretsiz" sayacı görünür.
- Coin yetmezse mesaj gitmez, yüklemeye yönlendirir.
- Akış'taki yorumlar ücretsizdir.

### 5.2 Arama

| Arama | Dakika ücreti |
|---|---|
| Sesli | 400 coin (≈20 ₺) |
| Görüntülü | 800 coin (≈39 ₺) |

- Ücret her dakikanın **başında** alınır; ilk dakika bağlanınca ödenir.
- Başlarken bir dakikalık coin yoksa arama başlamaz; aramadayken coin biterse arama kapanır.
- Gelen aramalar da aynı şekilde ücretlidir.

### 5.3 Hediye

- Fiyatlar 10 coin'den (Hatmi) 177.770 coin'e (Dönen kale) kadar.
- VIP4+ ile %5 indirim.
- Çantadaki (ödüllerden kazanılan) hediyeler coin harcamadan gönderilir.
- **Şanslı hediyeler** (100 / 400 / 1.000 coin) gönderilince belli bir aralıktan rastgele bir hediye çıkar.
- **Dostluk hediyeleri** (1.000–3.999 coin) yakınlık kurar (bkz. §5.4).
- 1.000 coin ve üstü hediyeler yayın bandında, 10.000 ve üstü tam ekran animasyonla görünür.
- Hediye; yakınlık puanını, kızın ilgisini, ruh halini, cazibe seviyesini ve "en çok destekleyenler" sıralamasını artırır.

### 5.4 Yakınlık (CP, Kanka, Eşlik, Koruyucu)

| Yakınlık | Fiyat |
|---|---|
| Kanka | 1.000 coin |
| Eşlik | 1.000 coin |
| Koruyucu | 1.000 coin |
| CP | 1.500 coin |

- Seviye şartı yoktur.
- Bir erkeğin elindeki yakınlığı **Al** ile onun yerine geçerek almak **2 katı** tutar; erkek yakınlığı kaptırır.
- Bir kızla tek yakınlığın olur; yenisi eskisinin yerine geçer.

### 5.5 Mağaza

Çerçeve (690–2.490), sohbet arka planı (1.490–2.990) ve baloncuk (990–1.990) coin. Satın alınan eşya **7 gün** geçerlidir.

### 5.6 Hediye isteği

Kızlar sohbette ve aramada hediye isteyebilir (hediye niyeti ve zevki kişiliğe bağlı; ayrıntı: [js/wish.js](../js/wish.js)).

- İstek 6 saat içinde karşılanırsa ilgisi ve keyfi ayrıca artar.
- Karşılanmazsa düşer, sitem edebilir.
- Bu bir harcama zorunluluğu değildir ama karşılanmayan istek ilişkiyi etkiler.

### 5.7 Oyunlar

- **Blackjack:** bahis 10 / 50 / 100 / 500 coin. 2x ile bahis ikiye katlanır.
- **Slot:** bahis 10 / 50 / 100 / 500 coin. Üç aynı sembol bahsin 5 katından (🍒) 150 katına (7️⃣) kadar öder.

### 5.8 Kapalı olan

- **Zorla çevrimiçi yapma** (100 coin / 30 dakika): kodda duruyor ama kapalı (`FORCE_ENABLED = false`, [js/app.js](../js/app.js)).

---

## 6. Ölçek: ne neye denk?

Dokunarak saatte en fazla ≈240 ₺ (≈4.900 coin) kazanılabildiğine göre:

| Harcama | Coin | ₺ | Dokunarak kazanma süresi |
|---|---:|---:|---|
| 1 mesaj (Lv.1 kız) | 40 | ≈2 | ≈30 sn |
| 1 mesaj (Lv.8 kız) | 200 | ≈10 | ≈2,5 dk |
| 10 dk sesli arama | 4.000 | ≈195 | ≈50 dk |
| 10 dk görüntülü arama | 8.000 | ≈390 | ≈1 sa 40 dk |
| CP yakınlığı | 1.500 | ≈73 | ≈20 dk |
| Gül (150) | 150 | ≈7 | ≈2 dk |
| Altın ejderha | 39.999 | ≈1.950 | ≈8 sa |
| Dönen kale | 177.770 | ≈8.680 | ≈36 sa |

Günlük giriş + görevlerle günde yaklaşık 115 coin ve birkaç sohbet kartı ücretsiz gelir. Bu, günde ≈3 mesaj + kart sayısı kadar mesaj demektir.

---

## 7. Seviyeler

- **Zenginlik seviyesi (senin):** harcadığın coine göre, `Lv = ⌊√(harcanan / 50)⌋ + 1`. Hediye panelinde görünür.
- **Yakınlık seviyesi (her kızla ayrı):** sohbet, iltifat ve hediyelerle artan puan; Lv.1 Yeni tanışma → Lv.6 Ruh eşi.
- **Cazibe seviyesi (kızın):** aldığı hediyelerin toplam değeri (senden + arka plandaki erkeklerden); eşikler 500 → 800.000 coin, Lv.1–11. Ana sayfa sıralamasını etkiler.

---

## 8. Arka plandaki erkeklerin harcaması

Arka plandaki erkek karakterler de hediye atar, arar, yakınlık kurar. Onların harcaması **senin coinlerinden düşmez**; ayrı tutulur ve sadece izleme sayfasında (bot-editoru.bat → 💬 Diyalog → 🛠️ Arka plan) görünür.

- Aynı fiyatlar geçerlidir: arama 400 / 800 coin/dk, hediye fiyatları, yakınlık hediyeleri.
- İzleme sayfası her erkeğin ve her sohbetin toplam harcamasını coin ve ₺ olarak gösterir.
- Erkeklerin hediyeleri kızların koleksiyonuna, cazibe seviyesine ve "en çok destekleyenler" listesine girer. Bu yüzden onlarla aynı sıralamada yarışırsın.
