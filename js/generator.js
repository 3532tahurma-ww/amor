/*
 * Amor - Karakter oluşturucu
 * --------------------------
 * Bir karakter = fotoğraf seti (characters/<klasör>/photos) + isim havuzundan bir isim
 *               + kişilik arketipi + bunlara uygun rastgele kimlik.
 *
 * Kayıtta sadece "kimlik" saklanır (Store.characters). Uygulama açılınca her kimlik,
 * arketipinin cümleleri ve yazım tarzıyla birleştirilip Amor.CHARACTERS'a yüklenir.
 */
window.Amor = window.Amor || {};

Amor.Gen = (() => {
  const S = () => Amor.Store.state;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const int = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const jitter = v => Math.round(Math.max(0.05, Math.min(0.95, v + rnd(-0.08, 0.08))) * 100) / 100;

  const setById = id => Amor.PHOTO_SETS.find(s => s.id === id);
  // Fotoğraflar characters/<set>/photos/ ya da doğrudan characters/<set>/ altında olabilir
  const photoUrl = (setId, file) => {
    const set = setById(setId);
    const dir = set && set.dir !== undefined ? set.dir : 'photos/';
    return `characters/${encodeURIComponent(setId)}/${dir}${encodeURIComponent(file)}`;
  };

  function daysAgo(n) {
    const d = new Date(Date.now() - n * 86400000);
    return d.toISOString().slice(0, 10);
  }

  /* ---------- Havuzdan seçim ---------- */
  const usedSets = (exceptId) => new Set(S().characters.filter(c => c.id !== exceptId).map(c => c.setId));
  const usedNames = () => new Set(S().characters.map(c => c.name));

  // En az kullanılan fotoğraf setlerinden biri. Bir set birden çok karakterde kullanılabilir;
  // her karakter setten farklı bir fotoğrafı profil yapar (pickProfile).
  function randomSet() {
    const count = {};
    Amor.PHOTO_SETS.forEach(s => { if (s.id !== RANDOM) count[s.id] = 0; }); // random kişileri sadece kendi fotoğraflarından doğar
    S().characters.forEach(c => { if (c.setId in count) count[c.setId]++; });
    // önce boşta profil fotoğrafı kalan setler (kişi sayısı < fotoğraf sayısı), aralarından en az kullanılan
    const sets = Amor.PHOTO_SETS.filter(s => s.id in count);
    const roomy = sets.filter(s => count[s.id] < setFiles(s).length);
    const pool = roomy.length ? roomy : sets;
    const min = Math.min(...pool.map(s => count[s.id]));
    return pick(pool.filter(s => count[s.id] === min)).id;
  }

  // Hediye niyeti (js/wish.js): kişilikten (GIFT_LOVE) türetilir, kişiye göre oynar
  const giftWant = archId => Math.round(Math.max(0.05, Math.min(0.95, (Amor.GIFT_LOVE[archId] ?? 1) * 0.5 + rnd(-0.2, 0.25))) * 100) / 100;
  // Hediye zevki: kişilik tabanı × kişiye özgü sapma (çoğu ×0.4-2.5, azı ×5'e kadar)
  const giftTaste = archId => Math.round((Amor.GIFT_TASTE[archId] ?? 1) * Math.exp((Math.random() + Math.random() - 1) * 1.6) * 10) / 10;

  // Ajans (js/agency.js): ağırlığa göre; AGENCY_FREE oranında bağımsız (null)
  function pickAgency() {
    const list = Amor.AGENCIES || [];
    if (!list.length || Math.random() < (Amor.AGENCY_FREE ?? 0.2)) return null;
    let r = Math.random() * list.reduce((a, x) => a + x.weight, 0);
    for (const x of list) { r -= x.weight; if (r <= 0) return x.id; }
    return list[0].id;
  }

  const setFiles = set => set ? [set.profile, ...set.photos] : [];
  /* characters/random: karışık fotoğraflar; her fotoğraf ayrı bir kişi. Bu setten karakter sadece kendi tek fotoğrafını
   * kullanır (profil = kapak = albüm, gönderiler fotoğrafsız); diğer setlerdeki gibi bütün fotoğrafları kullanmaz. */
  const RANDOM = 'random';
  const extraFiles = (set, profile) => (set && set.id !== RANDOM ? setFiles(set).filter(f => f !== profile) : []);
  // Setteki en az profil yapılmış fotoğraf; eşitlikte setin kendi profil fotoğrafı öne çıkar
  function pickProfile(setId, exceptId) {
    const set = setById(setId);
    if (!set) return null;
    const used = {};
    S().characters.forEach(c => {
      if (c.id === exceptId || c.setId !== setId) return;
      const p = setFiles(set).includes(c.profile) ? c.profile : set.profile;
      used[p] = (used[p] || 0) + 1;
    });
    const min = Math.min(...setFiles(set).map(f => used[f] || 0));
    const free = setFiles(set).filter(f => (used[f] || 0) === min);
    return free.includes(set.profile) ? set.profile : pick(free);
  }

  function randomName() {
    const used = usedNames();
    const all = Object.values(Amor.NAMES).flat();
    const free = all.filter(n => !used.has(n));
    return pick(free.length ? free : all);
  }

  function eraOf(name) {
    for (const [era, list] of Object.entries(Amor.NAMES)) if (list.includes(name)) return era;
    return 'modern';
  }

  // İsim + kişilik -> yaş aralığı (18-50)
  function ageRange(name, archId) {
    let [lo, hi] = Amor.NAME_AGE[eraOf(name)];
    if (archId === 'olgun') { lo = Math.max(lo, 25); hi = Math.max(hi, 34); }
    return [Math.max(18, lo), Math.min(50, Math.max(lo, hi))];
  }

  // Kişiliğe ve yaşa uygun meslek
  function pickJob(archId, age) {
    const fitsAge = j => age >= (j.min || 18) && age <= (j.max || 50);
    const fits = Amor.JOBS.filter(j => j.arch.includes(archId) && fitsAge(j));
    const students = fits.filter(j => j.student);
    const workers = fits.filter(j => !j.student);
    if (age <= 21 && students.length) return pick(students);
    if (age <= 24 && students.length && Math.random() < 0.5) return pick(students);
    if (workers.length) return pick(workers);
    // kişiliğe uyan yoksa yaşa uyan herhangi bir meslek
    return pick(fits.length ? fits : Amor.JOBS.filter(j => !j.student && fitsAge(j)));
  }

  const fillSimple = (s, ctx) => s
    .replace(/\{fav\}/g, ctx.fav)
    .replace(/\{like\}/g, ctx.likes[0]);

  /* ---------- Kimlik üret ----------
   * opts: { setId, name, archetype } verilenler korunur, diğerleri rastgele */
  function draft(opts = {}) {
    const setId = opts.setId || randomSet();
    const name = (opts.name || randomName()).trim();
    const arch = Amor.archetype(opts.archetype || pick(Amor.ARCHETYPES).id);
    const [lo, hi] = ageRange(name, arch.id);
    const age = int(lo, hi);
    const city = pick(Amor.CITIES);
    const job = pickJob(arch.id, age);
    const height = int(156, 177);
    const likes = shuffle(arch.likes).slice(0, 5);
    const set = setById(setId);
    const profile = opts.profile || pickProfile(setId);
    const ctx = { fav: city.fav, likes };
    const captions = shuffle(arch.captions);
    const postPhotos = shuffle(extraFiles(set, profile)).slice(0, 3);
    const dislikes = shuffle(arch.dislikes).slice(0, 3);
    let day = int(0, 4);

    return {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
      setId,
      profile,
      giftWant: giftWant(arch.id),
      giftTaste: giftTaste(arch.id),
      agency: pickAgency(),
      name,
      deco: Math.random() < 0.4 ? pick(Amor.NAME_DECOS) : ['', ''],
      archetype: arch.id,
      age,
      cityName: city.name,
      district: pick(city.districts),
      job: job.title,
      height,
      weight: height - 108 + int(-4, 4),
      zodiac: pick(Amor.ZODIACS),
      bio: fillSimple(pick(arch.bios), ctx),
      likes,
      dislikes,
      big5: Object.fromEntries(Object.entries(arch.big5).map(([k, v]) => [k, jitter(v)])),
      // takipçi / takip / hediye sayıları uydurulmaz: gerçek ilişkilerden sayılır (js/background.js social)
      joined: daysAgo(int(0, 120)),
      posts: postPhotos.map((p, i) => {
        day += int(3, 14);
        return { photo: p, text: fillSimple(captions[i % captions.length], ctx), date: daysAgo(day) };
      })
    };
  }

  /* ---------- Ekran adı (Amor.NAME_STYLES) ----------
   * Stil kayıtta yoksa kimlikten sabit türetilir (her açılışta aynı). Elle tanımlanan karakterlere dokunulmaz. */
  const nicks = new Map(); // karakter id -> takma ad
  const hashOf = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  function styledName(id) {
    const name = id.name;
    if ((Amor.CUSTOM_CHARACTERS || []).some(d => d.id === id.id)) return name;
    const h = hashOf(id.id);
    let style = id.nameStyle;
    if (style === undefined) {
      const total = Amor.NAME_STYLES.reduce((a, s) => a + s[1], 0);
      let r = h % total;
      style = Amor.NAME_STYLES.find(s => (r -= s[1]) < 0)[0];
    }
    const at = list => list[(h >>> 8) % list.length];
    const up = s => s.toLocaleUpperCase('tr'), low = s => s.toLocaleLowerCase('tr');
    switch (style) {
      case 'upper': return up(name);
      case 'lower': return low(name);
      case 'stretch': return name + name.slice(-1).repeat(1 + (h >>> 4) % 2);
      case 'paren': { const b = at(Amor.NAME_BRACKETS); return b[0] + up(name) + b[1]; }
      case 'az': return name.replace(/e/g, 'ə') + name.slice(-1);
      case 'nick': {
        // aynı takma ad iki kişide olmasın: doluysa listede sıradakine geç
        if (!nicks.has(id.id)) {
          const taken = new Set(nicks.values()), L = Amor.NICKNAMES;
          const fill = n => n.replace(/\{name\}/g, name).replace(/\{low\}/g, low(name).replace(/\s+/g, ''));
          let i = (h >>> 8) % L.length, k = 0;
          while (taken.has(fill(L[i])) && k++ < L.length) i = (i + 1) % L.length;
          nicks.set(id.id, fill(L[i]));
        }
        return nicks.get(id.id);
      }
      default: return name;
    }
  }

  /* ---------- Kimlik + arketip -> çalışan karakter ---------- */
  function hydrate(id) {
    const arch = Amor.archetype(id.archetype);
    const city = Amor.CITIES.find(c => c.name === id.cityName) || Amor.CITIES[0];
    const job = Amor.JOBS.find(j => j.title === id.job) || Amor.JOBS[0];
    const set = setById(id.setId);
    const prof = set && setFiles(set).includes(id.profile) ? id.profile : set && set.profile;
    const rest = extraFiles(set, prof);
    const deco = id.deco || ['', ''];
    const shown = styledName(id);
    return {
      ...id,
      display: (deco[2] ? deco[0] + shown + deco[1] : `${deco[0]} ${shown} ${deco[1]}`).trim(),
      city: city.name, cityAt: city.at, fav: city.fav,
      jobIs: job.is, doing: job.doing,
      archLabel: arch.label, emoji: arch.icon, colors: arch.colors,
      style: arch.style, hitap: arch.hitap, lines: arch.lines, questions: arch.questions, mood: arch.mood, giftLines: arch.gift, sweet: arch.sweet || [],
      photo: set ? photoUrl(set.id, prof) : null,
      cover: set ? photoUrl(set.id, rest[0] || prof) : null,
      album: set ? [prof, ...rest].map(f => photoUrl(set.id, f)) : [],
      posts: (id.posts || []).map(p => ({ ...p, photo: set && p.photo ? photoUrl(set.id, p.photo) : null }))
    };
  }

  // Karakterin gönderilerine setinden fotoğraf dağıt (setteki dosyalar değişince de)
  function repost(c) {
    const photos = shuffle(extraFiles(setById(c.setId), c.profile));
    c.posts = (c.posts || []).map((p, i) => ({ ...p, photo: photos[i] || null }));
  }

  function load() {
    let changed = false;
    // Fotoğraf seti silinmiş/yeniden adlandırılmış karakterlere boştaki yeni bir set ata
    S().characters.forEach(c => {
      if (c.traits || c.traitRoll) { delete c.traits; delete c.traitRoll; changed = true; } // huylar kaldırıldı (yerine Küme kişilik havuzları)
      if (c.giftWant == null) { c.giftWant = giftWant(c.archetype); changed = true; }
      if (c.giftTaste == null) { c.giftTaste = giftTaste(c.archetype); changed = true; }
      if (c.agency === undefined) { c.agency = pickAgency(); changed = true; }
      const cur = setById(c.setId);
      if (cur) {
        // profil fotoğrafı yoksa (eski kayıt) ya da setten silindiyse setten yenisini seç
        if (!setFiles(cur).includes(c.profile)) { c.profile = pickProfile(c.setId, c.id); changed = true; }
        // setteki dosyalar değiştiyse olmayan fotoğrafa (ya da profile) işaret eden gönderileri yenile
        if ((c.posts || []).some(p => p.photo && !extraFiles(cur, c.profile).includes(p.photo))) { repost(c); changed = true; }
        return;
      }
      const used = usedSets(c.id);
      const free = Amor.PHOTO_SETS.filter(s => !used.has(s.id));
      const set = pick(free.length ? free : Amor.PHOTO_SETS);
      if (!set) return;
      c.setId = set.id;
      c.profile = pickProfile(set.id, c.id);
      repost(c);
      changed = true;
    });
    if (changed) Amor.Store.save();
    Amor.CHARACTERS = S().characters.map(hydrate);
  }

  /* Yeni "An" paylaşımı (app.js zamanlayıcısı): setinden henüz paylaşmadığı bir fotoğrafla; fotoğrafı kalmadıysa
   * (ya da random setindense) yazı paylaşır. Eski gönderilerin sırası bozulmasın diye sona eklenir (Akış'taki
   * beğeni/yorum anahtarları sıraya bağlı); gösterimde tarihe göre sıralanır. En fazla MAX_POSTS. */
  const MAX_POSTS = 24;
  // ts verilirse geçmiş tarihli paylaşım (js/background.js warmup): kaydetmez ve yüklemez, çağıran sonda bir kez yükler
  function addPost(id, ts) {
    const c = S().characters.find(x => x.id === id);
    if (!c || (c.posts || []).length >= MAX_POSTS) return null;
    const arch = Amor.archetype(c.archetype);
    const city = Amor.CITIES.find(x => x.name === c.cityName) || Amor.CITIES[0];
    const shared = new Set((c.posts || []).map(p => p.photo));
    const fresh = extraFiles(setById(c.setId), c.profile).filter(f => !shared.has(f));
    const when = ts || Date.now();
    const post = { photo: fresh.length ? pick(fresh) : null, text: fillSimple(pick(arch.captions), { fav: city.fav, likes: shuffle(c.likes || ['']) }),
      date: new Date(when).toISOString().slice(0, 10), ts: when };
    c.posts = [...(c.posts || []), post];
    if (ts) return post;
    Amor.Store.save();
    load();
    return post;
  }

  function add(identity) {
    S().characters.unshift(identity);
    Amor.Store.save();
    load();
    return Amor.byId(identity.id);
  }

  function remove(id) {
    const s = S();
    // elle tanımlanan karakter silinince bir daha eklenmesin
    if ((Amor.CUSTOM_CHARACTERS || []).some(d => d.id === id)) s.customRemoved = [...(s.customRemoved || []), id];
    s.characters = s.characters.filter(c => c.id !== id);
    ['moods', 'moodLog', 'chats', 'affinity', 'unread', 'follows', 'recent', 'expect', 'pending'].forEach(k => delete s[k][id]);
    Amor.Store.save();
    load();
  }

  /* İlk açılışta (ya da sürüm yükselince bir kez) karakter sayısını hedefe tamamlar.
   * Kişilikler eşit dağılır. Sonradan silinen karakterler geri gelmez. */
  const SEED_TARGET = 50, SEED_VERSION = 2;
  function seed() {
    const s = S();
    syncCustom();
    if ((s.seedVersion || 0) >= SEED_VERSION) return spawnNewSets();
    while (s.characters.length < SEED_TARGET) {
      const count = {};
      Amor.ARCHETYPES.forEach(a => { count[a.id] = 0; });
      s.characters.forEach(c => { count[c.archetype] = (count[c.archetype] || 0) + 1; });
      const min = Math.min(...Object.values(count));
      const arch = pick(Amor.ARCHETYPES.filter(a => count[a.id] === min)).id;
      s.characters.push(draft({ archetype: arch }));
    }
    s.seedVersion = SEED_VERSION;
    spawnNewSets();
    Amor.Store.save();
  }

  /* characters/ klasörüne yeni eklenen her fotoğraf seti için bir kez CHARS_PER_SET karakter (fotograf-ekle.bat);
   * setin fotoğrafı yetmiyorsa daha az. Her biri setten farklı bir profil fotoğrafı alır.
   * Görülmüş setler hatırlanır; silinen karakterin seti yeniden karakter doğurmaz.
   * FILL_VERSION artınca mevcut setler de bir kez CHARS_PER_SET'e tamamlanır. */
  const CHARS_PER_SET = 2, FILL_VERSION = 1, TOTAL_TARGET = 500;
  function spawnNewSets() {
    const s = S();
    const known = new Set(s.knownSets || []);
    const used = usedSets();
    const fill = (s.fillVersion || 0) < FILL_VERSION;
    const per = x => Math.min(CHARS_PER_SET, setFiles(x).length);
    const has = x => s.characters.filter(c => c.setId === x.id).length;
    let made = 0;
    Amor.PHOTO_SETS.forEach(x => {
      if (x.id === RANDOM || (!fill && (known.has(x.id) || used.has(x.id)))) return;
      for (let n = has(x); n < per(x); n++, made++) s.characters.unshift(draft({ setId: x.id }));
    });
    /* random: her fotoğraf ayrı bir kişi; toplam karakter TOTAL_TARGET olana kadar daha önce kullanılmamış
     * fotoğraflardan rastgele yeni kişiler oluşur. Kalan fotoğraflar yedekte durur: biri silinince yerine yenisi gelir
     * (aynı fotoğraf geri gelmez: kullanılanlar knownRandom'da). */
    const rset = setById(RANDOM);
    if (rset) {
      const seen = new Set(s.knownRandom || []);
      const taken = new Set(s.characters.filter(c => c.setId === RANDOM).map(c => c.profile));
      const room = TOTAL_TARGET - s.characters.length;
      const fresh = shuffle(setFiles(rset).filter(f => !seen.has(f) && !taken.has(f))).slice(0, Math.max(0, room));
      fresh.forEach(f => s.characters.unshift(draft({ setId: RANDOM, profile: f })));
      made += fresh.length;
      const used = [...taken, ...fresh].filter(f => !seen.has(f));
      if (used.length) { s.knownRandom = [...seen, ...used]; made++; }
    }
    // Hâlâ TOTAL_TARGET'ın altındaysa: diğer setlerde henüz kimsenin profili olmayan fotoğraflardan yeni kişiler
    // (en çok boşta fotoğrafı olan set önce; boşta fotoğraf kalmayınca durur, aynı profil iki kişide olmaz)
    for (let room = TOTAL_TARGET - s.characters.length; room > 0; room--) {
      const freeIn = x => setFiles(x).length - has(x);
      const best = Amor.PHOTO_SETS.filter(x => x.id !== RANDOM && freeIn(x) > 0).sort((a, b) => freeIn(b) - freeIn(a))[0];
      if (!best) break;
      s.characters.push(draft({ setId: best.id }));
      made++;
    }
    s.fillVersion = FILL_VERSION;
    if (!made && !fill && Amor.PHOTO_SETS.every(x => known.has(x.id))) return;
    s.knownSets = [...new Set([...known, ...Amor.PHOTO_SETS.map(x => x.id)])];
    Amor.Store.save();
  }

  /* Elle tanımlanan karakterler (karakter-ekle.bat -> js/data/custom-characters.js).
   * Yoksa eklenir; varsa tanımdaki alanlar her açılışta yeniden uygulanır.
   * Boş bırakılan alanlar rastgele kalır. */
  function syncCustom() {
    const s = S();
    const removed = s.customRemoved || [];
    s.customMoodAt = s.customMoodAt || {};
    let changed = false;
    (Amor.CUSTOM_CHARACTERS || []).forEach(def => {
      if (removed.includes(def.id) || !setById(def.setId)) return;
      let c = s.characters.find(x => x.id === def.id);
      if (!c) {
        c = draft({ setId: def.setId, name: def.name, archetype: def.archetype });
        c.id = def.id;
        s.characters.unshift(c);
      }
      const arch = Amor.archetype(def.archetype);
      if (c.archetype !== arch.id) {
        c.archetype = arch.id;
        c.big5 = Object.fromEntries(Object.entries(arch.big5).map(([k, v]) => [k, jitter(v)]));
      }
      if (c.setId !== def.setId) {
        c.setId = def.setId;
        c.profile = pickProfile(def.setId, c.id);
        repost(c);
      }
      c.name = def.name;
      if (def.age) c.age = def.age;
      if (def.height) { c.height = def.height; c.weight = def.height - 108; }
      const city = def.city && Amor.CITIES.find(x => x.name === def.city);
      if (city) {
        c.cityName = city.name;
        if (!city.districts.includes(c.district)) c.district = pick(city.districts);
      }
      if (def.job && Amor.JOBS.some(j => j.title === def.job)) c.job = def.job;
      if (def.bio) c.bio = def.bio;
      if (def.big5) c.big5 = { ...c.big5, ...def.big5 };
      // başlangıç ruh hali: araçta her değiştirildiğinde bir kez uygulanır
      if (def.mood && s.customMoodAt[def.id] !== def.moodAt) {
        s.moods[def.id] = { values: { ...def.mood }, updatedAt: Date.now(), locked: !!def.moodLocked, cause: null, source: 'tanım' };
        s.customMoodAt[def.id] = def.moodAt;
      }
      changed = true;
    });
    if (changed) Amor.Store.save();
  }

  return { draft, hydrate, load, add, addPost, remove, seed, randomSet, randomName, usedSets, photoUrl, setById };
})();

Amor.byId = id => (Amor.CHARACTERS || []).find(c => c.id === id);
