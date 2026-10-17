# Amor konuşma kümesi: JSON formatı

Bu belge, bir yapay zekanın Amor diyalog editörüne doğrudan içe aktarılabilecek bir **konuşma kümesi JSON dosyası** üretmesi için yazıldı. Belgeyi olduğu gibi yapay zekaya verip sonuna istediğin kümeyi yazman yeterli (bkz. [Bölüm 8](#8-yapay-zekaya-verilecek-istek)).

Üretilen dosya editörün kenar listesinde, **Konuşma kümeleri** başlığındaki **⬆ JSON** düğmesiyle eklenir. Örnek: [ornek-konusma.json](ornekler/ornek-konusma.json). Senaryolar için ayrı bir format var: [SENARYO-KURMA.md](SENARYO-JSON.md).

---

## 1. Konuşma kümesi nedir

Amor, yapay zeka kullanmayan, kalıp tabanlı bir Türkçe sohbet uygulamasıdır. Kullanıcının mesajı anahtar kelimelere göre bir **konuşma kümesine** (niyete) atanır: Selamlaşma, Teşekkür, Nasılsın… Karakter o kümenin cümlelerinden biriyle cevap verir.

Bir konuşma kümesinin parçaları:

| Parça | Ne yapar |
|---|---|
| **Anahtar kelimeler** | Mesajın bu kümeye ait olduğunu anlamaya yarar |
| **Öncelik** | Mesaj birden çok kümeye uyarsa hangisinin kazanacağı |
| **Etki** | Mesajın karakterin ruh haline ve yakınlığa etkisi |
| **Cevap yolları** | Her kişilik için cümleler; ruh haline ve yakınlığa göre ayrı yollar |
| **ƒ Fonksiyon** | Mesajdaki belirli kelimelere göre daha özel bir cevap grubu seçer |

Kişilikler (arketipler):

| id | Kişilik |
|---|---|
| `nese` | Neşeli |
| `soguk` | Soğuk |
| `utangac` | Utangaç |
| `flortoz` | Flörtöz |
| `dramatik` | Dramatik |
| `olgun` | Olgun |

---

## 2. Dosyanın üst yapısı

```json
{
  "format": "amor-konusma",
  "version": 1,
  "clusters": [ { ...küme... } ]
}
```

`clusters` bir dizidir; tek dosyada birden çok küme verilebilir.

---

## 3. Küme nesnesi

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| `id` | string | bkz. aşağı | Var olan bir kümenin id'si yazılırsa o küme **güncellenir**. Yeni küme için `x_` ile başlayan bir id yaz (`"x_muzik"`) ya da hiç yazma. |
| `name` | string | yeni kümede evet | Editörde görünen ad: `"Müzik sohbeti"` |
| `words` | string[] | yeni kümede evet | Anahtar kelimeler (bkz. 4. bölüm) |
| `before` | string | hayır | Bu küme, hangi kümeden **önce** denensin (bir küme id'si). Yeni kümede verilmezse `"how_are_you"`. |
| `effect` | nesne | hayır | `{ "valence": -0.4…0.4, "arousal": -0.3…0.3, "aff": -10…10 }`: mutluluk, heyecan, yakınlık puanı |
| `lines` | nesne | yeni kümede evet | Cevap yolları (bkz. 5. bölüm) |
| `function` | nesne | hayır | ƒ fonksiyon (bkz. 6. bölüm) |

### Güncelleme kuralı

Var olan bir kümeyi güncellerken **sadece dosyada olan alanlar değişir**:
- `words` verilirse kelime listesinin tamamı değişir.
- `lines` içinde verilen her kişilik ve yol değişir; verilmeyenler olduğu gibi kalır.
- `function` verilirse fonksiyonun tamamı değişir.

### Var olan küme id'leri

**Anahtar kelimeli kümeler:**

| id | Ad | id | Ad |
|---|---|---|---|
| `greet` | Selamlaşma | `how_are_you` | Nasılsın |
| `morning` | Günaydın | `night` | İyi geceler |
| `bye` | Vedalaşma | `thanks` | Teşekkür |
| `sorry` | Özür | `agree` | Onaylama |
| `disagree` | Reddetme | `laugh` | Gülme |
| `compliment` | İltifat | `flirt` | Flört |
| `miss` | Özlem | `kiss` | Öpücük |
| `hug` | Sarılma | `insult` | Hakaret |
| `answer_good` | İyiyim | `answer_bad` | Kötüyüm |
| `wyd` | Ne yapıyorsun | `meet` | Buluşma / iletişim |
| `photo` | Fotoğraf isteği | `ask_call` | Arama isteği |
| `ask_age` | Yaş sorusu | `ask_name` | İsim sorusu |
| `ask_city` | Şehir sorusu | `ask_job` | Meslek sorusu |
| `ask_hobby` | Hobi sorusu | `ask_memory` | Beni hatırlıyor musun (cümle almaz) |

**Özel durumlar:** Bunların anahtar kelimesi, önceliği ve etkisi yoktur; `words`, `before` ve `effect` alanları yok sayılır.

| id | Ne zaman |
|---|---|
| `question` | Hiçbir kelime tutmadı ama mesaj soru |
| `fallback` | Hiçbir kelime tutmadı |
| `tell_name` | Kullanıcı adını söyledi ("adım Deniz") |
| `opener` | Karakter sohbeti kendisi başlatıyor (sadece `normal` ve `close` yolları) |
| `any` | Genel ruh hali cümleleri: niyete özel cümle yokken gergin / üzgün / yorgun karakter (sadece `neg`, `sad`, `low` yolları) |

**Kişilik kümeleri:** Sadece `lines.<kişilik>.normal` ve `function` alanlarını kullanır.

| id | Ne zaman |
|---|---|
| `refuse` | Karakter sevmediği bir senaryo kümesine girmeyi reddediyor |
| `love` | Karakter sevdiği bir kümeye giriyor (ikinci balon) |

---

## 4. Anahtar kelimeler (`words`)

- Küçük harf yaz. Eşleşme büyük/küçük harfe ve Türkçe karakterlere duyarsızdır; tekrar eden harfler sadeleşir ("şarkııı" = "şarkı").
- **Kelimenin başı** eşleşir: `"şarkı"` kelimesi "şarkıyı", "şarkılar"ı da yakalar.
- Çok kelimeli kalıplar yan yana aranır: `"ne dinliyorsun"`.
- `^` ile başlayan kelime sadece mesajın başında ve tam kelime olarak eşleşir: `"^ok"` "ok"u tutar, "okul"u tutmaz.
- Çok genel kelimelerden kaçın (`"ve"`, `"bu"`, `"iyi"`, `"ben"`). Başka kümelerin kelimeleriyle çakışmasın; çakışırsa listede önce gelen küme kazanır.
- 6–15 kelime ver; kullanıcının gerçekte yazacağı biçimleri düşün.

---

## 5. Cevap yolları (`lines`)

```json
"lines": {
  "*":     { "normal": [...], "neg": [...] },
  "nese":  { "normal": [...], "close": [...] },
  "soguk": [ "...", "..." ]
}
```

- Anahtar bir kişilik id'sidir. `"*"` bütün kişilikler demektir; önce `"*"` uygulanır, sonra tek tek kişilikler onun üstüne yazar.
- Değer bir **yol → cümleler** nesnesidir. Düz dizi verilirse `normal` yolu sayılır.

| Yol | Ne zaman kullanılır |
|---|---|
| `normal` | İyi ya da sakin ruh hali |
| `close` | Yakınlık Lv.3 ve üstü (%75 ihtimalle) |
| `neg` | Karakter gergin |
| `sad` | Karakter üzgün |
| `low` | Karakter yorgun |

Boş bırakılan yol başka yollara düşer: `close` → `normal`, ruh hali yolları → genel ruh hali cümleleri, `normal` → "Anlaşılmayan mesaj" cümleleri. En azından `normal` yolunu doldur.

### Cümle yazımı

- Her öğe bir cevaptır. Her yola 2–5 farklı cümle yaz; karakter son kullandıklarını tekrar etmez.
- `|` cümleyi iki ayrı balona böler: `"ooo ne dinliyorsun?|ben de bir şey arıyordum"`. Bir cevapta en fazla bir `|` kullan.
- Kişiliğe uygun yaz: neşeli coşkulu, soğuk kısa ve resmi, utangaç çekingen ("şey…"), flörtöz cilveli, dramatik abartılı, olgun sakin. Kişiliğin yazım tarzı (küçük harf, emoji, ekler) uygulama tarafından ayrıca eklenir.
- Yer tutucular:

| Yer tutucu | Yerine gelen |
|---|---|
| `{h}` | Yakınlığa göre hitap (" canım" ya da boş); boşluksuz yapıştır: `"selam{h}"` |
| `{name}` | Kullanıcının adı |
| `{self}` | Karakterin adı |
| `{age}` `{city}` `{district}` | Karakterin yaşı, şehri, semti |
| `{city_at}` | "İzmir'deyim" |
| `{fav}` | Şehirde sevdiği yer |
| `{job_is}` | "mimarım" |
| `{doing}` | Mesleğine göre şu an ne yaptığı |
| `{like}` `{like2}` | Sevdiği şeylerden |
| `{laugh}` | Kişiliğe göre gülme (ahah, hh, ASDJK…) |

---

## 6. ƒ Fonksiyon (`function`)

Fonksiyon, mesajdaki belirli kelimelere göre kümenin genel cümleleri yerine daha özel bir cevap grubu seçer. Bütün kişilikler için ortaktır.

```json
"function": {
  "outs": [
    { "id": "konser", "name": "Konser", "lines": ["konser mi?? kimin?", "konserler ayrı bir dünya ya"] }
  ],
  "ins": [
    { "kw": "konser", "out": "konser" },
    { "kw": "bilet + konser", "out": "konser" },
    { "kw": ["şarkı", "öner"], "out": "oneri" }
  ]
}
```

- **`outs` (çıktılar):** Cevap grupları. `id` benzersiz ve ASCII olsun; `name` editörde görünür; `lines` bölüm 5'teki gibi yazılır.
- **`ins` (girdiler):** Hangi kelimelerin hangi çıktıya gideceği. `out` bir çıktının `id`'sidir. Bir girdi tek bir çıktıya gider; bir çıktıya birden çok girdi gidebilir.
- **Kombinasyon:** `kw` tek bir kelime ya da kelime grubu (`"iyi akşamlar"`) olabilir. `"x + y"` yazısı ya da `["x", "y"]` dizisi de olabilir: bu durumda **parçaların hepsi** mesajda geçmeli, sıra ve aradaki kelimeler önemsiz.
- **Hangi girdi kazanır:** Mesajda birden çok girdi tutarsa önce **parçası çok olan**, sonra uzun olan kazanır.

  | Girdi | Çıktı |
  |---|---|
  | `kedi` | A |
  | `kedi + hasta` | B |
  | `hasta + veteriner` | C |

  "kedim var" → A · "kedim biraz hasta" → B · "hasta oldu, veterinere götürdüm" → C · sadece "hasta" → kümenin genel cümleleri.
- Girdiler kümeyi tetiklemeye de yeter: bir girdi tutarsa mesaj, anahtar kelimesi geçmese bile bu kümeye atanır. Mesaj başka bir kümenin kelimesine de uyuyorsa, girdi o kelimeden uzunsa fonksiyonun kümesi kazanır.

---

## 7. Tam örnek

[ornek-konusma.json](ornekler/ornek-konusma.json) dosyası:
- **Müzik sohbeti** adlı yeni bir küme ekliyor: kelimeler, öncelik, etki, `"*"` ile bütün kişiliklere ortak yollar, bazı kişiliklere özel cümleler ve kombinasyonlu girdileri olan bir fonksiyon.
- Var olan **Teşekkür** (`thanks`) kümesini güncelliyor: sadece Olgun kişiliğin normal cümleleri ve yeni bir fonksiyon değişiyor; kelimeleri olduğu gibi kalıyor.

```json
{
  "format": "amor-konusma",
  "version": 1,
  "clusters": [
    {
      "id": "x_muzik",
      "name": "Müzik sohbeti",
      "words": ["şarkı", "müzik", "playlist", "albüm", "konser", "spotify", "dinliyorum", "ne dinliyorsun"],
      "before": "how_are_you",
      "effect": { "valence": 0.08, "arousal": 0.05, "aff": 1 },
      "lines": {
        "*": {
          "normal": ["ooo ne dinliyorsun?", "müziksiz yaşayamam ya|sen ne tür seversin?"],
          "neg": ["şu an müziğe bile kafam yok", "hmm, sonra konuşalım mı?"],
          "sad": ["hüzünlü bir şey dinliyorum ben de…"],
          "low": ["kulaklık takıp uzanasım var"]
        },
        "nese": {
          "normal": ["AYY müzik!!|ne dinliyorsun söyle hemen", "bana da öner bir şarkı{h}"],
          "close": ["sana bir playlist yapsam mı?|bizim şarkımız olsun"]
        },
        "soguk": { "normal": ["Ne tür müzik?", "Ben genelde enstrümantal dinlerim."] }
      },
      "function": {
        "outs": [
          { "id": "konser", "name": "Konser", "lines": ["konser mi?? kimin?|ben de gelmek isterdim", "konserler ayrı bir dünya ya"] },
          { "id": "oneri", "name": "Şarkı önerisi", "lines": ["bir şarkı öner bakalım{h}", "bana da at, dinleyeyim"] },
          { "id": "huzun", "name": "Hüzünlü şarkı", "lines": ["neden hüzünlü şarkılar?|bir şey mi oldu?", "bazen iyi gelir öyle şarkılar"] }
        ],
        "ins": [
          { "kw": "konser", "out": "konser" },
          { "kw": "bilet + konser", "out": "konser" },
          { "kw": ["şarkı", "öner"], "out": "oneri" },
          { "kw": "şarkı + hüzünlü", "out": "huzun" }
        ]
      }
    },
    {
      "id": "thanks",
      "lines": { "olgun": { "normal": ["Rica ederim, ne demek.", "Her zaman{h}."] } },
      "function": {
        "outs": [ { "id": "yardim", "name": "Yardım için teşekkür", "lines": ["ne demek, işe yaradıysa ne mutlu"] } ],
        "ins": [ { "kw": "teşekkür + yardım", "out": "yardim" } ]
      }
    }
  ]
}
```

---

## 8. Yapay zekaya verilecek istek

Bu belgeyi yapıştırdıktan sonra şunu ekle (konuyu değiştir):

```
Yukarıdaki formata birebir uyan bir Amor konuşma kümesi JSON'u üret.
Küme: <KÜME, örn. "Yemek / ne yedin">
- Yeni bir küme olsun: id "x_" ile başlasın, name Türkçe olsun.
- 8-15 anahtar kelime; başka kümelerin (selam, nasılsın, teşekkür…) kelimeleriyle çakışmasın.
- lines: "*" ile bütün kişiliklere normal, neg, sad, low yolları; ayrıca 6 kişiliğin
  (nese, soguk, utangac, flortoz, dramatik, olgun) her biri için kişiliğine uygun en az 2 normal cümle,
  flortoz ve nese için close yolu.
- function: en az 3 çıktı; tek kelimelik ve "x + y" kombinasyonlu girdiler.
- Cümleler doğal, kısa, gündelik Türkçe olsun.
Sadece JSON'u ver, açıklama yazma.
```

---

## 9. İçe aktardıktan sonra

1. Editörde kümeyi aç. **Anahtar kelimeler** kartında ⚠ işaretli kelime varsa başka bir kümeye takılıyor demektir; ya kelimeyi daralt ya önceliği değiştir.
2. **ƒ Fonksiyon** panelindeki "dene" kutusuna örnek mesajlar yazıp doğru çıktının seçildiğini kontrol et.
3. **Cevap yolları** sekmelerinden her kişiliğin cümlelerine göz at.
4. **Kaydet**'e bas. Değişiklikler [js/data/custom-dialog.js](../js/data/custom-dialog.js) dosyasına yazılır. Telefonda görmek için commit + push gerekir.

Bir kümeyi paylaşmak ya da yedeklemek için kümenin sayfasındaki **⬇ JSON dışa aktar** düğmesini kullan. Kenar listesindeki **⬇ hepsi** bütün konuşma kümelerini tek dosyada indirir. Dışa aktarılan dosya aynı formattadır ve doğrudan geri içe aktarılabilir.
