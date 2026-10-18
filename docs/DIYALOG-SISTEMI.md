# Amor Diyalog Sistemi

Amor'da yapay zeka yoktur. Her cevap **kalıp tabanlı** üretilir: mesajın niyeti bulunur, karakterin ruh hali, yakınlığı, ilgisi, hafızası ve Küme senaryosu / kişilik havuzu hesaba katılır, uygun cümle havuzundan bir cümle seçilir ve karakterin yazım tarzıyla süslenir.

Merkez dosya: [js/engine.js](../js/engine.js) (`Amor.Engine`).

---

## 1. Genel akış

```
Kullanıcı mesaj yazar
   │
   ▼
app.js  ── 1.1 sn bekler (art arda gelen mesajları toplar)
   │      ── okuma gecikmesi: Schedule.replyDelay + Interest.delay
   │      ── ilgisi düşükse "Görüldü"de bırakabilir (Interest.ignoreChance)
   ▼
Engine.respond(karakter, cevaplanmamış mesajlar)
   │
   ├─ 1. Niyet tespiti        (detect / NLU)
   ├─ 2. Hafıza               (Memory.learn)
   ├─ 3. Beklenen cevap       (applyExpect)
   ├─ 4. İlgi                 (Interest.evaluate)
   ├─ 5. Ruh hali + yakınlık  (Mood.nudge, affinity)
   ├─ 6. Sosyal pil kontrolü  (bittiyse sohbetten çıkar)
   ├─ 8. Küme sistemi         (Kume.turn: senaryo, sevmediğini reddetme)
   ├─ 9. Cümle seçimi         (havuz önceliği)
   ├─ 10. Ekler               (hafıza tepkisi, takip sorusu, tatlı cümle, soru)
   └─ 11. finish()            (yazım tarzı, balonlar, yazma süreleri)
   │
   ▼
app.js play() ── balonları "yazıyor…" süreleriyle tek tek gösterir
```

---

## 2. Metin sadeleştirme

Tüm eşleştirmeler sadeleştirilmiş metin üzerinde yapılır (`norm`):

| Adım | Örnek |
|---|---|
| Türkçe küçük harf + katlama (`ç→c`, `ı→i`…) | `Günaydın` → `gunaydin` |
| Tekrar eden harfleri tek harfe indirme | `selaaaam` → `selam` |
| Noktalama silme (emoji kalır) | `naber?!` → `naber` |

[js/nlu.js](../js/nlu.js) yüklüyse eşleştirme daha akıllıdır: SMS kısaltmaları (`slm`, `nbr`), kök ayırma, yazım hatası toleransı (Damerau-Levenshtein), olumsuzluk tespiti ("iyi değilim" → kötü) ve -1…+1 duygu puanı. NLU yoksa motor basit kelime eşleştirmesine düşer.

---

## 3. Niyet (intent) tespiti

Niyetler [js/data/intents.js](../js/data/intents.js) içindeki `Amor.INTENTS` listesindedir: `[niyet, [kelimeler]]`.

- **Sıra önemlidir.** Liste yukarıdan aşağı taranır, ilk eşleşen kazanır (`insult`, `night`, `morning`, `bye` … `agree`, `disagree`).
- Kelime önekleri:
  - `^kelime` → sadece mesajın başındaysa sayılır (`^selam`, `^ok`)
  - `+fiil` → fiilin bütün olumlu çekimleri, kökler `Amor.VERBS`'te (`+ozlemek` → özledim, özlüyorum, özledin mi). Olumsuz çekimler sayılmaz (özlemedim). Kelimelerle sıralı yazılabilir: `seni +sevmek` → "seni çok seviyorum" (arada en fazla 3 kelime). Kelimeli fiil kalıbı tek kelimelik eşleşmelerden daha özel sayılır.
- Sevgi niyetleri (`flirt`, `miss`, `hug`, `kiss`) olumsuz cümlede tutmaz: "seni sevmiyorum", "sarılmak istemiyorum".
- Arketipte havuzu olmayan niyetler (`ask_day`, `ask_ate`, `ask_music`, `ask_movie`, `ask_weekend`, `ask_ask`, `ask_love`, `jealous`, `trust`) `Amor.COMMON_LINES` ortak cümlelerini kullanır (`_close` = Lv.3+).
- Özel durumlar:
  - "adım Ali", "bana Ali de" → `tell_name` (en yüksek öncelik)
  - Hiçbiri tutmazsa ama soru gibiyse (`?` ya da `mi/mu`) → `question`
  - Hiçbiri tutmazsa → `fallback`
- Mesajda selam da varsa (`greet: true`), cevabın başına selam eklenir: "selam nasılsın" → selam + nasılsın cevabı.

Birden fazla mesaj birikmişse **en öncelikli niyet** seçilir (`tell_name` > liste sırası > `question` > `fallback`).

### Niyet etkisi
`Amor.INTENT_EFFECTS[niyet] = { valence, arousal, aff }` — her niyet ruh halini ve yakınlık puanını değiştirir (iltifat +, hakaret −). Hakaretin etkisi nevrotiklikle (`big5.N`) büyür.

---

## 4. Beklenen cevap (`applyExpect`)

Karakter bir soru sorduysa bir sonraki mesaj o sorunun cevabı olarak yorumlanır:

| Karakterin sorusu | Kullanıcı | Sonuç |
|---|---|---|
| "adın ne?" | `Ayşe` | `tell_name`, isim kaydedilir |
| "kaç yaşındasın?" | `24` | `react_age` |
| "nerelisin?" | `İzmir` | `react_city`, hafızaya yazılır |
| Soru bankasından (`q:id`) "kedi mi köpek mi?" | `kedi tabii` | `react_q` → [js/data/questions.js](../js/data/questions.js) içindeki eşleşen tepki |

"ok", "hmm" gibi kuru cevaplar soruya cevap sayılmaz.

---

## 5. Cümle havuzu seçimi (öncelik sırası)

`respond` içinde ilk tutan kural cümleyi belirler:

1. **Küme cevabı** (`Kume.turn`) — senaryo bağlantısı / sevmediğini reddetme (bkz. §11).
2. **Tekrar** — kullanıcı aynı şeyi yazdıysa %70 `SHARED.repeat`.
3. `react_q` — soru bankası tepkisi.
4. `ask_call` — `Call.permit` (arama izni).
5. `ask_memory` — `Memory.summary` (hakkında bildikleri).
6. `react_*` — `SHARED.react_age`, `SHARED.react_city`…
7. **Sıkılmış** (ilgi < 0.3, gündelik niyet) — `SHARED.bored` (tek kelimelik cevaplar).
8. **Kötü ruh hali** (`neg` gergin / `sad` üzgün / `low` yorgun) — `c.mood[grup][niyet]` → `c.mood[grup].any` → `SHARED[grup]`. Lv.3+ ise "nasılsın"a kötü ruh halinin sebebini ima edebilir.
9. **Normal** — `linePool`: arketipin `lines[niyet]`, yoksa `lines.fallback`. Üzerine:
   - **Yansıtma** (bkz. §7)
   - Selam varsa başa selam

### Yakınlık havuzu (`_close`)
Lv.3+ iken `lines[niyet + '_close']` varsa %75 ihtimalle o kullanılır. `flirt`, `kiss`, `hug`, `meet` için her zaman.

| Lv | Ad | Puan |
|---|---|---|
| 1 | Yeni tanışma | 0 |
| 2 | Tanıdık | 8 |
| 3 | Arkadaş | 20 |
| 4 | Yakın | 40 |
| 5 | Özel | 70 |
| 6 | Ruh eşi | 110 |

### Tekrar önleme
`pick()` karakterin son 14 cümlesini hatırlar ve mümkünse onları tekrar seçmez.

---

## 6. Konular (kaldırıldı)

Eski konu sistemi (`topicTurn`, `js/data/topics.js`) kaldırıldı. Konular artık **Küme senaryolarının** kendi anahtar kelimeleriyle açılır (bkz. §11): ör. *Konu: Okul / sınav* senaryosu `okul, ders, sınav, ödev…` kelimeleriyle başlar. Senaryosu olmayan konulardaki mesajlar niyet cevaplarıyla karşılanır.

---

## 7. Yansıtma ([js/reflect.js](../js/reflect.js))

Kullanıcının cümlesindeki fiil 2. şahsa çevrilip cümleye `{x}` olarak girer:

> "bugün sinemaya gittim" → "aa **bugün sinemaya gittin** mi, anlat bakalım"

- Zamanlar: `past`, `prog`, `fut`, `habit`, `neg`, `mis`, `must`, `state`
- Havuz anahtarı: `<zaman>_<ton>` (yoksa `<zaman>_any`) — [js/data/reflect.js](../js/data/reflect.js)
- Sadece `fallback`, `answer_good/bad`, `agree`, `laugh` niyetlerinde. `fallback`'te %85 cevabın yerine, diğerlerinde %55 başına eklenir.

---

## 8. Hafıza ([js/memory.js](../js/memory.js))

Mesajlardan bilgi çıkarır ve **sadece o karaktere** kaydeder: şehir, yaş, meslek, evcil hayvan, sevdikleri/sevmedikleri, olaylar ("yarın sınavım var").

| Kullanım | Örnek |
|---|---|
| Öğrenince tepki (`reaction`) | "İzmir mi? hep merak etmişimdir" |
| Olay zamanı geçince sorma (`followup`) | "dün sınavın vardı, nasıl geçti?" |
| Aradan zaman geçince hatırlama (`callback`, en az 4 saat sonra) | "işler nasıl gidiyor?" |
| "Beni hatırlıyor musun?" (`summary`) | bildiklerini sayar |

Takip soruları selamlaşmada (`greet`, `how_are_you`, `morning`) ve karakterin kendiliğinden yazdığı mesajlarda (`opener`) gelir.

---

## 9. İlgi ([js/interest.js](../js/interest.js))

Yakınlık sadece artar; **ilgi** (0…1) sohbetin kalitesine göre iner çıkar, 12 saat yarı ömürle kişiliğin temel değerine döner.

- **Düşürür:** kuru cevaplar, tekrar, erken buluşma/numara isteği, iltifat yağmuru, hakaret
- **Artırır:** soru sormak, sorusuna cevap vermek, kendinden bahsetmek, güldürmek, özenli mesaj, hediye
- **Etkisi:** gecikme artar, cevap kısalır, soru sormaz, < 0.3 iken `bored` havuzu, "Görüldü"de bırakma

---

## 10. Ruh hali ([js/mood.js](../js/mood.js))

Valence × arousal + enerji + sosyal pil. Her mesaj sosyal pili azaltır (içe dönüklerde daha çok). Ruh hali bir **grup** (`pos`, `neu`, `neg`, `sad`, `low`) ve **modifiers** üretir:

- `maxParts` — en fazla balon sayısı
- `emoji` — emoji çarpanı
- `askBack` — soru sorma eğilimi
- `speed`, `extraDelay` — yazma hızı
- `flat` — emojisiz, düz yazım

Sosyal pil < 0.12 ise karakter `leave` cümlesiyle sohbetten çıkar (zorla çevrimiçi değilse).

---

## 11. Küme sistemi ([js/kume.js](../js/kume.js))

Kişilik tabanlı, durum geçişli diyalog. **Küme konuşmanın neresinde olduğunu, kişilik karakterin nasıl konuştuğunu belirler.** (Eski "huylar" — trip, naz, terslik… — kaldırıldı; yerine kişilik havuzları geldi.)

- **Senaryolar:** her senaryonun kümeleri var: S (başlangıç) → X (konu açıldı) → X-1a, X-1b… (süreçler) → X-2a, X-2b… (sonuçlar). Hazır: *Konu: Okul / sınav*, *Konu: Futbol*, *Örnek: buluşma ayarlama* (uygulamada çalışır) ve *Küme: konu döngüsü* (şablon, kapalı). Sadece "uygulamada kullan" işaretli senaryolar sohbette çalışır.
- **Bağlantılar (δ):** bulunulan kümeden çıkanlar sırayla denenir, ilk tutan kazanır. Koşul: anahtar kelime, konuşma kümesi (niyet), selam ya da nasılsın (selam / nasılsın, aynı mesajda başka bir bağlantının kelimesi varsa ona yol verir). Hiçbiri tutmazsa kümede kalınır; kümenin kelimeli kalma cevapları denenir.
- **Konuşma kümeleri:** niyetler + özel durumlar. Cevap havuzlarına cümle verir; her birinin **fonksiyonu** (girdi kelime / kelime grubu ya da "x + y" kombinasyonu → çıktı cevap grubu; en çok kelimeli girdi kazanır) vardır. Girdiler kümeyi tetiklemeye de yeter ("iyi akşamlar" → Selamlaşma → Akşam selamı).
- **Kişilik havuzları:** her kişilik kümeleri sever / sevmez / nötr. **Sevmediği** kümeye girmez, "Sevmediğini reddetme" cümlesiyle cevap verip yerinde kalır; **sevdiği** kümeye girerken "Sevdiği küme" cümlesi eklenir. Ayrıca yazım tarzı: ifade tercihleri ("iyiyim > iyidir ya"), cümle sonu ekleri, kişilik emojileri, en fazla balon.

**Motorda (`respond`):**
1. `Kume.turn(c, mesaj)`: süren senaryoda bir bağlantı ya da kelimeli kalma tutarsa, ya da bir senaryoya girilirse cevap havuzu döner. Karakterin küme durumu `Store.state.kume[id]`'de; küme sadece çizilmiş bir bağlantıyla değişir ("her küme" kaynağı yok); 30 dk sessizlikte unutulur.
2. Küme cevabı, karakterin önceki sorusuna verilen cevap tepkisinden de önce gelir; senaryodayken araya soru sormaz, hafıza tepkisi küme cevabını ezmez. Ruh hali kötüyse (reddetme hariç) ruh hali cümleleri kullanılır, küme yine ilerler.
3. Küme tutmazsa niyetin cevabı verilir; mesaj niyetin fonksiyon girdisine uyarsa o çıktının cümleleri.
---

## 12. Cevaba eklenenler

Ana cümle seçildikten sonra, iyi ruh halinde (`pos` / `neu`):

1. **Hafıza tepkisi** — yeni öğrenilen bilgiye tepki (gündelik niyette cevabın yerine, diğerlerinde başına).
2. **Takip / hatırlama** — selamlaşmada zamanı gelen olay ya da eski bilgi.
3. **Tatlı cümle** (`c.sweet`) — Lv.3+, ilgi ≥ 0.5, %12 (+%5 / seviye).
4. **Karşı soru** (`c.questions`) — cevapta `?` yoksa, dışa dönüklük × ruh hali × ilgi oranında. Sorulan soru `expect`'e yazılır (§4).
5. **Meşgulse** — tek balon; ilk seferde "dersteyim, sonra yazarım" notu.

---

## 13. Yer tutucular (`fill`)

| Yer tutucu | Anlamı |
|---|---|
| `{name}` | Kullanıcının adı |
| `{h}` | Hitap (seviyeye göre, %60 ihtimalle) |
| `{self}`, `{age}`, `{city}`, `{city_at}`, `{district}`, `{fav}`, `{job_is}` | Karakter bilgileri |
| `{doing}` | Şu an ne yaptığı |
| `{like}`, `{like2}` | Sevdiği şeyler |
| `{laugh}` | Gülme tarzı (`ahahah`, `ASDJSKF`, `hihi`…) |
| `{x}` | Yakalanan kelime / yansıtılan cümle / cevap (`{x} mı` doğru soru ekine çevrilir) |
| `{cause}` | Kötü ruh halinin sebebi |
| `{gift}` | Hediye adı (hediye tepkisinde) |
| `|` | Balon ayırıcı: `"selam|nasılsın"` iki ayrı balon olur |

---

## 14. Yazım tarzı ve zamanlama (`stylize`, `finish`)

Her balona karakterin `style` ayarları uygulanır:

- `lowercase` — küçük harf oranı (düşükse cümle büyük harfle başlar). BÜYÜK yazılmış kısımlara dokunulmaz.
- `elongate` — iyi ruh halinde son harfi uzatma (`canımmm`)
- `emojiRate` × ruh hali — son balona emoji
- `cps` — yazma hızı: süre = uzunluk / cps, balon başına 0.6–3.5 sn; ilk balona ek düşünme süresi

`finish` ayrıca karakterin cevaptan sonra ne beklediğini (`expect`) kaydeder. Kişilik havuzunun ifade tercihleri `finish`'te, cümle sonu ekleri ve emojiler (önce kümenin emojisi) `stylize`'da uygulanır.

---

## 15. Diğer giriş noktaları

| Fonksiyon | Ne zaman |
|---|---|
| `opener(c)` | Karakter kendiliğinden yazar (keyfi yerinde, boş, ilgili). Varsa hafızadan soru sorar. |
| `comeBack(c, msgs, reason)` | Çevrimdışıyken gelen mesajlara dönüş ("günaydın, yeni uyandım" + cevap). |
| `wake(c, reason)` | Coin ile zorla çevrimiçi yapılınca ilk mesaj. |
| `giftReact(c, r)` | Hediye tepkisi (küçük / orta / büyük). |
| `sample(c, intent)` | Önizleme: kaydetmeden örnek cümle. |

---

## 16. Diyalog editörü ve özelleştirme

`tools/dialog-editor.html` (`bot-editoru.bat` → 💬 Diyalog sekmesi) değişiklikleri [js/data/custom-dialog.js](../js/data/custom-dialog.js) dosyasına `Amor.CUSTOM_DIALOG` olarak yazar. Motor açılışta `applyDialog` ile bunları varsayılanların üzerine uygular:

```js
Amor.CUSTOM_DIALOG = {
  intents: { niyet: { words, before, effect } },       // kelime listesi, sıra, etki
  lines: { arketip: {
    'niyet': [...], 'niyet_close': [...],                // normal / yakın
    'neg:niyet': [...], 'sad:niyet': [...], 'low:niyet': [...]  // ruh haline göre
  } },
  kume: { scenarios, order, persona, talk, talkMap, ... }  // Küme sistemi (js/kume.js)
};
```

- Boş liste verilen yol silinir ve yedek havuza düşer (`fallback`, `greet`, `opener` hariç).
- `before` ile niyetin listedeki sırası (önceliği) değiştirilebilir.

---

## 17. Dosya haritası

| Dosya | İçerik |
|---|---|
| [js/engine.js](../js/engine.js) | Cevap motoru |
| [js/nlu.js](../js/nlu.js) | Doğal dil anlama (opsiyonel, daha akıllı eşleşme) |
| [js/data/intents.js](../js/data/intents.js) | Niyetler, etkileri, ortak cümleler (`SHARED`), hazır cevaplar |
| [js/data/archetypes.js](../js/data/archetypes.js) | Kişilikler: Big Five, yazım tarzı, `lines`, `mood` havuzları |
| [js/data/questions.js](../js/data/questions.js) | Karakter soruları ve beklenen cevaplar |
| [js/kume.js](../js/kume.js) | Küme sistemi: senaryolar, konuşma kümesi fonksiyonları, kişilik havuzları, motor |
| [js/reflect.js](../js/reflect.js), [js/data/reflect.js](../js/data/reflect.js) | Yansıtma |
| [js/memory.js](../js/memory.js) | Hafıza |
| [js/interest.js](../js/interest.js) | İlgi |
| [js/mood.js](../js/mood.js) | Ruh hali |
| [js/schedule.js](../js/schedule.js) | Günlük program (uyku, meşgul) |
| [js/data/custom-dialog.js](../js/data/custom-dialog.js) | Editörden gelen özelleştirmeler |
| [js/app.js](../js/app.js) | Mesaj toplama, okuma gecikmesi, balonları oynatma |
