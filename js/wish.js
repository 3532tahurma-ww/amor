/*
 * Amor - Hediye niyeti (deneysel simülasyon)
 * ------------------------------------------
 * Her kadın karakterin bir "hediye niyeti" değeri var (c.giftWant, 0..1; kişilikten türetilir, generator.js).
 * Niyeti yüksek olan:
 *   - sohbette ve aramada daha sık hediye ister (istediği hediyenin değeri de niyetle artar),
 *   - istediği hediye gelince daha çok sevinir (ilgi ve ruh hali daha çok artar),
 *   - istek WISH_TTL içinde karşılanmazsa daha çok bozulur (ilgi ve ruh hali düşer, sitem eder).
 * Kullanıcıdan istekler Store.state.wish[id]'de; erkeklerden istekler js/background.js'te.
 * Coinler tamamen sanaldır.
 */
window.Amor = window.Amor || {};

Amor.Wish = (() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const H = 3600000;
  const WISH_TTL = 6 * H, COOLDOWN = 3 * H;

  const want = c => (c && c.giftWant != null ? c.giftWant : 0.5);
  const store = () => (S().wish = S().wish || {});
  const pending = c => { const w = store()[c.id]; return w && !w.done && w.until > Date.now() ? w : null; };

  // İstediği hediyelerin değer tavanı: niyet × hediye zevki (kişilik + kişiye özgü sapma, generator.js)
  const ceiling = c => Math.min(200000, Math.round((40 + want(c) ** 2 * 1600) * (c && c.giftTaste != null ? c.giftTaste : 1)));
  function pickGift(c) {
    const max = ceiling(c);
    const pool = A.GIFTS.filter(g => g.tab === 'hediye' && !g.vip && g.price <= max && g.price >= max * 0.15);
    return pick(pool.length ? pool : A.GIFTS.filter(g => g.tab === 'hediye' && g.price <= 150));
  }

  const askLine = (c, g) => pick(A.SHARED.wish_ask).replace(/\{gift\}/g, g.name.toLocaleLowerCase('tr'));

  /* Sohbette istek: iyi ruh hali, Lv.2+, ilgili, bekleyen istek yok, son istekten COOLDOWN geçti.
   * Dönen: eklenecek cümle ya da null */
  function maybeAsk(c, { good, interest, intent }) {
    if (!good || interest < 0.3 || A.Engine.level(c).lv < 2) return null;
    if (['bye', 'night', 'insult', 'tell_name', 'ask_call'].includes(intent)) return null;
    const last = store()[c.id];
    if (pending(c) || (last && Date.now() - last.ts < COOLDOWN)) return null;
    if (Math.random() >= want(c) * 0.14) return null;
    return ask(c, 'chat');
  }

  function ask(c, where) {
    const g = pickGift(c);
    store()[c.id] = { gift: g.id, ts: Date.now(), until: Date.now() + WISH_TTL, where };
    A.Store.save();
    return askLine(c, g);
  }

  /* Kullanıcı hediye gönderdi (Wallet.sendGift sonucu r). İstediği (ya da daha değerli) bir hediyeyse karşılanmış sayılır.
   * Dönen: tepkiye eklenecek cümle ya da null */
  function fulfill(c, r) {
    const w = pending(c);
    const g = w && A.GIFTS.find(x => x.id === w.gift);
    const k = want(c);
    // Niyeti yüksek olan her hediyeye biraz daha çok sevinir
    A.Interest.add(c, 0.02 + k * 0.04);
    if (!w || !g || r.value < g.price * 0.8) return null;
    w.done = true;
    A.Interest.add(c, 0.05 + k * 0.1);
    A.Mood.nudge(c, { valence: 0.05 + k * 0.12, arousal: 0.05 });
    A.Store.save();
    return pick(A.SHARED.wish_thanks);
  }

  /* Süresi dolan istek: niyete göre ilgi ve ruh hali düşer. Dönen: sitem cümlesi ya da null (zamanlayıcı çağırır) */
  function expire(c) {
    const w = store()[c.id];
    if (!w || w.done || w.missed || w.until > Date.now()) return null;
    w.missed = true;
    const k = want(c);
    A.Interest.add(c, -(0.04 + k * 0.12));
    A.Mood.nudge(c, { valence: -(0.03 + k * 0.15) });
    A.Store.save();
    return Math.random() < 0.3 + k * 0.5 ? pick(A.SHARED.wish_forgot) : null;
  }

  // Aramada istek (her dakika bir kez denenir)
  function maybeAskInCall(c) {
    if (pending(c) || Math.random() >= want(c) * 0.3) return null;
    return ask(c, 'call');
  }

  return { want, ceiling, pending, pickGift, maybeAsk, ask, fulfill, expire, maybeAskInCall };
})();
