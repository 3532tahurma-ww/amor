# Amor Küme senaryosu: JSON formatı

Bu belge, bir yapay zekanın Amor diyalog editörüne doğrudan içe aktarılabilecek bir **senaryo JSON dosyası** üretmesi için yazıldı. Belgeyi olduğu gibi yapay zekaya verip sonuna istediğin konuyu yazman yeterli (bkz. [Bölüm 8](#8-yapay-zekaya-verilecek-istek)).

Üretilen dosya editörde **⬆ JSON içe aktar** ile eklenir. Örnek: [ornek-senaryo.json](ornekler/ornek-senaryo.json). Konuşma kümeleri için ayrı bir format var: [KONUSMA-KUMESI-JSON.md](KONUSMA-KUMESI-JSON.md).

---

## 1. Sistem nasıl çalışır

Amor, yapay zeka kullanmayan, kalıp tabanlı bir Türkçe sohbet uygulamasıdır. Karakterler kullanıcının mesajlarına hazır cümlelerle cevap verir.

Bir **senaryo**, bir konunun konuşma haritasıdır (durum makinesi):

- Karakter her an bir **kümede** (state) durur.
- Kullanıcı mesaj yazınca, bulunulan kümeden çıkan **bağlantılar** (edge) listedeki sırayla denenir. Mesajda kelimesi geçen **ilk** bağlantı kazanır.
- Karakter o bağlantının cümlelerinden birini söyler ve bağlantının hedef kümesine geçer.
- Hiçbir bağlantı tutmazsa karakter kümede kalır ve kümenin "kalma" cümlelerinden birini söyler.
- Uygulamada senaryoya başlangıç kümesinden çıkan bir bağlantıyla girilir. Bu yüzden başlangıçtan konuyu açan bağlantının kelimeleri senaryonun giriş kapısıdır.
- Karakter sadece çizilmiş bir bağlantıyla küme değiştirir; bağlantı yoksa (selam dese bile) olduğu kümede kalır. Tek istisna: 30 dakika sessizlikten sonra konu unutulur.

Önerilen yapı (zorunlu değil, her küme her kümeye bağlanabilir):

```
S (başlangıç) ──konu kelimesi──▶ X (konu açıldı) ──▶ X-1a, X-1b… (süreçler) ──▶ X-2a, X-2b… (sonuçlar) ──▶ S
```

---

## 2. Dosyanın üst yapısı

```json
{
  "format": "amor-kume",
  "version": 1,
  "scenarios": [ { ...senaryo... } ]
}
```

- `scenarios` bir dizidir; birden çok senaryo tek dosyada verilebilir.
- Tek bir senaryo nesnesi ya da senaryo dizisi de kabul edilir, ama yukarıdaki biçimi kullan.

---

## 3. Senaryo nesnesi

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| `id` | string | hayır | Yazılabilir ama kullanılmaz; editör içe aktarırken senaryoya yeni bir id verir |
| `name` | string | evet | Editörde görünen ad, örn. `"Konu: İş / mülakat"` |
| `live` | boolean | hayır | `true` ise uygulamada hemen çalışır. Varsayılan `false`; kullanıcı editörde açar. |
| `states` | dizi | evet | Kümeler (en az 1) |
| `edges` | dizi | evet | Bağlantılar |
| `samples` | dizi | hayır | Editörde tek tıkla çalışan test sohbetleri |

### id kuralları

Üç tür id var; karıştırma:

| Nerede | Örnek | Ne işe yarar |
|---|---|---|
| Senaryo `id` | — | Gerekmez, yazılırsa yok sayılır |
| Küme `states[].id` | `"S"`, `"X"`, `"X1a"`, `"X2b"` | Bağlantıların `from` / `to` alanları bu değerlere başvurur |
| Bağlantı `edges[].id` | `"open"`, `"study"`, `"pass"` | Bağlantının kendi adı; başka yerde kullanılmaz |

- Küme ve bağlantı id'lerini **her zaman yaz**. Senaryo içinde benzersiz olsunlar; sadece İngilizce harf, rakam, `_` ve `-` kullan (Türkçe karakter ve boşluk yok).
- `from` ve `to` içine **küme id'si** yazılır (`"X1a"`), küme adı (`"X-1a"`) değil.
- Yine de eksik kalırsa editör tolerans gösterir: id'si olmayan kümeye / bağlantıya adından id üretir, `from` / `to` içinde küme adı yazılmışsa onu da tanır.

---

## 4. Küme (`states[]`)

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| `id` | string | evet | Senaryo içinde benzersiz. Bağlantılar buna başvurur. Kısa ve ASCII olsun: `"S"`, `"X"`, `"X1a"`, `"X2b"` |
| `kind` | string | evet | `"S"` başlangıç · `"X"` konu açıldı · `"X1"` süreç · `"X2"` sonuç · `"O"` diğer |
| `name` | string | evet | Görünen ad: `"S"`, `"X"`, `"X-1a"`, `"X-2b"` |
| `desc` | string | evet | Kısa açıklama: `"Sınav stresi"` |
| `icon` | string | evet | Tek emoji |
| `start` | boolean | bir kümede | Sohbetin başladığı küme. Tam olarak bir kümede `true` olmalı. |
| `emojis` | string[] | hayır | Karakter bu kümeye girerken cevabın sonuna eklenebilecek emojiler (1–3 tane) |
| `emojiChance` | number | hayır | 0–1 arası emoji ekleme ihtimali. Varsayılan 0.5. |
| `stay` | string[] | evet | Hiçbir bağlantı tutmazsa söylenen "kalma" cümleleri (2–4 tane) |
| `stayRules` | dizi | hayır | Kalırken kelimeye göre özel cevap: `[{ "kw": [...], "lines": [...] }]`. Sırayla denenir. |
| `x`, `y` | number | hayır | Haritadaki konum. Önerilen sütunlar: S `x:90`, X `x:300`, X1 `x:540`, X2 `x:800`. `y` 60–380 arası. |
| `color` | string | hayır | Boş bırak; türe göre renk verilir. |

---

## 5. Bağlantı (`edges[]`)

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| `id` | string | evet | Senaryo içinde benzersiz, ASCII: `"open"`, `"study"`, `"pass"` |
| `name` | string | evet | Görünen ad: `"Okul konusu"`, `"Geçti"` |
| `desc` | string | hayır | Bağlantının anlamı |
| `from` | string[] | evet | Kaynak küme id'leri. "Her küme" (`"*"`) yoktur; bağlantının çalışacağı her kümeyi tek tek yaz. |
| `to` | string | evet | Hedef küme id'si. `""` olursa cevap verilir ama küme değişmez. |
| `need` | string | evet | Tetikleyici türü, aşağıya bak. Çoğunlukla `"kw"`. |
| `kw` | string[] | `kw` ise evet | Anahtar kelimeler |
| `intent` | string | `intent` ise evet | Tetikleyen konuşma kümesinin id'si |
| `lines` | string[] | evet* | Karakterin cevapları (2–4 tane) |
| `use` | string[] | hayır | Cevaplara eklenecek hazır konuşma kümesi id'leri. *`use` doluysa `lines` boş olabilir. |

**`need` değerleri:**

| Değer | Ne zaman tetiklenir |
|---|---|
| `"kw"` | Mesajda `kw` listesinden bir kelime geçerse |
| `"intent"` | Mesaj `intent` alanındaki konuşma kümesine uyarsa |
| `"greet"` | Selamlaşma (selam, günaydın…). Aynı mesajda başka bir bağlantının kelimesi varsa ona yol verir. |
| `"how"` | "nasılsın", "naber". `"greet"` gibi o da başka bir bağlantının kelimesine yol verir. |

**Geçerli konuşma kümesi id'leri** (`intent` ve `use` için):

`greet`, `how_are_you`, `morning`, `night`, `bye`, `thanks`, `sorry`, `agree`, `disagree`, `laugh`, `compliment`, `flirt`, `miss`, `kiss`, `hug`, `insult`, `answer_good`, `answer_bad`, `wyd`, `meet`, `photo`, `ask_call`, `ask_age`, `ask_name`, `ask_city`, `ask_job`, `ask_hobby`, `ask_memory`, `question`, `fallback`, `tell_name`, `opener`, `refuse`, `love`

---

## 6. Kurallar

### Kelime eşleşmesi (`kw`, `stayRules[].kw`)

- Kelimeler küçük harf yazılır. Eşleşme büyük/küçük harfe ve Türkçe karakterlere duyarsızdır; tekrar eden harfler sadeleştirilir ("sınavvv" = "sınav").
- **Kelimenin başı** eşleşir: `"sınav"` kelimesi "sınavım", "sınavda", "sınavlar"ı da yakalar. Bu yüzden kökü yaz: `"çalış"` yerine niyeti netleştirmek gerekiyorsa `"çalışıyorum"`.
- Kelime grupları da kullanılabilir: `"kötü geçti"`, `"oh be"`.
- **Çakışma yasağı:** Aynı kümeden çıkan iki bağlantıda aynı kelime olmamalı. Biri ötekinin başıysa da çakışır (`"bit"` ve `"bitti"`). Farklı kümelerden çıkan bağlantılarda aynı kelime sorun değildir.
- Çok genel kelimelerden kaçın: `"ve"`, `"ben"`, `"iyi"`, `"var"`, `"bu"`. Konu açan (S → X) bağlantının kelimeleri konuya özgü olmalı, başka konularla karışmamalı.
- Her `kw` bağlantısına 4–12 kelime ver; kullanıcının gerçekte yazacağı çekimli biçimleri düşün ("kazandık", "kazandım", "kazandı").

### Sıra (öncelik)

- `edges` dizisindeki sıra önceliktir; bulunulan kümeden çıkan bağlantılar bu sırayla denenir.
- Genel bağlantıları en başa koy: önce **Kapatma** (konunun bütün kümelerinden S'ye), sonra **Nasılsın** ve **Selam** (sadece S'den S'ye; konunun ortasında selam konuyu kapatmaz). Ardından konuyu açan bağlantı, sonra süreç ve sonuç bağlantıları gelsin.

### Cümleler (`lines`, `stay`, `stayRules[].lines`)

- Doğal, kısa, gündelik Türkçe; mesajlaşma dili. Kişiliğe göre biçim (küçük harf, emoji, ekler) uygulama tarafından eklenir. Nötr yaz.
- `|` cümleyi iki ayrı balona böler: `"tebrikler!!|biliyordum yapacağını"`. Bir cevapta en fazla bir `|` kullan.
- Yer tutucular:

| Yer tutucu | Yerine gelen | Not |
|---|---|---|
| `{w}` | Bağlantıyı tetikleyen kelime | Sadece bağlantı cümlelerinde: `"{w} mı? nasıl gidiyor?"` |
| `{h}` | Hitap ("canım", "kanka"…) ya da boş | Boşluksuz yapıştır: `"selam{h}"` |
| `{name}` | Kullanıcının adı | Az kullan |
| `{laugh}` | Kişiliğe uygun gülme | |

- Aynı cevap havuzunda birbirine çok benzeyen cümleler yazma; karakter son kullandıklarını tekrar etmez.

### Yapı

- Tam olarak bir küme `"start": true` olsun ve türü `"S"` olsun.
- Her kümeden en az bir çıkış olsun; sonuç kümelerinden başlangıca dönüş olsun (tatmin, teselli, kapatma).
- Her `from` ve `to` değeri var olan bir küme id'si olmalı. Geçersiz değerler içe aktarırken sessizce atılır.
- Başlangıçtan en az bir sonuca (X2) giden yol olmalı.
- `samples` her biri `["Örnek adı", ["mesaj 1", "mesaj 2", …]]` biçiminde. Mesajlar bir yolu baştan sona yürümeli; her mesaj sıradaki bağlantının kelimesini içermeli.

### Senaryoya giremeyenler

Şunlar senaryo JSON'una girmez, içe aktardıktan sonra editörde ayarlanır:
- Kişiliklerin sevdiği / sevmediği kümeler
- Yazım tarzı

---

## 7. Tam örnek

```json
{
  "format": "amor-kume",
  "version": 1,
  "scenarios": [
    {
      "name": "Konu: İş / mülakat",
      "live": false,
      "states": [
        { "id": "S", "kind": "S", "name": "S", "desc": "Başlangıç", "icon": "👋", "start": true,
          "emojis": ["👋"], "stay": ["hmm anlat bakalım", "başka ne var ne yok?"], "x": 90, "y": 220 },
        { "id": "X", "kind": "X", "name": "X", "desc": "İş konusu açıldı", "icon": "💼",
          "emojis": ["💼", "👀"], "stay": ["eee, iş nasıl?", "anlat biraz daha"], "x": 300, "y": 220,
          "stayRules": [ { "kw": ["patron", "müdür"], "lines": ["patron ne dedi?", "patronlar hep böyle ya"] } ] },
        { "id": "X1a", "kind": "X1", "name": "X-1a", "desc": "Mülakata hazırlanıyor", "icon": "📝",
          "emojis": ["📝", "💪"], "stay": ["kolay gelsin", "ne soruyorlar genelde?"], "x": 540, "y": 80 },
        { "id": "X1b", "kind": "X1", "name": "X-1b", "desc": "Mülakat stresi", "icon": "😰",
          "emojis": ["🫂"], "stay": ["derin nefes al", "sen hazırsın bence"], "x": 540, "y": 360 },
        { "id": "X2a", "kind": "X2", "name": "X-2a", "desc": "İşe alındı", "icon": "🎉",
          "emojis": ["🎉", "✨"], "stay": ["ne zaman başlıyorsun?", "çok sevindim"], "x": 800, "y": 80 },
        { "id": "X2b", "kind": "X2", "name": "X-2b", "desc": "Olumsuz döndüler", "icon": "💔",
          "emojis": ["🤍"], "emojiChance": 0.3, "stay": ["canını sıkma", "daha iyisi gelecek"], "x": 800, "y": 360 }
      ],
      "edges": [
        { "id": "close", "name": "Kapatma", "from": ["X", "X1a", "X1b", "X2a", "X2b"], "to": "S", "need": "kw",
          "kw": ["neyse", "boşver", "konuyu değiştir", "geçelim"], "lines": ["tamam kapattık|başka ne var?"] },
        { "id": "how", "name": "Nasılsın", "from": ["S"], "to": "S", "need": "how", "kw": [], "lines": [], "use": ["how_are_you"] },
        { "id": "greet", "name": "Selam", "from": ["S"], "to": "S", "need": "greet", "kw": [], "lines": [], "use": ["greet"] },
        { "id": "open", "name": "İş konusu", "from": ["S"], "to": "X", "need": "kw",
          "kw": ["mülakat", "iş görüşmesi", "iş başvurusu", "başvurdum", "cv", "işe alım", "staj"],
          "lines": ["aa {w} mı? anlat", "ciddi mi? hangi şirket?"], "desc": "iş arama konusu açıldı" },
        { "id": "prep", "name": "Hazırlık", "from": ["X"], "to": "X1a", "need": "kw",
          "kw": ["hazırlanıyorum", "çalışıyorum", "araştırıyorum", "prova"],
          "lines": ["aferin, iyi hazırlan", "kolay gelsin{h}|neler çalışıyorsun?"] },
        { "id": "stress", "name": "Stres", "from": ["X", "X1a"], "to": "X1b", "need": "kw",
          "kw": ["stres", "gerginim", "korkuyorum", "heyecan", "panik"],
          "lines": ["sakin ol{h}, çok normal", "heyecanlanman güzel aslında|demek ki önemsiyorsun"] },
        { "id": "calm", "name": "Sakinleşme", "from": ["X1b"], "to": "X1a", "need": "kw",
          "kw": ["sakinleştim", "toparladım", "kendime geldim"], "lines": ["işte böyle, devam"] },
        { "id": "hired", "name": "Alındı", "from": ["X1a", "X1b"], "to": "X2a", "need": "kw",
          "kw": ["alındım", "kabul edildim", "teklif geldi", "işe girdim", "olumlu döndüler"],
          "lines": ["tebrikler!!|biliyordum alınacağını", "helal olsun sana{h}"] },
        { "id": "rejected", "name": "Olmadı", "from": ["X1a", "X1b"], "to": "X2b", "need": "kw",
          "kw": ["alınmadım", "reddedildim", "olumsuz döndüler", "olmadı", "dönmediler"],
          "lines": ["üzüldüm ama onların kaybı", "boşver, daha iyisi gelecek"] },
        { "id": "praise", "name": "Övgü", "from": ["X2a"], "to": "", "need": "kw",
          "kw": ["başardım", "gurur"], "lines": ["gurur duydum seninle", "aferin sana!"] },
        { "id": "satisfy", "name": "Tatmin", "from": ["X2a"], "to": "S", "need": "kw",
          "kw": ["rahatladım", "oh be", "mutluyum"], "lines": ["hak ettin bu rahatlığı"] },
        { "id": "comfort", "name": "Teselli", "from": ["X2b"], "to": "S", "need": "kw",
          "kw": ["sağ ol", "haklısın", "iyi geldi"], "lines": ["hep buradayım"] },
        { "id": "retry", "name": "Yeniden başvuru", "from": ["X2b"], "to": "X1a", "need": "kw",
          "kw": ["yine başvurdum", "başka yere başvurdum", "yeniden"], "lines": ["bu sefer olacak, eminim"] }
      ],
      "samples": [
        ["İşe alındı", ["selam", "yarın mülakatım var", "biraz hazırlanıyorum", "çok gerginim ya", "toparladım", "teklif geldi!", "başardım işte", "oh be rahatladım"]],
        ["Olmadı", ["iş başvurusu yaptım", "çalışıyorum sorulara", "reddedildim", "sağ ol"]]
      ]
    }
  ]
}
```

---

## 8. Yapay zekaya verilecek istek

Bu belgeyi yapıştırdıktan sonra şunu ekle (konuyu değiştir):

```
Yukarıdaki formata birebir uyan bir Amor Küme senaryosu JSON'u üret.
Konu: <KONU, örn. "Spor salonu / diyet">
- 1 başlangıç (S), 1 konu (X), en az 2 süreç (X1) ve en az 2 sonuç (X2) kümesi olsun.
- Kapatma, Nasılsın ve Selam bağlantıları başta olsun.
- Konu açan bağlantının kelimeleri konuya özgü olsun, Okul (okul, ders, sınav, ödev, hoca…),
  Futbol (maç, gol, takım, derbi…) ve Buluşma (buluşalım, görüşelim, kahve içelim…) kelimeleriyle çakışmasın.
- Aynı kümeden çıkan bağlantılarda kelime çakışması olmasın.
- Cümleler doğal, kısa, gündelik Türkçe olsun.
- Her kümeye ve her bağlantıya benzersiz, ASCII bir "id" yaz; from / to alanlarında küme id'sini kullan.
- 2 örnek sohbet (samples) ekle; her mesaj sıradaki bağlantının kelimesini içersin.
Sadece JSON'u ver, açıklama yazma.
```

---

## 9. İçe aktardıktan sonra

1. Editörde senaryoyu aç. **W · Bağlantılar** başlığında "çakışma yok ✓" görünmeli.
2. **Yollar** kartında yolları **Bu yolu test et** ile dene; hepsi ✓ olmalı.
3. **Kişilik havuzları**'ndan hangi kişiliğin bu kümeleri sevdiğini / sevmediğini seç.
4. **uygulamada kullan** kutusunu işaretle ve **Kaydet**'e bas.
