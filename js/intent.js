/*
 * Amor - Niyet katmanı: Carmen'den aktarılan bot kurallarının olay, durum ve soru-cevap cevapları (js/data/bot-rules.js)
 *
 * Carmen'de olaylar butonla eklenir ve bota "evt <etiketler> <kategori> <başlık>" sorgusu gider ("=evt" kuralları).
 * Amor'da olay bölümü yok: kullanıcı yazarak niyetini belli eder. js/data/intent-map.js yazılan metinden olayı bulur,
 * aynı sorgu kurulur. Komut kuralları (r_cmd_*, ör. "dön") kendi cevabından sonra olayı da tetikler.
 * Olaylar gizli parametreleri değiştirir (js/params.js); eşikte olay kendiliğinden olur: Zevk 80 → boşalma, Uyarılma 80 → onun orgazmı.
 * Durum baloncuğu ("=durum" + anahtar): olaydan (ilkkez · gecis… · giris… · hold_… · izin_… · hamilekaldi · kondomkorudu…)
 * ya da parametrelerden (zevkyuksek · korpullout2 · onugeliyor · askyuksek · saatgece · hamile2 · regl…), Carmen botState.
 * Soru-cevap: olaydan sonra ya da soruya cevap verince karakter soru sorar ("=sor" + konu); sonraki "evet / hayır"
 * "=cevap" + konu kurallarıyla cevaplanır, cevaba bağlı olay olur (Carmen BOT_ASK, js/data/carmen-bot.js).
 * Özel sorulara Güven ≤ 15 iken kaçamak cevap ("=kacamak"). {cevap:…} hazır cevapları Carmen BOT_ANS'tan.
 * Sahne (S().scene[karakter id]): pozisyon, fantezi, tempo, kondom, olay / orgazm / boşalma sayıları. 30 dk sessizlikte biter.
 */
window.Amor = window.Amor || {};

Amor.Intent = (() => {
  const S = () => Amor.Store.state;
  const M = () => Amor.INTENT_MAP || { catalog: {}, events: [], cmd: {}, fant: [] };
  const R = () => Amor.BOT_RULES || { rules: [] };
  const B = () => Amor.Bot;
  const P = () => Amor.Params;
  const low = s => String(s || '').toLocaleLowerCase('tr').trim();
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const pickW = list => { let x = Math.random() * list.reduce((s, [w]) => s + w, 0); return (list.find(([w]) => (x -= w) < 0) || list[list.length - 1])[1]; };
  const SCENE_MS = 30 * 60000, ASK_MS = 30 * 60000;
  const POS_CATS = ['forward', 'backward', 'outercourse', 'eat', 'foreplay']; // Carmen "event" kategorileri
  const SEX_CATS = ['forward', 'backward', 'outercourse', 'eat'];

  let CB = null; // Carmen soru-cevap verisi, yardımcılarla bir kez kurulur
  const cb = () => CB || (CB = Amor.CarmenBot ? Amor.CarmenBot(P().helpers())
    : { BOT_ASK: {}, QPRIVATE: [], QCOUNTER: [], QFRAME: {}, yesNo: () => '', BOT_ANS: {} });

  const ev = title => { const x = M().catalog[title]; return x ? { title, cat: x[0], tags: x[1] || [] } : null; };
  const isPos = e => POS_CATS.includes(low(e.cat));
  const isFant = e => low(e.cat) === 'fantesy';
  const isMode = e => low(e.cat) === 'mode';
  const isCum = e => e.tags.includes('boşalma');
  const isOrg = e => e.tags.includes('orgazm');
  const fantKey = e => (M().fant.find(([t]) => low(e.title).startsWith(t)) || [, 'fxdiger'])[1];

  function scene(c) {
    const all = S().scene = S().scene || {};
    const sc = all[c.id] = all[c.id] || { n: {} };
    if (sc.ts && Date.now() - sc.ts > SCENE_MS) return (all[c.id] = { n: sc.n });
    return sc;
  }
  // sexnow: pozisyon / fantezi / tempo sürüyor · sexsonra: az önce boşalma ya da orgazm
  function phase(c) {
    const sc = scene(c);
    if (!sc.ts) return '';
    return sc.done && sc.done >= sc.ts ? 'sexsonra' : sc.pos || sc.fant || sc.mode ? 'sexnow' : '';
  }

  function detect(c, text) {
    const data = R(), live = !!phase(c);
    for (const x of M().events) {
      if (x.scene && !live) continue;
      if (x.words.some(w => B().catches(text, w, data))) return ev(pickTitle(x.titles, c));
    }
    return null;
  }
  // Başlıklardan biri: sevdiği öne çıkar
  function pickTitle(titles, c) {
    if (!Array.isArray(titles) || !titles.length) return null;
    const lk = titles.filter(t => P().feels(c).likes.includes(t));
    return pick(lk.length ? lk : titles);
  }
  // Şu ankinden farklı bir pozisyon: önce sevdikleri, yoksa aynı kategoriden, yoksa herhangi biri
  function otherPos(c) {
    const cur = scene(c).pos, all = Object.keys(M().catalog).filter(t => SEX_CATS.includes(low(M().catalog[t][0])) && (!cur || t !== cur.title));
    const liked = all.filter(t => P().feels(c).likes.includes(t)), same = cur ? all.filter(t => low(M().catalog[t][0]) === low(cur.cat)) : [];
    return pick(liked.length ? liked : same.length ? same : all);
  }

  // Sadece "=tok" kelimelerinin hepsini içeren kurallardan en iyisi (yedek cevap değil)
  function ask(toks, query, c, filter) {
    toks = [].concat(toks);
    const rules = (R().rules || []).filter(r => toks.every(t => (r.when || []).includes('=' + t)) && (!filter || filter(r)));
    if (!rules.length) return null;
    const m = B().best({ ...R(), rules }, query, B().asChar(c));
    return m && !m.fallback ? m : null;
  }
  const hasTok = tok => (R().rules || []).some(r => (r.when || []).includes('=' + tok));

  // Cevap seçeneği kullanılabilir mi: {cevap:…} hazır cevabı yoksa atlanır
  const OK = x => String(x).trim() && [...String(x).matchAll(/\{cevap:([^}]+)\}/g)].every(m => cb().BOT_ANS[m[1].trim()]);
  function reply(rule, vars) {
    const opts = (rule.reply || []).filter(OK);
    return opts.length ? B().reply({ reply: opts }, vars) : [];
  }

  /* ---------- Korunma ---------- */
  // kondom: bu sahnede takıldı; diğerleri: karakterin izin verdiği korunma (js/params.js)
  function prot(c) {
    const a = P().feels(c).allows;
    return { condom: scene(c).prot === 'kondom', pullout: a.includes('Pull-Out Method'), pill: a.includes('Control Pill'),
      morning: a.includes('Morning-After Pill'), nothing: a.includes('Nothing') };
  }
  function korToken(c) {
    if (P().get(c).izinVerdi) return 'koricine';
    const p = prot(c);
    return p.condom ? 'korkondom' : p.pullout ? 'korpullout' : p.pill ? 'korhap' : p.morning ? 'korsabah' : p.nothing ? 'koricine' : 'kordikkat';
  }

  /* ---------- Olay ---------- */
  const MODE_KEY = { gentle: 'mdnaz', passionate: 'mdtutku', assertive: 'mdbaskin', rough: 'mdsert', brutal: 'mdvahsi', inletmeli: 'mdinlet', 'bağırtmalı': 'mdbagir', 'ağlatmalı': 'mdaglat' };
  const band = (v, list) => (list.find(([lo, hi]) => v >= lo && v <= hi) || [])[2] || '';
  const CUM_BAND = [[0, 14, 'Watery Cumming'], [15, 39, 'Low-volume Cumming'], [40, 69, 'Normal Cumming'], [70, 89, 'Thick White Cumming'], [90, 100, 'High Sperm Cumming']];
  const CUMN_BAND = [[0, 0, 'Hyper-concentrated (4/4)'], [1, 1, 'Polyzoospermia (3/4)'], [2, 2, 'Normozoospermia (2/4)'], [3, 4, 'Oligospermia (1/4)'], [5, 20, 'Azoospermia (0/4)']];
  const WOTER_BAND = [[0, 19, 'Drops Woter'], [20, 44, 'Low-volume Woter'], [45, 69, 'Normal Woter'], [70, 89, 'High-volume Woter'], [90, 100, 'Squirt Woter']];
  const MILK_BAND = [[10, 29, 'Drops Milk'], [30, 49, 'Low-volume Milk'], [50, 69, 'Normal Milk'], [70, 89, 'High-volume Milk'], [90, 100, 'Squirt Milk']];

  // Carmen sorgusu: "evt <etiketler> <kategori> <başlık> [fant …] [mod …] [poz <pozisyon> <kategori>] [miktar …] [sivi …]"
  function query(c, e) {
    const sc = scene(c), p = P().get(c), cum = isCum(e), fan = isFant(e);
    const fant = !fan && sc.fant && Math.random() < 0.6 ? ` fant ${sc.fant}` : '';
    const mk = isPos(e) && !cum && low(e.cat) !== 'foreplay' && sc.mode && MODE_KEY[low(sc.mode)];
    const mod = mk && Math.random() < 0.7 ? ` mod ${mk}` : '';
    const pos = (cum || fan) && sc.pos ? ` poz ${sc.pos.title} ${sc.pos.cat}` : '';
    const miktar = cum ? ` miktar ${band(p.me.cum, CUM_BAND)} ${band(p.me.cumN, CUMN_BAND)}` : '';
    const sivi = isOrg(e) ? ` sivi ${band(p.v.sehvet, WOTER_BAND)}${p.hamile ? ' ' + band(p.v.sut, MILK_BAND) : ''}` : '';
    return `evt ${e.tags.join(' ')} ${e.cat} ${e.title}${fant}${mod}${pos}${miktar}${sivi}`;
  }

  // Carmen olay etkileri (Olunca / sonuçlar)
  const EAT_FX = { 'Cunnilingus': { uyarilma: 25, sehvet: 10 }, 'Squirt': { uyarilma: 40, sehvet: 10 }, 'On Mouth': { uyarilma: 15, sehvet: 10 }, 'Facesitting': { uyarilma: 20, sehvet: 10 } };
  const HOLD = {
    'Holding': [[55, { zevk: -20, cum: 10 }], [25, { zevk: -30, cum: 15, cumN: -1 }], [20, { zevk: 100 }]],
    'Cock Ring': [[60, { zevk: -25, cum: 15 }], [30, { zevk: -20, cum: 20, cumN: -1 }], [10, { zevk: 100 }]],
    'Hard Holding': [[50, { zevk: -35, cum: 20, cumN: -1 }], [35, { zevk: -30, cum: 25, cumN: -1 }], [15, { zevk: 100 }]]
  };
  const HURT = { hamilekaldi_istemedi: { guven: -8, ask: -3 }, pulloutkacti: { guven: -5 }, girisdikkat: { guven: -3 }, riskli: { guven: -2 } };

  // Olayı işle: parametreler, sahne, hamilelik. Dönüş: durum { st, p } (p olasılık) ya da null
  function record(c, e) {
    const sc = scene(c), p = P().get(c), t = low(e.title), cat = low(e.cat), n = sc.n[e.title] || 0, pr = prot(c), f = P().feels(c);
    if (cat === 'foreplay') P().add(c, { guven: 1, ask: 5, samimiyet: 4 });
    else if (isPos(e)) P().add(c, { samimiyet: 1, guven: 1 });
    P().add(c, EAT_FX[e.title]);
    if (isPos(e)) P().add(c, { zevk: cat === 'foreplay' ? pickW([[60, 6], [30, 9], [10, 12]]) : pickW([[60, 10], [30, 15], [10, 20]]) }); // pozisyon / ön sevişme zevki
    if (cat === 'backward' && /tight/i.test(P().traitVal(c, 'Anal Size'))) P().add(c, { aci: 15 });
    if (/rough|brutal/.test(t)) P().add(c, { aci: 10 });
    if (HOLD[e.title]) P().add(c, pickW(HOLD[e.title]));
    if (isOrg(e)) { P().add(c, { sut: -30, ask: 5, guven: 2, uyarilma: -100 }); sc.orgN = (sc.orgN || 0) + 1; }
    if (isCum(e)) { P().add(c, { cumN: 1, cum: -30, zevk: -100 }); sc.cumN = (sc.cumN || 0) + 1; }

    let out = null;
    if (cat === 'protection') {
      const k = /condom/.test(t) ? 'kondom' : /control/.test(t) ? 'hap' : /morning/.test(t) ? 'sabah' : /pull/.test(t) ? 'pullout' : t === 'nothing' ? 'nothing' : 'diger';
      if (k === 'kondom') sc.prot = 'kondom';
      if (k === 'sabah' && p.hamile && Math.random() < 0.85) P().setPregnant(c, false);
      const ok = f.allows.includes(e.title), red = f.denies.includes(e.title);
      out = { st: `izin_${ok ? 'ok' : red ? 'red' : 'notr'}_${k}`, p: 1 };
      if (red) P().add(c, { guven: -3 });
    } else if (HOLD[e.title]) {
      out = { st: 'hold_' + (p.hamile ? 'icine' : pr.condom ? 'kondom' : pr.nothing ? 'icine' : pr.pill ? 'hap' : pr.pullout ? 'pullout' : pr.morning ? 'sabah' : 'dikkat'), p: 1 };
    } else if (isCum(e) && e.tags.includes('vajinal')) {
      // 🤰 önden bitiş: hamile kaldı · zaten hamile · kondom korudu · hap · içime istedi · sabah hapı · çıkarmadın · riskli
      const was = p.hamile;
      let preg = false;
      if (!was && !pr.condom && !pr.pill && Math.random() < P().pregChance(c)) { P().setPregnant(c, true); preg = true; }
      const s = preg ? (pr.nothing || p.izinVerdi ? 'hamilekaldi' : 'hamilekaldi_istemedi') : was ? 'hamileyken'
        : pr.condom ? 'kondomkorudu' : pr.pill ? 'haplakorundu' : p.izinVerdi ? 'icineistedi' : pr.morning ? 'sabahhap' : pr.pullout ? 'pulloutkacti' : pr.nothing ? 'icineistedi' : 'riskli';
      out = { st: s, p: 1 };
      p.izinVerdi = false;
      p.israr = 0;
    } else if (isPos(e) && e.tags.includes('vajinal') && !sc.giris && !p.hamile) {
      sc.giris = true;
      out = { st: pr.condom ? 'giriskondomlu' : pr.nothing ? 'girisicine' : pr.pill ? 'girishap' : pr.pullout ? 'girispullout' : pr.morning ? 'girissabah' : 'girisdikkat', p: 1 };
    } else if (isPos(e) && sc.pos && low(sc.pos.cat) !== cat) {
      out = { st: 'gecis' + cat, p: 1 };
    } else if (isPos(e) || isCum(e) || isOrg(e)) {
      out = { st: n === 0 ? 'ilkkez' : n >= 2 ? 'hepbunu' : 'yine', p: 0.5 };
    }
    if (out && HURT[out.st]) P().add(c, HURT[out.st]);

    sc.n[e.title] = n + 1;
    sc.ts = Date.now();
    if (isPos(e)) sc.pos = { title: e.title, cat: e.cat };
    if (isFant(e)) sc.fant = fantKey(e);
    if (isMode(e)) sc.mode = e.title;
    if (isCum(e)) { sc.done = sc.ts; sc.giris = false; if (sc.prot === 'kondom') sc.prot = null; }
    if (isOrg(e)) sc.done = sc.ts;
    return out;
  }

  // ⚡ Eşik: Zevk 80 → şu anki pozisyona uyan boşalma, Uyarılma 80 → onun orgazmı
  function trigger(c, e) {
    const p = P().get(c);
    if (!isCum(e) && p.me.zevk >= 80) {
      const pos = scene(c).pos && ev(scene(c).pos.title), tags = pos ? pos.tags : [];
      const cands = Object.keys(M().catalog).filter(t => { const x = ev(t); return low(x.cat) === 'cumming' && isCum(x) && x.tags.some(g => g !== 'boşalma' && tags.includes(g)); });
      return ev(cands.length ? pick(cands) : 'Boşalma');
    }
    if (!isOrg(e) && p.v.uyarilma >= 80) return ev('Orgazm');
    return null;
  }

  // ❔ Şimdi sorulabilecek soru konusu (Carmen askTopic)
  function askTopic(c, done) {
    const A = cb().BOT_ASK, pos = scene(c).pos && ev(scene(c).pos.title);
    const ctx = { cat: pos ? low(pos.cat) : '', vaj: !!pos && pos.tags.includes('vajinal'), zevk: P().val(c, 'zevk'), done };
    if (done) {
      const anal = !P().feels(c).dislikes.some(t => (ev(t) || { tags: [] }).tags.includes('anal')) && P().traitVal(c, 'Experience') !== 'Virgo';
      const r = Math.random();
      return anal && r < 0.4 ? 'arkaistek' : r < 0.75 ? 'pozistek' : 'tekrar';
    }
    if (A.icine && A.icine.ok(ctx) && Math.random() < 0.6) return 'icine';
    if (A.begen && A.begen.ok(ctx) && Math.random() < 0.4) return 'begen';
    const ok = Object.keys(A).filter(k => !['tekrar', 'icine', 'begen', 'arkaistek', 'pozistek'].includes(k) && A[k].ok(ctx));
    return ok.length ? pick(ok) : '';
  }
  // Karakter soru sorar ("=sor" + konu); sonraki evet / hayır buna göre cevaplanır
  function askQ(c, t, vars, parts) {
    const m = t && ask(['sor', t], `sor ${t}`, c);
    if (!m) return;
    const q = reply(m.rule, vars);
    if (!q.length) return;
    parts.push(...q);
    P().get(c).ask = { t, ts: Date.now() };
  }

  // Olaya cevap (+ eşikle gelen olay, + bazen soru). Dönüş: { parts, rule, st, olay }
  function eventTurn(c, e, vars, depth = 0) {
    const f = P().feels(c), mood = f.likes.includes(e.title) ? 'sever' : f.dislikes.includes(e.title) ? 'sevmez' : '';
    const q = query(c, e), s0 = record(c, e);
    const m = (mood && ask(mood, `${q} ${mood}`, c)) || ask('evt', q, c);
    const out = { parts: m ? reply(m.rule, vars) : [], rule: m && m.rule, st: s0 && Math.random() < s0.p ? s0.st : null, olay: e.title };
    if (m) P().outs(c, m.rule.id);
    if (depth) return out;
    const t = trigger(c, e);
    if (t) {
      const r = eventTurn(c, t, vars, 1);
      out.parts.push(...r.parts);
      out.rule = out.rule || r.rule;
      out.st = r.st || out.st;
      out.olay = t.title;
      e = t;
    }
    if (Math.random() < (isCum(e) || isOrg(e) ? 0.6 : 0.3)) askQ(c, askTopic(c, isCum(e) || isOrg(e)), vars, out.parts);
    return out;
  }

  /* ---------- Durum (Carmen botState): talk = normal sohbet mesajı ---------- */
  function botState(c, talk) {
    const v = l => P().val(c, l), p = P().get(c), sc = scene(c);
    const a = v('aşk'), guv = v('güven'), sam = v('samimiyet'), kis = v('kıskançlık');
    const rel = kis >= 60 ? 'kiskanc' : a >= 70 ? 'askyuksek' : guv <= 15 ? 'guvendusuk' : a >= 40 ? 'askorta' : sam >= 60 ? 'samimi' : guv >= 70 ? 'guvenyuksek' : '';
    const hr = new Date().getHours();
    const tm = hr >= 22 || hr <= 4 ? 'saatgece' : hr <= 10 ? 'saatsabah' : hr >= 18 ? 'saataksam' : '';
    if (talk && rel) return rel;
    if (talk && tm) return tm;
    const z = v('zevk'), cum = v('cum'), n = v('cumN');
    const pos = sc.pos && ev(sc.pos.title), vaj = !!pos && pos.tags.includes('vajinal');
    if (vaj && z >= 30 && !p.hamile && P().cyclePhase(c) === 'riskli' && Math.random() < 0.35) { const pr = prot(c); if (!pr.pill && !pr.condom) return 'riskligun'; }
    if (vaj && !p.hamile) {
      const k = korToken(c);
      if (['korpullout', 'korsabah', 'kordikkat'].includes(k) && z >= 30) return k + (z >= 75 ? 3 : z >= 55 ? 2 : 1);
      if (z >= 50) return k;
    }
    const aci = v('acı'), ua = v('uyarılma'), sh = v('şehvet'), sut = v('süt');
    if (aci >= 60) return 'acili';
    if (z >= 70) return cum >= 80 && Math.random() < 0.5 ? 'zevkdolu' : cum <= 20 && Math.random() < 0.5 ? 'zevkbos' : 'zevkyuksek';
    if (ua >= 60) return 'onugeliyor';
    if (n >= 3) return 'cumcok';
    if ((sc.orgN || 0) >= 3) return 'onyorgun';
    if (cum >= 80 && z >= 20 && (z < 40 || Math.random() < 0.35)) return 'cumdolu';
    if (p.hamile && sut >= 70) return 'sutdolu';
    if (sh >= 80) return 'onazgin';
    if (cum <= 20 && phase(c)) return 'cumbos';
    if (z >= 40) return 'zevkorta';
    if (aci >= 30 && Math.random() < 0.5) return 'aciorta';
    if (phase(c) === 'sexnow' && Math.random() < 0.4) return 'destek';
    if (phase(c) && hr >= 1 && hr <= 5) return 'saatgecesex';
    if (rel) return rel;
    if (p.hamile) { const w = P().pregWeek(c); return Math.random() < 0.3 ? 'hamile' : w >= 27 ? 'hamile3' : w >= 13 ? 'hamile2' : 'hamile1'; }
    if (talk && P().cyclePhase(c) === 'regl' && Math.random() < 0.3) return 'regl';
    return '';
  }
  // Kuralı yoksa genel hâline düşer: "korpullout3" → "korpullout", "izin_red_hap" → "izin_red"; kişilik varyantı (r_pk_) çoğu zaman öne geçer
  function stateParts(c, st, vars) {
    const s2 = [st, st.replace(/\d$/, ''), st.replace(/_[^_]+$/, '')].find(hasTok);
    const pk = Math.random() < 0.7;
    const m = s2 && ask(s2, `durum ${s2}`, c, r => pk || !String(r.id).startsWith('r_pk_'));
    return m ? reply(m.rule, vars) : [];
  }

  // 😤 başka bir kızdan bahsetti (Kıskanç ya da Kıskançlık 50+)
  const OTHER = / (eski sevgili|başka bir kız|başka kız|kız arkadaşım|bir kızla|biriyle tanıştım|eski karım|eski sevgilim) /;
  const jealous = (c, text) => OTHER.test(B().norm(text)) && (P().traits(c).includes('Kıskanç') || P().val(c, 'kıskançlık') >= 50);
  const cmdKey = id => String(id || '').replace(/_(shy|exp|sever|sevmez)$/, '').replace(/\d+$/, '');

  /* Bot cevabı: { line ('|' ile baloncuklar), rule, src, event } ya da null.  br: Bot.best(metin) sonucu */
  function turn(c, text, br) {
    const p = P().get(c), vars = { sen: P().hitap(c), ben: c.name.split(' ')[0] };
    const hit = br && !br.fallback ? br : null;
    const out = { parts: [], rule: null, src: '' };
    const use = (m, src) => { out.parts.push(...reply(m.rule, vars)); out.rule = out.rule || m.rule; out.src = out.src || src; P().outs(c, m.rule.id); };
    let e = null, st = null, olay = null, other = '';

    // ❔ önceki sorusuna evet / hayır: "=cevap" + konu kuralı, sonra cevaba bağlı olay
    const pend = p.ask && Date.now() - p.ask.ts < ASK_MS ? p.ask : null;
    p.ask = null;
    const yn = pend ? cb().yesNo(text) : '';
    if (yn) {
      const m = ask(['cevap', pend.t], `cevap ${pend.t} ${yn} ${korToken(c)}`, c);
      if (m) use(m, 'soru-cevap: ' + pend.t);
      const a = cb().BOT_ASK[pend.t], list = a && a[yn === 'evet' ? 'yes' : 'no'];
      const t = list === '@pos' ? (scene(c).pos || {}).title : list === '@other' ? otherPos(c) : pickTitle(list, c);
      e = t ? ev(t) : null;
    }
    // 🗣️ komut kuralı: kendi cevabı, ardından olay
    const key = !yn && hit && cmdKey(hit.rule.id);
    if (key && M().cmd[key]) { use(hit, 'bot kuralı'); e = ev(pickTitle(M().cmd[key], c)); }
    if (!e && !yn) e = detect(c, text);

    if (e) {
      const r = eventTurn(c, e, vars);
      out.parts.push(...r.parts);
      out.rule = out.rule || r.rule;
      out.src = out.src || 'niyet: ' + e.title;
      st = r.st;
      olay = r.olay;
    } else if (!out.parts.length) {
      const sx = phase(c), jm = jealous(c, text) && ask('kiskanc', 'kiskanc', c);
      const sm = !jm && sx && ask(sx, `${text} ${sx}`, c);
      const pk = !jm && !sm && Math.random() < 0.5 && ask([], text, c, r => String(r.id).startsWith('r_pk_') && !(r.when || []).includes('=durum'));
      if (jm) { use(jm, 'niyet: kıskançlık'); other = 'o kız'; P().add(c, { kiskanclik: 6 }); }
      else if (sm) use(sm, 'niyet: ' + sx);
      else if (pk) use(pk, 'bot kuralı (kişilik)');
      else if (hit) use(hit, 'bot kuralı');
      // sevişirken her mesaj ikisini de biraz daha yaklaştırır; eşiği geçen olay kendiliğinden olur
      if (sx === 'sexnow') {
        P().add(c, { zevk: pickW([[60, 3], [40, 5]]), uyarilma: pickW([[60, 3], [40, 6]]) });
        const t = trigger(c, { tags: [] });
        if (t) { const r = eventTurn(c, t, vars); out.parts.push(...r.parts); out.rule = out.rule || r.rule; out.src = out.src || 'niyet: ' + t.title; st = r.st; olay = t.title; e = t; }
      }
    }
    if (!out.parts.length) return null;

    // ❓ soruya cevap: özel soruya Güven ≤ 15 iken kaçamak
    const qid = String(out.rule.id), isQ = qid.startsWith('r_q');
    const intimate = isQ && cb().QPRIVATE.some(x => qid.startsWith(x)) && P().val(c, 'güven') <= 15;
    if (intimate) { const km = ask('kacamak', 'durum kacamak', c); if (km) out.parts = reply(km.rule, vars); }
    // 🙏 içine boşalmak için ısrar: kaçıncı ısrar; razı olursa bu tur içine istiyormuş gibi
    if (qid.startsWith('r_israr')) {
      const n = p.israr = (p.israr || 0) + 1, a = P().val(c, 'aşk'), k = korToken(c);
      if ((k === 'korpullout' && n >= 3 && a >= 70) || (k === 'korsabah' && n >= 2) || (k === 'kordikkat' && n >= 3 && a >= 80)) p.izinVerdi = true;
    }

    // 📊 durum baloncuğu: olaydan gelen ya da parametrelerden (ısrarcı korunma uyarıları her zaman)
    if (!st && !isQ) {
      const s = botState(c, !e && !phase(c));
      if (s && (/^kor\w+[23]$/.test(s) || Math.random() < (phase(c) ? 0.65 : 0.25))) st = s;
    }
    if (st) out.parts.push(...stateParts(c, st, vars));
    // ❔ soruya cevap verdiyse bazen karşı soru
    if (isQ && !intimate && Math.random() < 0.4) askQ(c, (cb().QCOUNTER.find(([x]) => qid.startsWith(x)) || [, 'k_genel'])[1], vars, out.parts);

    const sc = scene(c);
    const ctx = { olay, other, kor: korToken(c), israr: p.israr || 0, text: e ? '' : text, orgN: sc.orgN || 0, cumN: sc.cumN || 0 };
    const parts = out.parts.map(x => fill(c, x, ctx));
    // 🎭 soru cevabında kişiliğe göre çerçeve
    if (isQ && !intimate && Math.random() < 0.6) {
      const fr = P().traits(c).map(t => cb().QFRAME[t]).filter(Boolean), fx = fr.length && pick(fr);
      if (fx && fx.pre) parts[0] = pick(fx.pre) + parts[0];
      if (fx && fx.add) parts[0] += pick(fx.add);
    }
    // event: olay ya da soru-cevap oldu (motor bunu tekrar tepkisine / kümeye ezdirmez)
    return { line: parts.join('|'), rule: out.rule, src: out.src, event: !!(e || yn) };
  }

  /* ---------- Yer tutucular (Carmen fillTraits) ---------- */
  const sample = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);
  const inCats = (list, cats) => list.filter(t => cats.includes(low((M().catalog[t] || [''])[0])));
  const titles = (list, n, none) => { const x = sample(list, n); return x.length ? x.join(' ve ') : none; };
  function hatira(c) {
    const mem = Amor.Memory.get(c), f = mem.facts, out = [];
    if (S().user.name) out.push(`Adının ${S().user.name} olduğunu unutur muyum hiç 😌`);
    if (f.age) out.push(`${f.age} yaşındasın, hatırlıyorum 😏`);
    if (f.city) out.push(`${f.city} diyordun, bir gün gelirim belki 😏`);
    if (f.job) out.push('İşler nasıl, yorulmuyor musun? 💼');
    if (f.pet) out.push(`${f.pet} nasıl? Ona selam söyle 🐾`);
    mem.likes.forEach(v => out.push(`${v} sevdiğini unutmadım 😏`));
    return out.length ? pick(out) : pick(['Seni daha çok tanımak istiyorum 😏', 'Bana kendinden bahsetsene 🥺']);
  }
  function fill(c, s, ctx = {}) {
    const f = P().feels(c);
    return String(s)
      .replace(/\{ö:([^}]+)\}/g, (x, g) => P().traitVal(c, g.trim()) || '?')
      .replace(/\{sever\}/g, () => titles(f.likes, 2, 'sürprizleri'))
      .replace(/\{sevmez\}/g, () => titles(f.dislikes, 2, 'pek bir şeyi'))
      .replace(/\{izin\}/g, () => titles(f.allows, 2, 'hiçbir şeyi'))
      .replace(/\{izinyok\}/g, () => titles(f.denies, 2, 'hiçbir şeyi'))
      .replace(/\{olay\}/g, () => ctx.olay || 'bunu')
      .replace(/\{diger\}/g, () => ctx.other || 'o kız')
      .replace(/\{ad\}/g, () => S().user.name || 'sen')
      .replace(/\{hatıra\}/g, () => hatira(c))
      .replace(/\{pozisyon\}/g, () => titles(inCats(f.likes, SEX_CATS), 2, 'sürpriz pozisyonları'))
      .replace(/\{fantezi\}/g, () => titles(inCats(f.likes, ['fantesy']), 2, 'bunu sana söylemem'))
      .replace(/\{mod\}/g, () => titles(inCats(f.likes, ['mode']), 1, 'duruma göre'))
      .replace(/\{cevap:([^}]+)\}/g, (x, k) => (cb().BOT_ANS[k.trim()] || (() => ''))(P().ch(c), ctx));
  }

  // Tek bot cevabı (yedek kurallar vb.): baloncuklar '|' ile, {sen} {ben} ve yer tutucular dolu
  const line = (c, x) => fill(c, String(x).split('||').join('|')
    .replace(/\{sen\}/gi, P().hitap(c)).replace(/\{ben\}/gi, c.name.split(' ')[0]));

  return { turn, line, fill, detect, phase, OK };
})();
