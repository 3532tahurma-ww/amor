/*
 * Amor - Arka plan sohbetleri (deneysel simülasyon)
 * -------------------------------------------------
 * Kadın karakterler, uygulamada görünmeyen erkek karakterlerle (js/data/males.js) kendi aralarında mesajlaşır.
 * app.js tick() her turda Background.tick() çağırır. İzlemek için: bot-editoru.bat -> Diyalog -> "Arka plan"
 * (tools/background.html; aynı adreste açılan uygulamanın verisini okur).
 *
 * Sohbet oturumlar halinde ilerler: erkek yazar, kadın cevap verir; turlar birkaç dakika arayla gelir.
 * 4-9 turdan sonra erkek vedalaşır, sohbet saatler sonra yeniden açılır. Kadın sadece çevrimiçiyken yazar.
 * Isındıkça kadın hediye / arama ister (hediye niyetine göre, js/wish.js), erkek cömertliğine göre karşılar.
 * Hediyeler kadının koleksiyonuna eklenir (bg.coll), erkeğin harcadığı coinler sayılır (sohbet başına th.spent). Hepsi sanal.
 * Isınan sohbette erkek boş bir yakınlık (CP, Kanka...) kurabilir (bg.rels; kullanıcı profilden 2 katına alabilir).
 * Arka planda yazıştığı biri varken kullanıcıya geç döner (delay). Kullanıcıyla olan yakınlık, hafıza ve
 * ruh hali etkilenmez (Engine.quickReply durumsuzdur).
 */
window.Amor = window.Amor || {};

Amor.Background = (() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const int = (a, b) => Math.floor(rnd(a, b + 1));
  const MIN = 60000, H = 3600000;
  const MALE_COUNT = 500, MAX_THREADS = 50, PER_FEMALE = 3, MAX_MSGS = 80, MAX_EVENTS = 400, CLOSE_AT = 20;
  const CALL_COST = { voice: 400, video: 800 }; // call.js ile aynı (dakika başı)
  const BUSY_WINDOW = 6 * MIN; // son turdan bu kadar süre "yazışıyor" sayılır

  /* Test hızlandırma (tools/background.html yazar): 'amor:bgSpeed' = 1 | 10 | 60 | 300 — turlar arası süreler bu kadar kısalır,
   * uygulama açıkken 2 sn'de bir tur denenir. 'amor:bgKick' değişince bütün sohbetler hemen bir tur ilerler. */
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const speed = () => Math.max(1, Number(lsGet('amor:bgSpeed')) || 1);

  // İsteği karşılama olasılığı: çoğu erkek ister istemez alır; cömertlik arttırır, çok pahalı hediyede biraz düşer
  const yesChance = (m, g) => Math.min(0.97, (0.6 + m.generous * 0.38) / (1 + g.price / 30000));
  // Coin -> TL (en küçük yükleme paketinin kuru, sadece gösterim)
  const TL_PER_COIN = A.RECHARGE_PACKS ? A.RECHARGE_PACKS[0].price / A.RECHARGE_PACKS[0].coins : 0.05;
  const money = coins => `${coins.toLocaleString('tr-TR')} coin (≈${(coins * TL_PER_COIN).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺)`;
  // Sohbette harcanan: bu erkek bu kadına toplam ne harcadı
  function spend(th, m, coins) {
    m.spent += coins;
    th.spent = (th.spent || 0) + coins;
  }
  // Erkeğin kendiliğinden seçtiği hediye: cömertliğine göre
  function maleGift(m) {
    const max = 100 + m.generous ** 2 * 3000;
    const pool = A.GIFTS.filter(g => g.tab === 'hediye' && !g.vip && g.price <= max && g.price >= max * 0.1);
    return pick(pool.length ? pool : A.GIFTS.filter(g => g.tab === 'hediye' && g.price <= 150));
  }

  function st() {
    const s = S();
    if (!s.bg) s.bg = { males: [], threads: {} };
    const bg = s.bg;
    bg.coll = bg.coll || {};
    bg.events = bg.events || [];
    bg.rels = bg.rels || {};
    bg.support = bg.support || {};   // kadın id -> { erkek id: hediyelere harcadığı coin } (en çok destekleyenler)
    bg.comments = bg.comments || {}; // gönderi anahtarı ("kadınId:sıra") -> [{ m, text, ts }] (js/feed.js)
    bg.likes = bg.likes || {};       // gönderi anahtarı -> [beğenen erkek id]
    Object.keys(bg.likes).forEach(k => { if (!Array.isArray(bg.likes[k])) bg.likes[k] = []; }); // eski sayaç kayıtları
    bg.follows = bg.follows || {};   // kadın id -> [onu takip eden erkek id]
    bg.followsBack = bg.followsBack || {}; // kadın id -> [onun takip ettiği erkek id]
    if (!bg.supportInit) { // eski kayıtlar: destekçileri olaylardan bir kez çıkar
      bg.events.filter(e => (e.type === 'gift' || e.type === 'rel') && e.coins).forEach(e => {
        const sup = (bg.support[e.f] = bg.support[e.f] || {});
        sup[e.m] = (sup[e.m] || 0) + e.coins;
      });
      bg.supportInit = true;
    }
    // MALE_COUNT'a tamamla (eski kayıtlar da); aynı isim varsa soyadı harfi eklenir ("Emre K.")
    if (bg.males.length < MALE_COUNT) {
      const used = new Set(bg.males.map(m => m.name));
      const INITIALS = 'ABCÇDEFGHIİKLMNOÖPRSŞTUÜVYZ';
      const names = [];
      while (names.length < MALE_COUNT - bg.males.length) {
        const first = pick(A.MALE_NAMES);
        let n = first;
        while (used.has(n)) n = `${first} ${pick([...INITIALS])}.`;
        used.add(n);
        names.push(n);
      }
      const fresh = names.map(makeMale);
      fresh.forEach(m => { m.hist = false; }); // geçmişi henüz üretilmedi (warmup)
      bg.males.push(...fresh);
      // sonradan gelenler de birkaç kızı takip ederek başlar (ilk takipler aşağıda, followInit)
      if (bg.followInit && A.CHARACTERS) fresh.forEach(m => [...A.CHARACTERS].sort(() => Math.random() - 0.5).slice(0, int(3, 12)).forEach(c => follow(c.id, m.id)));
    }
    bg.males.forEach(m => { if (m.generous == null) Object.assign(m, { generous: Math.round(Math.random() * 100) / 100, spent: 0, gifts: 0, callMin: 0 }); });
    // Erkekler uygulamaya gelmeden önce de birkaç kızı takip ediyordu (bir kez; gerçek takip ilişkisi olarak kaydedilir)
    if (!bg.followInit && A.CHARACTERS && A.CHARACTERS.length) {
      bg.males.forEach(m => [...A.CHARACTERS].sort(() => Math.random() - 0.5).slice(0, int(3, 12)).forEach(c => follow(c.id, m.id)));
      // süren sohbetler: erkek takip ediyor, ısınmışsa kız da geri takip ediyor
      Object.values(bg.threads).forEach(t => { follow(t.f, t.m); if (t.warm >= FOLLOW_BACK_AT) followBack(t.f, t.m); });
      bg.followInit = true;
    }
    return bg;
  }

  function makeMale(name) {
    const city = pick(A.CITIES);
    return { id: 'm' + Math.random().toString(36).slice(2, 9), name, age: int(20, 40), job: pick(A.MALE_JOBS),
      city: city.name, at: city.at, like: pick(A.MALE_LIKES), bold: Math.round(Math.random() * 100) / 100,
      generous: Math.round(Math.random() * 100) / 100, spent: 0, gifts: 0, callMin: 0 };
  }

  const maleById = id => st().males.find(m => m.id === id);

  /* ---------- Takip ilişkileri ----------
   * Erkek kızı takip eder: sohbet açınca, gönderisini beğenince (bazen), ya da uygulamadan önceki ilk takipler.
   * Kız erkeği geri takip eder: sohbet ısınınca (FOLLOW_BACK_AT). Profildeki sayılar bunlardan sayılır (social). */
  const FOLLOW_BACK_AT = 10;
  const addTo = (map, k, id) => { const a = (map[k] = map[k] || []); if (!a.includes(id)) a.push(id); };
  const follow = (fId, mId) => addTo(S().bg.follows, fId, mId);
  const followBack = (fId, mId) => addTo(S().bg.followsBack, fId, mId);
  // Kadının gerçek sayıları (kullanıcının takibi ve "beni takip ediyor" durumu app.js'te eklenir)
  function social(fId) {
    const bg = st();
    const count = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
    return {
      followers: (bg.follows[fId] || []).length,
      following: (bg.followsBack[fId] || []).length,
      gifts: count((S().giftsReceived || {})[fId]) + count(bg.coll[fId])
    };
  }
  const fillMale = (s, m, c) => s.replace(/\{her\}/g, c.name).replace(/\{job\}/g, m.job).replace(/\{at\}/g, m.at).replace(/\{like\}/g, m.like);
  const lc = s => s.toLocaleLowerCase('tr');

  // Aynı sohbette aynı konuyu ikinci kez sormaz (hepsi sorulduysa baştan)
  function topic(th) {
    th.asked = th.asked || [];
    let free = A.MALE_LINES.topic.filter(t => !th.asked.includes(t));
    if (!free.length) { th.asked = []; free = A.MALE_LINES.topic; }
    const t = pick(free);
    th.asked.push(t);
    return t;
  }

  // Erkeğin bu turdaki mesajı (bir ya da iki balon)
  function maleSays(th, m, c) {
    const L = A.MALE_LINES;
    const lastF = [...th.msgs].reverse().find(x => x.from === 'f');
    let out;
    if (th.turn === 0) out = [pick(th.session === 0 ? L.open : L.again)];
    else if (th.turn >= th.len) out = [pick(L.bye)];
    else if (th.turn === 1 && th.session === 0) out = [pick(L.how)];
    else if (lastF && lastF.text.includes('?') && Math.random() < 0.75) {
      out = [pick(L.self)];
      if (Math.random() < 0.5) out.push(topic(th));
    } else {
      const r = Math.random();
      if (th.warm >= 15 && r < 0.06 + m.bold * 0.06) out = [pick(L.meet)];
      else if (th.warm >= 8 && r < 0.18 + m.bold * 0.1) out = [pick(L.flirt)];
      else if (th.warm >= 3 && r < 0.32) out = [pick(L.compliment)];
      else if (r < 0.5) out = [pick(L.react), topic(th)];
      else out = [topic(th)];
    }
    return out.map(s => fillMale(s, m, c));
  }

  function push(th, from, text, ts) {
    th.msgs.push({ from, text, ts });
    if (th.msgs.length > MAX_MSGS) th.msgs.splice(0, th.msgs.length - MAX_MSGS);
  }

  function event(e) {
    const bg = st();
    bg.events.unshift({ ts: Date.now(), ...e });
    if (bg.events.length > MAX_EVENTS) bg.events.length = MAX_EVENTS;
  }

  // Kadının tepkisi (hediye için kişiliğinin hediye cümleleri)
  function herGiftLine(c, g, m) {
    const tier = g.price < 300 ? 'small' : g.price < 3000 ? 'mid' : 'big';
    const pool = (c.giftLines && c.giftLines[tier]) || ['teşekkürler {gift}'];
    return pick(pool).split('|')[0].replace(/\{gift\}/g, lc(g.name)).replace(/\{name\}/g, m.name).replace(/\{[a-z_]+\}/g, '').trim();
  }

  /* ---------- Haftalık hediye sayacı (ajans ve yayıncı sıralaması, js/agency.js) ----------
   * Hafta pazartesi başlar. Hafta değişince eski hafta lastWeek olarak saklanır (geçen haftanın kazananları). */
  function weekKey(t = Date.now()) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  function week() {
    const bg = st(), k = weekKey();
    if (!bg.week || bg.week.key !== k) {
      const firstTime = !bg.week;
      if (bg.week && Object.keys(bg.week.girls).length) bg.lastWeek = bg.week;
      bg.week = { key: k, girls: {} };
      // ilk kez: bu haftanın kayıtlı hediye / yakınlık olaylarından doldur
      if (firstTime) bg.events.filter(e => e.coins && (e.type === 'gift' || e.type === 'rel') && weekKey(e.ts) === k)
        .forEach(e => { bg.week.girls[e.f] = (bg.week.girls[e.f] || 0) + e.coins; });
    }
    return bg.week;
  }
  // Kıza gelen hediye değeri bu haftaya yazılır (geçmiş tarihliyse ve bu haftadan değilse sayılmaz)
  function credit(fId, coins, ts = Date.now()) {
    if (weekKey(ts) !== weekKey()) return;
    const w = week();
    w.girls[fId] = (w.girls[fId] || 0) + coins;
  }

  // Hediye kaydı (sohbet / oda): koleksiyon, destekçi listesi, sayaçlar, olay, büyük hediyede yayın
  function recordGift(c, m, g, extra = {}) {
    const bg = st();
    credit(c.id, g.price);
    const coll = (bg.coll[c.id] = bg.coll[c.id] || {});
    coll[g.id] = (coll[g.id] || 0) + 1;
    const sup = (bg.support[c.id] = bg.support[c.id] || {});
    sup[m.id] = (sup[m.id] || 0) + g.price;
    m.gifts++;
    event({ type: 'gift', f: c.id, m: m.id, gift: g.id, coins: g.price, ...extra });
    announce(m.name, c, g);
  }
  // Büyük hediye: js/broadcast.js bantta gösterir (BROADCAST_MIN ve üstü)
  function announce(from, c, g, qty = 1) {
    if (g.price * qty < (A.BROADCAST_MIN || 1000)) return;
    window.dispatchEvent(new CustomEvent('amor:gift', { detail: { from, to: c.name, toId: c.id, gift: g, qty } }));
  }

  function giveGift(th, c, m, g, ts, asked) {
    spend(th, m, g.price);
    push(th, 'sys', `🎁 ${m.name} → ${c.name}: ${g.e} ${g.name} · ${money(g.price)} · bu sohbette toplam ${money(th.spent)}`, ts);
    th.warm += 2 + Math.round(A.Wish.want(c) * 3);
    recordGift(c, m, g, { asked: !!asked });
    push(th, 'f', herGiftLine(c, g, m), ts + 12000);
  }

  // Sesli odada erkeğin hediyesi (js/rooms.js)
  function roomGift(c, m, g) {
    m.spent += g.price;
    recordGift(c, m, g, { where: 'room' });
    A.Store.save();
  }

  /* ---------- Cazibe ve destekçiler ----------
   * Cazibe puanı = aldığı hediyelerin toplam değeri (senden + erkeklerden). Seviye eşikleri Amor.CHARM_LEVELS. */
  const giftValue = o => Object.entries(o || {}).reduce((a, [id, n]) => a + ((A.GIFTS.find(g => g.id === id) || {}).price || 0) * n, 0);
  function charm(fId) {
    const points = giftValue((S().giftsReceived || {})[fId]) + giftValue(st().coll[fId]);
    const L = A.CHARM_LEVELS;
    let lv = 1;
    L.forEach((t, i) => { if (points >= t) lv = i + 1; });
    const next = L[lv] ?? null;
    return { points, lv, next, pct: next ? Math.round((points - L[lv - 1]) / (next - L[lv - 1]) * 100) : 100 };
  }
  // En çok destekleyenler: erkekler + sen (hediyelere harcanan coin), çoktan aza
  function supporters(fId) {
    const list = Object.entries(st().support[fId] || {}).map(([mId, coins]) => ({ male: maleById(mId), coins })).filter(x => x.male);
    const mine = giftValue((S().giftsReceived || {})[fId]);
    if (mine) list.push({ user: true, coins: mine });
    return list.sort((a, b) => b.coins - a.coins);
  }

  function doCall(th, c, m, ts, asked) {
    const kind = th.warm >= 20 && Math.random() < 0.35 ? 'video' : 'voice';
    const minutes = int(2, 6 + Math.min(30, th.warm));
    const coins = minutes * CALL_COST[kind];
    spend(th, m, coins);
    m.callMin += minutes;
    th.warm += 2;
    push(th, 'sys', `${kind === 'video' ? '📹 Görüntülü' : '📞 Sesli'} arama · ${minutes} dk · ${money(coins)} (${m.name} ödedi) · bu sohbette toplam ${money(th.spent)}`, ts);
    event({ type: 'call', f: c.id, m: m.id, kind, minutes, coins, asked: !!asked });
    // Aramada hediye isteyebilir
    if (Math.random() < A.Wish.want(c) * 0.35) {
      const g = A.Wish.pickGift(c);
      event({ type: 'ask', f: c.id, m: m.id, gift: g.id, where: 'call' });
      if (Math.random() < yesChance(m, g) + 0.1) giveGift(th, c, m, g, ts + 2000, true);
      else event({ type: 'refuse', f: c.id, m: m.id, what: 'gift', gift: g.id });
    }
  }

  /* ---------- Yakınlıklar (CP, Kanka, Eşlik, Koruyucu) ----------
   * Bir kadının her yakınlık türünde tek sahibi olur: kullanıcı (Store.state.relations) ya da bir erkek (bg.rels).
   * Erkek, sohbet REL_WARM kadar ısınınca boş bir yakınlığı o türün en ucuz dostluk hediyesiyle kurar. */
  const REL_WARM = { kanka: 12, eslik: 14, koruyucu: 18, cp: 25 };
  const relGift = type => A.GIFTS.filter(g => g.rel === type).sort((a, b) => a.price - b.price)[0];
  function relHolder(fId, type) {
    if ((S().relations || {})[fId] === type) return { user: true };
    const m = maleById((st().rels[fId] || {})[type]);
    return m ? { male: m } : null;
  }
  // Kullanıcı bir erkeğin yakınlığını alınca erkek onu kaybeder
  function takeRel(fId, type) {
    const r = st().rels[fId];
    if (!r || !r[type]) return;
    event({ type: 'rellost', f: fId, m: r[type], rel: type });
    delete r[type];
  }
  function maleRel(th, c, m, ts) {
    const bg = st();
    const mine = (bg.rels[c.id] = bg.rels[c.id] || {});
    if (Object.values(mine).includes(m.id)) return false; // bir erkek bir kadınla tek yakınlık kurar
    const free = Object.keys(A.RELATIONS).filter(t => th.warm >= REL_WARM[t] && !relHolder(c.id, t));
    if (!free.length) return false;
    const type = pick(free), g = relGift(type);
    mine[type] = m.id;
    spend(th, m, g.price);
    const coll = (bg.coll[c.id] = bg.coll[c.id] || {});
    coll[g.id] = (coll[g.id] || 0) + 1;
    const sup = (bg.support[c.id] = bg.support[c.id] || {});
    sup[m.id] = (sup[m.id] || 0) + g.price;
    credit(c.id, g.price);
    announce(m.name, c, g);
    push(th, 'sys', `💞 ${m.name} ile ${c.name} artık ${A.RELATIONS[type].tag} · ${g.e} ${g.name} · ${money(g.price)} · bu sohbette toplam ${money(th.spent)}`, ts);
    push(th, 'f', A.RELATIONS[type].line, ts + 10000);
    event({ type: 'rel', f: c.id, m: m.id, rel: type, gift: g.id, coins: g.price });
    return true;
  }

  /* Bir tur: erkek yazar, kadın cevap verir; ardından hediye / arama istekleri. force: zamanı / çevrimiçi olmayı beklemeden */
  function step(th, force) {
    const c = A.byId(th.f), m = maleById(th.m);
    if (!c || !m) { delete st().threads[th.id]; return false; }
    const now = Date.now();
    const sp = speed();
    if (!force && !A.Mood.isOnline(c)) { th.next = now + rnd(10, 40) * MIN / sp; return false; }
    const want = A.Wish.want(c);

    // Bekleyen istek: erkek karşılar ya da geçiştirir
    if (th.ask) {
      const g = A.GIFTS.find(x => x.id === th.ask.gift);
      if (th.ask.type === 'gift' && g && Math.random() < yesChance(m, g)) {
        push(th, 'm', pick(A.MALE_LINES.giftYes), now);
        giveGift(th, c, m, g, now + 3000, true);
        th.ask = null;
      } else if (th.ask.type === 'call' && Math.random() < 0.55 + m.bold * 0.4) {
        push(th, 'm', pick(A.MALE_LINES.callYes), now);
        doCall(th, c, m, now + 3000, true);
        th.ask = null;
      } else if (++th.ask.tries >= 3) {
        push(th, 'm', pick(th.ask.type === 'gift' ? A.MALE_LINES.giftNo : A.MALE_LINES.callNo), now);
        push(th, 'f', pick(A.SHARED.wish_forgot).replace(/\{laugh\}/g, ''), now + 15000);
        th.warm = Math.max(0, th.warm - Math.round(1 + want * 4)); // niyeti yüksekse daha çok soğur
        event({ type: 'refuse', f: c.id, m: m.id, what: th.ask.type, gift: th.ask.gift });
        th.ask = null;
      }
    }

    const said = maleSays(th, m, c);
    said.forEach(t => push(th, 'm', t, now));
    const r = A.Engine.quickReply(c, said.join(' '), { name: m.name, close: th.warm >= CLOSE_AT });
    r.parts.forEach((p, i) => push(th, 'f', p, now + 15000 + i * 4000));
    th.warm++;
    if (th.warm >= FOLLOW_BACK_AT) followBack(c.id, m.id); // ısınan sohbette geri takip

    // Kendiliğinden: erkek hediye atar / arar
    if (!th.ask && th.warm >= 5 && Math.random() < 0.03 + m.generous * 0.08) giveGift(th, c, m, maleGift(m), now + 25000, false);
    else if (!th.ask && th.warm >= 10 && Math.random() < m.bold * 0.05) doCall(th, c, m, now + 25000, false);
    else if (!th.ask && th.warm >= 12 && Math.random() < 0.03 + m.generous * 0.05 && maleRel(th, c, m, now + 25000)) { /* yakınlık kurdu */ }
    // Kadın ister (hediye niyetine göre)
    else if (!th.ask && th.warm >= 4 && th.turn < th.len && Math.random() < want * 0.16) {
      const g = A.Wish.pickGift(c);
      th.ask = { type: 'gift', gift: g.id, tries: 0 };
      push(th, 'f', pick(A.SHARED.wish_ask).replace(/\{gift\}/g, lc(g.name)).replace(/\{laugh\}/g, ''), now + 26000);
      event({ type: 'ask', f: c.id, m: m.id, gift: g.id, where: 'chat' });
    } else if (!th.ask && th.warm >= 8 && th.turn < th.len && Math.random() < want * 0.08) {
      th.ask = { type: 'call', tries: 0 };
      push(th, 'f', pick(A.MALE_LINES.herCallAsk), now + 26000);
      event({ type: 'ask', f: c.id, m: m.id, what: 'call', where: 'chat' });
    }

    th.last = now;
    if (th.turn >= th.len) {
      th.session++;
      th.turn = 0;
      th.len = int(4, 9);
      th.next = now + rnd(2, 10) * H / sp;
    } else {
      th.turn++;
      th.next = now + rnd(1, 6) * MIN / sp;
    }
    return true;
  }

  /* ---------- Geçmiş ----------
   * Uygulama yeni kurulmuş gibi görünmesin: herkes WARM_DAYS gündür buradaymış gibi gerçek kayıtlar üretilir:
   * takipler, hediyeler, aramalar, yakınlıklar, eski gönderiler, beğeni ve yorumlar. Hiçbiri uydurma sayı değil;
   * profil sayıları, cazibe ve destekçiler bu kayıtlardan hesaplanır. Kızın katılma tarihinden öncesine bir şey yazılmaz.
   * İlk çalışmada popülerlik log-normal (birkaç kız çok, çoğu az ilgi görür). Sonradan katılan erkekler (m.hist === false)
   * de geçmişlerini alır; onlar kimi takip edeceğini mevcut takipçi sayısına göre seçer (popüler olan daha popülerleşir). */
  const WARM_DAYS = 90, WARM_VERSION = 1, DAY = 86400000;
  const REL_SUPPORT = { kanka: 800, eslik: 1200, koruyucu: 2000, cp: 4000 }; // yakınlık kurmak için o kıza toplam hediye (coin)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

  function warmup() {
    const bg = st();
    if (!A.CHARACTERS || !A.CHARACTERS.length || !A.Gen) return false;
    const first = (bg.warmed || 0) < WARM_VERSION;
    const newcomers = bg.males.filter(m => first || m.hist === false);
    if (!newcomers.length) return false;
    const now = Date.now();
    const start = c => Math.max(now - WARM_DAYS * DAY, Date.parse(c.joined) || now - WARM_DAYS * DAY);
    const when = c => start(c) + Math.random() * (now - DAY / 2 - start(c));

    // 1. Eski gönderiler (sadece ilk çalışmada; katıldığından beri, eskiden yeniye); sonra bir kez yüklenir
    if (first) {
      A.CHARACTERS.forEach(c => {
        const life = (now - start(c)) / (WARM_DAYS * DAY);
        const n = Math.round(int(1, 6) * life);
        Array.from({ length: n }, () => when(c)).sort((a, b) => a - b).forEach(ts => A.Gen.addPost(c.id, ts));
      });
      A.Gen.load();
    }
    const C = A.CHARACTERS;
    const pop = new Map(C.map(c => [c.id, first
      ? Math.exp(gauss() * 0.9) * (0.3 + 0.7 * (now - start(c)) / (WARM_DAYS * DAY))
      : 1 + (bg.follows[c.id] || []).length]));
    const weighted = list => {
      let r = Math.random() * list.reduce((a, c) => a + pop.get(c.id), 0);
      for (const c of list) { r -= pop.get(c.id); if (r <= 0) return c; }
      return list[list.length - 1];
    };
    const evs = [];
    const giftValue = (c, m, g, ts, extra = {}) => {
      (bg.coll[c.id] = bg.coll[c.id] || {})[g.id] = (bg.coll[c.id][g.id] || 0) + 1;
      const sup = (bg.support[c.id] = bg.support[c.id] || {});
      sup[m.id] = (sup[m.id] || 0) + g.price;
      m.spent += g.price;
      credit(c.id, g.price, ts);
      evs.push({ ts, type: 'gift', f: c.id, m: m.id, gift: g.id, coins: g.price, ...extra });
    };

    const touched = new Set(), fresh = new Set(newcomers.map(m => m.id));
    newcomers.forEach(m => {
      m.hist = true;
      // 2. Takipler: popüler kızlar daha çok takip edilir
      const followed = new Set();
      const k = int(15, 60);
      for (let i = 0; i < k * 3 && followed.size < k; i++) followed.add(weighted(C));
      followed.forEach(c => { follow(c.id, m.id); touched.add(c.id); });
      const mine = [...followed];
      if (!mine.length) return;
      // 3. Hediyeler: cömertliğe göre, takip ettiği kızlara
      const gifts = Math.round(m.generous ** 1.5 * int(4, 70));
      for (let i = 0; i < gifts; i++) {
        const c = weighted(mine);
        const g = maleGift(m);
        giftValue(c, m, g, when(c));
        m.gifts++;
      }
      // 4. Aramalar: cesarete göre
      const calls = Math.round(m.bold * int(0, 14));
      for (let i = 0; i < calls; i++) {
        const c = weighted(mine);
        const kind = Math.random() < 0.3 ? 'video' : 'voice';
        const minutes = int(2, 25);
        const coins = minutes * CALL_COST[kind];
        m.spent += coins;
        m.callMin += minutes;
        evs.push({ ts: when(c), type: 'call', f: c.id, m: m.id, kind, minutes, coins });
      }
    });

    // 5-7 sadece yeni gelenlerin dokunduğu kızlar için (ilk çalışmada hepsi); geri takip ve beğeni sadece yeni gelenlerden
    C.filter(c => first || touched.has(c.id)).forEach(c => {
      const sup = Object.entries(bg.support[c.id] || {}).sort((a, b) => b[1] - a[1]);
      // 5. Geri takip: hediye atanların bir kısmı + takipçilerden birkaçı
      sup.forEach(([mId]) => { if (fresh.has(mId) && Math.random() < 0.55) followBack(c.id, mId); });
      (bg.follows[c.id] || []).forEach(mId => { if (fresh.has(mId) && Math.random() < 0.08) followBack(c.id, mId); });
      // 6. Yakınlıklar: en çok destekleyenler, yeterince harcadıysa (bir erkek bir kızla tek yakınlık)
      const rels = (bg.rels[c.id] = bg.rels[c.id] || {});
      const holders = new Set(Object.values(rels));
      Object.keys(A.RELATIONS).sort(() => Math.random() - 0.5).forEach(type => {
        if (relHolder(c.id, type)) return;
        const cand = sup.find(([mId, coins]) => !holders.has(mId) && coins >= REL_SUPPORT[type]);
        if (!cand || Math.random() > 0.6) return;
        const m = maleById(cand[0]), g = relGift(type);
        rels[type] = m.id;
        holders.add(m.id);
        giftValue(c, m, g, when(c), { type: 'rel', rel: type });
      });
      // 7. Gönderilere beğeni ve yorum: çoğunlukla takipçilerinden
      const fans = (bg.follows[c.id] || []).filter(id => fresh.has(id));
      (c.posts || []).forEach((p, i) => {
        const key = `${c.id}:${i}`, t = p.ts || Date.parse(p.date) || now;
        const likers = fans.filter(() => Math.random() < 0.15 + Math.random() * 0.35);
        if (first && Math.random() < 0.5) likers.push(pick(bg.males).id);
        likers.forEach(id => addTo(bg.likes, key, id));
        const cm = Math.min(likers.length, Math.random() < 0.6 ? int(0, 3) : 0);
        for (let j = 0; j < cm; j++) {
          const mm = maleById(pick(likers));
          if (mm) (bg.comments[key] = bg.comments[key] || []).push({ m: mm.id, text: fillMale(pick(A.MALE_LINES.comment), mm, c), ts: t + Math.random() * DAY });
        }
      });
    });

    bg.events = [...bg.events, ...evs].sort((a, b) => b.ts - a.ts).slice(0, MAX_EVENTS);
    bg.warmed = WARM_VERSION;
    A.Store.save();
    return true;
  }

  // Yeni sohbet: çevrimiçi bir kadın + henüz konuşmadığı bir erkek
  function start(force) {
    const bg = st();
    const count = id => Object.values(bg.threads).filter(t => t.f === id).length;
    const fs = (A.CHARACTERS || []).filter(c => count(c.id) < PER_FEMALE && (force || A.Mood.isOnline(c)));
    if (!fs.length) return null;
    const c = pick(fs);
    const talked = new Set(Object.values(bg.threads).filter(t => t.f === c.id).map(t => t.m));
    const ms = bg.males.filter(m => !talked.has(m.id));
    if (!ms.length) return null;
    const m = pick(ms);
    const th = { id: 't' + Math.random().toString(36).slice(2, 9), f: c.id, m: m.id, msgs: [], turn: 0, session: 0,
      len: int(4, 9), warm: 0, next: Date.now(), last: Date.now(), ask: null };
    bg.threads[th.id] = th;
    follow(c.id, m.id); // yazmadan önce takip eder
    step(th, force);
    return th;
  }

  // every: çağrılma aralığı (ms); yeni sohbet olasılığı 25 sn'de 0.2 olacak şekilde ölçeklenir (× hız)
  function tick(every = 25000) {
    if (!A.CHARACTERS || !A.CHARACTERS.length) return;
    warmup(); // ilk kez: geçmişi üret (sonra hiçbir şey yapmaz)
    const bg = st();
    const now = Date.now();
    Object.values(bg.threads).forEach(th => { if (th.next <= now) step(th); });
    if (Object.keys(bg.threads).length < MAX_THREADS && Math.random() < Math.min(1, 0.2 * speed() * every / 25000)) start();
    if (Math.random() < Math.min(1, 0.35 * speed() * every / 25000)) feedActivity();
    A.Store.save();
  }

  // Akış (js/feed.js): erkekler kızların gönderilerini beğenir, arada yorum yazar
  function feedActivity() {
    const bg = st();
    const withPosts = (A.CHARACTERS || []).filter(c => c.posts && c.posts.length);
    if (!withPosts.length) return;
    const c = pick(withPosts), i = Math.floor(Math.random() * c.posts.length), key = `${c.id}:${i}`;
    // Beğeniler gerçek kişiler: daha çok onu takip eden erkekler beğenir; beğenen bazen takip etmeye başlar
    const fans = (bg.follows[c.id] || []).filter(id => maleById(id));
    const liker = maleById(fans.length && Math.random() < 0.75 ? pick(fans) : pick(bg.males).id);
    if (!liker) return;
    addTo(bg.likes, key, liker.id);
    if (Math.random() < 0.3) follow(c.id, liker.id);
    if (Math.random() < 0.45) {
      const m = liker;
      const list = (bg.comments[key] = bg.comments[key] || []);
      list.push({ m: m.id, text: fillMale(pick(A.MALE_LINES.comment), m, c), ts: Date.now() });
      if (list.length > 30) list.splice(0, list.length - 30);
    }
  }

  // Hızlandırma ve "bir tur" düğmesi için hızlı döngü (uygulama açık ve hesap girişliyken)
  let lastKick = lsGet('amor:bgKick');
  setInterval(() => {
    if (!A.Store.account || !A.Store.account() || !A.CHARACTERS || !A.CHARACTERS.length) return;
    const kick = lsGet('amor:bgKick');
    if (kick && kick !== lastKick) {
      lastKick = kick;
      Object.values(st().threads).forEach(th => step(th, true));
      for (let i = 0; i < 3; i++) start(true);
      A.Store.save();
    } else if (speed() > 1) tick(2000);
  }, 2000);

  /* Kullanıcıya dönmeden önceki ek bekleme (ms): son BUSY_WINDOW içinde bir erkekle süren oturumda yazıştıysa.
   * Sohbet ne kadar ısınmışsa o kadar oyalanır. */
  function delay(c) {
    const now = Date.now();
    const th = Object.values(st().threads).filter(t => t.f === c.id && t.turn > 0 && now - t.last < BUSY_WINDOW)
      .sort((a, b) => b.warm - a.warm)[0];
    if (!th) return 0;
    return Math.round((20 + Math.random() * 40 + Math.min(60, th.warm * 2)) * 1000);
  }

  // Kadının diğerlerinden (erkeklerden) aldığı hediyeler: { giftId: adet }
  const collection = id => (st().coll[id] || {});

  return { st, tick, step, start, delay, collection, relHolder, takeRel, relGift, money, charm, supporters, roomGift, announce, maleById, maleGift, social, warmup, credit, week, weekKey };
})();
