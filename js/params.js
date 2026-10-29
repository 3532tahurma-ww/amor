/*
 * Amor - Gizli karakter durumu (kullanıcıya gösterilmez; js/intent.js bot cevaplarında durum ve yer tutucu olarak kullanır)
 *
 * Özellikler (traits): Amor kişiliği + Carmen kişilikleri + beden / deneyim (js/data/char-traits.js), karakter id'sine göre sabit.
 * Sevdiği / sevmediği olaylar ve izin verdiği / vermediği korunmalar da karakter id'sine göre sabit (js/data/intent-map.js kataloğundan).
 * Parametreler (Carmen'deki gibi, S().params[karakter id]):
 *   onun: güven · samimiyet · aşk · şehvet · kıskançlık · uyarılma · süt · acı      senin (me): zevk · cum · cumN (boşalma sayısı)
 *   Saatlik değişim (Carmen sohbet saati kuralları): cum +10 · cumN −1 · süt +5 · şehvet −5 · kıskançlık −2 · acı −10
 *   Aşk ve samimiyet Amor yakınlık seviyesinin altına düşmez.
 * Hamilelik / döngü: 28 günlük döngü (gerçek gün), doğurganlık %20–90, hamilelik haftası = hamile kaldığından beri geçen gün.
 */
window.Amor = window.Amor || {};

Amor.Params = (() => {
  const S = () => Amor.Store.state;
  const T = () => Amor.CHAR_TRAITS || { arch: {}, body: {}, cr: [] };
  const M = () => Amor.INTENT_MAP || { catalog: {} };
  const low = s => String(s || '').toLocaleLowerCase('tr').trim();
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const HOUR = 3600000, DAY = 24 * HOUR;

  // Karakter id'sine göre hep aynı sonuç veren sayı üreteci
  function rng(c, key) {
    let h = 2166136261;
    for (const ch of String(c.id) + ':' + key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 4294967296; };
  }
  function seeded(c, key, list, n) {
    const r = rng(c, key), a = [...list], out = [];
    while (a.length && out.length < n) out.push(a.splice(Math.floor(r() * a.length), 1)[0]);
    return out;
  }

  /* ---------- Özellikler ---------- */
  const cache = {};
  function traits(c) {
    if (cache[c.id]) return cache[c.id];
    const A = T().arch, a = A[c.archLabel];
    const all = [...new Set(Object.values(A).flatMap(x => [...x.core, ...x.pool]))];
    const out = [c.archLabel, ...(a ? a.core : []), ...seeded(c, 'kisilik', a ? a.pool : all, 2)].filter(Boolean);
    const blocked = new Set();
    Object.entries(T().body).forEach(([g, opts]) => {
      const ok = opts.filter(([v]) => !blocked.has(`${g}: ${v}`)), sum = ok.reduce((s, [, w]) => s + w, 0);
      let x = rng(c, g)() * sum;
      const v = (ok.find(([, w]) => (x -= w) < 0) || ok[ok.length - 1])[0];
      out.push(`${g}: ${v}`);
      T().cr.filter(r => r.ifs.every(t => out.includes(t))).forEach(r => r.not.forEach(t => blocked.add(t)));
    });
    return (cache[c.id] = [...new Set(out)]);
  }
  const traitVal = (c, group) => { const t = traits(c).find(x => x.startsWith(group + ':')); return t ? t.slice(t.indexOf(':') + 1).trim() : ''; };

  // ❤️ sevdiği / 💔 sevmediği olaylar, ✅ izin verdiği / 🚫 vermediği korunmalar (başlıklar)
  const titlesIn = cats => Object.keys(M().catalog).filter(t => cats.includes(low(M().catalog[t][0])) && t !== 'Boşalma');
  const EVENT_CATS = ['forward', 'backward', 'outercourse', 'eat', 'foreplay', 'fantesy', 'mode'];
  function feels(c) {
    const pool = titlesIn(EVENT_CATS), likes = seeded(c, 'sever', pool, 6);
    const prot = titlesIn(['protection']), allows = seeded(c, 'izin', prot, 2);
    return { likes, dislikes: seeded(c, 'sevmez', pool.filter(t => !likes.includes(t)), 4), allows, denies: seeded(c, 'izinyok', prot.filter(t => !allows.includes(t)), 2) };
  }

  /* ---------- Parametreler ---------- */
  const START = { guven: 20, samimiyet: 10, ask: 0, sehvet: 0, kiskanclik: 0, uyarilma: 0, sut: 30, aci: 0 };
  const HOURLY = { sut: 5, sehvet: -5, kiskanclik: -2, aci: -10 };
  const LABEL = { 'güven': 'guven', samimiyet: 'samimiyet', 'aşk': 'ask', 'şehvet': 'sehvet', 'kıskançlık': 'kiskanclik', 'uyarılma': 'uyarilma', 'süt': 'sut', 'acı': 'aci' };
  const lv = c => Amor.Engine.level(c).lv;

  function get(c) {
    const all = S().params = S().params || {};
    let p = all[c.id];
    if (!p) p = all[c.id] = { v: { ...START }, me: { zevk: 0, cum: 100, cumN: 0 }, hamile: false, pregAt: null, ts: Date.now(), ask: null, israr: 0, izinVerdi: false };
    const h = Math.floor((Date.now() - p.ts) / HOUR);
    if (h > 0) {
      Object.entries(HOURLY).forEach(([k, d]) => { p.v[k] = clamp(p.v[k] + d * h, 0, 100); });
      p.me.cum = clamp(p.me.cum + 10 * h, 0, 100);
      p.me.cumN = clamp(p.me.cumN - h, 0, 20);
      p.ts += h * HOUR;
    }
    // aşk / samimiyet Amor yakınlık seviyesinin altına düşmez
    p.v.ask = Math.max(p.v.ask, (lv(c) - 1) * 18);
    p.v.samimiyet = Math.max(p.v.samimiyet, (lv(c) - 1) * 12);
    return p;
  }
  // label: 'aşk' gibi Türkçe ad ya da anahtar; me: senin değerin (zevk · cum · cumN)
  const val = (c, label) => { const p = get(c), k = LABEL[low(label)] || label; return k in p.me ? p.me[k] : p.v[k] ?? 0; };
  // fx: { ask: 3, zevk: -100 ... } (me anahtarları senin değerlerine)
  function add(c, fx) {
    const p = get(c);
    Object.entries(fx || {}).forEach(([k, d]) => {
      if (k in p.me) p.me[k] = clamp(p.me[k] + d, 0, k === 'cumN' ? 20 : 100);
      else if (k in p.v) p.v[k] = clamp(p.v[k] + d, 0, 100);
    });
  }

  // Carmen botOuts: kurala göre değer değişimi (sevgi sözü, iltifat, kabalık, "seviyor musun" cevabı)
  const OUTS = [[/^r_(seni_seviyorum|seviyorum_seni|love_)/, { ask: 3 }], [/^r_(ozledim|cmp|q3_meme_sev)/, { ask: 2, samimiyet: 1 }],
    [/^r_rude/, { guven: -3, ask: -1 }], [/^r_ans_k_sevgi_evet/, { ask: 3 }], [/^r_ans_k_sevgi_hayir/, { ask: -3, guven: -1 }]];
  const outs = (c, id) => { const o = OUTS.find(([re]) => re.test(String(id))); if (o) add(c, o[1]); };

  /* ---------- Döngü ve hamilelik ---------- */
  const CYCLE = { regl: 0.15, erken: 0.7, riskli: 1.8, gec: 0.5 };
  const cycleDay = c => (Math.floor(Date.now() / DAY) + Math.floor(rng(c, 'dongu')() * 28)) % 28 + 1;
  const cyclePhase = c => { const d = cycleDay(c); return d <= 5 ? 'regl' : d >= 11 && d <= 16 ? 'riskli' : d <= 10 ? 'erken' : 'gec'; };
  const fert = c => 20 + Math.floor(rng(c, 'dogurganlik')() * 71);
  const pregChance = c => Math.min(0.95, 0.5 * fert(c) / 50 * CYCLE[cyclePhase(c)]);
  const pregWeek = c => { const p = get(c); return p.hamile && p.pregAt ? Math.floor((Date.now() - p.pregAt) / DAY) + 1 : 0; };
  function setPregnant(c, on) { const p = get(c); p.hamile = on; p.pregAt = on ? Date.now() : null; }

  /* ---------- Carmen biçimi karakter (js/data/carmen-bot.js cevapları için) ---------- */
  function ch(c) {
    const f = feels(c), mem = Amor.Memory ? Amor.Memory.get(c).facts : {};
    return { _c: c, id: c.id, name: c.name, age: c.age, city: c.city, job: c.job, zodiac: c.zodiac, traits: traits(c),
      fields: { hamile: get(c).hamile }, likes: f.likes, dislikes: f.dislikes, allows: f.allows, denies: f.denies, memory: { ad: mem.name || '' } };
  }
  // 💕 hitap (Carmen hitapOf): aşka göre ad · canım · aşkım
  function hitap(c) {
    const name = S().user.name || 'sen', t = traits(c);
    if (t.includes('Soğuk') || t.includes('Resmi konuşur')) return name;
    const a = val(c, 'aşk');
    return a >= 70 ? pick(['aşkım', 'bebeğim', 'canım', 'aşkım', 'hayatım', 'sevgilim']) : a >= 30 ? pick([name, 'canım', 'tatlım']) : name;
  }
  // Carmen yardımcılarının karşılıkları (olay kimliği yerine başlık kullanılır)
  function helpers() {
    const cat = t => M().catalog[t] || ['', []];
    const has = (ids, t) => (ids || []).some(x => low(x) === low(t));
    return {
      relV: (x, label) => val(x._c, label),
      traitVal: (x, group) => traitVal(x._c, group),
      evAllowed: (x, t) => has(x.allows, t), evDenied: (x, t) => has(x.denies, t),
      likedTitles: x => x.likes || [],
      likesTag: (x, tag) => (x.likes || []).some(t => cat(t)[1].includes(tag)),
      dislikesTag: (x, tag) => (x.dislikes || []).some(t => cat(t)[1].includes(tag)),
      hitapOf: x => hitap(x._c), pickOne: pick, S,
      // Amor'da kıyafet yok: Carmen'in eski genel cümlelerine düşer
      outfitItems: () => [], clItem: () => null, outfitOf: () => ({}), slotLine: () => ''
    };
  }

  return { traits, traitVal, feels, seeded, get, val, add, outs, cyclePhase, pregChance, pregWeek, setPregnant, ch, hitap, helpers };
})();
