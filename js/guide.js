/*
 * Amor - Kitaplık (Ben → Kitapçık, #/guide, kitap: #/guide/<kitapId>)
 * --------------------------------------------------------------------
 * Raf: kitap kapakları. Kitap: sayfa sayfa okunur (‹ ›, kaydırma, ok tuşları).
 * "Kitapçık" herkese açık; gizli kitaplar (oyun kurallarının ayrıntısı) rafın altındaki 🔑 alana kod yazınca açılır
 * (Store.state.secretBooks, hesap başına). Söz → olay tabloları js/data/intent-map.js ve r_cmd_* kurallarından,
 * ekonomi tabloları js/data/shop.js'ten her açılışta okunur; veri değişince kitaplar da güncel kalır.
 */
window.Amor = window.Amor || {};

(() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const back = (href) => `<a class="icon-btn" href="${href}" aria-label="Geri"><svg viewBox="0 0 24 24"><path d="M20 12H5M11 5l-7 7 7 7"/></svg></a>`;
  const low = s => String(s || '').toLocaleLowerCase('tr');
  const fold = s => low(s).replace(/[çğıöşü]/g, ch => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[ch]));
  const n = v => Number(v).toLocaleString('tr-TR');
  const CODE = 'a2lybWl6aWRlZnRlcg=='; // gizli kitapların kodu (base64)

  A.Pages = A.Pages || {};
  A.FULL_PAGES = [...(A.FULL_PAGES || []), 'guide'];

  // Olay grupları: kategori → [başlık, simge]
  const GROUPS = [
    ['protection', '🛡️ Korunma'], ['cumming', '💦 Boşalma ve orgazm'], ['fantesy', '🦄 Fantezi ve rol'],
    ['backward', '🍑 Arkadan'], ['outercourse', '👄 Dıştan ve oral'], ['forward', '🔥 Önden'],
    ['foreplay', '💋 Isınma'], ['mode', '🎚️ Tempo (sadece sevişirken)']
  ];
  const groupOf = cat => ({ eat: 'outercourse', lactation: 'cumming' }[cat] || cat);

  // Terimi okunur yap: "=em" tam kelime, "yap-" kelime başı, "a|b" ayrı ayrı; Türkçesiz tekrarlar atlanır
  function terms(list) {
    const out = [], seen = new Set();
    list.flatMap(w => String(w).split('|')).forEach(w => {
      const t = w.trim(), whole = t.startsWith('='), pre = t.endsWith('-');
      const core = t.replace(/^=/, '').replace(/-$/, '');
      if (!core || seen.has(fold(core))) return;
      seen.add(fold(core));
      out.push(`<code title="${whole ? 'tam kelime' : pre ? 'kelime başı: devamı ne olursa olsun' : 'metinde geçsin'}">${esc(core)}${pre ? '…' : ''}</code>`);
    });
    return out.join(' ');
  }
  const titles = list => list.map(t => `<b>${esc(t)}</b>`).join(' / ');

  function eventsHtml() {
    const M = A.INTENT_MAP || { catalog: {}, events: [] };
    return GROUPS.map(([g, name]) => {
      const rows = M.events.filter(x => groupOf(low((M.catalog[x.titles[0]] || [''])[0])) === g);
      if (!rows.length) return '';
      return `<details><summary>${name} <small>${rows.length}</small></summary>
        <table>${rows.map(x => `<tr><td>${titles(x.titles)}</td><td>${terms(x.words)}</td></tr>`).join('')}</table></details>`;
    }).join('');
  }

  function cmdHtml() {
    const M = A.INTENT_MAP || { cmd: {} }, rules = (A.BOT_RULES || { rules: [] }).rules;
    const rows = Object.entries(M.cmd).map(([id, evs]) => {
      const r = rules.find(x => x.id === id);
      const when = r ? (r.when || []).filter(w => !String(w).startsWith('=evt')) : [];
      return when.length ? `<tr><td>${terms(when)}</td><td>${titles(evs)}</td></tr>` : '';
    }).join('');
    return rows ? `<details><summary>🗣️ Komutlar <small>önce cevap, sonra olay</small></summary><table>${rows}</table></details>` : '';
  }

  const table = (head, rows) => `<table>${head ? `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>`;
  const ARCH = { nese: 'Neşeli', soguk: 'Soğuk', utangac: 'Utangaç', flortoz: 'Flörtöz', dramatik: 'Dramatik', olgun: 'Olgun' };
  const LV_NAMES = ['Yeni tanışma', 'Tanıdık', 'Arkadaş', 'Yakın', 'Özel', 'Ruh eşi'];

  /* ---------- Kitaplar: { id, title, sub, color, icon, secret, pages: () => [[başlık, html]] } ---------- */
  const BOOKS = [
    {
      id: 'kitapcik', title: 'Kitapçık', sub: 'Nasıl oynanır', icon: '📖', color: '#ff3d8b',
      pages: () => [
        ['💕 Amor nedir?', `<p>Amor'da karakterlerle yazışır, arar, hediye atar ve sesli odalara girersin. Her karakterin kendi kişiliği, ruh hali, çevrimiçi saatleri ve hafızası vardır; ne yazdığın ve nasıl davrandığın ilişkinizi değiştirir.</p>
          <ul><li><b>Keşfet:</b> ana sayfada profiller, çevrimiçiler üstte.</li><li><b>Mesajlar:</b> sohbetler; mesaj coin ya da bedava sohbet kartı ister.</li>
          <li><b>Odalar:</b> bir kızın ev sahipliği yaptığı grup sohbetleri.</li><li><b>Ben:</b> profilin, mağaza, ödüller ve bu kitaplık.</li></ul>`],
        ['💞 Yakınlık seviyeleri', `<p>Konuştukça ve hediye attıkça yakınlık puanı birikir. Seviye yükseldikçe karakter daha açık, daha sıcak konuşur; bazı şeyler (fotoğraf, istekler) belli bir seviyeden sonra açılır.</p>
          ${table(['Seviye', 'Ad', 'Puan'], (A.Engine ? A.Engine.LEVELS : []).map((p, i) => [`Lv.${i + 1}`, LV_NAMES[i] || '', n(p)]))}
          <p>Lv.4 ve Lv.5'te sohbete özel kalpli tema kendiliğinden açılır.</p>`],
        ['🎁 Hediyeler', `<p>Sohbette, aramada ya da odada 🎁 butonuyla hediye atarsın. Pahalı hediye daha çok sevindirir ama etki logaritmiktir: 10 kat pahalı hediye 10 kat sevindirmez.</p>
          <ul><li><b>hediye:</b> klasik hediyeler (${(A.GIFTS || []).filter(g => g.tab === 'hediye').length} çeşit).</li>
          <li><b>Dostluk:</b> ilişki kurar: CP (sevgili), Kanka, Eşlik, Koruyucu. Profilinde rozet olarak görünür.</li>
          <li><b>Şanslı:</b> atınca aralığındaki rastgele bir hediyeye dönüşür.</li><li><b>Çanta:</b> ödül olarak kazandığın hediyeler.</li></ul>
          <p>Karakterler de senden hediye ister. İsteğe "tamam" ya da "alamam" diyebilirsin; ikisinin de sonucu olur.</p>`],
        ['📸 Fotoğraflar', `<ul><li>"Fotoğrafını atar mısın", "resim rica etsem" gibi yazarak fotoğraf isteyebilirsin.</li>
          <li>Lv.2'den önce utanır, vermez.</li><li>Fotoğrafı <b>her zaman bir hediye karşılığında</b> verir: istediği hediye gelince gönderir.</li>
          <li>Sana küsmüşse fotoğraf da yok.</li></ul>`],
        ['🎙️ Sesli odalar', `<ul><li>Odalar yarım saatte bir değişir; ne kadar çok kız çevrimiçiyse o kadar oda açılır.</li>
          <li>Boş koltuğa oturabilir, yazabilir, ev sahibine hediye atabilirsin.</li><li>Arada <b>PK</b> (hediye yarışı) başlar: iki oda, hediyelerle yarışır.</li>
          <li>Büyük hediyeler bütün uygulamada yayın bandına düşer.</li></ul>`],
        ["📖 Carmen'den neler geldi?", `<p>Amor'un yetişkin sohbet tarafı kardeş proje <b>Carmen</b>'in bot sisteminden birebir aktarıldı:</p>
          <ul>
            <li><b>Bot kuralları:</b> Carmen'deki bütün cevaplar, olaylara cevaplar (<code>=evt</code>), durum baloncukları (<code>=durum</code>) ve kişiliğe göre cevaplar.</li>
            <li><b>Olay kataloğu:</b> pozisyonlar, ısınma, oral, fanteziler, roller, tempo, boşalma ve korunma.</li>
            <li><b>Gizli parametreler:</b> güven, samimiyet, aşk, şehvet, uyarılma, kıskançlık, acı, süt ve senin zevkin. Görünmezler ama cevapları değiştirirler.</li>
            <li><b>Karakter özellikleri:</b> her karakterin kişiliği, vücudu, deneyimi, sevdiği / sevmediği olaylar ve izin verdiği korunma sabittir.</li>
            <li><b>Döngü ve hamilelik:</b> regl, riskli günler, gebelik şansı ve hamilelik haftaları.</li>
            <li><b>Soru-cevap:</b> karakter sana soru sorar, "evet" ya da "hayır" demen olayı belirler.</li>
          </ul>`],
        ['✍️ Butonlar yok, yazman yeter', `<p>Carmen'de olaylar butonla seçiliyordu. Amor'da ne yapmak istediğini <b>yazarsın</b>; mesajındaki söz listelerden biriyle eşleşirse o olay olur ve karakter ona göre cevap verir.</p>
          <ul>
            <li>Liste <b>yukarıdan aşağı</b> okunur, ilk tutan kazanır: "dışarı boşalırım" boşalma değil korunma niyetidir.</li>
            <li>Bir sözün birden fazla olayı varsa biri seçilir; karakterin <b>sevdiği</b> olan öne geçer.</li>
            <li><code>öp…</code> gibi üç noktalılar kelime başıdır: "öpeyim", "öpsene", "öpüyorum" hepsi tutar.</li>
            <li>Tempo sözleri ("yavaş", "daha sert") sadece sevişme sürerken sayılır.</li>
          </ul>`],
        ['🔎 Hangi söz hangi olay?', eventsHtml() + cmdHtml()],
        ['⚙️ Kendiliğinden olanlar', `<ul>
            <li><b>Zevk 80</b> olunca o anki pozisyona uygun boşalma, onun <b>uyarılması 80</b> olunca orgazmı kendiliğinden olur.</li>
            <li>Sevişirken yazdığın her mesaj ikinizi de biraz daha yaklaştırır.</li>
            <li>Önden girişte, boşalmada ve korunmada karakter korunma durumuna göre konuşur; korunmasız ve riskli günde hamile kalabilir.</li>
            <li>Sevmediği bir şey olursa ya da izin vermediği korunmayı seçersen güveni düşer.</li>
            <li>30 dakika yazışmazsanız sahne biter, sonraki seferde baştan başlar.</li>
            <li>Güveni çok düşükken özel sorulara kaçamak cevap verir.</li>
          </ul>`]
      ]
    },
    {
      id: 'hediye-defteri', title: 'Hediye Defteri', sub: 'İstekler, pazarlık, küsme', icon: '🎁', color: '#f59e0b', secret: true,
      pages: () => [
        ['🎯 Hediye niyeti', `<p>Her kadın karakterin gizli bir <b>hediye niyeti</b> (0–1) vardır; kişiliğinden türer, kişiye özgü biraz sapar. Niyeti yüksek olan:</p>
          <ul><li>daha sık ve daha <b>pahalı</b> hediye ister,</li><li>istediği gelince daha çok sevinir,</li><li>karşılanmazsa daha çok bozulur ve daha uzun küser,</li><li>"alamam" deyince daha çok pazarlık eder (1–3 tur).</li></ul>`],
        ['💰 Ne kadar pahalı ister?', `<p>İsteyebileceği en pahalı hediye (tavan):</p>
          <p><code>(300 + niyet² × 6000) × hediye zevki</code> (en çok ${n(200000)})</p>
          <p>Tavanın <b>%30'u ile tavanın kendisi</b> arasındaki hediyelerden seçer; seçim fiyatla ağırlıklıdır, yani pahalı olan daha olasıdır.</p>
          ${table(['Kişilik', 'Hediye zevki', 'Hediye sevgisi'], Object.keys(ARCH).map(k => [ARCH[k], '× ' + (A.GIFT_TASTE || {})[k], '× ' + (A.GIFT_LOVE || {})[k]]))}
          <p><b>Hediye zevki</b> tavanı çarpar (soğuk az ister ama istediği pahalıdır); <b>hediye sevgisi</b> hediyenin yakınlığa etkisini çarpar.</p>`],
        ['⏱️ Ne zaman ister?', `<ul><li><b>Sohbette:</b> ruh hali iyiyken, ilgisi ≥ %30 ve <b>Lv.2+</b> iken her mesajında <code>niyet × %14</code> ihtimalle.</li>
          <li>Veda, iyi geceler, hakaret, isim söyleme ve arama isteğinde istemez.</li>
          <li><b>Aramada:</b> her dakika <code>niyet × %30</code> ihtimalle.</li>
          <li>Bekleyen isteği varken yenisini istemez; son istekten sonra <b>3 saat</b> bekler.</li>
          <li>Arada isteği fotoğrafa bağlar: "{hediye} atarsan sürprizim var".</li>
          <li>Sohbette %30 ihtimalle isteğine bir para bahanesi ekler.</li></ul>`],
        ['✅ İsteği karşılamak', `<ul><li>İstek <b>6 saat</b> geçerlidir (küsmüşse küslük bitene kadar).</li>
          <li>İstediği ya da daha değerli hediye karşılar. Daha ucuzlar <b>birikir</b>: toplam, istediğinin <b>%80'ine</b> ulaşınca tamam sayılır; o zamana kadar "kalanını" ister ve ruh hali biraz düşer.</li>
          <li>Karşılanınca: ilgi <code>+0,05 + niyet × 0,1</code>, ruh hali yükselir, <b>uyarılma +25, şehvet +30, aşk +5, güven +2</b>; sevişmek ister.</li>
          <li>Küsken karşılarsan barışır ve ekstra sevinir.</li>
          <li>Fotoğrafa bağlıysa fotoğrafı hemen gönderir.</li>
          <li>Her hediye (istenmese de) ilgiyi <code>0,02 + niyet × 0,04</code> artırır.</li></ul>`],
        ['🗣️ Evet / hayır', `<p>İstekten sonraki <b>20 dakika</b> içinde verdiğin cevap sayılır.</p>
          <ul><li><b>Evet</b> sözleri: tamam, olur, alırım, alayım, söz, evet, peki, hallederim… → söz verdin, sevinir.</li>
          <li><b>Hayır</b> sözleri: alamam, olmaz, hayır, param yok, pahalı, istemem, bütçem… → pazarlık başlar.</li></ul>`],
        ['🤝 Pazarlık', `<p>Pazarlık tur sayısı: niyet ≥ 0,6 → <b>3</b>, ≥ 0,3 → <b>2</b>, yoksa <b>1</b>. Her "hayır"da %85 ihtimalle bir tur daha döner:</p>
          <ul><li>Para bahanesi söyleyebilir (ilk turda %70).</li><li>"Param yok" dersen ya da %60 ihtimalle <b>daha ucuz</b> bir hediyeye iner (istediğinin %15–70'i).</li>
          <li>Sevişme vaadiyle ya da tatlılıkla ikna etmeye çalışır.</li><li>Son turda son kez uyarır.</li><li>Her turda cevap süresi yeniden başlar.</li></ul>
          <p><b>Bahaneler</b> karakterin kimliğine göre sabittir (niyeti 0,35 altındakiler bahane kullanmaz): evliyim, işim yok, uygulamanın kuralı, öğrenciyim, kira, aile.</p>`],
        ['🥶 Küsme', `<ul><li><b>Geri çevirirsen</b> (pazarlık da biterse): <code>1 + niyet × 4</code> saat küser; ilgi düşer, ruh hali sert düşer, <b>aşk −3, güven −2, uyarılma −30, şehvet −20</b>.</li>
          <li><b>Unutursan</b> (6 saat dolarsa): <code>0,5 + niyet × 2</code> saat küser; ilgi <code>0,04 + niyet × 0,12</code> düşer, sitem edebilir.</li>
          <li>Küsken sevişme olaylarını pozisyona ve duruma göre <b>reddeder</b> (korunma konuşması hariç). Çok azgınsa (uyarılma ≥ 50 ya da şehvet ≥ 60) yarı yarıya kararsız kalır.</li>
          <li>Küsken fotoğraf vermez.</li><li>İstediği hediyeyi atınca küslük biter.</li></ul>`],
        ['📸 Fotoğraf kuralları', `<p>Mesajda <b>foto / resim / selfie / pic</b> ile birlikte <b>at, gönder, yolla, göster, görmek, paylaş, rica, istiyorum, ister, alabilir, var mı</b> geçerse fotoğraf isteği sayılır.</p>
          ${table(['Durum', 'Sonuç'], [['Küs', 'vermez'], ['Lv.1', 'utanır, erken der'], ['Albümü yok', 'fotoğrafım yok der'], ['Bekleyen isteği var', 'fotoğrafı o isteğe bağlar, hediyeyi bekler'], ['Diğer', '<b>her zaman</b> hediye karşılığı ister']])}
          <p>Daha önce göndermediği fotoğrafları önce gönderir; profil fotoğrafı en sona kalır.</p>`],
        ['😈 Cüretkâr açılışlar', `<p>Sohbete dönüşte <code>%12 + %4 × seviye</code> (en çok Lv.5) ihtimalle cüretkâr bir soruyla açar (küsken açmaz):</p>
          <ul><li><b>Fotoğraf + "nasılım?":</b> beğendim dersen şehvet +15, uyarılma +15, aşk +2; beğenmedim dersen aşk −2, ruh hali düşer.</li>
          <li><b>"Kaç santim?":</b> 26 üstü abartı der · 19+ büyük (şehvet +20, uyarılma +15) · 14+ ideal (şehvet +12, uyarılma +8) · altı küçük.</li>
          <li><b>"Sevişmeyi sever misin?":</b> evet → şehvet +15, uyarılma +10; hayır → ruh hali düşer.</li></ul>
          <p>Cevap 30 dakika içinde sayılır.</p>`]
      ]
    },
    {
      id: 'yakinlik', title: 'Yakınlık Kitabı', sub: 'Puanlar ve ilişkiler', icon: '💞', color: '#ec4899', secret: true,
      pages: () => [
        ['📈 Seviye eşikleri', table(['Seviye', 'Ad', 'Gereken puan'], (A.Engine ? A.Engine.LEVELS : []).map((p, i) => [`Lv.${i + 1}`, LV_NAMES[i] || '', n(p)]))
          + `<p>Puan sohbetle ve hediyeyle birikir. Aşk değeri seviyenin altına düşmez: <code>(seviye − 1) × 18</code>; samimiyet <code>(seviye − 1) × 12</code>.</p>`],
        ['🎁 Hediyenin puanı', `<p>Bir hediyenin kazandırdığı yakınlık puanı:</p><p><code>(√değer ÷ 3 + 1) × hediye sevgisi</code></p>
          ${table(['Hediye', 'Neşeli', 'Flörtöz', 'Soğuk'], [100, 1000, 10000, 100000].map(v => [n(v) + ' coin', ...['nese', 'flortoz', 'soguk'].map(k => Math.round((Math.sqrt(v) / 3 + 1) * (A.GIFT_LOVE || {})[k]))]))}
          <p>Ruh haline etkisi: <code>(0,04 + log10(değer) × 0,07) × hediye sevgisi</code> (en çok 0,6). 3.000 coin ve üstü heyecanı da artırır.</p>`],
        ['💍 Dostluk ilişkileri', table(['Hediye', 'Fiyat', 'İlişki'], (A.GIFTS || []).filter(g => g.tab === 'dostluk').map(g => [`${g.e} ${esc(g.name)}`, n(g.price), esc((A.RELATIONS[g.rel] || {}).title || g.rel)]))
          + '<p>İlişki kurulunca karakter ona özel bir cümleyle karşılık verir ve rozet profilde görünür.</p>'],
        ['🍀 Şanslı hediyeler', table(['Hediye', 'Fiyat', 'Dönüştüğü değer'], (A.GIFTS || []).filter(g => g.lucky).map(g => [`${g.e} ${esc(g.name)}`, n(g.price), `${n(g.lucky[0])} – ${n(g.lucky[1])}`]))
          + '<p>Atınca aralıktaki rastgele bir hediyeye dönüşür; karakter dönüştüğü hediyeye göre sevinir.</p>'],
        ['💬 Hitap', `<p>Sana nasıl seslendiği aşk değerine bağlıdır:</p>${table(['Aşk', 'Hitap'], [['≥ 70', 'aşkım, bebeğim, canım, hayatım, sevgilim'], ['30 – 69', 'adın, canım, tatlım'], ['< 30', 'adın']])}<p>Soğuk ya da resmi konuşan karakterler hep adınla seslenir.</p>`]
      ]
    },
    {
      id: 'odalar', title: 'Oda ve PK', sub: 'Sesli odaların kuralları', icon: '🎙️', color: '#8b5cf6', secret: true,
      pages: () => [
        ['🏠 Odalar nasıl açılır?', `<ul><li>Her <b>30 dakikada</b> oda listesi yenilenir.</li><li>Oda sayısı ≈ çevrimiçi kız sayısı ÷ 10 (en az 4, en çok 30).</li>
          <li>Her odada ev sahibi + <b>8 koltuk</b>. Açılışta 2–6 kişi oturur, 1–6 kişi dinler.</li><li>Ev sahibini takip eden erkekler önce gelir; bir erkek aynı anda tek odadadır.</li>
          <li>Ev sahibi çevrimdışı olunca oda kapanır.</li></ul>`],
        ['⏲️ Odanın her anı', `<p>Oda her <b>2,6 saniyede</b> bir zar atar:</p>
          ${table(['Olay', 'Olasılık'], [['Bir erkek yazar (ara sıra başka erkeğe takılır, %60 ev sahibi cevap verir)', '%38'], ['Bir erkek hediye atar', '%7 (PK\'de %20)'], ['Koltuk değişimi', '%12'], ['Biri gelir / gider', '%8'], ['Ev sahibi kendiliğinden konu açar ya da susar', 'kalan']])}
          <p>Senin yazdığına ev sahibi %80 ihtimalle cevap verir.</p>`],
        ['⚔️ PK', `<ul><li>Odaya girdikten 20–60 saniye sonra ilk PK olabilir; sonraki PK'ler 1,5–4 dakika arayla.</li>
          <li>PK <b>3 dakika</b> sürer; rakip, açık odalardan birinin ev sahibidir.</li><li>Bu odaya atılan hediyeler ev sahibine, rakip odadakilerin hediyeleri rakibe sayılır.</li>
          <li>Eşitlikte ev sahibi kazanır. Kazanınca en çok destek vereni açıklar.</li><li>PK hediyeleri gerçek sayılır: koleksiyon, destekçiler, ajans yarışı.</li></ul>`],
        ['📣 Yayın bandı', `<ul><li><b>${n(A.BROADCAST_MIN || 0)}</b> coin ve üstü hediyeler bütün uygulamada bantta kayar.</li><li><b>${n(A.BIG_FX || 0)}</b> coin ve üstü tam ekran animasyonla gelir.</li></ul>`]
      ]
    },
    {
      id: 'ekonomi', title: 'Coin Kitabı', sub: 'Ekonomi, VIP, cazibe', icon: '🪙', color: '#10b981', secret: true,
      pages: () => [
        ['🪙 Coin', `<ul><li>Başlangıç: <b>${n(A.START_COINS || 0)}</b> coin. Coin tamamen sanaldır; yükleme bir simülasyondur.</li>
          <li>Bedava sohbet kartı = 1 ücretsiz mesaj.</li><li>Hesap ekonomisi: Hesaplar kitabına bak.</li></ul>`],
        ['✨ Cazibe ve mesaj ücreti', `<p>Kızın cazibe seviyesi aldığı hediyelerin toplamıdır (senden + erkeklerden). Popüler kızla yazışmak pahalıdır:</p>
          ${table(['Cazibe', 'Toplam hediye', 'Mesaj'], (A.CHARM_LEVELS || []).map((v, i) => [`Lv.${i + 1}`, n(v), n((A.MSG_COST_BY_CHARM || [])[i] || 0) + ' coin']))}`],
        ['👑 VIP', table(['VIP', 'Toplam yükleme'], (A.VIP_LEVELS || []).slice(1).map((v, i) => [`VIP ${i + 1}`, n(v)]))
          + table(['Ayrıcalık', 'VIP', 'Açıklama'], (A.VIP_PERKS || []).map(p => [`${p.icon} ${esc(p.name)}`, p.vip, esc(p.desc)]))],
        ['🏢 Ajanslar', `<p>Kızların %${Math.round((A.AGENCY_FREE || 0) * 100)}'i bağımsızdır, diğerleri ağırlığa göre bir ajansa bağlıdır. Haftalık sıralama hediyelerden hesaplanır.</p>
          ${table(['Ajans', 'Ağırlık'], (A.AGENCIES || []).map(a => [`${a.e} ${esc(a.name)}`, a.weight]))}`],
        ['🎁 Ödüller', table(['Gün', 'Coin', 'Kart', 'Ek'], (A.CHECKIN || []).map((d, i) => [i + 1, d.coins, d.cards, d.gift ? `${d.qty}× ${esc((A.GIFTS.find(g => g.id === d.gift) || {}).name || d.gift)}` : '']))
          + table(['Günlük görev', 'Ödül'], (A.DAILY_TASKS || []).map(t => [`${t.icon} ${esc(t.name)}`, t.coins + ' coin']))],
        ['🎡 Şans çarkı', (() => { const W = A.WHEEL || [], sum = W.reduce((s, x) => s + x.w, 0); return table(['Ödül', 'Olasılık'], [...W].sort((a, b) => a.coins - b.coins).map(x => [n(x.coins) + ' coin', '%' + Math.round(x.w / sum * 100)])); })()]
      ]
    },
    {
      id: 'hesaplar', title: 'Hesaplar', sub: 'Çoklu hesap kuralları', icon: '👥', color: '#0ea5e9', secret: true,
      pages: () => [
        ['👥 Birden çok hesap', `<ul><li>Aynı cihazda istediğin kadar hesap açabilirsin; her hesabın karakterleri, sohbetleri, coinleri ve gizli kitap kilidi ayrıdır.</li>
          <li>Hesaplar giriş ekranında listelenir; PIN koyduysan açarken sorulur.</li>
          <li>Hesaplar cihazda saklanır, sunucu yoktur.</li></ul>`],
        ['💸 İkinci hesap cezası', `<p>Sistem cihazda kaç hesap açıldığını sayar (<b>silinen hesaplar da sayılır</b>, sayaç hiç azalmaz). İlk hesaptan sonrakilerde yükleme paketlerinin fiyatı artar:</p>
          ${table(['Hesap', 'Fiyat çarpanı'], (A.MULTI_ACCOUNT_MARKUP || [1]).map((m, i, all) => [`${i + 1}.${i === all.length - 1 ? ' ve sonrası' : ''}`, '× ' + m.toLocaleString('tr-TR')]))}
          <p>Bu hesap: <b>${(A.Store.accountRank() + 1)}. hesap</b> · çarpan <b>× ${A.Wallet && A.Wallet.markup ? A.Wallet.markup().toLocaleString('tr-TR') : 1}</b>. Coin miktarı ve bonus değişmez, sadece ödenen tutar artar.</p>`]
      ]
    },
    {
      id: 'gizli', title: 'Gizli Parametreler', sub: 'Görünmeyen değerler', icon: '🔒', color: '#6366f1', secret: true,
      pages: () => [
        ['🧪 Başlangıç değerleri', `<p>Her karakter için tutulur (0–100), kullanıcıya gösterilmez:</p>
          ${table(['Değer', 'Başlangıç', 'Saatlik'], [['Güven', 20, ''], ['Samimiyet', 10, ''], ['Aşk', 0, ''], ['Şehvet', 0, '−5'], ['Kıskançlık', 0, '−2'], ['Uyarılma', 0, ''], ['Süt', 30, '+5'], ['Acı', 0, '−10']])}
          <p>Senin değerlerin: <b>zevk</b> (80'de boşalırsın), <b>cum</b> (saatte +10), <b>boşalma sayısı</b> (saatte −1).</p>`],
        ['🗨️ Sözlerin etkisi', table(['Söz', 'Etki'], [['Seni seviyorum', 'aşk +3'], ['Özledim, iltifat', 'aşk +2, samimiyet +1'], ['Kabalık', 'güven −3, aşk −1'], ['"Seviyor musun?" → evet', 'aşk +3'], ['"Seviyor musun?" → hayır', 'aşk −3, güven −1']])],
        ['🌙 Döngü', `<p>28 günlük döngü gerçek günle ilerler; her karakterin başlangıç günü farklıdır.</p>
          ${table(['Gün', 'Evre', 'Gebelik çarpanı'], [['1–5', 'Regl', '× 0,15'], ['6–10', 'Erken', '× 0,7'], ['11–16', 'Riskli', '× 1,8'], ['17–28', 'Geç', '× 0,5']])}`],
        ['🤰 Hamilelik', `<ul><li>Doğurganlık karakter başına sabit: %20–90.</li><li>Korunmasız şans: <code>0,5 × doğurganlık ÷ 50 × evre çarpanı</code> (en çok %95).</li>
          <li>Hamilelik haftası = hamile kaldığından beri geçen gün + 1.</li></ul>`],
        ['🧬 Özellikler', `<ul><li>Kişilik, beden ve deneyim karakterin kimliğine göre sabittir; her açılışta aynı çıkar.</li>
          <li>Her karakter <b>6</b> olayı sever, <b>4</b> olayı sevmez; <b>2</b> korunmaya izin verir, <b>2</b>'sine vermez.</li>
          <li>Sevdiği olay öne geçer; sevmediği ya da izin vermediği olay güveni düşürür.</li></ul>`]
      ]
    }
  ];

  const unlocked = () => !!S().secretBooks;
  const visible = () => BOOKS.filter(b => !b.secret || unlocked());

  // Kitap kapağı
  const cover = b => `<a class="book" href="#/guide/${b.id}" style="--bk:${b.color}"><span class="book-spine"></span>
    <span class="book-ico">${b.icon}</span><b>${esc(b.title)}</b><small>${esc(b.sub)}</small>${b.secret ? '<em>gizli</em>' : ''}</a>`;

  function shelf() {
    const list = visible();
    $('#view').innerHTML = `
      <div class="eco guide">
        <div class="eco-head">${back('#/me')}<h1>Kitaplık</h1><span></span></div>
        <div class="shelf">${list.map(cover).join('')}</div>
        <form class="book-code" id="bookCode" autocomplete="off">
          <input maxlength="40" placeholder="🔑" aria-label="Kod"><button type="submit">↵</button>
        </form>
      </div>`;
    $('#bookCode').onsubmit = e => {
      e.preventDefault();
      const inp = e.target.querySelector('input');
      const v = fold(inp.value).replace(/[^a-z0-9]/g, '');
      inp.value = '';
      if (v && btoa(v) === CODE) {
        S().secretBooks = !unlocked(); // aynı kod tekrar yazılınca kitaplar yine gizlenir
        A.Store.save();
        shelf();
      } else e.target.classList.add('shake'), setTimeout(() => e.target.classList.remove('shake'), 500);
    };
  }

  function read(b) {
    const pages = b.pages();
    let i = 0;
    $('#view').innerHTML = `
      <div class="eco guide">
        <div class="eco-head">${back('#/guide')}<h1>${b.icon} ${esc(b.title)}</h1><span></span></div>
        <div class="book-open" style="--bk:${b.color}"><div class="book-page" id="bkPage"></div></div>
        <div class="book-nav"><button id="bkPrev" aria-label="Önceki">‹</button><span id="bkNo"></span><button id="bkNext" aria-label="Sonraki">›</button></div>
        <div class="book-toc" id="bkToc"></div>
      </div>`;
    const draw = () => {
      const [t, html] = pages[i];
      $('#bkPage').innerHTML = `<h2>${t}</h2>${html}`;
      $('#bkNo').textContent = `${i + 1} / ${pages.length}`;
      $('#bkPrev').disabled = i === 0;
      $('#bkNext').disabled = i === pages.length - 1;
      $('#bkToc').innerHTML = pages.map(([pt], k) => `<button data-p="${k}" class="${k === i ? 'on' : ''}">${pt}</button>`).join('');
    };
    const go = d => { const k = Math.max(0, Math.min(pages.length - 1, i + d)); if (k !== i) { i = k; draw(); window.scrollTo(0, 0); } };
    $('#bkPrev').onclick = () => go(-1);
    $('#bkNext').onclick = () => go(1);
    $('#bkToc').onclick = e => { const p = e.target.closest('[data-p]'); if (p) { i = +p.dataset.p; draw(); window.scrollTo(0, 0); } };
    // kaydırarak sayfa çevir
    let x0 = null;
    const pg = $('.book-open');
    pg.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    pg.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
    const key = e => {
      if (!document.body.contains(pg)) return document.removeEventListener('keydown', key);
      if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', key);
    draw();
  }

  A.Pages.guide = (rt) => {
    const b = rt && rt.id && visible().find(x => x.id === rt.id);
    if (rt && rt.id && !b) { location.hash = '#/guide'; return; }
    return b ? read(b) : shelf();
  };
  A.Guide = { BOOKS };
})();
