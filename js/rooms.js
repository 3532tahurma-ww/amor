/*
 * Amor - Sesli odalar (#/rooms, #/room/<kızId>)
 * ---------------------------------------------
 * Çevrimiçi bir kızın ev sahipliği yaptığı, 8 koltuklu grup odaları (metin tabanlı simülasyon: konuşan koltuk parlar).
 * Odalar ODA_SLOT'ta bir değişir. Oda sayısı çevrimiçi kız sayısıyla ölçeklenir (≈ PER_ROOM çevrimiçi kıza bir oda,
 * ROOM_MIN–ROOM_MAX). Oda açıkken her TICK_MS'de:
 *   arka plandaki erkekler (js/background.js) yazar, koltuklara oturur / kalkar, ev sahibine hediye atar;
 *   ev sahibi mesajlara cevap verir (Engine.quickReply, durumsuz).
 * Odadaki herkes hediyeleri görür; pahalı hediyeler bütün uygulamada yayın bandına düşer (js/broadcast.js).
 * Sen de yazabilir, boş koltuğa oturabilir ve ev sahibine hediye atabilirsin (yakınlık, istek, cazibe sayılır).
 *
 * PK (hediye yarışı): oda açıkken arada bir ev sahibi, başka bir odanın ev sahibine karşı PK_MS süren bir yarışa girer.
 * Bu odaya atılan hediyeler ev sahibine, rakip odadaki erkeklerin hediyeleri rakibe sayılır (gerçek kayıt: koleksiyon,
 * destekçiler, haftalık ajans yarışı). PK sırasında erkekler daha çok hediye atar. Sonunda kazanan ve en çok destek veren
 * açıklanır.
 */
window.Amor = window.Amor || {};

Amor.Rooms = (() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const ROOM_MIN = 4, ROOM_MAX = 30, PER_ROOM = 10, SEATS = 8, TICK_MS = 2600, ODA_SLOT = 30 * 60000, MAX_MSGS = 80;
  const PK_MS = 3 * 60000, PK_GAP = [90000, 240000]; // yarış süresi, iki yarış arası bekleme (ms)
  const live = {}; // kızId -> oda durumu (bellekte; sayfa yenilenince yeniden kurulur)

  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
  const slot = () => Math.floor(Date.now() / ODA_SLOT);

  // Şu an açık odalar: çevrimiçi kızlardan bu dilime özgü sabit seçim; sayısı çevrimiçi sayısıyla ölçeklenir
  function hosts() {
    const online = (A.CHARACTERS || []).filter(A.Mood.isOnline);
    const n = Math.max(ROOM_MIN, Math.min(ROOM_MAX, Math.round(online.length / PER_ROOM)));
    return online.sort((a, b) => hash(a.id + slot()) - hash(b.id + slot())).slice(0, n);
  }

  function room(c) {
    let r = live[c.id];
    if (r && r.slot === slot()) return r;
    // Odadakiler gerçek erkekler: aynı anda başka bir odada olmayanlar; onu takip edenler önce gelir
    const taken = busyMales(c.id);
    const fans = new Set(A.Background.st().follows[c.id] || []);
    const males = A.Background.st().males.filter(m => !taken.has(m.id))
      .sort(() => Math.random() - 0.5).sort((a, b) => fans.has(b.id) - fans.has(a.id));
    const seated = Math.min(int(2, 6), males.length);
    r = live[c.id] = {
      slot: slot(), title: A.ROOM_TITLES[hash(c.id + slot()) % A.ROOM_TITLES.length],
      seats: Array.from({ length: SEATS }, (_, i) => (i < seated ? males[i].id : null)),
      audience: males.slice(seated, seated + int(1, 6)).map(m => m.id),
      msgs: [], speaking: null, mine: null, gifts: 0,
      pk: null, pkNext: Date.now() + int(20000, 60000) // ilk yarış odaya girdikten kısa süre sonra olabilir
    };
    say(r, 'sys', `🎙️ ${c.name} odayı açtı: ${r.title}`);
    return r;
  }

  function say(r, who, text, extra = {}) {
    r.msgs.push({ who, text, ts: Date.now(), ...extra });
    if (r.msgs.length > MAX_MSGS) r.msgs.splice(0, r.msgs.length - MAX_MSGS);
  }
  const male = id => A.Background.maleById(id);
  const present = r => [...r.seats.filter(Boolean), ...r.audience];
  // Şu an açık odalarda bulunan erkekler (except: bu kızın odası hariç)
  const busyMales = except => new Set(Object.entries(live).filter(([id, r]) => id !== except && r.slot === slot()).flatMap(([, r]) => present(r)));

  /* ---------- PK (hediye yarışı) ---------- */
  function startPk(c, r) {
    const rivals = hosts().filter(x => x.id !== c.id);
    const pool = rivals.length ? rivals : (A.CHARACTERS || []).filter(x => x.id !== c.id && A.Mood.isOnline(x));
    if (!pool.length) return;
    const opp = pick(pool);
    r.pk = { opp: opp.id, until: Date.now() + PK_MS, a: 0, b: 0, top: {} };
    say(r, 'sys', `⚔️ PK başladı: ${c.name} vs ${opp.name} · ${PK_MS / 60000} dk · hediyeler sayılıyor!`);
    setTimeout(() => say(r, 'host', pick(['PK başladı! destek olun 🔥', 'hadi bu PK bizim olsun 💪', 'kazanırsak hepinize teşekkür edeceğim 🥺', 'yarış başladı, sizi bekliyorum 🙈'])), 1200);
  }
  // Bu odaya atılan hediye ev sahibine sayılır (who: gönderenin adı)
  function pkScore(r, who, coins) {
    if (!r.pk) return;
    r.pk.a += coins;
    r.pk.top[who] = (r.pk.top[who] || 0) + coins;
  }
  function endPk(c, r) {
    const pk = r.pk, opp = A.byId(pk.opp);
    const win = pk.a >= pk.b;
    const best = Object.entries(pk.top).sort((x, y) => y[1] - x[1])[0];
    say(r, 'sys', `⚔️ PK bitti: ${win ? c.name : (opp ? opp.name : 'rakip')} kazandı · ${pk.a.toLocaleString('tr-TR')} – ${pk.b.toLocaleString('tr-TR')} ♥`);
    setTimeout(() => say(r, 'host', win
      ? `kazandıııık 🎉${best ? ` en çok destek veren ${best[0]} 👑 teşekkürler!` : ''}`
      : pick(['kaybettik ama sizi seviyorum 🥺', 'bir dahakine kesin biz kazanırız 😤', 'olsun, eğlenceliydi 😅'])), 1300);
    r.pk = null;
    r.pkNext = Date.now() + int(...PK_GAP);
  }
  // Rakip taraf: rakip odadaki (yoksa boştaki) gerçek erkekler rakip ev sahibine hediye atar
  function rivalGift(r) {
    const opp = A.byId(r.pk.opp);
    if (!opp || Math.random() > 0.2) return; // bu odadaki hediye sıklığıyla dengeli
    const theirRoom = live[opp.id] && live[opp.id].slot === slot() ? present(live[opp.id]) : [];
    const mine = new Set(present(r));
    const cand = theirRoom.length ? theirRoom : A.Background.st().males.filter(m => !mine.has(m.id)).map(m => m.id);
    const m = male(pick(cand));
    if (!m || Math.random() > 0.35 + m.generous * 0.65) return;
    const g = A.Background.maleGift(m);
    A.Background.roomGift(opp, m, g);
    r.pk.b += g.price;
  }

  /* ---------- Odanın bir anı ---------- */
  function tickRoom(c, r) {
    const now = Date.now();
    if (r.pk && now >= r.pk.until) endPk(c, r);
    else if (!r.pk && now >= r.pkNext) startPk(c, r);
    if (r.pk) rivalGift(r);
    const roll = Math.random();
    const ids = present(r);
    if (!ids.length) return;
    const giftP = r.pk ? 0.2 : 0.07; // PK sırasında erkekler daha çok hediye atar
    if (roll < 0.38) {
      const m = male(pick(ids));
      if (!m) return;
      // arada az önce konuşan başka bir erkeğe takılır
      const prev = [...r.msgs].reverse().find(x => x.who === 'm' && x.id !== m.id);
      const text = prev && A.MALE_LINES.roomTease && Math.random() < 0.2
        ? pick(A.MALE_LINES.roomTease).replace(/\{to\}/g, prev.name)
        : pick(A.MALE_LINES.room).replace(/\{her\}/g, c.name);
      say(r, 'm', text, { name: m.name, id: m.id });
      if (r.seats.includes(m.id)) r.speaking = m.id;
      if (Math.random() < 0.6) setTimeout(() => hostReply(c, r, text, m.name), 1200 + Math.random() * 1600);
    } else if (roll < 0.38 + giftP) {
      const m = male(pick(ids));
      if (!m || Math.random() > 0.3 + m.generous * 0.7) return;
      const g = A.Background.maleGift(m);
      A.Background.roomGift(c, m, g);
      r.gifts += g.price;
      pkScore(r, m.name, g.price);
      say(r, 'gift', `${m.name} → ${c.name}: ${g.e} ${g.name}`, { coins: g.price, e: g.e });
      setTimeout(() => say(r, 'host', `${thankLine(c, g, m.name)} ${g.e}`), 1500);
    } else if (roll < 0.5 + giftP) {
      // koltuk değişimi: biri kalkar ya da dinleyicilerden biri oturur
      const i = Math.floor(Math.random() * SEATS);
      if (i === r.mine) return;
      if (r.seats[i] && Math.random() < 0.5) { r.audience.push(r.seats[i]); r.seats[i] = null; }
      else if (!r.seats[i] && r.audience.length) { r.seats[i] = r.audience.splice(Math.floor(Math.random() * r.audience.length), 1)[0]; }
    } else if (roll < 0.58 + giftP) {
      // biri gelir ya da gider (gelen: o an hiçbir odada olmayan bir erkek)
      if (r.audience.length && Math.random() < 0.45) {
        const m = male(r.audience.splice(Math.floor(Math.random() * r.audience.length), 1)[0]);
        if (m) say(r, 'sys', `${m.name} odadan ayrıldı`);
      } else {
        const busy = busyMales(null);
        const free = A.Background.st().males.filter(m => !busy.has(m.id));
        if (free.length) { const m = pick(free); r.audience.push(m.id); say(r, 'sys', `${m.name} odaya katıldı`); }
      }
    } else if (A.ROOM_HOST_LINES && Math.random() < 0.45) {
      // ev sahibi kendiliğinden konu açar
      say(r, 'host', pick(A.ROOM_HOST_LINES));
      r.speaking = 'host';
    } else {
      r.speaking = Math.random() < 0.5 ? 'host' : r.speaking;
    }
  }

  // Ev sahibinin hediye teşekkürü: kişiliğinin hediye cümleleri (küçük / orta / büyük)
  function thankLine(c, g, name) {
    const pool = (c.giftLines && c.giftLines[g.price < 300 ? 'small' : g.price < 3000 ? 'mid' : 'big']) || ['teşekkürler {gift}'];
    return `${name}, ` + pick(pool).split('|')[0].replace(/\{gift\}/g, g.name.toLocaleLowerCase('tr')).replace(/\{[a-z_]+\}/g, '').trim();
  }

  function hostReply(c, r, text, name) {
    const res = A.Engine.quickReply(c, text, { name });
    say(r, 'host', res.parts.join(' '));
    r.speaking = 'host';
  }

  /* ---------- Sayfalar ---------- */
  A.Pages = A.Pages || {};
  A.FULL_PAGES = [...(A.FULL_PAGES || []), 'room'];
  const back = href => A.Eco.back(href);

  A.Pages.rooms = () => {
    const view = $('#view');
    // kalabalıktan tenhaya
    const list = hosts().map(c => ({ c, r: room(c) })).sort((x, y) => present(y.r).length - present(x.r).length);
    view.innerHTML = `<div class="page-pad rooms">
      <div class="feed-head"><h1>Sesli odalar <small class="rooms-n">${list.length} oda</small></h1>
        <span><a class="btn sm pink" href="#/agencies">🏆 Ajanslar</a> <a class="btn sm ghost" href="#/feed">📷 Akış</a></span></div>
      ${list.length ? list.map(({ c, r }) => {
        const sup = A.Background.supporters(c.id).slice(0, 3);
        const ag = A.Agency && A.Agency.of(c);
        return `<a class="room-card" href="#/room/${c.id}" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
          ${A.UI.avatar(c, 64, { dot: false })}
          <div class="room-info"><b>${esc(r.title)}${r.pk ? ' <em class="pk-tag">⚔️ PK</em>' : ''}</b>
            <small>${esc(c.display)} · ✨ Lv.${A.Background.charm(c.id).lv}${ag ? ` · ${ag.e} ${esc(ag.name)}` : ''}</small>
            <span class="room-live"><i></i>${present(r).length} kişi · ${r.seats.filter(Boolean).length + 1}/${SEATS + 1} koltuk</span>
            ${sup.length ? `<span class="room-sup">👑 ${sup.map(x => esc(x.user ? 'Sen' : x.male.name)).join(' · ')}</span>` : ''}</div>
          <span class="room-go">Gir</span></a>`;
      }).join('') : '<div class="empty"><span class="big">🎙️</span>Şu an açık oda yok, çevrimiçi biri olunca açılır</div>'}
    </div>`;
  };

  A.Pages.room = (rt) => {
    const view = $('#view');
    const c = rt && A.byId(rt.id);
    if (!c) { location.hash = '#/rooms'; return; }
    const r = room(c);
    if (!r.welcomed) { r.welcomed = true; say(r, 'sys', `${S().user.name || 'Sen'} odaya katıldı`); setTimeout(() => hostReply(c, r, 'selam hoş geldin', S().user.name || ''), 1500); }

    view.innerHTML = `<div class="room" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
      <div class="room-top">${back('#/rooms')}<div><b>${esc(r.title)}</b><small id="rmMeta"></small></div>${A.Agency ? A.Agency.chip(c) : '<span></span>'}</div>
      <div class="room-sups" id="rmSups"></div>
      <div class="pk-bar" id="rmPk" hidden></div>
      <div class="room-stage">
        <div class="seat host" id="rmHost">${A.UI.avatar(c, 84, { dot: false })}<b>${esc(c.name)}</b><small>Ev sahibi</small></div>
        <div class="seats" id="rmSeats"></div>
      </div>
      <div class="room-log" id="rmLog"></div>
      <form class="room-bar" id="rmForm" autocomplete="off">
        <input maxlength="200" placeholder="Odaya yaz…">
        <button type="button" id="rmGift" aria-label="Hediye">🎁</button>
        <button type="submit">Gönder</button>
      </form>
    </div>`;

    function draw() {
      if (!document.body.contains(view.querySelector('.room'))) return;
      $('#rmMeta').textContent = `${present(r).length + 1} kişi (sen dahil) · odada ${r.gifts.toLocaleString('tr-TR')} ♥ hediye`;
      const sup = A.Background.supporters(c.id).slice(0, 3);
      $('#rmSups').innerHTML = sup.map((x, i) => `<span>${['🥇', '🥈', '🥉'][i]} ${esc(x.user ? 'Sen' : x.male.name)} · ${x.coins.toLocaleString('tr-TR')} ♥</span>`).join('');
      // PK skor çubuğu: iki taraf, oran, kalan süre
      const pkEl = $('#rmPk'), pk = r.pk, opp = pk && A.byId(pk.opp);
      pkEl.hidden = !pk;
      if (pk && opp) {
        const left = Math.max(0, Math.ceil((pk.until - Date.now()) / 1000));
        const share = pk.a + pk.b ? Math.round(pk.a / (pk.a + pk.b) * 100) : 50;
        pkEl.innerHTML = `<div class="pk-side">${A.UI.avatar(c, 30, { dot: false })}<b>${pk.a.toLocaleString('tr-TR')}</b></div>
          <div class="pk-mid"><span>⚔️ PK · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>
            <div class="pk-meter"><i style="width:${share}%"></i></div></div>
          <div class="pk-side r"><b>${pk.b.toLocaleString('tr-TR')}</b>${A.UI.avatar(opp, 30, { dot: false })}</div>`;
      }
      $('#rmHost').classList.toggle('talk', r.speaking === 'host');
      $('#rmSeats').innerHTML = r.seats.map((id, i) => {
        if (i === r.mine) return `<div class="seat me ${r.speaking === 'me' ? 'talk' : ''}"><span class="s-ava me">${esc((S().user.name || 'S').charAt(0))}</span><b>Sen</b><button data-leave>kalk</button></div>`;
        const m = id && male(id);
        return m ? `<div class="seat ${r.speaking === id ? 'talk' : ''}"><span class="s-ava">${esc(m.name.charAt(0))}</span><b>${esc(m.name)}</b></div>`
          : `<div class="seat free" data-sit="${i}"><span class="s-ava">+</span><b>Otur</b></div>`;
      }).join('');
      const log = $('#rmLog');
      const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
      log.innerHTML = r.msgs.map(x => x.who === 'sys' ? `<div class="rm-sys">${esc(x.text)}</div>`
        : x.who === 'gift' ? `<div class="rm-gift"><span>${x.e}</span>${esc(x.text)} <em>${x.coins.toLocaleString('tr-TR')} ♥</em></div>`
        : `<div class="rm-msg ${x.who}"><b>${esc(x.who === 'host' ? c.name : x.who === 'me' ? (S().user.name || 'Sen') : x.name)}</b> ${esc(x.text)}</div>`).join('');
      if (atBottom) log.scrollTop = log.scrollHeight;
    }

    $('#rmSeats').onclick = e => {
      const sit = e.target.closest('[data-sit]');
      if (sit && r.mine == null) {
        r.mine = +sit.dataset.sit;
        say(r, 'sys', `${S().user.name || 'Sen'} ${r.mine + 1}. koltuğa oturdu`);
        setTimeout(() => hostReply(c, r, 'selam', S().user.name || ''), 1400);
        draw();
      }
      if (e.target.closest('[data-leave]')) { r.mine = null; draw(); }
    };
    $('#rmForm').onsubmit = e => {
      e.preventDefault();
      const inp = e.target.querySelector('input');
      const text = inp.value.trim();
      if (!text) return;
      inp.value = '';
      say(r, 'me', text);
      if (r.mine != null) r.speaking = 'me';
      if (Math.random() < 0.8) setTimeout(() => { hostReply(c, r, text, S().user.name || ''); draw(); }, 1500 + Math.random() * 2000);
      draw();
    };
    $('#rmGift').onclick = () => A.GiftPanel.open(c, res => {
      // Kullanıcının hediyesi: yakınlık + istek + cazibe (Wallet.sendGift zaten coin, koleksiyon ve yayını yaptı)
      const wl = A.Wish && A.Wish.fulfill(c, res);
      A.Engine.giftAffinity(c, res.value);
      r.gifts += res.value;
      pkScore(r, S().user.name || 'Sen', res.value); // PK sırasındaysa ev sahibine sayılır
      say(r, 'gift', `${S().user.name || 'Sen'} → ${c.name}: ${res.delivered.e} ${res.delivered.name}${res.qty > 1 ? ' x' + res.qty : ''}`, { coins: res.value, e: res.delivered.e });
      const thanks = A.Engine.giftReact(c, res).parts;
      setTimeout(() => { say(r, 'host', [...thanks, ...(wl ? wl.split('|') : [])].join(' ')); r.speaking = 'host'; draw(); }, 1300);
      A.Store.save();
      draw();
    });

    draw();
    clearInterval(A.Rooms.timer);
    A.Rooms.timer = setInterval(() => {
      if (!document.body.contains(view.querySelector('.room'))) { clearInterval(A.Rooms.timer); return; }
      if (!A.Mood.isOnline(c)) { say(r, 'sys', `${c.name} odadan ayrıldı, oda kapandı`); draw(); clearInterval(A.Rooms.timer); return; }
      tickRoom(c, r);
      A.Store.save();
      draw();
    }, TICK_MS);
  };

  return { hosts, timer: null };
})();
