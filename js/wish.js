/*
 * Amor - Hediye niyeti (deneysel simülasyon)
 * ------------------------------------------
 * Her kadın karakterin bir "hediye niyeti" değeri var (c.giftWant, 0..1; kişilikten türetilir, generator.js).
 * Niyeti yüksek olan:
 *   - sohbette ve aramada daha sık hediye ister (istediği hediyenin değeri de niyetle artar),
 *   - istediği hediye gelince daha çok sevinir (ilgi ve ruh hali daha çok artar),
 *   - istek WISH_TTL içinde karşılanmazsa daha çok bozulur (ilgi ve ruh hali düşer, sitem eder).
 * İsteğe "alamam / param yok" denirse önce pazarlık eder (daha ucuza iner, sevişme vaadi, para bahanesi: evliyim, işim yok...);
 * ikna edemezse ya da süresi dolarsa küser (cold): sevişme olaylarını pozisyona ve
 * duruma göre reddeder. İstediği gelince barışır ve sevişmek ister. Daha ucuzu gelirse tatmin olmaz, kalanı ister.
 * Fotoğraf: istenince her zaman hediyeye bağlar ("{gift} atarsan sürprizim var"); hediye gelince gönderir.
 * Cüretkâr açılışlar (opener): fotoğrafla "nasılım?" ya da "kaç santim?"; cevabına tepki (gate).
 * Kullanıcıdan istekler Store.state.wish[id]'de; erkeklerden istekler js/background.js'te.
 * Coinler tamamen sanaldır.
 */
window.Amor = window.Amor || {};

Amor.Wish = (() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const H = 3600000;
  const WISH_TTL = 6 * H, COOLDOWN = 3 * H, ANSWER_MS = 20 * 60000, FLIRT_MS = 30 * 60000;

  const want = c => (c && c.giftWant != null ? c.giftWant : 0.5);
  const store = () => (S().wish = S().wish || {});
  const pending = c => { const w = store()[c.id]; return w && !w.done && w.until > Date.now() ? w : null; };
  // Karşılanabilir istek: süresi dolmamış ya da küsmesi sürüyor
  const open = c => { const w = store()[c.id]; return w && !w.done && (w.until > Date.now() || (w.coldUntil || 0) > Date.now()) ? w : null; };
  // Küs: isteğini geri çevirdin ya da unuttun
  const cold = c => { const w = open(c); return w && (w.refused || w.missed) && (w.coldUntil || 0) > Date.now() ? w : null; };
  const giftOf = w => w && A.GIFTS.find(x => x.id === w.gift);
  const lc = s => String(s).toLocaleLowerCase('tr');
  const P = () => A.Params;
  const addP = (c, fx) => P() && P().add(c, fx);

  // İstediği hediyelerin değer tavanı: niyet × hediye zevki (kişilik + kişiye özgü sapma, generator.js)
  const ceiling = c => Math.min(200000, Math.round((300 + want(c) ** 2 * 6000) * (c && c.giftTaste != null ? c.giftTaste : 1)));
  // Tavana yakın (pahalı) hediyeler daha olası: ağırlık = fiyat
  function pickGift(c) {
    const max = ceiling(c);
    const pool = A.GIFTS.filter(g => g.tab === 'hediye' && !g.vip && g.price <= max && g.price >= max * 0.3);
    if (!pool.length) return pick(A.GIFTS.filter(g => g.tab === 'hediye' && !g.vip && g.price >= 150 && g.price <= 500));
    let r = Math.random() * pool.reduce((s, g) => s + g.price, 0);
    return pool.find(g => (r -= g.price) < 0) || pool[pool.length - 1];
  }

  const line = (key, g) => pick(A.SHARED[key]).replace(/\{gift\}/g, g ? lc(g.name) : 'hediyemi');
  const askLine = (c, g) => line('wish_ask', g);

  /* Sohbette istek: iyi ruh hali, Lv.2+, ilgili, bekleyen istek yok, son istekten COOLDOWN geçti.
   * Dönen: eklenecek cümle ya da null */
  function maybeAsk(c, { good, interest, intent }) {
    if (!good || interest < 0.3 || A.Engine.level(c).lv < 2) return null;
    if (['bye', 'night', 'insult', 'tell_name', 'ask_call'].includes(intent)) return null;
    const last = store()[c.id];
    if (open(c) || (last && Date.now() - last.ts < COOLDOWN)) return null;
    if (Math.random() >= want(c) * 0.14) return null;
    // arada fotoğrafı hediyeye bağlar
    return ask(c, 'chat', Math.random() < 0.3 ? photoFor(c) : null);
  }

  function ask(c, where, photo) {
    const g = pickGift(c);
    store()[c.id] = { gift: g.id, ts: Date.now(), until: Date.now() + WISH_TTL, where, photo: photo || null };
    A.Store.save();
    const s = photo ? line('wish_photo_ask', g) : askLine(c, g);
    // sohbette arada bahanesiyle ister (aramada tek cümle kalır)
    const ex = where !== 'call' && Math.random() < 0.3 && excuseLine(c);
    return ex ? s + '|' + ex : s;
  }

  /* Kullanıcı hediye gönderdi (Wallet.sendGift sonucu r). İstediği (ya da daha değerli) bir hediyeyse karşılanmış sayılır;
   * daha ucuzsa birikir, tatmin olmaz ve kalanını ister. Dönen: tepkiye eklenecek cümle(ler) ('|' ile) ya da null */
  function fulfill(c, r) {
    const w = open(c);
    const g = giftOf(w);
    const k = want(c);
    // Niyeti yüksek olan her hediyeye biraz daha çok sevinir
    A.Interest.add(c, 0.02 + k * 0.04);
    if (!w || !g) return null;
    w.paid = (w.paid || 0) + r.value;
    if (w.paid < g.price * 0.8) {
      A.Mood.nudge(c, { valence: -(0.02 + k * 0.05) });
      A.Store.save();
      return line('wish_less', g);
    }
    const wasCold = !!cold(c);
    w.done = true;
    w.coldUntil = 0;
    if (w.photo) S().photoDue = { ...(S().photoDue || {}), [c.id]: w.photo };
    A.Interest.add(c, 0.05 + k * 0.1);
    A.Mood.nudge(c, { valence: 0.05 + k * 0.12 + (wasCold ? 0.1 : 0), arousal: 0.15 });
    // istediği geldi: azar, sevişmek ister
    addP(c, { uyarilma: 25, sehvet: 30, ask: 5, guven: 2 });
    A.Store.save();
    return [wasCold ? line('wish_makeup', g) : pick(A.SHARED.wish_thanks), w.photo ? line('wish_photo_give', g) : line('wish_horny', g)].join('|');
  }

  /* Süresi dolan istek: niyete göre ilgi ve ruh hali düşer, bir süre küser. Dönen: sitem cümlesi ya da null (zamanlayıcı çağırır) */
  function expire(c) {
    const w = store()[c.id];
    if (!w || w.done || w.missed || w.until > Date.now()) return null;
    w.missed = true;
    const k = want(c);
    if (!w.refused) w.coldUntil = Date.now() + (0.5 + k * 2) * H;
    A.Interest.add(c, -(0.04 + k * 0.12));
    A.Mood.nudge(c, { valence: -(0.03 + k * 0.15) });
    A.Store.save();
    return Math.random() < 0.3 + k * 0.5 ? pick(A.SHARED.wish_forgot) : null;
  }

  // Aramada istek (her dakika bir kez denenir)
  function maybeAskInCall(c) {
    if (open(c) || Math.random() >= want(c) * 0.3) return null;
    return ask(c, 'call');
  }

  /* ---------- Fotoğraf ---------- */
  // Albümünden daha önce göndermediği bir fotoğraf (profil fotoğrafı en son)
  function photoFor(c) {
    const all = (c.album || []).filter(Boolean);
    if (!all.length) return null;
    const sent = (S().sentPhotos = S().sentPhotos || {})[c.id] || [];
    const rest = all.filter(u => u !== c.photo);
    const fresh = rest.filter(u => !sent.includes(u));
    return pick(fresh.length ? fresh : rest.length ? rest : all);
  }
  function markSent(c, url) {
    const all = S().sentPhotos = S().sentPhotos || {};
    all[c.id] = [...(all[c.id] || []).filter(u => u !== url), url].slice(-30);
  }
  // Hediye karşılığı gönderilecek fotoğraf (bir kez alınır)
  function takePhoto(c) {
    const due = S().photoDue && S().photoDue[c.id];
    if (!due) return null;
    delete S().photoDue[c.id];
    markSent(c, due);
    A.Store.save();
    return due;
  }

  /* ---------- Konuşma kapısı: motor (js/engine.js) olay / kural cevabından önce sorar ----------
   * Dönen: { line ('|' ile), src, photo? } ya da null (normal akış) */
  const norm = t => ' ' + lc(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const has = (t, words) => words.some(w => t.includes(' ' + w));
  const NO = ['alamam', 'almam', 'almıyacağım', 'almayacağım', 'almıycam', 'almıyorum', 'olmaz', 'hayır', 'param yok', 'para yok', 'istemem', 'pahalı', 'almadım', 'alamıycam', 'alamıyorum', 'param kalmadı', 'bütçem', 'yok '];
  const YES = ['tamam', 'olur', 'alırım', 'alayım', 'alıcam', 'alacağım', 'tabi', 'hemen', 'söz', 'evet', 'peki', 'hallederim'];
  const PHOTO = ['foto', 'resim', 'resm', 'selfie', 'pic'];
  const SEND = ['at', 'gönder', 'yolla', 'göster', 'görebilir', 'görmek', 'görsem', 'paylaş', 'rica', 'isti', 'ister', 'alabilir', 'var mı'];

  // Sevişme niyeti: yazılan metinden olay (js/data/intent-map.js) ya da komut kuralı (r_cmd_*) → kategori
  function sexCat(c, text, br) {
    const M = A.INTENT_MAP;
    if (!M) return '';
    const catOf = t => (M.catalog[t] || [''])[0].toLowerCase();
    const id = br && !br.fallback ? String(br.rule.id) : '';
    const key = id.replace(/_(shy|exp|sever|sevmez)$/, '').replace(/\d+$/, '');
    if (M.cmd[key]) return catOf(M.cmd[key][0]);
    const e = A.Intent && A.Intent.detect(c, text);
    return e ? e.cat.toLowerCase() : '';
  }

  function gate(c, text, br) {
    const t = norm(text), w = open(c), g = giftOf(w), now = Date.now();
    const out = (key, src, x) => ({ line: line(key, g), src: 'hediye niyeti: ' + src, ...x });

    // 💬 cüretkâr açılışına cevap
    const fl = (S().flirt || {})[c.id];
    if (fl && now - fl.ts < FLIRT_MS) {
      delete S().flirt[c.id];
      const r = flirtAnswer(c, t, fl.q, text);
      if (r) return r;
    }

    // 🎁 isteğine evet / hayır (istekten hemen sonra); hayır denince önce pazarlık eder, ikna edemezse küser
    if (w && !w.answered && !w.refused && w.until > now && now - w.ts < ANSWER_MS) {
      if (has(t, NO)) {
        const k = want(c);
        w.haggle = (w.haggle || 0) + 1;
        if (w.haggle <= maxHaggle(c) && Math.random() < 0.85) return haggle(c, w, t);
        w.answered = w.refused = true;
        w.coldUntil = now + (1 + k * 4) * H;
        A.Interest.add(c, -(0.03 + k * 0.08));
        A.Mood.nudge(c, { valence: -(0.12 + k * 0.25), arousal: -0.05 });
        addP(c, { ask: -3, guven: -2, uyarilma: -30, sehvet: -20 });
        A.Store.save();
        return out('wish_refused', 'isteği geri çevrildi');
      }
      if (has(t, YES)) {
        w.answered = true;
        A.Mood.nudge(c, { valence: 0.05 });
        A.Store.save();
        return out(w.photo ? 'wish_photo_promised' : 'wish_promised', 'söz verildi');
      }
    }

    // 📸 fotoğraf isteği
    if (has(t, PHOTO) && has(t, SEND)) {
      if (cold(c)) return out('wish_photo_cold', 'küsken fotoğraf istendi');
      if (A.Engine.level(c).lv < 2) return out('wish_photo_shy', 'fotoğraf için erken');
      if (w && w.photo) return out('wish_photo_wait', 'fotoğraf hediyeye bağlı');
      const url = photoFor(c);
      if (!url) return out('wish_photo_none', 'fotoğrafı yok');
      if (w) { w.photo = url; A.Store.save(); return out('wish_photo_wait', 'fotoğraf hediyeye bağlandı'); }
      // fotoğrafı her zaman hediye şartıyla verir; hediye gelince gönderir (fulfill → photoDue)
      return { line: ask(c, 'photo', url), src: 'hediye niyeti: fotoğraf karşılığı hediye istedi' };
    }

    // 🥶 küsken sevişme: pozisyona ve duruma göre red
    const cw = cold(c);
    if (cw) {
      const live = A.Intent && A.Intent.phase(c) === 'sexnow';
      const cat = sexCat(c, text, br);
      if ((cat && cat !== 'protection') || live) {
        const p = P() && P().get(c);
        const hot = p && (p.v.uyarilma >= 50 || p.v.sehvet >= 60);
        const key = live && !cat ? 'cold_mid' : hot && Math.random() < 0.5 ? 'cold_tempted' : A.SHARED['cold_' + cat] ? 'cold_' + cat : 'cold_any';
        A.Mood.nudge(c, { valence: -0.03 });
        return out(key, 'küs: sevişmeyi reddetti (' + (cat || 'sahne') + ')');
      }
    }
    return null;
  }

  /* ---------- Pazarlık ve bahaneler ----------
   * Niyeti yüksek olan daha çok pazarlık eder (1-3 tur): daha ucuz hediyeye iner, sevişme vaadiyle ikna etmeye çalışır,
   * bazıları para bahanesine başvurur (evliyim, işim yok, uygulamanın kuralı...). Bahane karakter id'sine göre sabit. */
  const maxHaggle = c => (want(c) >= 0.6 ? 3 : want(c) >= 0.3 ? 2 : 1);
  const EXCUSES = ['married', 'married', 'jobless', 'jobless', 'app', 'student', 'rent', 'family', null, null];
  function excuse(c) {
    if (want(c) < 0.35) return null;
    let h = 7;
    for (const ch of String(c.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return EXCUSES[h % EXCUSES.length];
  }
  const excuseLine = c => { const x = excuse(c); return x && A.SHARED['wish_excuse_' + x] ? pick(A.SHARED['wish_excuse_' + x]) : null; };
  // İstediğinden daha ucuz bir hediye (pazarlıkta iner)
  function cheaper(g) {
    const pool = A.GIFTS.filter(x => x.tab === 'hediye' && !x.vip && x.price < g.price * 0.7 && x.price >= g.price * 0.15);
    const any = A.GIFTS.filter(x => x.tab === 'hediye' && !x.vip && x.price < g.price);
    return pool.length ? pick(pool) : any.length ? any.reduce((a, b) => (b.price > a.price ? b : a)) : null;
  }
  function haggle(c, w, t) {
    const n = w.haggle, last = n >= maxHaggle(c), poor = has(t, ['param yok', 'para yok', 'fakir', 'bütçe', 'pahalı', 'param kalmadı', 'meteliksiz']);
    const parts = [];
    const ex = excuseLine(c);
    if (ex && (n === 1 ? Math.random() < 0.7 : Math.random() < 0.4)) parts.push(ex);
    else if (poor) parts.push(pick(A.SHARED.wish_haggle_poor));
    const alt = (poor || Math.random() < 0.6) && cheaper(giftOf(w));
    if (alt) { w.gift = alt.id; parts.push(line('wish_haggle_cheaper', alt)); }
    parts.push(line(Math.random() < 0.55 ? 'wish_haggle_sex' : 'wish_haggle_sweet', giftOf(w)));
    if (last) parts.push(line('wish_haggle_last', giftOf(w)));
    w.ts = Date.now(); // cevap süresi yeniden başlar
    A.Mood.nudge(c, { valence: -0.03 });
    A.Store.save();
    return { line: parts.join('|'), src: `hediye niyeti: pazarlık (${n}. tur${alt ? ', daha ucuza indi' : ''}${ex && parts[0] === ex ? ', bahane: ' + excuse(c) : ''})` };
  }

  /* ---------- Cüretkâr açılışlar ---------- */
  function opener(c) {
    const lv = A.Engine.level(c).lv;
    if (cold(c) || Math.random() >= 0.12 + 0.04 * Math.min(lv, 5)) return null;
    const url = lv >= 2 && photoFor(c);
    const q = url && Math.random() < 0.55 ? 'photo' : Math.random() < 0.5 ? 'size' : 'sexlove';
    (S().flirt = S().flirt || {})[c.id] = { q, ts: Date.now() };
    if (url && q === 'photo') markSent(c, url);
    A.Store.save();
    return { parts: pick(A.SHARED['flirt_open_' + q]).split('|'), photo: q === 'photo' ? url : null };
  }

  function flirtAnswer(c, t, q, raw) {
    const r = (key, src, fx, mood) => { if (fx) addP(c, fx); if (mood) A.Mood.nudge(c, mood); A.Store.save(); return { line: pick(A.SHARED[key]), src: 'cüretkâr açılış: ' + src }; };
    if (q === 'size') {
      const m = t.match(/ (\d{1,2})(?:[.,]\d)? ?(cm|santim|santi)? /);
      if (!m) return has(t, ['söylemem', 'ayıp', 'sana ne', 'utandım', 'neden', 'niye']) ? r('flirt_size_shy', 'söylemedi') : null;
      const n = +m[1];
      if (n > 26) return r('flirt_size_liar', 'abartı');
      if (n >= 19) return r('flirt_size_big', 'büyük', { sehvet: 20, uyarilma: 15 }, { arousal: 0.12 });
      if (n >= 14) return r('flirt_size_good', 'ideal', { sehvet: 12, uyarilma: 8 }, { arousal: 0.08 });
      return r('flirt_size_small', 'küçük');
    }
    if (q === 'sexlove') {
      if (has(t, ['hayır', 'sevmem', 'pek değil', 'yok', 'hiç'])) return r('flirt_sex_no', 'sevmem dedi', null, { valence: -0.04 });
      if (has(t, ['evet', 'severim', 'seviyorum', 'tabi', 'hem de', 'çok', 'bayıl', 'kim sevmez', 'sevmez mi', 'olur mu', 'aşığım']))
        return r('flirt_sex_yes', 'severim dedi', { sehvet: 15, uyarilma: 10 }, { arousal: 0.1, valence: 0.04 });
      return null;
    }
    if (q === 'photo') {
      if (has(t, ['hayır', 'idare eder', 'fena değil', 'normal', 'çirkin', 'beğenmedim', 'azmadım', 'eh işte', 'pek değil']))
        return r('flirt_photo_no', 'beğenmedi', { ask: -2 }, { valence: -0.1 });
      if (has(t, ['güzel', 'harika', 'mükemmel', 'muhteşem', 'azd', 'evet', 'çok', 'süper', 'tatlı', 'seksi', 'ateşli', 'vay', 'of', 'bayıl', 'efsane', 'tanrıça', 'kraliçe']) || /🔥|😍|🤤|❤|😈/.test(raw))
        return r('flirt_photo_yes', 'beğendi', { sehvet: 15, uyarilma: 15, ask: 2 }, { valence: 0.08, arousal: 0.1 });
      return null;
    }
    return null;
  }

  return { want, ceiling, pending, cold, pickGift, maybeAsk, ask, fulfill, expire, maybeAskInCall, gate, opener, takePhoto };
})();
