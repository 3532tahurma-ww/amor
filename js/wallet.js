/*
 * Amor - Cüzdan ve ekonomi (sadece sanal coin)
 * ---------------------------------------------
 * Coin bakiyesi, yükleme simülasyonu, VIP, günlük giriş, görevler, başarımlar,
 * çanta (hediye envanteri), çerçeve/arka plan eşyaları, ziyaretçiler ve hediye gönderme.
 */
window.Amor = window.Amor || {};

Amor.Wallet = (() => {
  const S = () => Amor.Store.state;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const DAY = 86400000;

  function today(offset = 0) {
    const d = new Date(Date.now() + offset * DAY);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const monthKey = () => today().slice(0, 7);

  /* ---------- Durum (eksik alanları tamamla, gün/ay değişince sıfırla) ---------- */
  function st() {
    const s = S();
    if (!s.wallet) s.wallet = { coins: Amor.START_COINS, earned: 0, spent: 0, recharged: 0, history: [] };
    if (s.wallet.purse == null) s.wallet.purse = 0; // simülasyon cüzdanı, kuruş
    // cüzdandan paketlere harcanan toplam (kuruş); eski kayıtlarda yüklenen coinden en küçük paketin kuruyla tahmin edilir
    if (s.wallet.purseSpent == null) s.wallet.purseSpent = Math.round(s.wallet.recharged * Amor.RECHARGE_PACKS[0].price / Amor.RECHARGE_PACKS[0].coins * 100);
    // açılış katkısı bir kez: daha önce cüzdanı kullanmış olan eski kayıtlarda kullanılmış sayılır
    if (s.wallet.tapsTotal == null) s.wallet.tapsTotal = s.wallet.purse || s.wallet.purseSpent ? TAP_BONUS : 0;
    if (!s.inventory) s.inventory = { gifts: {}, frames: {}, bgs: {} };
    if (!s.inventory.bubbles) s.inventory.bubbles = {};
    if (!s.inventory.cards) s.inventory.cards = 0;
    if (!s.equipped) s.equipped = { frame: null, bg: 'mor-gece' };
    if (!s.equipped.bubble) s.equipped.bubble = 'klasik';
    if (!s.giftsReceived) s.giftsReceived = {};
    if (!s.relations) s.relations = {};
    if (!s.visitors) s.visitors = [];
    if (!s.visited) s.visited = [];
    if (!s.checkin) s.checkin = { last: '', streak: 0 };
    if (!s.achievements) s.achievements = { claimed: [] };
    if (!s.daily || s.daily.date !== today()) {
      s.daily = { date: today(), msg: 0, gift: 0, spin: 0, spinsUsed: 0, chats: [], visits: [], claimed: [], vipBonus: false };
    }
    if (!s.monthly || s.monthly.key !== monthKey()) s.monthly = { key: monthKey(), recharged: 0, claimed: [] };
    return s;
  }
  const save = () => Amor.Store.save();

  /* ---------- Coin ---------- */
  const coins = () => st().wallet.coins;

  function log(amount, reason) {
    const w = st().wallet;
    w.history.unshift({ ts: Date.now(), amount, reason });
    w.history = w.history.slice(0, 200);
  }

  function add(amount, reason) {
    const w = st().wallet;
    w.coins += amount;
    if (reason !== 'Yükleme') w.earned += amount;
    log(amount, reason);
    save();
    Amor.Wallet.onChange && Amor.Wallet.onChange();
  }

  function spend(amount, reason) {
    const w = st().wallet;
    if (w.coins < amount) return false;
    w.coins -= amount;
    w.spent += amount;
    log(-amount, reason);
    save();
    Amor.Wallet.onChange && Amor.Wallet.onChange();
    return true;
  }

  /* ---------- Seviyeler ---------- */
  // Harcamaya göre kullanıcı seviyesi (hediye panelindeki Lv)
  function wealth() {
    const spent = st().wallet.spent;
    const lv = Math.floor(Math.sqrt(spent / 50)) + 1;
    const prev = (lv - 1) ** 2 * 50, next = lv ** 2 * 50;
    return { lv, spent, prev, next, need: next - spent, pct: Math.round((spent - prev) / (next - prev) * 100) };
  }

  function vip() {
    const r = st().wallet.recharged;
    let lv = 0;
    Amor.VIP_LEVELS.forEach((t, i) => { if (i > 0 && r >= t) lv = i; });
    const next = Amor.VIP_LEVELS[lv + 1] ?? null;
    const prev = Amor.VIP_LEVELS[lv];
    return { lv, recharged: r, next, pct: next ? Math.round((r - prev) / (next - prev) * 100) : 100 };
  }
  const hasPerk = id => {
    const p = Amor.VIP_PERKS.find(x => x.id === id);
    return !!p && vip().lv >= p.vip;
  };

  /* ---------- Cüzdan (simülasyon) ----------
   * Cüzdan menüsünde dokundukça para eklenir; coin paketleri bu bakiyeden alınır. Tutarlar kuruş.
   *   Açılış katkısı: ilk TAP_BONUS dokunuş TAP_FIRST kuruş, sonra TAP_BASE kuruş.
   *   Sınırlar: TAP_LIMITS = [dakika, en fazla dokunuş]; biri dolunca o pencere boşalana kadar dokunulamaz.
   *   Aşırı dokunma: son 10 sn'de TAP_CALM'dan fazla dokunuş olursa miktar adım adım düşer, TAP_HARD'da TAP_MIN olur;
   *   yavaşlayınca toparlanır.
   *   Gelişimler (TAP_UPGRADES, cüzdandan alınır): "rate" her seviyede dokunuş başı miktarı (ve en düşük miktarı) step kadar,
   *   "limit" her seviyede sınırlardaki en fazla dokunuşu step kadar artırır. Seviye fiyatı: cost × grow^seviye. */
  const TAP_FIRST = 100, TAP_BASE = 40, TAP_MIN = 20, TAP_BONUS = 100, TAP_CALM = 8, TAP_HARD = 25;
  const TAP_LIMITS = [[5, 90], [10, 150], [30, 300]];
  const TAP_UPGRADES = {
    rate: { name: 'Dokunuş değeri', icon: '💰', step: 0.25, max: 10, cost: 1500, grow: 1.75 },
    limit: { name: 'Limitler', icon: '📈', step: 0.2, max: 10, cost: 2500, grow: 1.8 }
  };
  const purse = () => st().wallet.purse;
  const purseSpent = () => st().wallet.purseSpent;

  const upLevel = id => (st().wallet.upgrades || {})[id] || 0;
  const upMult = id => 1 + TAP_UPGRADES[id].step * upLevel(id);
  // Gelişimin durumu: { id, name, icon, lv, max, cost (sonraki seviye, kuruş; son seviyedeyse null), now, next (çarpan) }
  function upgradeInfo(id) {
    const u = TAP_UPGRADES[id], lv = upLevel(id);
    return { id, name: u.name, icon: u.icon, lv, max: u.max, cost: lv < u.max ? Math.round(u.cost * u.grow ** lv) : null,
      now: 1 + u.step * lv, next: lv < u.max ? 1 + u.step * (lv + 1) : null };
  }
  // Gelişim al: { ok, reason }
  function buyUpgrade(id) {
    const i = upgradeInfo(id), w = st().wallet;
    if (i.cost == null) return { ok: false, reason: 'max' };
    if (w.purse < i.cost) return { ok: false, reason: 'para' };
    w.purse -= i.cost;
    w.purseSpent += i.cost;
    w.upgrades = { ...(w.upgrades || {}), [id]: i.lv + 1 };
    save();
    return { ok: true, info: upgradeInfo(id) };
  }

  function tapLog() {
    const w = st().wallet;
    const since = Date.now() - 30 * 60000;
    w.taps = (w.taps || []).filter(t => t > since);
    return w.taps;
  }
  // Şu anki durum: dokunuş başına miktar, açılış katkısı, sınırlar, bekleme
  function tapInfo() {
    const w = st().wallet, now = Date.now(), taps = tapLog();
    const bonusLeft = Math.max(0, TAP_BONUS - (w.tapsTotal || 0));
    const rm = upMult('rate'), lm = upMult('limit');
    const after = Math.round(TAP_BASE * rm), base = bonusLeft ? Math.max(TAP_FIRST, after) : after;
    const recent = taps.filter(t => now - t < 10000).length;
    const factor = recent <= TAP_CALM ? 1 : Math.max(0, 1 - (recent - TAP_CALM) / (TAP_HARD - TAP_CALM));
    const rate = Math.max(Math.round(TAP_MIN * rm), Math.round(base * factor));
    const limits = TAP_LIMITS.map(([min, max0]) => {
      const max = Math.round(max0 * lm), win = taps.filter(t => now - t < min * 60000);
      return { min, max, used: win.length, resetIn: win.length >= max ? win[win.length - max] + min * 60000 - now : 0 };
    });
    const wait = Math.max(0, ...limits.map(l => l.resetIn));
    return { rate, base, slowed: rate < base, bonusLeft, bonusTotal: TAP_BONUS, first: TAP_FIRST, after, limits, wait };
  }
  // Dokunuş: { ok, amount, info } — sınır doluysa ok: false
  function tapPurse() {
    const info = tapInfo();
    if (info.wait) return { ok: false, amount: 0, info };
    const w = st().wallet;
    w.purse += info.rate;
    w.tapsTotal = (w.tapsTotal || 0) + 1;
    w.taps.push(Date.now());
    save();
    return { ok: true, amount: info.rate, info: tapInfo() };
  }
  function buyPack(pack) {
    const cost = Math.round(pack.price * 100);
    if (purse() < cost) return false;
    st().wallet.purse -= cost;
    st().wallet.purseSpent += cost;
    recharge(pack);
    return true;
  }

  /* ---------- Yükleme (simülasyon) ---------- */
  function recharge(pack) {
    const s = st();
    const total = pack.coins + (pack.bonus || 0);
    s.wallet.recharged += pack.coins;
    s.monthly.recharged += pack.coins;
    add(total, 'Yükleme');
    return total;
  }

  function monthlyTiers() {
    const m = st().monthly;
    return Amor.MONTHLY_TIERS.map((t, i) => ({ ...t, i, reached: m.recharged >= t.at, claimed: m.claimed.includes(i) }));
  }

  function grant(reward, reason) {
    if (reward.cards) st().inventory.cards += reward.cards; // önce: add() → onChange kart sayacını da yeniler
    if (reward.coins) add(reward.coins, reason);
    if (reward.gift) addGift(reward.gift, reward.qty || 1);
    if (reward.frame) giveItem('frames', reward.frame, reward.days || 3);
    save();
  }

  /* ---------- Sohbet kartı (ücretsiz mesaj) ---------- */
  const cards = () => st().inventory.cards;
  function useCard() {
    if (!cards()) return false;
    st().inventory.cards--;
    save();
    return true;
  }

  function claimTier(i) {
    const t = monthlyTiers()[i];
    if (!t || !t.reached || t.claimed) return false;
    st().monthly.claimed.push(i);
    grant(t.reward, 'Yükleme Yıldızı');
    return true;
  }

  /* ---------- Günlük giriş ---------- */
  function checkinState() {
    const c = st().checkin;
    const done = c.last === today();
    const continues = c.last === today(-1);
    const streak = done ? c.streak : (continues ? c.streak : 0);
    return { done, streak, dayIndex: done ? (streak - 1) % 7 : streak % 7 };
  }

  function doCheckin() {
    const c = st().checkin;
    const cs = checkinState();
    if (cs.done) return null;
    c.streak = cs.streak + 1;
    c.last = today();
    const reward = Amor.CHECKIN[(c.streak - 1) % 7];
    grant(reward, `Giriş ödülü · ${c.streak}. gün`);
    return reward;
  }

  /* ---------- Görevler ---------- */
  function track(event, data) {
    const d = st().daily;
    if (event === 'msg') d.msg++;
    if (event === 'gift') d.gift++;
    if (event === 'spin') d.spin++;
    if (event === 'chat' && !d.chats.includes(data)) d.chats.push(data);
    if (event === 'visit') {
      if (!d.visits.includes(data)) d.visits.push(data);
      const v = st().visited.filter(x => x.id !== data);
      v.unshift({ id: data, ts: Date.now() });
      st().visited = v.slice(0, 100);
    }
    save();
  }

  function taskProgress(t) {
    const d = st().daily;
    const n = { msg: d.msg, chat: d.chats.length, visit: d.visits.length, gift: d.gift, spin: d.spin }[t.id] || 0;
    return { n: Math.min(n, t.target), target: t.target, done: n >= t.target, claimed: d.claimed.includes(t.id) };
  }

  function claimTask(id) {
    const t = Amor.DAILY_TASKS.find(x => x.id === id);
    const p = taskProgress(t);
    if (!p.done || p.claimed) return false;
    st().daily.claimed.push(id);
    add(t.coins, `Görev · ${t.name}`);
    return true;
  }

  function achievementProgress(a) {
    const s = st();
    let n = 0, target = a.target || 1;
    if (a.id === 'name') n = s.user.name ? 1 : 0;
    if (a.id === 'follow') n = Object.values(s.follows).filter(Boolean).length;
    if (a.id === 'lv3') n = (Amor.CHARACTERS || []).some(c => Amor.Engine.level(c).lv >= 3) ? 1 : 0;
    if (a.id === 'recharge') n = s.wallet.recharged > 0 ? 1 : 0;
    return { n: Math.min(n, target), target, done: n >= target, claimed: s.achievements.claimed.includes(a.id) };
  }

  function claimAchievement(id) {
    const a = Amor.ACHIEVEMENTS.find(x => x.id === id);
    const p = achievementProgress(a);
    if (!p.done || p.claimed) return false;
    st().achievements.claimed.push(id);
    grant({ coins: a.coins, frame: a.frame, days: a.days }, `Başarım · ${a.name}`);
    return true;
  }

  function claimableCount() {
    let n = checkinState().done ? 0 : 1;
    Amor.DAILY_TASKS.forEach(t => { const p = taskProgress(t); if (p.done && !p.claimed) n++; });
    Amor.ACHIEVEMENTS.forEach(a => { const p = achievementProgress(a); if (p.done && !p.claimed) n++; });
    monthlyTiers().forEach(t => { if (t.reached && !t.claimed) n++; });
    return n;
  }

  /* ---------- VIP günlük bonus ---------- */
  function vipBonusAvailable() { return hasPerk('daily') && !st().daily.vipBonus; }
  function claimVipBonus() {
    if (!vipBonusAvailable()) return 0;
    st().daily.vipBonus = true;
    const n = vip().lv * 50;
    add(n, 'VIP günlük bonus');
    return n;
  }

  /* ---------- Şans çarkı ---------- */
  function spinsLeft() {
    const free = hasPerk('spin') ? 2 : 1;
    return Math.max(0, free - st().daily.spinsUsed);
  }
  function spin() {
    if (!spinsLeft()) return null;
    const total = Amor.WHEEL.reduce((a, s) => a + s.w, 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < Amor.WHEEL.length; idx++) { r -= Amor.WHEEL[idx].w; if (r <= 0) break; }
    idx = Math.min(idx, Amor.WHEEL.length - 1);
    st().daily.spinsUsed++;
    track('spin');
    add(Amor.WHEEL[idx].coins, 'Şans çarkı');
    return idx;
  }

  /* ---------- Çanta ---------- */
  function addGift(id, qty = 1) {
    const g = st().inventory.gifts;
    g[id] = (g[id] || 0) + qty;
    save();
  }
  const bag = () => Object.entries(st().inventory.gifts).filter(([, n]) => n > 0)
    .map(([id, n]) => ({ gift: giftById(id), qty: n })).filter(x => x.gift);

  /* ---------- Eşyalar (çerçeve / arka plan) ---------- */
  function giveItem(kind, id, days) {
    const inv = st().inventory[kind];
    const base = Math.max(Date.now(), inv[id] || 0);
    inv[id] = base + days * DAY;
    save();
  }
  function owns(kind, id) {
    if (kind === 'frames' && id === 'vip') return hasPerk('frame');
    if (kind === 'bgs' && id === 'mor-gece') return true;
    if (kind === 'bubbles' && id === 'klasik') return true;
    return (st().inventory[kind][id] || 0) > Date.now();
  }
  const expiresIn = (kind, id) => Math.ceil(((st().inventory[kind][id] || 0) - Date.now()) / DAY);

  function buyItem(kind, item) {
    if (!spend(item.price, `Mağaza · ${item.name}`)) return false;
    giveItem(kind, item.id, Amor.ITEM_DAYS);
    return true;
  }
  function equip(slot, id) {
    st().equipped[slot] = id;
    save();
  }
  function activeFrame() {
    const id = st().equipped.frame;
    return id && owns('frames', id) ? Amor.FRAMES.find(f => f.id === id) : null;
  }
  function activeBg() {
    const id = st().equipped.bg;
    const bg = id && owns('bgs', id) ? Amor.BACKGROUNDS.find(b => b.id === id) : null;
    return bg || Amor.BACKGROUNDS[0];
  }
  function activeBubble() {
    const id = st().equipped.bubble;
    const b = id && owns('bubbles', id) ? Amor.BUBBLES.find(x => x.id === id) : null;
    return b || Amor.BUBBLES[0];
  }
  // Sohbet teması: mağazadan seçilen; varsayılandaysa kalp düzeyinin teması
  function chatTheme(lv) {
    const t = [...Amor.LEVEL_THEMES].reverse().find(x => lv >= x.lv) || {};
    let bg = activeBg(), bubble = activeBubble();
    if (bg === Amor.BACKGROUNDS[0] && t.bg) bg = Amor.BACKGROUNDS.find(b => b.id === t.bg);
    if (bubble === Amor.BUBBLES[0] && t.bubble) bubble = Amor.BUBBLES.find(b => b.id === t.bubble);
    return { bg, bubble };
  }

  /* ---------- Ziyaretçiler ---------- */
  function addVisitor(id) {
    const v = st().visitors.filter(x => x.id !== id);
    v.unshift({ id, ts: Date.now() });
    st().visitors = v.slice(0, 100);
    save();
  }

  /* ---------- Hediye gönder ---------- */
  const giftById = id => Amor.GIFTS.find(g => g.id === id);

  function unitPrice(gift) {
    return hasPerk('discount') ? Math.round(gift.price * 0.95) : gift.price;
  }

  // Şanslı hediye -> değer aralığında rastgele bir normal hediye
  function resolveLucky(gift) {
    if (!gift.lucky) return gift;
    const [lo, hi] = gift.lucky;
    const pool = Amor.GIFTS.filter(g => g.tab === 'hediye' && !g.vip && g.price >= lo && g.price <= hi);
    return pick(pool.length ? pool : [giftById('gul')]);
  }

  /* fromBag: çantadan gönderiliyorsa coin harcanmaz
   * döner: { ok, reason, delivered, qty, value } */
  function sendGift(c, gift, qty, fromBag) {
    const s = st();
    if (fromBag) {
      if ((s.inventory.gifts[gift.id] || 0) < qty) return { ok: false, reason: 'Çantada yeterli yok' };
      s.inventory.gifts[gift.id] -= qty;
    } else {
      const cost = unitPrice(gift) * qty;
      if (!spend(cost, `Hediye · ${gift.name} x${qty} → ${c.name}`)) return { ok: false, reason: 'coin' };
    }
    const delivered = resolveLucky(gift);
    const rec = s.giftsReceived[c.id] = s.giftsReceived[c.id] || {};
    rec[delivered.id] = (rec[delivered.id] || 0) + qty;
    if (gift.rel) s.relations[c.id] = gift.rel;
    track('gift');
    save();
    if (Amor.Background) {
      Amor.Background.announce(s.user.name || 'Sen', c, delivered, qty); // pahalıysa yayın bandı
      Amor.Background.credit(c.id, delivered.price * qty); // haftalık ajans / yayıncı sıralaması
    }
    return { ok: true, gift, delivered, qty, value: delivered.price * qty, rel: gift.rel ? Amor.RELATIONS[gift.rel] : null };
  }

  function receivedCount(id) {
    return Object.values(st().giftsReceived[id] || {}).reduce((a, b) => a + b, 0);
  }

  return {
    st, today, coins, add, spend, wealth, vip, hasPerk,
    recharge, purse, purseSpent, tapPurse, tapInfo, buyPack, upgradeInfo, buyUpgrade, TAP_UPGRADES, monthlyTiers, claimTier, cards, useCard,
    checkinState, doCheckin, track, taskProgress, claimTask, achievementProgress, claimAchievement, claimableCount,
    vipBonusAvailable, claimVipBonus, spinsLeft, spin,
    addGift, bag, owns, expiresIn, buyItem, equip, activeFrame, activeBg, activeBubble, chatTheme,
    addVisitor, giftById, unitPrice, sendGift, receivedCount,
    onChange: null
  };
})();
