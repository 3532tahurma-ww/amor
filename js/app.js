/*
 * Amor - Arayüz
 * -------------
 * Hash tabanlı basit yönlendirme (GitHub Pages ile uyumlu):
 *   #/home  #/messages  #/mood  #/me  #/p/<id>  #/chat/<id>  #/mood/<id>
 */
(() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const $ = (sel, root = document) => root.querySelector(sel);
  const view = $('#view');
  const app = $('#app');

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const chars = () => A.CHARACTERS;

  const ui = {
    homeTab: 'recommended', msgTab: 'msg', msgFilter: 'all', contactFilter: 'all', contactAsc: false, profileTab: 'profile', route: null,
    filter: { min: 18, max: 99, city: '', online: false }
  };
  const typing = {};   // karakter yazıyor mu
  const reading = {};  // mesajı okumak üzere bekliyor mu
  const timers = {};   // cevap bekletme zamanlayıcıları
  const openerSent = {};

  /* ---------- İkonlar ---------- */
  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24"><path d="M20 12H5M11 5l-7 7 7 7"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M3.4 11.1 19.6 3.6c.9-.4 1.8.5 1.4 1.4l-7.5 16.2c-.4.9-1.7.8-2-.1l-1.6-5.4a1 1 0 0 0-.6-.6L3.9 13.5c-.9-.3-1-1.6-.1-2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.3 3.4c-.6.5-1.5 0-1.5-.7V16A3.5 3.5 0 0 1 4 12.5z"/><circle cx="9.5" cy="9.5" r="1.2" fill="#fff"/><circle cx="14.5" cy="9.5" r="1.2" fill="#fff"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ---------- Yardımcılar ---------- */
  // Telefonda avatarlar biraz daha küçük
  const avaSize = size => Math.round(window.innerWidth < 768 ? size * 0.8 : size);

  function avatar(c, size = 56, opts = {}) {
    size = avaSize(size);
    const online = A.Mood.isOnline(c);
    const inner = c.photo
      ? `<img src="${esc(c.photo)}" alt="${esc(c.name)}" loading="lazy">`
      : esc(c.name.charAt(0));
    const dot = opts.dot === false ? '' : `<i class="dot ${online ? '' : 'off'}"></i>`;
    const unread = opts.unread ? `<b class="unread">${opts.unread > 99 ? '99+' : opts.unread}</b>` : '';
    const deco = opts.deco ? `<span class="deco">${c.emoji}</span>` : '';
    return `<div class="ava" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${inner}${deco}${dot}${unread}</div>`;
  }

  // Kullanıcının avatarı (mağazadan alınan çerçeveyle)
  function userAvatar(size = 56, frameOverride) {
    size = avaSize(size);
    const f = frameOverride || A.Wallet.activeFrame();
    const name = S().user.name || 'Sen';
    const inner = `<div class="ava" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;background:linear-gradient(135deg,#7b5cff,#c86bff)">${esc(name.charAt(0))}</div>`;
    if (!f) return inner;
    return `<div class="uava" style="width:${size}px;height:${size}px"><i class="ring" style="background:${f.ring}"></i>${inner}<span class="fdeco" style="font-size:${Math.round(size * 0.34)}px">${f.deco}</span></div>`;
  }

  // Kullanıcının adı (VIP rozeti ve renkli isim)
  function userName() {
    const v = A.Wallet.vip().lv;
    const name = esc(S().user.name || 'İsimsiz');
    const colored = A.Wallet.hasPerk('color') ? `<span class="rainbow">${name}</span>` : name;
    return `${colored}${A.Wallet.hasPerk('badge') ? ` <span class="vip-badge">VIP${v}</span>` : ''}`;
  }

  /* ---------- Yakınlıklar (CP, Kanka, Eşlik, Koruyucu) ----------
   * Her türün tek sahibi olur: sen ya da arka plandaki bir erkek (js/background.js). Kurmak o türün en ucuz dostluk
   * hediyesi kadar coin; bir erkeğin elindekini "Al" ile onun yerine geçerek almak iki katı. Seviye şartı yok.
   * Seninle tek yakınlığı olur, yenisi eskisinin yerine geçer. */
  function relCost(c, type) {
    const g = A.Background.relGift(type), h = A.Background.relHolder(c.id, type);
    return { g, h, cost: g.price * (h && h.male ? 2 : 1) };
  }
  function relSection(c) {
    if (!A.Background) return '';
    return `<div class="sec-title" style="margin-top:4px">Yakınlıklar</div><div class="rel-grid">${Object.entries(A.RELATIONS).map(([k, r]) => {
      const { g, h, cost } = relCost(c, k);
      const who = !h ? '<span class="rel-ava free">+</span><b>Boş</b>'
        : h.user ? `<span class="rel-ava me">${esc((S().user.name || 'S').charAt(0))}</span><b>Sen</b>`
        : `<span class="rel-ava">${esc(h.male.name.charAt(0))}</span><b>${esc(h.male.name)}</b>`;
      const act = h && h.user ? '<small class="rel-own">💞 senin</small>'
        : `<button class="btn sm pink" data-rel="${k}">${h ? 'Al' : 'Kur'} · ${cost.toLocaleString('tr-TR')} ♥</button>`;
      return `<div class="rel-card" style="--rc:${r.color}"><div class="rel-top"><em>${g.e}</em><span>${esc(r.tag)}</span><small>${esc(r.title)}</small></div>
        <div class="rel-who">${who}</div>${act}</div>`;
    }).join('')}</div>`;
  }
  function buyRel(c, type) {
    const R = A.RELATIONS[type];
    const { g, h, cost } = relCost(c, type);
    const old = A.RELATIONS[(S().relations || {})[c.id]];
    if (!confirm(`${c.name} ile ${R.title} (${R.tag}) yakınlığı kurulsun mu?\n${cost.toLocaleString('tr-TR')} ♥${h && h.male ? `\nŞu an ${h.male.name} sahibi, ondan alınır (2 kat).` : ''}${old ? `\nMevcut ${old.tag} yakınlığının yerine geçer.` : ''}`)) return;
    if (!A.Wallet.spend(cost, `Yakınlık · ${R.tag} → ${c.name}`)) {
      if (confirm('Yeterli coin yok. Coin yüklemek ister misin?')) location.hash = '#/recharge';
      return;
    }
    if (h && h.male) A.Background.takeRel(c.id, type);
    // Dostluk hediyesi olarak gider: koleksiyona girer, yakınlık kurulur, sohbette tepki verir (ödeme yukarıda alındı)
    A.Wallet.addGift(g.id, 1);
    const r = A.Wallet.sendGift(c, g, 1, true);
    if (r.ok) sendGift(c, r);
    A.Eco.notify(h && h.male ? `Artık ${c.name} ile ${R.tag} sensin · ${h.male.name} yerini kaptırdı` : `Artık ${c.name} ile ${R.tag} sensin`, '💞');
    renderProfile(c);
  }

  // Cazibe seviyesi rozeti (aldığı hediyelerin değeri, js/background.js)
  function charmChip(c) {
    if (!A.Background) return '';
    const ch = A.Background.charm(c.id);
    return `<span class="chip charm lv${Math.min(ch.lv, 11)}" title="Cazibe: ${ch.points.toLocaleString('tr-TR')} coin değerinde hediye">✨ Lv.${ch.lv}</span>`;
  }

  // En çok destekleyenler: ona en çok hediye gönderen ilk 10 (sen + arka plandaki erkekler)
  function supportSection(c) {
    if (!A.Background) return '';
    const all = A.Background.supporters(c.id);
    const meIdx = all.findIndex(x => x.user);
    const top = all.slice(0, 10);
    const row = (x, i) => `<div class="sup-row ${x.user ? 'me' : ''}"><span class="sup-rank">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
      <span class="rel-ava ${x.user ? 'me' : ''}">${esc((x.user ? (S().user.name || 'S') : x.male.name).charAt(0))}</span>
      <b>${esc(x.user ? 'Sen' : x.male.name)}</b><em>${x.coins.toLocaleString('tr-TR')} ♥</em></div>`;
    return `<div class="sec-title">En çok destekleyenler</div>
      ${top.length ? `<div class="sup-list">${top.map(row).join('')}</div>` : '<div class="empty" style="padding:14px">Henüz kimse hediye göndermedi</div>'}
      ${meIdx >= 10 ? `<div class="sup-list">${row(all[meIdx], meIdx)}</div>` : ''}
      ${meIdx !== 0 && all.length ? `<small class="sup-hint">${meIdx < 0 ? 'Listeye girmek için hediye gönder' : `1. sıraya ${(all[0].coins - all[meIdx].coins + 1).toLocaleString('tr-TR')} ♥ kaldı`}</small>` : ''}`;
  }

  function relChip(c) {
    const rel = A.RELATIONS[(S().relations || {})[c.id]];
    return rel ? `<span class="chip" style="background:${rel.color};color:#fff">💞 ${rel.tag}</span>` : '';
  }

  function moodInfo(c) {
    const cur = A.Mood.current(c);
    const lab = A.Mood.label(cur.values);
    return { cur, lab, meta: A.Mood.LABELS[lab] };
  }

  function moodChip(c) {
    const { meta } = moodInfo(c);
    return `<span class="chip mood" style="background:${meta.color}">${meta.emoji} ${meta.name}</span>`;
  }

  function fmtTime(ts) {
    const d = new Date(ts), now = new Date();
    const hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return hm;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${hm}`;
  }

  const chatOf = c => (S().chats[c.id] = S().chats[c.id] || []);
  const lastMsg = c => { const m = S().chats[c.id]; return m && m.length ? m[m.length - 1] : null; };
  const totalUnread = () => Object.values(S().unread).reduce((a, b) => a + (b || 0), 0);

  function updateBadge() {
    const n = totalUnread();
    const b = $('#navBadge');
    b.hidden = !n;
    b.textContent = n > 99 ? '99+' : n;
    if (A.Notify) A.Notify.badge(n);
  }

  function toast(c, text) {
    const el = document.createElement('button');
    el.className = 'toast';
    el.innerHTML = `${avatar(c, 40, { dot: false })}<div class="info"><b>${esc(c.name)}</b><span>${esc(text)}</span></div>`;
    el.onclick = () => { location.hash = `#/chat/${c.id}`; el.remove(); };
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3500);
  }

  /* ---------- Yönlendirme ---------- */
  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const [name = 'home', id, extra] = parts;
    return { name, id, extra };
  }

  function render() {
    if (!A.Store.account()) return renderAuth();
    const r = ui.route = parseRoute();
    const c = r.id ? A.byId(r.id) : null;
    const full = ['p', 'chat', 'create', ...(A.FULL_PAGES || [])].includes(r.name) || (r.name === 'mood' && c);
    app.classList.toggle('no-nav', full);
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === r.name && !full));
    updateBadge();
    document.querySelectorAll('.sheet-wrap, .lightbox').forEach(el => el.remove());
    window.scrollTo(0, 0);
    if (r.name !== 'rewards') setTimeout(() => A.Eco.checkinPopup(), 1300);

    // id bir karakter değilse (ör. #/game/slot) sayfa kendisi karar verir
    if (r.id && !c && !(A.Pages && A.Pages[r.name])) { location.hash = '#/home'; return; }
    if (A.Pages && A.Pages[r.name]) return A.Pages[r.name](r);
    switch (r.name) {
      case 'messages': return renderMessages();
      case 'mood': return c ? renderMoodEditor(c) : renderMoodList();
      case 'me': return renderMe();
      case 'p': return renderProfile(c);
      case 'chat': return renderChat(c);
      case 'create': return renderCreate();
      default: return renderHome();
    }
  }

  /* ---------- Ana sayfa ----------
   * En fazla HOME_LIMIT profil gösterilir. Çevrimiçiler her zaman üstte; kendi aralarındaki sıra her SHUFFLE_MS'de
   * değişir (karakter başına o dilime özgü sabit zar: her yenilemede zıplamaz, hep aynı kişiler de başta durmaz). */
  const HOME_LIMIT = 60, SHUFFLE_MS = 10 * 60000;
  function rotation(c) {
    let h = 2166136261;
    for (const ch of c.id + ':' + Math.floor(Date.now() / SHUFFLE_MS)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return (h % 10000) / 10000;
  }
  function renderHome() {
    const tabs = [['recommended', 'Önerilen'], ['online', 'Çevrimiçi'], ['new', 'Yeni'], ['popular', 'Popüler']];
    let list = [...chars()];
    const on = c => (A.Mood.isOnline(c) ? 1 : 0);
    if (ui.homeTab === 'online') list = list.filter(A.Mood.isOnline).sort((a, b) => rotation(b) - rotation(a));
    if (ui.homeTab === 'new') list.sort((a, b) => on(b) - on(a) || b.joined.localeCompare(a.joined));
    const charm = c => (A.Background ? A.Background.charm(c.id).points : 0);
    if (ui.homeTab === 'popular') list.sort((a, b) => on(b) - on(a) || charm(b) - charm(a) || socialOf(b).followers - socialOf(a).followers);
    if (ui.homeTab === 'recommended') {
      // Çevrimiçiler üstte; sıra dönen zar + biraz ruh hali + cazibe seviyesi (çok hediye alan öne çıkar)
      const lv = c => (A.Background ? A.Background.charm(c.id).lv : 1);
      const score = c => { const v = A.Mood.current(c).values; return on(c) * 10 + rotation(c) * 2 + v.valence * 0.4 + (lv(c) - 1) * 0.15; };
      list.sort((a, b) => score(b) - score(a));
    }
    const f = ui.filter;
    const filtered = f.min > 18 || f.max < 99 || f.city || f.online;
    list = list.filter(c => c.age >= f.min && c.age <= f.max && (!f.city || c.city === f.city) && (!f.online || A.Mood.isOnline(c)))
      .slice(0, HOME_LIMIT);

    view.innerHTML = `
      <div class="page-pad home ${window.scrollY > 120 ? 'compact' : ''}">
        ${promoHtml()}
        <div class="home-top">
          <div class="banners">
            <a class="banner gold" href="#/rewards"><b>Ödüller</b><small>${A.Wallet.claimableCount()} ödül alınabilir</small><span class="art">🪙</span></a>
            <a class="banner pinkb" href="#/feed"><b>Akış</b><small>herkesin anları</small><span class="art">📷</span></a>
            <a class="banner blue" href="#/rooms"><b>Sesli oda</b><small>${A.Rooms ? A.Rooms.hosts().length : 0} oda açık</small><span class="art">🎙️</span></a>
            <a class="banner violet" href="#/agencies"><b>Ajanslar</b><small>haftalık yarış</small><span class="art">🏆</span></a>
          </div>
          <div class="tabs-row">
            <div class="tabs">
              ${tabs.map(([k, t]) => `<button data-tab="${k}" class="${ui.homeTab === k ? 'active' : ''}">${t}</button>`).join('')}
            </div>
            <button class="tab-tool ${filtered ? 'on' : ''}" data-act="filter" aria-label="Filtre"><svg viewBox="0 0 24 24"><path d="M4 5h13l-5 6.5V18l-3 1.5v-8z"/><path d="M15 15h5M15 18.5h5"/></svg></button>
            <button class="tab-tool" data-act="rank" aria-label="Sıralama">🏆</button>
          </div>
        </div>
        <div class="list">
          ${list.length ? list.map(homeRow).join('') : `<div class="empty"><span class="big">😴</span>${!chars().length ? 'Henüz kimse yok' : filtered ? 'Filtreye uyan kimse yok' : 'Şu an kimse çevrimiçi değil'}</div>`}
        </div>
      </div>`;

    bindPromo();
    view.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { ui.homeTab = b.dataset.tab; renderHome(); });
    view.querySelector('[data-act=filter]').onclick = filterSheet;
    view.querySelector('[data-act=rank]').onclick = rankSheet;
    view.querySelectorAll('.row').forEach(row => row.onclick = e => {
      const id = row.dataset.id;
      if (e.target.closest('.hi-btn')) {
        const c = A.byId(id);
        if (!chatOf(c).length && !sendUser(c, 'Selam 👋')) return;
        location.hash = `#/chat/${id}`;
      } else {
        ui.profileTab = 'profile';
        location.hash = `#/p/${id}`;
      }
    });
  }

  /* ---------- Kayan duyuru paneli (ana sayfanın üstü) ----------
   * Canlı verilerle duyurular: ajans yarışı, haftanın yıldızı, günlük giriş, PK'lı odalar, Yükleme Yıldızı, şans çarkı.
   * PROMO_MS'de bir kendiliğinden kayar; parmakla sağa / sola kaydırılır; hangi slaytta kaldığı hatırlanır (ui.promo). */
  const PROMO_MS = 4500;
  function promoSlides() {
    const B = A.Background, out = [];
    if (A.Agency && B) {
      const st = A.Agency.standings(B.week().girls);
      const ag = st.agencies[0];
      if (ag && ag.total) out.push({ cls: 'p-agency', art: '🏆', title: 'Haftalık ajans yarışı', sub: `${ag.a.e} ${ag.a.name} önde · ${ag.total.toLocaleString('tr-TR')} ♥`, href: `#/agency/${ag.a.id}` });
      const star = st.hosts[0];
      if (star) out.push({ cls: 'p-star', art: '🌟', title: `Haftanın yıldızı: ${star.name}`, sub: `bu hafta ${st.score(star).toLocaleString('tr-TR')} ♥ hediye aldı`, href: `#/p/${star.id}` });
    }
    const cs = A.Wallet.checkinState();
    const today = A.CHECKIN[cs.dayIndex];
    out.push({ cls: 'p-checkin', art: '📅', title: 'Günlük giriş ödülü', sub: cs.done ? 'Bugünün ödülü alındı ✓ · yarın tekrar gel' : `Bugün: ${today.cards ? today.cards + ' sohbet kartı + ' : ''}${today.coins} coin`, href: '#/rewards' });
    if (A.Rooms) out.push({ cls: 'p-pk', art: '⚔️', title: 'Sesli odalarda PK', sub: `${A.Rooms.hosts().length} oda açık · hediye yarışına katıl`, href: '#/rooms' });
    out.push({ cls: 'p-recharge', art: '🎁', title: 'Yükleme Yıldızı', sub: 'Bu ay yükle, ödülleri topla', href: '#/star' });
    out.push({ cls: 'p-wheel', art: '🎡', title: 'Şans çarkı', sub: A.Wallet.spinsLeft() ? 'Bugün ücretsiz çevirme hakkın var' : 'Yarın yeni ücretsiz çevirme', href: '#/game/wheel' });
    return out;
  }
  function promoHtml() {
    const s = promoSlides();
    ui.promo = (ui.promo || 0) % s.length;
    return `<div class="promo" id="promo"><div class="promo-track" style="transform:translateX(-${ui.promo * 100}%)">
      ${s.map(x => `<a class="promo-slide ${x.cls}" href="${x.href}"><div><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div><span>${x.art}</span></a>`).join('')}
    </div><div class="promo-dots">${s.map((_, i) => `<i class="${i === ui.promo ? 'on' : ''}"></i>`).join('')}</div></div>`;
  }
  let promoTimer = null;
  function bindPromo() {
    const el = $('#promo');
    if (!el) return;
    const track = el.querySelector('.promo-track'), dots = el.querySelectorAll('.promo-dots i'), n = dots.length;
    const go = i => {
      ui.promo = (i + n) % n;
      track.style.transform = `translateX(-${ui.promo * 100}%)`;
      dots.forEach((d, j) => d.classList.toggle('on', j === ui.promo));
    };
    clearInterval(promoTimer);
    promoTimer = setInterval(() => { if (!document.body.contains(el)) return clearInterval(promoTimer); go(ui.promo + 1); }, PROMO_MS);
    let x0 = null;
    el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) { go(ui.promo + (dx < 0 ? 1 : -1)); clearInterval(promoTimer); }
    });
  }

  function homeRow(c) {
    const started = chatOf(c).length > 0;
    return `
      <div class="row" data-id="${c.id}" role="button" tabindex="0">
        ${avatar(c, 80)}
        <div class="info">
          <div class="name">${esc(c.display)}</div>
          <div class="chips">
            <span class="chip sex">♀</span>
            <span class="chip flag">🇹🇷</span>
            <span class="chip">${esc(c.city)}</span>
            <span class="chip">${c.age}yş</span>
            <span class="chip">${c.height}cm</span>
            <span class="chip">${esc(c.job)}</span>
            ${charmChip(c)}
          </div>
          <div class="bio">${esc(c.bio)}</div>
        </div>
        <button class="hi-btn ${started ? 'msg' : 'hi'}" aria-label="Mesaj">${started ? ICON.chat : 'Hi'}</button>
      </div>`;
  }

  // Yukarı kaydırınca banner'lar küçülür (eşik aralığı titremeyi önler)
  window.addEventListener('scroll', () => {
    const h = $('.home');
    if (!h) return;
    if (window.scrollY > 120) h.classList.add('compact');
    else if (window.scrollY < 20) h.classList.remove('compact');
  }, { passive: true });

  function filterSheet() {
    const f = ui.filter;
    const cities = [...new Set(chars().map(c => c.city))].sort((a, b) => a.localeCompare(b, 'tr'));
    const ages = Array.from({ length: 82 }, (_, i) => i + 18);
    const opts = (list, sel) => list.map(v => `<option ${v === sel ? 'selected' : ''}>${v}</option>`).join('');
    const sh = A.Eco.sheet(`
      <div class="sheet-grip"></div>
      <h3>Filtre</h3>
      <div class="flt-row"><span>Yaş</span><select id="fMin">${opts(ages, f.min)}</select><em>–</em><select id="fMax">${opts(ages, f.max)}</select></div>
      <div class="flt-row"><span>Şehir</span><select id="fCity"><option value="">Hepsi</option>${cities.map(c => `<option ${c === f.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <label class="flt-row"><span>Sadece çevrimiçi</span><input type="checkbox" id="fOn" ${f.online ? 'checked' : ''}></label>
      <div class="flt-btns"><button class="btn ghost" id="fReset">Sıfırla</button><button class="btn pink" id="fApply">Uygula</button></div>`, 'light');
    const $s = sel => sh.el.querySelector(sel);
    $s('#fReset').onclick = () => { ui.filter = { min: 18, max: 99, city: '', online: false }; sh.close(); renderHome(); };
    $s('#fApply').onclick = () => {
      const a = +$s('#fMin').value, b = +$s('#fMax').value;
      ui.filter = { min: Math.min(a, b), max: Math.max(a, b), city: $s('#fCity').value, online: $s('#fOn').checked };
      sh.close();
      renderHome();
    };
  }

  // Hediye sıralaması: en çok hediye alanlar
  function rankSheet() {
    const score = c => socialOf(c).gifts;
    const top = [...chars()].sort((a, b) => score(b) - score(a)).filter(c => score(c)).slice(0, 20);
    const medal = i => ['🥇', '🥈', '🥉'][i] || `<b>${i + 1}</b>`;
    const sh = A.Eco.sheet(`
      <div class="sheet-grip"></div>
      <h3>🏆 Hediye Sıralaması</h3>
      ${top.map((c, i) => `<button class="c-row rank" data-p="${c.id}"><span class="medal">${medal(i)}</span>${avatar(c, 48)}
        <div class="info"><div class="name">${esc(c.display)}</div><div class="chips"><span class="chip">${esc(c.city)}</span></div></div>
        <span class="chip gift">🎁 ${score(c).toLocaleString('tr-TR')}</span></button>`).join('')}`, 'light');
    sh.el.onclick = e => { const r = e.target.closest('[data-p]'); if (r) { sh.close(); location.hash = `#/p/${r.dataset.p}`; } };
  }

  /* ---------- Mesajlar ---------- */
  // Geniş ekranda (≥1024px) mesaj listesi ve sohbet yan yana
  const wideMQ = window.matchMedia('(min-width: 1024px)');
  const wide = () => wideMQ.matches;

  function msgRowsHtml(activeId) {
    let list = chars().filter(c => chatOf(c).length);
    if (ui.msgFilter === 'unread') list = list.filter(c => S().unread[c.id] || c.id === activeId);
    if (ui.msgFilter === 'online') list = list.filter(c => A.Mood.isOnline(c) || c.id === activeId);
    // Sabitlenenler en üstte (sabitlenme sırasıyla), diğerleri son mesaja göre
    const pins = pinned();
    list.sort((a, b) => {
      const pa = pins.indexOf(a.id), pb = pins.indexOf(b.id);
      if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return (lastMsg(b)?.ts || 0) - (lastMsg(a)?.ts || 0);
    });
    return list.length ? list.map(c => msgRow(c, c.id === activeId)).join('')
      : '<div class="empty"><span class="big">💌</span>Henüz mesaj yok.<br>Ana sayfadan birine “Hi” de!</div>';
  }

  /* ---------- Sohbet sabitleme (en fazla 4) ---------- */
  const MAX_PINS = 4;
  const pinned = () => (S().pinned = (S().pinned || []).filter(id => A.byId(id)));
  const isPinned = id => pinned().includes(id);

  function togglePin(id) {
    const pins = pinned();
    if (pins.includes(id)) {
      S().pinned = pins.filter(x => x !== id);
      A.Eco.notify('Sabitleme kaldırıldı', '📌');
    } else {
      if (pins.length >= MAX_PINS) { A.Eco.notify(`En fazla ${MAX_PINS} sohbet sabitlenebilir`, '📌'); return; }
      pins.push(id);
      A.Eco.notify('Sohbet en üste sabitlendi', '📌');
    }
    A.Store.save();
    const hint = $('.pin-hint');
    if (hint) hint.textContent = `📌 Sabitlemek için sohbete basılı tut ya da sağ tıkla · ${pinned().length}/${MAX_PINS}`;
    const rows = $('#msgRows');
    if (rows) { rows.innerHTML = msgRowsHtml(ui.route.name === 'chat' ? ui.route.id : null); bindRows(rows.closest('.split-list') || view); }
  }

  // Basılı tutunca / sağ tıklayınca açılan sohbet işlemleri
  function rowActions(id) {
    const c = A.byId(id);
    const pinnedNow = isPinned(id);
    const sh = A.Eco.sheet(`
      <div class="sheet-grip"></div>
      <div class="row-act-head">${avatar(c, 44, { dot: false })}<b>${esc(c.display)}</b></div>
      <button class="act" data-act="pin">📌 ${pinnedNow ? 'Sabitlemeyi kaldır' : `En üste sabitle <small>(${pinned().length}/${MAX_PINS})</small>`}</button>
      <button class="act" data-act="read">✓ Okundu olarak işaretle</button>
      <button class="act" data-act="profile">👤 Profili gör</button>
      <button class="act danger" data-act="delete">🗑️ Sohbeti sil</button>`, 'light');
    sh.el.onclick = e => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (!a) return;
      sh.close();
      if (a === 'pin') togglePin(id);
      if (a === 'read') { S().unread[id] = 0; A.Store.save(); refresh(c); }
      if (a === 'profile') location.hash = `#/p/${id}`;
      if (a === 'delete' && confirm(`${c.name} ile sohbet silinsin mi?`)) {
        S().chats[id] = []; S().unread[id] = 0; S().pinned = pinned().filter(x => x !== id); A.Store.save();
        if (ui.route.name === 'chat' && ui.route.id === id) location.hash = '#/messages'; else render();
      }
    };
  }

  function messagesPanel(activeId) {
    const tabs = [['contacts', 'Rehber'], ['msg', 'Mesaj'], ['calls', 'Arama']];
    const filters = [['all', 'Tümü'], ['unread', 'Okunmamış'], ['online', 'Çevrimiçi']];
    const head = `<div class="page-pad"><div class="tabs msg-tabs">
      ${tabs.map(([k, t]) => `<button data-mt="${k}" class="${ui.msgTab === k ? 'active' : ''}">${t}</button>`).join('')}
    </div></div>`;
    if (ui.msgTab === 'contacts') return `<div class="msg-panel">${head}${contactsHtml()}</div>`;
    if (ui.msgTab === 'calls') return `<div class="msg-panel">${head}${callsHtml()}</div>`;
    return `<div class="msg-panel">${head}
      <div class="page-pad"><div class="tabs sub-tabs">
        ${filters.map(([k, t]) => `<button data-f="${k}" class="${ui.msgFilter === k ? 'active' : ''}">${t}</button>`).join('')}
      </div></div>
      ${!S().user.name ? '<a class="notice" href="#/me" style="display:block">Adını yazarsan kızlar sana adınla hitap eder ✨</a>' : ''}
      <div class="pin-hint">📌 Sabitlemek için sohbete basılı tut ya da sağ tıkla · ${pinned().length}/${MAX_PINS}</div>
      <div class="list" id="msgRows">${msgRowsHtml(activeId)}</div></div>`;
  }

  /* ---------- Rehber ---------- */
  // Seni tanıyacak kadar yakınlaşanlar (Lv.2+) seni takip eder
  const followsMe = c => A.Engine.level(c).lv >= 2;
  /* Profildeki gerçek sayılar: arka plandaki erkeklerin takipleri (js/background.js) + senin takibin / seni takip etmesi;
   * hediye = senden ve erkeklerden gerçekten aldıkları */
  function socialOf(c) {
    const s = A.Background ? A.Background.social(c.id) : { followers: 0, following: 0, gifts: A.Wallet.receivedCount(c.id) };
    return { followers: s.followers + (S().follows[c.id] ? 1 : 0), following: s.following + (followsMe(c) ? 1 : 0), gifts: s.gifts };
  }
  const contactGroups = () => {
    const rel = S().relations || {};
    return [
      ['friends', 'Dostluk', chars().filter(c => rel[c.id])],
      ['fans', 'Beni Takip Edenler', chars().filter(followsMe)],
      ['following', 'Takip Ettiklerim', chars().filter(c => S().follows[c.id])],
      ['mutual', 'Karşılıklı Takip', chars().filter(c => S().follows[c.id] && followsMe(c))]
    ];
  };
  const giftCount = c => Object.values((S().giftsReceived || {})[c.id] || {}).reduce((a, b) => a + b, 0);

  function contactsHtml() {
    const filters = [['all', 'Tümü'], ['gift', 'Hediye gönderdiklerim'], ['online', 'Çevrimiçi']];
    let list = chars().filter(c => chatOf(c).length || S().affinity[c.id]);
    if (ui.contactFilter === 'gift') list = list.filter(giftCount);
    if (ui.contactFilter === 'online') list = list.filter(A.Mood.isOnline);
    const aff = c => S().affinity[c.id] || 0;
    list.sort((a, b) => (A.Mood.isOnline(b) - A.Mood.isOnline(a)) || (ui.contactAsc ? aff(a) - aff(b) : aff(b) - aff(a)));
    return `
      <div class="c-groups">${contactGroups().map(([k, t, l]) => `<button class="c-group" data-g="${k}"><span>${t}</span><b>${l.length}</b><i>›</i></button>`).join('')}</div>
      <div class="c-head"><b>Yakınlık <small>(${list.length})</small></b><button id="cSort" aria-label="Sırala">⇅</button></div>
      <div class="c-filters">${filters.map(([k, t]) => `<button data-cf="${k}" class="${ui.contactFilter === k ? 'active' : ''}">${t}</button>`).join('')}</div>
      <div class="c-note">Şu anda çevrimiçi kullanıcılar önceliklidir</div>
      <div class="list">${list.length ? list.map(c => {
        const mine = chatOf(c).filter(m => m.from === 'me').length, g = giftCount(c);
        return `<button class="c-row" data-chat="${c.id}">${avatar(c, 56)}
          <div class="info"><div class="name">${esc(c.display)}</div>
            <div class="chips"><span class="chip sex">💬 ${mine}</span>${g ? `<span class="chip gift">🎁 ${g}</span>` : ''}${relChip(c)}</div></div>
          <span class="chip lv">♥ Lv.${A.Engine.level(c).lv}</span></button>`;
      }).join('') : '<div class="empty"><span class="big">💞</span>Henüz kimseyle yakınlaşmadın</div>'}</div>`;
  }

  function contactSheet(key) {
    const [, title, list] = contactGroups().find(g => g[0] === key);
    const sh = A.Eco.sheet(`
      <div class="sheet-grip"></div><h3>${title} <small>(${list.length})</small></h3>
      ${list.length ? list.map(c => `<button class="c-row" data-p="${c.id}">${avatar(c, 48)}
        <div class="info"><div class="name">${esc(c.display)}</div><div class="chips"><span class="chip">${esc(c.city)}</span><span class="chip">${c.age}yş</span></div></div>
        <span class="chip lv">♥ Lv.${A.Engine.level(c).lv}</span></button>`).join('')
        : `<div class="empty">${key === 'fans' ? 'Biriyle biraz yazışınca seni takip etmeye başlar' : 'Burada henüz kimse yok'}</div>`}`, 'light');
    sh.el.onclick = e => { const r = e.target.closest('[data-p]'); if (r) { sh.close(); location.hash = `#/p/${r.dataset.p}`; } };
  }

  /* ---------- Arama geçmişi ---------- */
  function callsHtml() {
    const list = A.Call ? A.Call.calls() : [];
    const hint = '<p class="call-hint">💬 Açmıyor mu? Önce mesajla <b>"arayabilir miyim?"</b> diye sor. "Olur" derse 10 dakika içinde araman kesin açılır, <b>"beni ara"</b> dersen o seni arar.</p>';
    if (!list.length) return `<div class="empty"><span class="big">📞</span>Henüz arama yok.<br>Sohbette 📞 ya da 📹 ile arayabilirsin.</div>${hint}`;
    return `${hint}<div class="list">${list.map(e => {
      const c = A.byId(e.id);
      const bad = e.dir === 'in' && e.status !== 'done';
      const ok = A.Call.permitLeft(c);
      return `<div class="call-row" data-chat="${c.id}">${avatar(c, 64, { dot: false })}
        <div class="info"><div class="name">${esc(c.display)}</div>
          <div class="st ${bad ? 'bad' : ''}">${e.dir === 'in' ? '↙' : '↗'} ${esc(A.Call.label(e))}</div>
          ${ok ? `<small class="call-ok">${ok.type === 'video' ? '📹' : '📞'} Aramanı bekliyor · ${ok.min} dk</small>` : `<small>${fmtTime(e.ts)}</small>`}</div>
        <button class="call-btn ask" data-ask="${c.id}" aria-label="Mesajla aramak için izin iste">💬</button>
        <button class="call-btn" data-call="voice" data-id="${c.id}" aria-label="Sesli ara">${A.Call.ICON.phone}</button>
        <button class="call-btn" data-call="video" data-id="${c.id}" aria-label="Görüntülü ara">${A.Call.ICON.video}</button></div>`;
    }).join('')}</div>`;
  }

  function bindMessagesPanel(root, activeId) {
    const redraw = () => { root.innerHTML = messagesPanel(activeId); bindMessagesPanel(root, activeId); };
    root.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => { ui.msgTab = b.dataset.mt; redraw(); });
    root.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { ui.contactFilter = b.dataset.cf; redraw(); });
    root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => contactSheet(b.dataset.g));
    const sort = root.querySelector('#cSort');
    if (sort) sort.onclick = () => { ui.contactAsc = !ui.contactAsc; redraw(); };
    root.querySelectorAll('[data-chat]').forEach(r => r.onclick = e => {
      const call = e.target.closest('[data-call]');
      const ask = e.target.closest('[data-ask]');
      if (call) A.Call.start(A.byId(call.dataset.id), call.dataset.call);
      else if (ask) {
        location.hash = `#/chat/${ask.dataset.ask}`;
        setTimeout(() => sendUser(A.byId(ask.dataset.ask), pickRaw(ASK_CALL)), 300);
      } else location.hash = `#/chat/${r.dataset.chat}`;
    });
    root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
      ui.msgFilter = b.dataset.f;
      root.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b));
      $('#msgRows').innerHTML = msgRowsHtml(activeId);
      bindRows(root);
    });
    bindRows(root);
  }
  function bindRows(root) {
    root.querySelectorAll('.msg-row').forEach(r => {
      let timer = null, long = false;
      const cancel = () => clearTimeout(timer);
      r.onpointerdown = () => { long = false; timer = setTimeout(() => { long = true; rowActions(r.dataset.id); }, 500); };
      r.onpointerup = cancel;
      r.onpointerleave = cancel;
      r.onpointercancel = cancel;
      r.oncontextmenu = e => { e.preventDefault(); cancel(); long = true; rowActions(r.dataset.id); };
      r.onclick = () => { if (long) { long = false; return; } location.hash = `#/chat/${r.dataset.id}`; };
    });
  }

  function renderMessages() {
    if (wide()) {
      view.innerHTML = `<div class="split"><aside class="split-list">${messagesPanel(null)}</aside>
        <section class="split-empty"><span>💌</span><b>Bir sohbet seç</b><small>Soldaki listeden birine tıkla ya da ana sayfadan yeni biriyle tanış.</small></section></div>`;
      bindMessagesPanel($('.split-list'), null);
      return;
    }
    view.innerHTML = messagesPanel(null);
    bindMessagesPanel(view, null);
  }

  function msgRow(c, active) {
    const last = lastMsg(c);
    const lv = A.Engine.level(c);
    const text = typing[c.id] ? 'yazıyor…' : (last.from === 'me' ? 'Sen: ' : '') + last.text;
    return `
      <button class="msg-row ${active ? 'active' : ''} ${isPinned(c.id) ? 'pinned' : ''}" data-id="${c.id}">
        ${avatar(c, 62, { unread: S().unread[c.id] })}
        <div class="info">
          <div class="top"><span class="name">${esc(c.name)}</span><span class="time">${isPinned(c.id) ? '<span class="pin">📌</span>' : ''}${fmtTime(last.ts)}</span></div>
          <div class="bottom">
            <div class="last ${typing[c.id] ? 'typing' : ''}">${esc(text)}</div>
            <span class="chip lv">♥ Lv.${lv.lv}</span>
          </div>
        </div>
      </button>`;
  }

  /* ---------- Profil ---------- */
  function renderProfile(c) {
    const online = A.Mood.isOnline(c);
    const followed = !!S().follows[c.id];
    const tabs = [['profile', 'Profil'], ['album', 'Albüm'], ['moments', 'Anlar'], ['gifts', 'Hediyeler']];
    const grad = `linear-gradient(135deg,${c.colors[0]},${c.colors[1]})`;
    A.Wallet.track('visit', c.id);

    view.innerHTML = `<div class="profile">
      <div class="cover" style="background:${grad}">
        ${c.cover ? `<img class="cover-bg" src="${esc(c.cover)}" alt="" aria-hidden="true"><img class="cover-fg" src="${esc(c.cover)}" alt="" data-zoom="0">` : ''}
      </div>
      <a class="round-btn left" href="#/home" aria-label="Geri">${ICON.back}</a>

      <div class="pcard">
        ${avatar(c, 96, { deco: true })}
        <div class="pname">${esc(c.display)} <span class="online-pill ${presence(c).cls}">● ${esc(presence(c).text)}</span></div>
        <div class="pbio">${esc(c.bio)}</div>
        ${forceBtn(c)}
        <div class="chips">
          <span class="chip sex">♀ ${c.age}</span>
          <span class="chip loc">📍 ${esc(c.city)}</span>
          <span class="chip zod">✦ ${esc(c.zodiac)}</span>
          <span class="chip lv">♥ Lv.${A.Engine.level(c).lv}</span>
          ${charmChip(c)}
          ${A.Agency ? A.Agency.chip(c) : ''}
          ${relChip(c)}
        </div>
        <div class="stats">
          <div><b>${socialOf(c).followers}</b><span>Takipçi</span></div>
          <div><b>${socialOf(c).following}</b><span>Takip et</span></div>
          <div><b>${socialOf(c).gifts}</b><span>Hediye</span></div>
        </div>
      </div>

      <div class="sheet-body">
        <div class="tabs dark">
          ${tabs.map(([k, t]) => `<button data-t="${k}" class="${ui.profileTab === k ? 'active' : ''}">${t}</button>`).join('')}
        </div>
        <div id="ptab">${profileTab(c)}</div>
      </div>

      <div class="cta-bar">
        <button class="follow ${followed ? 'on' : ''}" aria-label="Takip">${followed ? '💗' : '🤍'}</button>
        <a class="btn primary" href="#/chat/${c.id}">💬 mesaj gönder · ${msgCost(c)} ♥</a>
      </div></div>`;

    view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      ui.profileTab = b.dataset.t;
      view.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('active', x === b));
      $('#ptab').innerHTML = profileTab(c);
    });
    $('.profile', view).addEventListener('click', e => {
      const z = e.target.closest('[data-zoom]');
      if (z) lightbox(c.album.length ? c.album : [c.cover], +z.dataset.zoom);
      const rb = e.target.closest('[data-rel]');
      if (rb) buyRel(c, rb.dataset.rel);
    });
    $('.follow', view).onclick = () => {
      S().follows[c.id] = !S().follows[c.id];
      if (S().follows[c.id]) A.Mood.nudge(c, { valence: 0.05 });
      A.Store.save();
      renderProfile(c);
    };
    window.scrollTo(0, 0);
  }

  // Gönderi zamanı: yeni paylaşımlarda saat de var (ts), eskilerde sadece tarih
  const postTime = p => p.ts || Date.parse(p.date) || 0;
  const postDate = p => (p.ts ? relTime(p.ts) : p.date);

  function profileTab(c) {
    const grad = (i) => `linear-gradient(${135 + i * 30}deg,${c.colors[0]},${c.colors[1]})`;
    if (ui.profileTab === 'album') {
      if (!c.album.length) return '<div class="empty">Albüm boş</div>';
      return `<div class="album">${c.album.map((src, i) => `<div style="background:${grad(i)}"><img src="${esc(src)}" alt="" loading="lazy" data-zoom="${i}"></div>`).join('')}</div>`;
    }
    if (ui.profileTab === 'gifts') {
      // Hediye koleksiyonu: senden + başkalarından (arka plan, js/background.js) gelenler; alınmayanlar soluk
      const mine = (S().giftsReceived || {})[c.id] || {};
      const others = A.Background ? A.Background.collection(c.id) : {};
      const all = A.GIFTS.filter(g => !g.lucky).map(g => ({ g, me: mine[g.id] || 0, n: (mine[g.id] || 0) + (others[g.id] || 0) }))
        .sort((a, b) => (!!b.n - !!a.n) || b.g.price - a.g.price);
      const got = all.filter(x => x.n);
      const count = got.reduce((a, x) => a + x.n, 0);
      const value = got.reduce((a, x) => a + x.g.price * x.n, 0);
      const fromMe = got.reduce((a, x) => a + x.me, 0);
      return `
        <div class="gift-wall-head"><b>Hediye koleksiyonu · ${got.length}/${all.length}</b>
          <small>${count} hediye · toplam değer ${value.toLocaleString('tr-TR')} coin · senden ${fromMe}</small></div>
        <div class="gift-wall">${all.map(x => `<div class="${x.n ? '' : 'off'}${x.me ? ' me' : ''}"><span>${x.g.e}</span><b>${esc(x.g.name)}</b><small>${x.n ? 'x' + x.n : x.g.price.toLocaleString('tr-TR')}</small></div>`).join('')}</div>
        <a class="btn pink block" href="#/chat/${c.id}/gift" style="margin-top:14px">🎁 Hediye gönder</a>`;
    }
    if (ui.profileTab === 'moments') {
      if (!c.posts.length) return '<div class="empty">Henüz paylaşım yok</div>';
      return [...c.posts].sort((a, b) => postTime(b) - postTime(a)).map((p, i) => `
        <div class="post">
          <div class="p-head">${avatar(c, 44, { dot: false })}<div><b>${esc(c.display)}</b><small>${postDate(p)}</small></div></div>
          <p>${esc(p.text)}</p>
          ${p.photo ? `<div class="p-img" style="background:${grad(i)}"><img src="${esc(p.photo)}" alt="" loading="lazy" data-zoom="${Math.max(0, c.album.indexOf(p.photo))}"></div>` : ''}
        </div>`).join('');
    }
    return `
      ${relSection(c)}
      ${supportSection(c)}
      <div class="sec-title">Doğrulama</div>
      <div class="verify"><div class="v1">✔ Gerçek kişi doğrulaması</div><div class="v2">♀ Cinsiyet doğrulaması</div></div>
      <div class="sec-title">Profil</div>
      <div class="info-row"><span>🏠 Memleket</span><b>Türkiye ${esc(c.city)}, ${esc(c.district)}</b></div>
      <div class="info-row"><span>📏 Boy</span><b>${c.height}cm</b></div>
      <div class="info-row"><span>⚖️ Ağırlık</span><b>${c.weight}kg</b></div>
      <div class="info-row"><span>💼 Meslek</span><b>${esc(c.job)}</b></div>
      <div class="info-row"><span>✦ Burç</span><b>${esc(c.zodiac)}</b></div>
      <div class="sec-title">Sevdikleri</div>
      <div class="chips">${c.likes.map(l => `<span class="chip">💜 ${esc(l)}</span>`).join('')}</div>
      <div class="sec-title">Sevmedikleri</div>
      <div class="chips">${c.dislikes.map(l => `<span class="chip">✖ ${esc(l)}</span>`).join('')}</div>`;
  }

  /* ---------- Fotoğraf görüntüleyici ---------- */
  function lightbox(list, start = 0) {
    let i = start;
    const el = document.createElement('div');
    el.className = 'lightbox';
    const draw = () => {
      el.innerHTML = `
        <img src="${esc(list[i])}" alt="">
        ${list.length > 1 ? `<button class="lb-nav prev" aria-label="Önceki">‹</button><button class="lb-nav next" aria-label="Sonraki">›</button>
        <div class="lb-count">${i + 1} / ${list.length}</div>` : ''}
        <button class="lb-close" aria-label="Kapat">✕</button>`;
    };
    el.onclick = e => {
      if (e.target.closest('.prev')) { i = (i - 1 + list.length) % list.length; draw(); return; }
      if (e.target.closest('.next')) { i = (i + 1) % list.length; draw(); return; }
      el.remove();
    };
    // kaydırarak geçiş
    let x0 = null;
    el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 === null || list.length < 2) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) { i = (i + (dx < 0 ? 1 : -1) + list.length) % list.length; draw(); }
      x0 = null;
    });
    draw();
    document.body.appendChild(el);
  }

  /* ---------- Sohbet ---------- */
  function renderChat(c) {
    S().unread[c.id] = 0;
    A.Store.save();
    const lv = A.Engine.level(c);
    const quick = [...A.QUICK_REPLIES].sort(() => Math.random() - 0.5).slice(0, 6);

    const chatHtml = `
      <div class="chat">
        <div class="chat-head">
          <a class="icon-btn" href="#/messages" aria-label="Geri">${ICON.arrowLeft}</a>
          <a class="who" href="#/p/${c.id}">
            ${avatar(c, 40)}
            <div><b>${esc(c.display)}</b><small id="chatStatus" class="${presence(c).cls}">${esc(presence(c).text)}</small></div>
          </a>
          <a class="couple" href="#/p/${c.id}">
            <span class="heart">💗<small>LV ${lv.lv}</small></span>
            ${userAvatar(32)}
          </a>
          <button class="icon-btn" id="moreBtn" aria-label="Menü">${ICON.more}</button>
        </div>

        <div class="hcard">
          ${avatar(c, 58, { deco: true })}
          <div class="info">
            <div class="nm">${esc(c.name.toLocaleUpperCase('tr').split('').join(' '))}</div>
            <div class="meta">${c.age} | ${c.height}cm | ${esc(c.zodiac)} | ${esc(c.job)}</div>
            ${relChip(c) ? `<div style="margin-top:4px">${relChip(c)}</div>` : ''}
            <div class="lvbar">${lvbarInner(lv)}</div>
            <div class="unlock" id="unlockRow">${unlockRow(lv)}</div>
            ${c.album.length > 1 ? `<div class="thumbs">${c.album.slice(1, 5).map((s, i) => `<img src="${esc(s)}" alt="" data-zoom="${i + 1}">`).join('')}</div>` : ''}
          </div>
        </div>

        <div class="msgs" id="msgs"></div>

        <div id="forceBar">${forceBtn(c)}</div>
        ${TEST ? `<div id="testBar">${testBar(c)}</div>` : ''}
        <div class="quick" id="quick">${quick.map(q => `<button>${esc(q)}</button>`).join('')}</div>
        <form class="composer" id="composer" autocomplete="off">
          <span class="card-chip" id="cardChip" title="Ücretsiz sohbet kartı: her kart bir mesajı ücretsiz gönderir" ${A.Wallet.cards() ? '' : 'hidden'}>🎟️ ${A.Wallet.cards()} ücretsiz</span>
          <input id="msgInput" type="text" placeholder="${msgPlaceholder(c)}" enterkeyhint="send" maxlength="300">
          <button class="send-btn" type="submit" aria-label="Gönder">${ICON.send}</button>
        </form>
        <div class="chat-tools" id="chatTools">
          <button type="button" id="giftBtn" aria-label="Hediye gönder"><span>🎁</span>Hediye</button>
          <button type="button" data-call="video" class="${callLocked(c, 'video') ? 'locked' : ''}" aria-label="Görüntülü ara"><span>📹<i class="lock">🔒</i></span>Görüntülü</button>
          <button type="button" data-call="voice" class="${callLocked(c, 'voice') ? 'locked' : ''}" aria-label="Sesli ara"><span>📞<i class="lock">🔒</i></span>Sesli</button>
          <button type="button" data-tool="tasks" aria-label="Yakınlık görevleri"><span>💗</span>Görevler</button>
        </div>
      </div>`;

    if (wide()) {
      view.innerHTML = `<div class="split"><aside class="split-list">${messagesPanel(c.id)}</aside>${chatHtml}</div>`;
      bindMessagesPanel($('.split-list'), c.id);
    } else {
      view.innerHTML = chatHtml;
    }

    applyChatTheme(lv);
    drawMessages(c);

    const input = $('#msgInput');
    $('#composer').onsubmit = e => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      if (sendUser(c, t)) input.value = '';
      input.focus();
    };
    $('#quick').querySelectorAll('button').forEach(b => b.onclick = () => sendUser(c, b.textContent));
    $('#moreBtn').onclick = e => { e.stopPropagation(); toggleMenu(c); };
    $('.hcard').onclick = e => {
      const z = e.target.closest('[data-zoom]');
      if (z) lightbox(c.album, +z.dataset.zoom);
    };
    const openGifts = () => A.GiftPanel.open(c, r => sendGift(c, r));
    $('#giftBtn').onclick = openGifts;
    $('#chatTools').addEventListener('click', e => {
      const b = e.target.closest('[data-call], [data-tool]');
      if (!b) return;
      if (b.dataset.call) A.Call.start(c, b.dataset.call);
      if (b.dataset.tool === 'tasks') tasksSheet(c);
    });
    if (ui.route.extra === 'gift') { history.replaceState(null, '', `#/chat/${c.id}`); ui.route.extra = null; openGifts(); }
  }

  // Arka plan + baloncuk: mağazadan seçilen ya da kalp düzeyiyle açılan
  function applyChatTheme(lv) {
    const el = $('.chat');
    if (!el) return;
    const t = A.Wallet.chatTheme(lv.lv);
    el.className = `chat ${t.bg.cls || ''} bub-${t.bubble.id}`;
    el.style.background = t.bg.css || '';
  }

  // Yakınlık çubuğu: seviye adı, puan (°C) ve sonraki seviyeye ilerleme
  function lvbarInner(lv) {
    const pct = lv.next ? Math.round((lv.pts - lv.prev) / (lv.next - lv.prev) * 100) : 100;
    return `<span>${lv.name} · ${lv.pts}°C</span><div class="bar"><i style="width:${pct}%"></i></div>`;
  }

  // Yakınlık görevleri: seviyeyi nasıl artıracağı ve hangi özelliklerin açıldığı
  function tasksSheet(c) {
    const lv = A.Engine.level(c);
    const pct = lv.next ? Math.round((lv.pts - lv.prev) / (lv.next - lv.prev) * 100) : 100;
    const M = A.Call.MIN_LV;
    const tasks = [
      ['💬', `Mesajlaş · ${msgCost(c)} ♥`, 'Her sohbet yakınlığı artırır; onu merak etmek daha çok', true],
      ['🎁', 'Hediye gönder', 'Değerine göre: 10 ♥ ≈ +2°C, 1.000 ♥ ≈ +12°C, 10.000 ♥ ≈ +34°C', true],
      ['📞', `Sesli ara · Lv.${M.voice}`, 'Konuştuğun her dakika +1°C (aramada en fazla 10). Mesajla "arayabilir miyim?" diye sorarsan Lv.' + (M.voice - 1) + "'de de olur", lv.lv >= M.voice - 1],
      ['📹', `Görüntülü ara · Lv.${M.video}`, 'Yakınlaşınca kamerayı açmayı kabul eder. "Görüntülü arayayım mı?" diye sorarsan Lv.' + (M.video - 1) + "'de de olur", lv.lv >= M.video - 1],
      ['📲', 'Seni arasın · Lv.3', 'Keyfi yerindeyse arada bir kendisi arar', lv.lv >= 3],
      ['💖', 'Kalp teması · Lv.4', 'Kalpli baloncuklar ve uçan kalpler arka planı', lv.lv >= 4],
      ['💎', 'Mücevher kalp · Lv.5', 'Sohbete mücevher kalp arka planı gelir', lv.lv >= 5]
    ];
    A.Eco.sheet(`
      <div class="sheet-grip"></div>
      <h3>💗 Yakınlık Görevleri</h3>
      <div class="mem-block">
        <div class="row2"><b>Lv.${lv.lv} ${lv.name}</b><span>${lv.pts}°C${lv.next ? ` / ${lv.next}°C` : ''}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <small>${lv.next ? `Sonraki seviyeye ${lv.next - lv.pts}°C kaldı` : 'En yüksek seviyedesiniz 💞'}</small>
      </div>
      ${tasks.map(([i, t, d, ok]) => `<div class="task-row ${ok ? '' : 'locked'}"><span>${i}</span><div><b>${t}</b><small>${d}</small></div><em>${ok ? '✓' : '🔒'}</em></div>`).join('')}`, 'light');
  }

  /* ---------- Hediye ---------- */
  function sendGift(c, r) {
    chatOf(c).push({ from: 'me', type: 'gift', gift: r.delivered.id, qty: r.qty, text: `🎁 ${r.delivered.name} x${r.qty}`, ts: Date.now() });
    if (r.gift.lucky) chatOf(c).push({ from: 'sys', text: `${r.gift.e} ${r.gift.name} açıldı: içinden ${r.delivered.e} ${r.delivered.name} çıktı!`, ts: Date.now() });
    if (r.rel) chatOf(c).push({ from: 'sys', text: `💞 ${c.name} ile artık ${r.rel.title} rozetiniz var`, ts: Date.now() });
    r.wishLine = A.Wish && A.Wish.fulfill(c, r); // istediği hediyeyse ayrıca sevinir
    const before = A.Engine.level(c).lv;
    const gain = A.Engine.giftAffinity(c, r.value);
    const lv = A.Engine.level(c);
    chatOf(c).push({ from: 'sys', text: lv.lv > before ? `💗 +${gain}°C yakınlık · Lv.${lv.lv} ${lv.name} oldunuz!` : `💗 +${gain}°C yakınlık`, ts: Date.now() });
    A.Store.save();
    refresh(c);
    if (onChatWith(c)) updateChatHeader(c);
    if (!A.Mood.isOnline(c)) {
      // hediye sosyal pilini biraz doldurur; çevrimiçi olunca teşekkür eder
      A.Mood.nudge(c, { social: 0.15 });
      S().pendingGift = S().pendingGift || {};
      S().pendingGift[c.id] = r;
      S().pending[c.id] = true;
      A.Store.save();
      return;
    }
    reactGift(c, r);
  }

  function reactGift(c, r) {
    if (typing[c.id]) { setTimeout(() => reactGift(c, r), 700); return; }
    clearTimeout(timers[c.id]);
    const res = A.Engine.giftReact(c, r);
    if (r.wishLine) r.wishLine.split('|').forEach(p => { res.parts.push(p); res.delays.push(1600); });
    // hediye karşılığı sözü verilen fotoğraf (js/wish.js)
    const photo = A.Wish && A.Wish.takePhoto(c);
    if (photo) { res.parts.push({ photo }); res.delays.push(1800); }
    play(c, res);
  }

  function toggleMenu(c) {
    const old = $('.menu');
    if (old) { old.remove(); return; }
    const m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = `
      <button data-a="profile">👤 Profili gör</button>
      <button data-a="pin">📌 ${isPinned(c.id) ? 'Sabitlemeyi kaldır' : 'En üste sabitle'}</button>
      <button data-a="clear" class="danger">🗑️ Sohbeti temizle</button>`;
    $('.chat').appendChild(m);
    m.onclick = e => {
      const a = e.target.closest('button')?.dataset.a;
      if (a === 'profile') location.hash = `#/p/${c.id}`;
      if (a === 'pin') togglePin(c.id);
      if (a === 'clear' && confirm(`${c.name} ile sohbet silinsin mi?`)) {
        S().chats[c.id] = []; S().expect[c.id] = null; A.Store.save(); drawMessages(c);
      }
      m.remove();
    };
    setTimeout(() => document.addEventListener('click', function off() { m.remove(); document.removeEventListener('click', off); }), 0);
  }

  // Karakterin senin hakkında bildikleri + ilgisi + bugünkü programı
  function memorySheet(c) {
    const v = A.Interest.get(c);
    const facts = A.Memory.list(c);
    const plan = A.Schedule.today(c);
    const p = presence(c);
    const at = A.Kume.where(c);
    const pref = at && A.Kume.pref(A.Kume.runtime(), c.archetype, at.st.id, at.sc.id);
    A.Eco.sheet(`
      <div class="sheet-grip"></div>
      <h3>🧠 ${esc(c.name)} hakkında ne biliyor?</h3>
      <div class="mem-block">
        <div class="row2"><b>İlgisi</b><span>${A.Interest.label(v)} · %${Math.round(v * 100)}</span></div>
        <div class="bar"><i style="width:${v * 100}%;background:${v < 0.3 ? '#ef4444' : v < 0.55 ? '#f59e0b' : '#22c55e'}"></i></div>
        <small>Kuru cevaplar, tekrar ve erken buluşma isteği düşürür; onu merak etmek, sorularına cevap vermek ve kendinden bahsetmek artırır.</small>
      </div>
      <div class="mem-block">
        <b>Şu anki konu</b>
        ${at ? `<div class="info-row"><span>💬 Konu</span><b>${esc(at.sc.name.replace(/^Konu:\s*/, ''))}</b></div>
          <div class="info-row"><span>${at.st.icon || '📍'} Küme</span><b>${esc(at.st.name)} · ${esc(at.st.desc || at.kind.label)}</b></div>
          ${pref ? `<div class="info-row"><span>${pref === 'like' ? '💜' : '✖'} Tutumu</span><b>${pref === 'like' ? 'bu kümeyi seviyor' : 'bu kümeyi sevmiyor'}</b></div>` : ''}`
          : '<small>Şu an belirli bir konu yok (başlangıç kümesinde). Okul, maç ya da buluşma gibi bir konu açınca burada görünür.</small>'}
      </div>
      <div class="mem-block">
        <b>Hatırladıkları</b>
        ${facts.length ? facts.map(([i, k, val]) => `<div class="info-row"><span>${i} ${esc(k)}</span><b>${esc(val)}</b></div>`).join('')
          : '<small>Henüz kendinden bahsetmedin. "İzmirliyim", "25 yaşındayım", "yarın sınavım var", "kahve severim" gibi şeyler yaz.</small>'}
      </div>
      <div class="mem-block">
        <b>Bugünkü programı</b>
        <div class="info-row"><span>📍 Şu an</span><b>${esc(p.text)}</b></div>
        <div class="info-row"><span>💤 Uyku</span><b>${plan.sleep}</b></div>
        ${plan.busy.map(b => `<div class="info-row"><span>⏰ Meşgul</span><b>${esc(b)}</b></div>`).join('') || '<div class="info-row"><span>⏰ Meşgul</span><b>bugün boş</b></div>'}
      </div>`, 'light');
  }

  function drawMessages(c) {
    const box = $('#msgs');
    if (!box) return;
    const msgs = chatOf(c);
    let html = '', prevTs = 0, prevFrom = null;
    msgs.forEach((m, i) => {
      if (m.ts - prevTs > 10 * 60 * 1000) { html += `<div class="stamp">${fmtTime(m.ts)}</div>`; prevFrom = null; }
      if (m.from === 'sys') {
        html += `<div class="sys">${esc(m.text)}</div>`;
      } else if (m.from === 'her') {
        const body = m.type === 'photo' ? `<div class="bubble photo-bubble"><img src="${esc(m.src)}" alt="" loading="lazy"></div>` : `<div class="bubble">${esc(m.text)}</div>`;
        html += `<div class="msg her ${prevFrom === 'her' ? 'cont' : ''}">${avatar(c, 36, { dot: false })}${body}</div>`;
      } else {
        const answered = msgs.slice(i + 1).some(x => x.from === 'her');
        const g = m.type === 'gift' ? A.Wallet.giftById(m.gift) : null;
        const body = g
          ? `<div class="gift-bubble"><span class="ge">${g.e}</span><div><b>${esc(g.name)}</b><small>x${m.qty} · ${(g.price * m.qty).toLocaleString('tr-TR')} coin</small></div></div>`
          : `<div class="bubble">${m.type === 'comment' ? '<small class="cmt-tag">💬 Anlar\'a yorum</small>' : ''}${esc(m.text)}</div>`;
        html += `<div class="msg me"><span class="seen ${answered || m.seen ? '' : 'wait'}">${ICON.check}</span>${body}</div>`;
      }
      prevTs = m.ts; prevFrom = m.from;
    });
    // Son mesaj seninse ve okunduysa: "Görüldü 21:04"
    const lastReal = [...msgs].reverse().find(m => m.from !== 'sys');
    if (lastReal && lastReal.from === 'me' && lastReal.seen && !typing[c.id]) {
      html += `<div class="seen-label">Görüldü ${fmtTime((S().lastSeen || {})[c.id] || lastReal.ts)}</div>`;
    }
    if (!msgs.length) html = `<div class="sys">${esc(c.name)} ile sohbete başla. İlk mesajı sen at 💌</div>`;
    if (typing[c.id]) html += `<div class="msg her ${prevFrom === 'her' ? 'cont' : ''}">${avatar(c, 36, { dot: false })}<div class="bubble"><span class="typing-dots"><i></i><i></i><i></i></span></div></div>`;
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  const onChatWith = c => ui.route && ui.route.name === 'chat' && ui.route.id === c.id;

  function refresh(c) {
    if (onChatWith(c)) { drawMessages(c); updateStatus(c); refreshLocks(c); } // izin ya da seviye gelince kilit kalkar
    const side = $('.split-list');
    const rows = $('#msgRows');
    if (side && rows) {
      // geniş ekran: yan listedeki satırları güncelle (yazıyor…, son mesaj, okunmamış)
      rows.innerHTML = msgRowsHtml(ui.route.name === 'chat' ? ui.route.id : null);
      bindRows(side);
    } else if (ui.route && ui.route.name === 'messages') renderMessages();
    updateBadge();
  }

  function updateStatus(c) {
    const el = $('#chatStatus');
    if (!el) return;
    const p = presence(c);
    el.textContent = p.text;
    el.className = p.cls;
    const fb = $('#forceBar');
    if (fb) fb.innerHTML = forceBtn(c);
    const tb = $('#testBar');
    if (tb) tb.innerHTML = testBar(c);
  }

  // Mesaj ücreti kızın cazibe seviyesine göre (Amor.MSG_COST_BY_CHARM); sohbet kartı varsa önce o kullanılır
  const msgCost = c => {
    const t = A.MSG_COST_BY_CHARM || [40];
    const lv = c && A.Background ? A.Background.charm(c.id).lv : 1;
    return t[Math.min(lv, t.length) - 1];
  };
  const msgPlaceholder = c => (c && (S().freeFirst || {})[c.id]) ? 'Merhaba de · ilk mesaj ücretsiz' : A.Wallet.cards() ? 'Bir şey söyle' : `Bir şey söyle · ${msgCost(c)} ♥`;
  // Mesaj kutusunun sol üstündeki ücretsiz sohbet kartı sayacı
  function refreshCards() {
    const mi = $('#msgInput'), chip = $('#cardChip');
    if (mi) mi.placeholder = msgPlaceholder(ui.route && ui.route.name === 'chat' ? A.byId(ui.route.id) : null);
    if (chip) { chip.hidden = !A.Wallet.cards(); chip.textContent = `🎟️ ${A.Wallet.cards()} ücretsiz`; }
  }
  // Akış'ta gönderiye yorum (js/feed.js): ücretsiz, sohbete yorum olarak düşer ve kız orada cevap verir
  function commentReply(c, text) {
    chatOf(c).push({ from: 'me', type: 'comment', text, ts: Date.now() });
    A.Store.save();
    if (!A.Mood.isOnline(c)) { markPending(c); return; }
    if (reading[c.id]) return;
    clearTimeout(timers[c.id]);
    timers[c.id] = setTimeout(() => startReply(c), 1500);
  }
  const ASK_CALL = ['Müsaitsen arayabilir miyim? 📞', 'Seni arayayım mı? 🙈', 'Sesini duymak istiyorum, arayabilir miyim?'];
  const pickRaw = a => a[Math.floor(Math.random() * a.length)];
  function sendUser(c, text) {
    const free = (S().freeFirst || {})[c.id]; // Eşleş: ilk mesaj ücretsiz (js/match.js)
    if (free) delete S().freeFirst[c.id];
    else if (!A.Wallet.useCard() && !A.Wallet.spend(msgCost(c), `Mesaj · ${c.name}`)) {
      if (confirm(`${c.name} ile mesaj ${msgCost(c)} ♥. Coin yüklemek ister misin?`)) location.hash = '#/recharge';
      return false;
    }
    refreshCards();
    chatOf(c).push({ from: 'me', text, ts: Date.now() });
    A.Wallet.track('msg');
    A.Wallet.track('chat', c.id);
    A.Store.save();
    if (!A.Mood.isOnline(c)) {
      markPending(c);
      refresh(c);
      return true;
    }
    refresh(c);
    // Okumak üzere bekliyorsa yeni mesajı da o okuyunca görecek
    if (reading[c.id]) return true;
    // Art arda yazılan mesajları toplayıp tek seferde cevaplasın
    clearTimeout(timers[c.id]);
    timers[c.id] = setTimeout(() => startReply(c), 1100);
    return true;
  }

  function unanswered(c) {
    const out = [];
    const msgs = chatOf(c);
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].from === 'her') break;
      if (msgs[i].from === 'me' && msgs[i].type !== 'gift') out.unshift(msgs[i].text);
    }
    return out;
  }

  /* Mesajı görme süresi (ms): yazışma sürüyorsa (son cevabı 3 dk içinde) birkaç saniye;
   * değilse bildirimi sonra fark eder (ilgisi yüksekse daha çabuk). */
  function readDelay(c) {
    const last = [...chatOf(c)].reverse().find(m => m.from === 'her');
    const hot = last && Date.now() - last.ts < 3 * 60000;
    const sec = hot ? 2 + Math.random() * 7 : 10 + Math.random() * 90 * (1.2 - A.Interest.get(c));
    return Math.round(sec * 1000);
  }

  function startReply(c, mode) {
    if (typing[c.id] || reading[c.id]) { timers[c.id] = setTimeout(() => startReply(c, mode), 800); return; }
    if (!unanswered(c).length) return;
    // Okumadan önce bekler: bildirimi görmesi (readDelay), meşgulse (derste, nöbette) uzun, ilgisi azaldıysa umursamaz,
    // arka planda başkasıyla yazışıyorsa (js/background.js) hemen dönemez. Telefonu yeni eline aldıysa da birkaç saniye.
    const wait = mode === 'back' ? 3000 + Math.random() * 15000
      : readDelay(c) + A.Schedule.replyDelay(c) + A.Interest.delay(c) + (A.Background ? A.Background.delay(c) : 0);
    reading[c.id] = true;
    timers[c.id] = setTimeout(() => {
      reading[c.id] = false;
      if (!A.Mood.isOnline(c)) { markPending(c); return; } // beklerken uyudu
      markSeen(c);
      const msgs = unanswered(c); // beklerken yeni mesaj gelmiş olabilir
      if (!msgs.length) return;
      // İlgisini kaybettiyse "Görüldü"de bırakabilir
      if (mode !== 'back' && Math.random() < A.Interest.ignoreChance(c)) { A.Store.save(); refresh(c); return; }
      // Bot kuralları ve otomatik ekler motorun içinde (engine.js → js/bot.js)
      const r = mode === 'back' ? A.Engine.comeBack(c, msgs, (S().pendingReason || {})[c.id]) : A.Engine.respond(c, msgs);
      play(c, r);
    }, wait);
  }

  /* ---------- Zorla çevrimiçi ----------
   * Uyuyan, meşgul ya da sosyal pili bitmiş karakteri coin karşılığı FORCE_MIN dakika çevrimiçi yapar
   * (schedule.js bu sürede onu boşta sayar). Bekleyen mesaj varsa onlara uyanmış gibi cevap verir. */
  const FORCE_COST = 100, FORCE_MIN = 30;
  const FORCE_ENABLED = false; // kapalı: çevrimdışı karakter coinle uyandırılamaz
  function forceInfo(c) {
    if (!FORCE_ENABLED) return null;
    const st = A.Schedule.status(c);
    if (st.forced) return null;
    if (st.state === 'sleep') return { reason: 'sleep', text: '😴 Uyuyor' };
    if (A.Schedule.away(c)) return { reason: 'away', text: '📴 Çevrimdışı' };
    if (!A.Mood.isOnline(c)) return { reason: 'tired', text: '🔋 Sosyal pili bitti, çevrimdışı' };
    if (st.state === 'busy') return { reason: 'busy', text: '⏰ Geç cevap verebilir' };
    return null;
  }
  const forceBtn = c => {
    const f = forceInfo(c);
    return f ? `<div class="force-bar"><span>${esc(f.text)}</span><button class="btn pink sm" data-force="${c.id}">⚡ Zorla çevrimiçi yap · ${FORCE_COST} ♥</button></div>` : '';
  };
  function forceOnline(c) {
    const f = forceInfo(c);
    if (!f) return;
    if (!A.Wallet.spend(FORCE_COST, `Zorla çevrimiçi · ${c.name}`)) {
      if (confirm(`Yeterli coin yok (${FORCE_COST} ♥ gerekli). Coin yüklemek ister misin?`)) location.hash = '#/recharge';
      return;
    }
    S().forced = S().forced || {};
    S().forced[c.id] = Date.now() + FORCE_MIN * 60000;
    const v = A.Mood.current(c).values;
    A.Mood.nudge(c, { social: Math.max(0, 0.55 - v.social), valence: f.reason === 'sleep' ? -0.08 : 0 });
    A.Store.save();
    if (S().pending[c.id]) {
      S().pending[c.id] = false;
      S().pendingReason = S().pendingReason || {};
      S().pendingReason[c.id] = f.reason === 'sleep' ? 'sleep' : 'other';
      const pg = (S().pendingGift || {})[c.id];
      if (pg) { delete S().pendingGift[c.id]; reactGift(c, pg); } else startReply(c, 'back');
    } else if (!typing[c.id] && !reading[c.id]) {
      play(c, A.Engine.wake(c, f.reason));
    }
    if (ui.route && ui.route.name === 'p') renderProfile(c); else refresh(c);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-force]');
    if (b) { const c = A.byId(b.dataset.force); if (c) forceOnline(c); }
  });

  /* ---------- Test modu (test-modu.bat): gizli parametreler, hemen cevap ---------- */
  const TEST = A.Wallet.FREE;
  function testBar(c) {
    if (!TEST) return '';
    const P = A.Params, p = P.get(c), f = P.feels(c), sc = (S().scene || {})[c.id] || {};
    const row = (k, v) => `<span><b>${esc(k)}</b> ${esc(String(typeof v === 'number' ? Math.round(v) : v))}</span>`;
    const list = (k, a) => `<div><b>${esc(k)}</b> ${esc(a.join(', ') || '-')}</div>`;
    const panel = ui.testOpen ? `<div class="test-panel">
        <div>${Object.entries(p.v).map(([k, v]) => row(k, v)).join('')}</div>
        <div>${row('zevk', p.me.zevk)}${row('cum', p.me.cum)}${row('cumN', p.me.cumN)}${row('döngü', P.cyclePhase(c))}${row('hamile', p.hamile ? P.pregWeek(c) + '. hafta' : 'hayır')}${row('gebelik', Math.round(P.pregChance(c) * 100) + '%')}</div>
        <div>${row('sahne', A.Intent.phase(c) || '-')}${row('poz', sc.pos ? sc.pos.title : '-')}${row('fant', sc.fant || '-')}${row('mod', sc.mode || '-')}${row('korunma', sc.prot || '-')}${row('ısrar', p.israr || 0)}${row('izin', p.izinVerdi ? 'evet' : 'hayır')}${row('soru', p.ask ? p.ask.t : '-')}</div>
        <div>${row('çevrimiçi', A.Mood.isOnline(c) ? 'evet' : 'hayır')}${row('ilgi', Math.round(A.Interest.get(c) * 100) + '%')}${row('LV', A.Engine.level(c).lv)}</div>
        ${list('Özellik', P.traits(c))}${list('Sever', f.likes)}${list('Sevmez', f.dislikes)}${list('İzin', f.allows)}${list('İzin yok', f.denies)}
      </div>` : '';
    return `<div class="force-bar test-bar"><span>🧪 Test</span>
        <button class="btn sm" data-test-toggle="${c.id}">${ui.testOpen ? 'Gizle' : 'Parametreler'}</button>
        <button class="btn pink sm" data-test-reply="${c.id}">⚡ Hemen cevap ver</button></div>${panel}`;
  }
  // Bekleme, çevrimdışı ve "Görüldü"de bırakma atlanır; yazıyor süresi kısa
  function forceReply(c) {
    const msgs = unanswered(c);
    if (typing[c.id]) return;
    if (!msgs.length) return A.Eco.notify('Cevaplanacak mesaj yok', '🧪');
    clearTimeout(timers[c.id]);
    reading[c.id] = false;
    S().pending[c.id] = false;
    markSeen(c);
    const r = A.Engine.respond(c, msgs);
    play(c, { ...r, delays: r.delays.map(d => Math.min(d, 600)) });
  }
  if (TEST) document.addEventListener('click', e => {
    const t = e.target.closest('[data-test-toggle]'), r = e.target.closest('[data-test-reply]');
    if (t) { ui.testOpen = !ui.testOpen; updateStatus(A.byId(t.dataset.testToggle)); }
    if (r) { const c = A.byId(r.dataset.testReply); if (c) forceReply(c); }
  });

  // Son gönderilen mesajlar "görüldü"
  function markSeen(c) {
    const msgs = chatOf(c);
    for (let i = msgs.length - 1; i >= 0 && msgs[i].from !== 'her'; i--) if (msgs[i].from === 'me') msgs[i].seen = true;
    S().lastSeen = S().lastSeen || {};
    S().lastSeen[c.id] = Date.now();
    A.Store.save();
    refresh(c);
  }

  function markPending(c) {
    S().pending[c.id] = true;
    S().pendingReason = S().pendingReason || {};
    S().pendingReason[c.id] = A.Schedule.status(c).state === 'sleep' ? 'sleep' : 'other';
    A.Store.save();
  }

  // Sohbet başlığındaki durum: yazıyor / çevrimiçi / son görülme
  function presence(c) {
    if (typing[c.id]) return { text: 'yazıyor…', cls: 'typing' };
    const st = A.Schedule.status(c);
    if (st.forced) return { text: `Çevrimiçi · ⚡ ${Math.max(1, Math.ceil((st.until - Date.now()) / 60000))} dk`, cls: 'on' };
    if (A.Mood.isOnline(c)) return { text: 'Çevrimiçi', cls: 'on' };
    const seen = Math.max((S().lastSeen || {})[c.id] || 0, st.state === 'sleep' ? Math.min(st.since, Date.now()) : 0);
    return { text: seen ? `son görülme ${relTime(seen)}` : 'çevrimdışı', cls: 'off' };
  }

  function relTime(ts) {
    const diff = (Date.now() - ts) / 60000;
    if (diff < 1) return 'az önce';
    if (diff < 60) return `${Math.floor(diff)} dk önce`;
    const d = new Date(ts), hm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === new Date().toDateString()) return `bugün ${hm}`;
    if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return `dün ${hm}`;
    return fmtTime(ts);
  }

  function play(c, r) {
    let i = 0;
    const next = () => {
      typing[c.id] = true;
      refresh(c);
      setTimeout(() => {
        typing[c.id] = false;
        pushHer(c, r.parts[i]);
        i++;
        if (i < r.parts.length) setTimeout(next, 250);
        else if (unanswered(c).length) timers[c.id] = setTimeout(() => startReply(c), 900);
      }, r.delays[i]);
    };
    next();
  }

  function pushHer(c, part) {
    // { photo }: fotoğraf balonu (js/wish.js)
    const text = part && part.photo ? '📷 Fotoğraf' : part;
    chatOf(c).push(part && part.photo ? { from: 'her', type: 'photo', src: part.photo, text, ts: Date.now() } : { from: 'her', text, ts: Date.now() });
    if ((!onChatWith(c) || document.hidden) && A.Notify) A.Notify.message(c, text);
    if (!onChatWith(c)) {
      S().unread[c.id] = (S().unread[c.id] || 0) + 1;
      toast(c, text);
    }
    A.Store.save();
    refresh(c);
    if (onChatWith(c)) updateChatHeader(c);
  }

  /* Kademeli açılma: yazı → sesli → görüntülü. Seviye şartı call.js'teki MIN_LV (call.js app.js'ten sonra yüklenir).
   * Mesajla "arayabilir miyim?" diye sorunca bir seviye önce de açabilir (call.js permit). */
  const callLv = () => (A.Call && A.Call.MIN_LV) || { voice: 2, video: 3 };
  // Arama kilitli mi (seviye yetmiyor ve mesajla izin yok) — kilitliyse arama başlamaz (call.js)
  const callLocked = (c, type) => (A.Call ? A.Call.locked(c, type) : A.Engine.level(c).lv < callLv()[type]);
  function refreshLocks(c) {
    document.querySelectorAll('#chatTools [data-call]').forEach(b => b.classList.toggle('locked', callLocked(c, b.dataset.call)));
  }
  function unlockRow(lv) {
    const step = (icon, name, need) => lv.lv >= need
      ? `<span class="ul on">${icon} ${name} ✓</span>`
      : `<span class="ul" title="Mesajla 'arayabilir miyim?' diye sorarsan bir seviye önce açabilir">${icon} ${name} 🔒 Lv.${need}</span>`;
    return `${step('💬', 'Yazı', 1)}<i>›</i>${step('📞', 'Sesli', callLv().voice)}<i>›</i>${step('📹', 'Görüntülü', callLv().video)}`;
  }

  function updateChatHeader(c) {
    const lv = A.Engine.level(c);
    const ul = $('#unlockRow');
    if (ul) ul.innerHTML = unlockRow(lv);
    refreshLocks(c);
    const bar = $('.hcard .lvbar');
    if (bar) bar.innerHTML = lvbarInner(lv);
    const heart = $('.couple .heart small');
    if (heart) heart.textContent = `LV ${lv.lv}`;
    applyChatTheme(lv);
  }

  /* ---------- Ruh hali listesi ---------- */
  function renderMoodList() {
    view.innerHTML = `
      <div class="page-pad moods">
        <div class="h-title">Ruh Hali</div>
        <p class="about" style="margin-top:-6px">Valence × arousal düzleminde her karakterin anlık ruh hali. Ayarladığın değer zamanla kişiliğine göre “normal” haline geri döner.</p>
        ${chars().map(c => {
          const { cur, meta } = moodInfo(c);
          const v = cur.values;
          const bar = (lbl, val) => `<div><label>${lbl}</label><div class="bar"><i style="width:${Math.round(val * 100)}%"></i></div></div>`;
          return `
            <a class="mood-card" href="#/mood/${c.id}">
              ${avatar(c, 54)}
              <div class="info">
                <div class="name">${esc(c.name)} ${cur.locked ? '🔒' : ''}</div>
                <div class="mini-bars">
                  ${bar('Valence', (v.valence + 1) / 2)}${bar('Arousal', v.arousal)}
                  ${bar('Enerji', v.energy)}${bar('Sosyal pil', v.social)}
                </div>
              </div>
              <div class="face">${meta.emoji}<small>${meta.name}</small></div>
            </a>`;
        }).join('')}
      </div>`;
  }

  /* ---------- Ruh hali düzenleyici (Set mood) ---------- */
  function renderMoodEditor(c) {
    const cur = A.Mood.current(c);
    const draft = { ...cur.values };
    const base = cur.baseline;
    view.innerHTML = `
      <div class="editor-head">
        <button class="icon-btn" id="edBack" aria-label="Geri">${ICON.arrowLeft}</button>
        ${avatar(c, 40)}
        <h1>${esc(c.name)} · Ruh hali</h1>
      </div>

      <div class="pad-wrap">
        <div class="pad" id="pad">
          <span class="q tl">😤 Gergin</span><span class="q tr">🤩 Coşkulu</span>
          <span class="q bl">😔 Üzgün</span><span class="q br">😌 Huzurlu</span>
          <span class="axis x">VALENCE →</span><span class="axis y">↑ AROUSAL</span>
          <div class="ghost" id="ghost" title="Kişiliğine göre normal hali"></div>
          <div class="knob" id="knob"></div>
        </div>
      </div>

      <div class="live-label" id="live"></div>

      <div class="ctrl">
        <div class="row2"><span>⚡ Enerji</span><small id="enV"></small></div>
        <input type="range" id="en" min="0" max="1" step="0.01">
        <div class="row2"><span>🔋 Sosyal pil</span><small id="soV"></small></div>
        <input type="range" id="so" min="0" max="1" step="0.01">
      </div>

      <div class="ctrl">
        <div class="row2"><span>Hazır ruh halleri</span></div>
        <div class="presets">
          ${Object.keys(A.Mood.PRESETS).map(k => `<button data-p="${k}">${A.Mood.LABELS[k].emoji} ${A.Mood.LABELS[k].name}</button>`).join('')}
        </div>
      </div>

      <div class="ctrl">
        <div class="row2"><span>Gizli sebep</span><small>sadece güvendiği kişiye ima eder</small></div>
        <input type="text" id="cause" maxlength="80" placeholder="ör. sınavdan düşük aldı" value="${esc(cur.cause || '')}">
        <div class="row2" style="margin-top:14px"><span>🔒 Kilitle <small style="display:block">zamanla normale dönmesin</small></span>
          <label class="switch"><input type="checkbox" id="lock" ${cur.locked ? 'checked' : ''}><span></span></label>
        </div>
      </div>

      <div class="actions">
        <button class="btn ghost" id="resetBtn">Sıfırla</button>
        <button class="btn primary" id="saveBtn">Kaydet</button>
      </div>

      <div class="log">
        <div class="sec-title">Geçmiş</div>
        ${(S().moodLog[c.id] || []).slice(0, 12).map(l => {
          const m = A.Mood.LABELS[l.label];
          return `<div class="log-item"><span class="em">${m.emoji}</span><div class="txt"><b>${m.name}</b>${l.cause ? ` · ${esc(l.cause)}` : ''}<small>${fmtTime(l.ts)} · ${esc(l.source)}</small></div></div>`;
        }).join('') || '<div class="about">Henüz değişiklik yok.</div>'}
      </div>`;

    $('#edBack').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/mood'; };
    const pad = $('#pad'), knob = $('#knob'), ghost = $('#ghost');
    const en = $('#en'), so = $('#so');

    const place = (el, v) => {
      el.style.left = ((v.valence + 1) / 2 * 100) + '%';
      el.style.top = ((1 - v.arousal) * 100) + '%';
    };

    function sync() {
      place(knob, draft);
      place(ghost, base);
      en.value = draft.energy; so.value = draft.social;
      $('#enV').textContent = Math.round(draft.energy * 100) + '%';
      $('#soV').textContent = Math.round(draft.social * 100) + '%';
      const lab = A.Mood.label(draft);
      const m = A.Mood.LABELS[lab];
      knob.textContent = m.emoji;
      $('#live').style.background = m.color;
      $('#live').innerHTML = `<span class="em">${m.emoji}</span><div>${m.name}<small>valence ${draft.valence.toFixed(2)} · arousal ${draft.arousal.toFixed(2)}</small></div>`;
    }

    function fromPointer(e) {
      const r = pad.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      draft.valence = Math.round((x * 2 - 1) * 100) / 100;
      draft.arousal = Math.round((1 - y) * 100) / 100;
      sync();
    }
    pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); pad.classList.add('drag'); fromPointer(e); });
    pad.addEventListener('pointermove', e => { if (pad.classList.contains('drag')) fromPointer(e); });
    const end = () => pad.classList.remove('drag');
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);

    en.oninput = () => { draft.energy = +en.value; sync(); };
    so.oninput = () => { draft.social = +so.value; sync(); };
    view.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { Object.assign(draft, A.Mood.PRESETS[b.dataset.p]); sync(); });

    $('#saveBtn').onclick = () => {
      A.Mood.set(c, draft, { cause: $('#cause').value, locked: $('#lock').checked, source: 'panel' });
      renderMoodEditor(c);
    };
    $('#resetBtn').onclick = () => { A.Mood.reset(c); renderMoodEditor(c); };

    sync();
    window.scrollTo(0, 0);
  }

  /* ---------- Karakter oluştur ---------- */
  function renderCreate() {
    if (!ui.create) {
      const d = A.Gen.draft();
      ui.create = { setId: d.setId, name: d.name, archetype: d.archetype, draft: d };
    }
    const st = ui.create;
    const used = A.Gen.usedSets();
    const pv = A.Gen.hydrate(st.draft);
    const arch = A.archetype(st.archetype);
    const stripScroll = $('.sets') ? $('.sets').scrollLeft : null;

    view.innerHTML = `
      <div class="create">
        <div class="editor-head">
          <a class="icon-btn" href="#/home" aria-label="Geri">${ICON.arrowLeft}</a>
          <h1>Karakter Oluştur</h1>
          <button class="chip dice-all" id="allDice">🎲 Hepsi</button>
        </div>

        <div class="ctrl">
          <div class="row2"><span>📸 Fotoğraf seti</span><button class="dice-btn" data-dice="set" aria-label="Rastgele set">🎲</button></div>
          <div class="sets">
            ${A.PHOTO_SETS.map(s => `
              <button class="set ${s.id === st.setId ? 'on' : ''} ${used.has(s.id) ? 'used' : ''}" data-set="${esc(s.id)}">
                <img src="${A.Gen.photoUrl(s.id, s.profile)}" alt="" loading="lazy">
                <span>${used.has(s.id) ? 'kullanımda' : (s.photos.length + 1) + ' foto'}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="ctrl">
          <div class="row2"><span>✍️ İsim</span><button class="dice-btn" data-dice="name" aria-label="Rastgele isim">🎲</button></div>
          <input type="text" id="cName" maxlength="16" value="${esc(st.name)}" placeholder="İsim havuzundan çekmek için 🎲">
        </div>

        <div class="ctrl">
          <div class="row2"><span>💫 Kişilik</span><button class="dice-btn" data-dice="arch" aria-label="Rastgele kişilik">🎲</button></div>
          <div class="presets">
            ${A.ARCHETYPES.map(a => `<button data-arch="${a.id}" class="${a.id === st.archetype ? 'on' : ''}">${a.icon} ${a.label}</button>`).join('')}
          </div>
          <div class="about" style="margin-top:8px">${esc(arch.desc)}</div>
        </div>

        <div class="sec-title" style="margin:18px 16px 8px">Önizleme</div>
        <div class="preview">
          <div class="pv-photo">
            ${pv.photo ? `<img src="${esc(pv.photo)}" alt="">` : ''}
            <div class="pv-over">
              <b>${esc(pv.display)}</b>
              <div class="chips">
                <span class="chip sex">♀ ${pv.age}</span>
                <span class="chip loc">📍 ${esc(pv.city)}</span>
                <span class="chip">${pv.height}cm</span>
                <span class="chip zod">✦ ${esc(pv.zodiac)}</span>
              </div>
            </div>
          </div>
          <div class="pv-body">
            <div class="info-row"><span>💼 Meslek</span><b>${esc(pv.job)}</b></div>
            <div class="info-row"><span>🏠 Semt</span><b>${esc(pv.district)}, ${esc(pv.city)}</b></div>
            <div class="pv-bio">“${esc(pv.bio)}”</div>
            <div class="chips">${pv.likes.map(l => `<span class="chip">💜 ${esc(l)}</span>`).join('')}</div>
            <div class="pv-sample"><small>Örnek mesajı</small>${esc(A.Engine.sample(pv, 'greet'))} · ${esc(A.Engine.sample(pv, 'ask_city'))}</div>
          </div>
        </div>

        <div class="actions" style="padding-bottom:calc(20px + var(--safe-b))">
          <button class="btn ghost" id="reroll">🎲 Detaylar</button>
          <button class="btn primary" id="createBtn">✨ Oluştur</button>
        </div>
      </div>`;

    if (stripScroll !== null) $('.sets').scrollLeft = stripScroll;
    else { const on = $('.set.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); }

    const redraft = () => {
      st.draft = A.Gen.draft({ setId: st.setId, name: st.name, archetype: st.archetype });
      renderCreate();
    };
    const nameInput = $('#cName');

    view.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { st.setId = b.dataset.set; redraft(); });
    view.querySelectorAll('[data-arch]').forEach(b => b.onclick = () => { st.archetype = b.dataset.arch; redraft(); });
    nameInput.onchange = () => { st.name = nameInput.value.trim() || A.Gen.randomName(); redraft(); };
    view.querySelectorAll('[data-dice]').forEach(b => b.onclick = () => {
      const k = b.dataset.dice;
      if (k === 'set') st.setId = A.Gen.randomSet();
      if (k === 'name') st.name = A.Gen.randomName();
      if (k === 'arch') st.archetype = A.ARCHETYPES[Math.floor(Math.random() * A.ARCHETYPES.length)].id;
      redraft();
    });
    $('#reroll').onclick = redraft;
    $('#allDice').onclick = () => { ui.create = null; renderCreate(); };
    $('#createBtn').onclick = () => {
      const typed = nameInput.value.trim();
      if (typed && typed !== st.draft.name) { st.name = typed; st.draft = A.Gen.draft({ setId: st.setId, name: typed, archetype: st.archetype }); }
      const c = A.Gen.add(st.draft);
      S().createdCount = (S().createdCount || 0) + 1;
      A.Store.save();
      ui.create = null;
      ui.profileTab = 'profile';
      location.hash = `#/p/${c.id}`;
    };
  }

  /* ---------- Hesap: giriş / oluşturma ----------
   * Hesaplar bu cihazda tutulur (store.js); her hesabın karakterleri, sohbetleri ve coinleri ayrıdır.
   * Giriş / çıkıştan sonra sayfa yeniden yüklenir, böylece zamanlayıcılar ve önbellekler temiz başlar. */
  const auth = { mode: null, pick: null, error: '' };
  function renderAuth() {
    ui.route = { name: 'auth' };
    app.classList.add('no-nav');
    const list = A.Store.accounts();
    const mode = auth.mode || 'welcome';
    const err = auth.error ? `<div class="auth-err">${esc(auth.error)}</div>` : '';
    const ava = (name, size) => `<div class="ava" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;background:linear-gradient(135deg,#7b5cff,#c86bff)">${esc((name || '?').charAt(0).toLocaleUpperCase('tr'))}</div>`;
    // Yeni hesap ikinci (ya da sonraki) hesapsa yükleme fiyatları artar (js/wallet.js packCost)
    const M = A.MULTI_ACCOUNT_MARKUP || [1], nextMarkup = M[Math.min(A.Store.deviceCount(), M.length - 1)];
    const markupNote = nextMarkup > 1 ? `<div class="notice">Bu cihazda zaten hesap var: yeni hesapta yükleme fiyatları ×${nextMarkup.toLocaleString('tr-TR')} olur.</div>` : '';
    const backBtn = '<button class="auth-back" data-mode="welcome" aria-label="Geri">‹</button>';
    let body;
    if (mode === 'welcome') {
      // Çevrimiçi sayısı: saate göre değişen sabit bir sayı (simülasyon)
      const online = 1200000 + (Math.floor(Date.now() / 3600000) * 7919 % 800000);
      body = `<div class="auth-logo">amor</div>
        <p class="auth-tag">Amor'da şu an çevrimiçi sohbet eden <b>${online.toLocaleString('tr-TR')}</b> kişi!</p>
        <button class="auth-pill" id="guestBtn"><span>👥</span>Ziyaretçi girişi</button>
        <button class="auth-pill" data-mode="${list.length ? 'login' : 'register'}"><span>${list.length ? '👤' : '✍️'}</span>${list.length ? 'Hesabımla giriş' : 'Hesap oluştur'}</button>
        ${err}${markupNote}
        <div class="auth-or"><span>Diğer giriş yöntemi</span></div>
        <div class="auth-alt">
          ${list.length ? '<button data-mode="login" aria-label="Hesaplarım"><em>Eski giriş yöntemi</em>👤</button>' : ''}
          <button data-mode="register" aria-label="Yeni hesap">✍️</button>
        </div>
        <p class="auth-foot">Hesaplar sadece bu cihazda saklanır · coinler tamamen sanaldır</p>`;
    } else if (mode === 'login') {
      body = `${backBtn}<h2>Hesabını seç</h2>
        <div class="acc-list">${list.map(a => `
          <div class="acc ${auth.pick === a.id ? 'on' : ''}" data-acc="${a.id}">
            ${ava(a.user.name || a.username, 46)}
            <div class="acc-info"><b>${esc(a.user.name || a.username)}</b><small>@${esc(a.username)}${a.hasPin ? ' · 🔒' : ''}</small></div>
            ${auth.pick === a.id && a.hasPin ? `<input class="pin" id="pinIn" type="password" inputmode="numeric" maxlength="4" placeholder="PIN" autocomplete="off">` : ''}
            <span class="go">›</span>
          </div>`).join('')}</div>
        ${err}
        <button class="btn ghost block" data-mode="register" style="margin-top:14px">+ Yeni hesap oluştur</button>`;
    } else {
      body = `${backBtn}<h2>Hesap oluştur</h2>
        <p class="auth-sub">Hesabın bu cihazda saklanır. Her hesabın kendi karakterleri, sohbetleri ve coinleri olur.</p>
        ${!list.length && A.Store.hasLegacy() ? '<div class="notice">Bu cihazdaki mevcut sohbetlerin ve karakterlerin yeni hesabına aktarılacak 💌</div>' : ''}
        ${markupNote}
        <form id="regForm" autocomplete="off">
          <div class="field"><label>Kullanıcı adı</label><input name="username" maxlength="20" placeholder="ör. deniz.34" autocapitalize="none" required></div>
          <div class="field"><label>Adın</label><input name="name" maxlength="20" placeholder="Kızlar sana böyle hitap edecek" required></div>
          <div class="field two"><div><label>Yaşın</label><input name="age" inputmode="numeric" maxlength="2" required></div>
            <div><label>Şehrin</label><input name="city" maxlength="20" placeholder="isteğe bağlı"></div></div>
          <div class="field"><label>PIN (isteğe bağlı)</label><input name="pin" type="password" inputmode="numeric" maxlength="4" placeholder="4 haneli · hesabı açarken sorulur"></div>
          ${err}
          <button class="btn pink block" type="submit" style="margin-top:16px">Hesabı oluştur</button>
        </form>
        ${list.length ? '<button class="btn ghost block" data-mode="login" style="margin-top:10px">Mevcut hesaba giriş yap</button>' : ''}`;
    }
    // Arka plan: karakter fotoğraflarından kayan mozaik (4 sütun)
    const shots = (A.PHOTO_SETS || []).filter(s => s.profile).map(s => A.Gen.photoUrl(s.id, s.profile)).sort(() => Math.random() - 0.5).slice(0, 20);
    const cols = [0, 1, 2, 3].map(k => shots.filter((_, i) => i % 4 === k));
    const mosaic = shots.length ? `<div class="auth-mosaic" aria-hidden="true">${cols.map(col =>
      `<div>${[...col, ...col].map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>`).join('')}</div>` : '';
    view.innerHTML = `<div class="auth ${mode === 'welcome' ? 'welcome' : ''}">${mosaic}<div class="auth-card ${mode === 'welcome' ? '' : 'card'}">${body}</div></div>`;

    const enter = () => { location.hash = '#/home'; location.reload(); };
    view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { auth.mode = b.dataset.mode; auth.error = ''; auth.pick = null; renderAuth(); });
    // Ziyaretçi: formsuz, rastgele kullanıcı adıyla anında hesap (ad ve yaş sonra Ben'den değişir)
    const guest = $('#guestBtn');
    if (guest) guest.onclick = () => {
      let r;
      for (let i = 0; i < 5 && !(r && r.ok); i++) r = A.Store.register({ username: 'ziyaretci' + Math.floor(1000 + Math.random() * 9000), name: 'Ziyaretçi', age: 25 });
      if (r.ok) return enter();
      auth.error = r.error; renderAuth();
    };
    view.querySelectorAll('[data-acc]').forEach(el => el.onclick = e => {
      if (e.target.id === 'pinIn') return;
      const a = list.find(x => x.id === el.dataset.acc);
      if (!a.hasPin) { const r = A.Store.login(a.id); if (r.ok) enter(); return; }
      if (auth.pick !== a.id) { auth.pick = a.id; auth.error = ''; renderAuth(); $('#pinIn').focus(); return; }
      tryPin();
    });
    function tryPin() {
      const r = A.Store.login(auth.pick, $('#pinIn').value);
      if (r.ok) return enter();
      auth.error = r.error; renderAuth(); $('#pinIn').focus();
    }
    const pin = $('#pinIn');
    if (pin) pin.oninput = () => { if (pin.value.length === 4) tryPin(); };
    const form = $('#regForm');
    if (form) form.onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const r = A.Store.register(f);
      if (r.ok) return enter();
      auth.error = r.error; renderAuth();
      Object.entries(f).forEach(([k, v]) => { const i = $(`#regForm [name=${k}]`); if (i) i.value = v; });
    };
  }

  /* ---------- Ben ---------- */
  function renderMe() {
    const u = S().user;
    const acc = A.Store.account();
    const chatsCount = chars().filter(c => chatOf(c).length).length;
    const sent = chars().reduce((n, c) => n + chatOf(c).filter(m => m.from === 'me').length, 0);
    const follows = Object.values(S().follows).filter(Boolean).length;
    const best = [...chars()].sort((a, b) => (S().affinity[b.id] || 0) - (S().affinity[a.id] || 0))[0];
    const bestLv = best ? A.Engine.level(best) : null;

    const W = A.Wallet;
    const vip = W.vip();
    const wl = W.wealth();
    const todayVisitors = S().visitors.filter(v => new Date(v.ts).toDateString() === new Date().toDateString()).length;
    const menu = [
      ['#/visitors', '👀', 'Ziyaretçiler', todayVisitors],
      ['#/vip', '👑', 'VIP', 0],
      ['#/game', '🎡', 'Oyun', W.spinsLeft()],
      ['#/store', '🛍️', 'Mağaza', 0],
      ['#/rewards', '🎁', 'Ödüller', W.claimableCount()],
      ['#/guide', '📖', 'Kitaplık', 0]
    ];

    view.innerHTML = `
      <div class="me-head">
        <div class="me-top">
          <a class="pill" href="#/recharge"><span class="coin">♥</span><b data-coins>${W.coins().toLocaleString('tr-TR')}</b> Yükle</a>
          <a class="pill" href="#/vip">💎 VIP${vip.lv}</a>
        </div>
        <div class="row-me">
          ${userAvatar(76)}
          <div>
            <div class="nm">${userName()}</div>
            <div class="chips" style="margin-top:6px">
              <span class="chip" style="background:#3b82f6;color:#fff">♂ ${esc(u.age || '?')}</span>
              <span class="chip loc">📍 ${esc(u.city || 'Türkiye')}</span>
              <span class="chip" style="background:#16a34a;color:#fff">Lv.${wl.lv}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="me-card card">
        <div class="stats" style="margin-top:0">
          <div><b>${chatsCount}</b><span>Sohbet</span></div>
          <div><b>${sent}</b><span>Mesaj</span></div>
          <div><b>${follows}</b><span>Takip</span></div>
        </div>
        ${best && S().affinity[best.id] ? `<div class="info-row" style="margin-top:10px"><span>En yakının</span><b>${esc(best.name)} · Lv.${bestLv.lv} ${bestLv.name}</b></div>` : ''}
      </div>

      <div class="me-menu card">
        ${menu.map(([href, icon, name, n]) => `<a href="${href}"><span class="mi">${icon}${n ? `<b class="mbadge">${n}</b>` : ''}</span>${name}</a>`).join('')}
      </div>

      <div class="page-pad narrow">
        ${installCard()}
        <div class="card">
          <div class="sec-title" style="margin-top:0">Profilin</div>
          <div class="field"><label>Adın</label><input id="uName" maxlength="20" value="${esc(u.name)}" placeholder="Kızlar sana böyle hitap edecek"></div>
          <div class="field"><label>Yaşın</label><input id="uAge" inputmode="numeric" maxlength="2" value="${esc(u.age)}"></div>
          <div class="field"><label>Şehrin</label><input id="uCity" maxlength="20" value="${esc(u.city)}"></div>
        </div>

        <div class="card" style="margin-top:12px">
          <div class="sec-title" style="margin-top:0">🔔 Bildirimler</div>
          ${notifyCard()}
        </div>

        <div class="card" style="margin-top:12px">
          <div class="sec-title" style="margin-top:0">Hesap</div>
          <div class="info-row"><span>Kullanıcı adı</span><b>@${esc(acc.username)}</b></div>
          <div class="info-row"><span>Oluşturulma</span><b>${new Date(acc.created).toLocaleDateString('tr-TR')}</b></div>
          <div class="info-row"><span>PIN</span><b>${acc.pin ? '🔒 açık' : 'yok'}</b></div>
          <div class="acc-btns">
            <button class="btn ghost" id="accSwitch">Hesap değiştir / çıkış</button>
            <button class="btn ghost" id="accPin">${acc.pin ? 'PIN\'i değiştir / kaldır' : 'PIN koy'}</button>
          </div>
          <button class="btn ghost block" id="accDel" style="margin-top:8px;color:#ff2d55">Hesabı sil</button>
        </div>


        <button class="btn ghost block" id="resetAll" style="margin-top:14px;color:#ff2d55">Tüm verileri sıfırla</button>
      </div>`;

    const ib = $('#installBtn');
    if (ib) ib.onclick = async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderMe(); };
    const nb = $('#notifyBtn');
    if (nb) nb.onclick = async () => {
      if (A.Notify.on()) A.Notify.disable();
      else if (await A.Notify.enable() === 'granted') { A.Notify.message({ id: 'test', name: 'Amor', photo: null }, 'Bildirimler açık 🔔 Kızlar yazınca burada göreceksin.'); updateBadge(); }
      renderMe();
    };
    const bind = (id, key) => $(id).onchange = () => { u[key] = $(id).value.trim(); A.Store.save(); renderMe(); };
    bind('#uName', 'name'); bind('#uAge', 'age'); bind('#uCity', 'city');
    $('#accSwitch').onclick = () => { A.Store.logout(); location.hash = '#/home'; location.reload(); };
    $('#accPin').onclick = () => {
      const p = prompt(acc.pin ? 'Yeni 4 haneli PIN (boş bırakırsan PIN kaldırılır):' : '4 haneli PIN:');
      if (p === null) return;
      if (!A.Store.setPin(p.trim())) return alert('PIN 4 haneli rakam olmalı.');
      renderMe();
    };
    $('#accDel').onclick = () => {
      if (!confirm(`@${acc.username} hesabı ve içindeki bütün karakterler, sohbetler ve coinler kalıcı olarak silinsin mi?`)) return;
      if (prompt('Onaylamak için kullanıcı adını yaz:') !== acc.username) return alert('Kullanıcı adı eşleşmedi, silinmedi.');
      A.Store.removeAccount(acc.id); location.hash = '#/home'; location.reload();
    };
    $('#resetAll').onclick = () => {
      if (confirm('Bu hesaptaki tüm sohbetler ve ayarlar silinsin mi? Her şey baştan başlar.')) {
        busy('Her şey baştan hazırlanıyor…', () => {
          A.Store.reset(); A.Wallet.st(); A.Gen.seed(); A.Gen.load();
          if (A.Background) A.Background.warmup();
          location.hash = '#/home'; render();
        });
      }
    };
  }

  /* ---------- Zamanlayıcı: dönüşler ve kendiliğinden gelen mesajlar ---------- */
  function tick() {
    if (!A.Store.account()) return;
    // süresi dolan "zorla çevrimiçi" kayıtları
    Object.entries(S().forced || {}).forEach(([id, until]) => { if (until < Date.now()) delete S().forced[id]; });
    chars().forEach(c => {
      // karşılanmayan hediye isteği: bozulur, belki sitem eder
      const forgot = A.Wish && A.Wish.expire(c);
      if (forgot && A.Mood.isOnline(c) && !typing[c.id] && chatOf(c).length) pushHer(c, forgot);
      // Uygulama kapanıp açıldıysa okunmamış kalan mesajlar (okuma bekleyişi yarıda kalmış olabilir)
      const lastMe = lastMsg(c);
      if (lastMe && lastMe.from === 'me' && lastMe.type !== 'gift' && !lastMe.seen && !S().pending[c.id] && !reading[c.id] && !typing[c.id] && Date.now() - lastMe.ts > 2 * 60000) {
        if (A.Mood.isOnline(c)) startReply(c); else markPending(c);
      }
      if (S().pending[c.id] && A.Mood.isOnline(c) && !typing[c.id]) {
        S().pending[c.id] = false;
        const pg = (S().pendingGift || {})[c.id];
        if (pg) delete S().pendingGift[c.id];
        A.Store.save();
        if (pg) reactGift(c, pg);
        else startReply(c, 'back');
      }
    });

    // Arada biri profiline bakar (yakın olanlar daha sık)
    if (Math.random() < 0.2) {
      const seenToday = new Set(S().visitors.filter(v => new Date(v.ts).toDateString() === new Date().toDateString()).map(v => v.id));
      const pool = chars().filter(c => !seenToday.has(c.id) && A.Mood.isOnline(c));
      const weighted = pool.flatMap(c => Array(1 + Math.min(5, A.Engine.level(c).lv)).fill(c));
      if (weighted.length) A.Wallet.addVisitor(weighted[Math.floor(Math.random() * weighted.length)].id);
    }

    // Çevrimiçi olanların "son görülme"si şimdi
    S().lastSeen = S().lastSeen || {};
    chars().forEach(c => { if (A.Mood.isOnline(c)) S().lastSeen[c.id] = Date.now(); });
    const open = ui.route && ui.route.name === 'chat' && A.byId(ui.route.id);
    if (open) updateStatus(open);

    // Keyfi yerinde, boş ve konuşmak isteyen biri arada bir kendisi yazar
    const now = Date.now();
    const candidates = chars().filter(c => {
      if (openerSent[c.id] || typing[c.id] || reading[c.id] || onChatWith(c)) return false;
      if (A.Schedule.status(c).state !== 'free' || A.Interest.get(c) < 0.35) return false;
      const v = A.Mood.current(c).values;
      const last = lastMsg(c);
      return A.Mood.isOnline(c) && v.valence > 0.1 && v.social > 0.5 && (!last || now - last.ts > 30 * 60 * 1000);
    });
    if (candidates.length && Math.random() < 0.25) {
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      openerSent[c.id] = true;
      play(c, A.Engine.opener(c));
    }

    if (A.Call) A.Call.maybeIncoming();
    if (A.Background) A.Background.tick(); // kadınların görünmeyen erkek karakterlerle sohbetleri

    // Arada biri yeni bir "An" paylaşır (çevrimiçi olanlardan; kişi başı ortalama 1-2 günde bir)
    if (Math.random() < 0.03) {
      const pool = chars().filter(A.Mood.isOnline);
      if (pool.length) A.Gen.addPost(pool[Math.floor(Math.random() * pool.length)].id);
    }

    // Listelerdeki çevrimiçi / ruh hali bilgisini tazele
    const r = ui.route;
    if (r && !r.id && r.name === 'home') renderHome();
    if (r && !r.id && r.name === 'mood') renderMoodList();
  }

  /* ---------- PWA: çevrimdışı çalışma + ana ekrana ekleme ---------- */
  let installPrompt = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    if (ui.route && ui.route.name === 'me') renderMe();
  });

  // Ben → Bildirimler: duruma göre aç/kapat düğmesi ya da ne yapılacağı (js/notify.js)
  function notifyCard() {
    const N = A.Notify, p = N.permission();
    const row = (txt, btn) => `<div class="info-row"><span>${txt}</span>${btn || ''}</div>`;
    if (p === 'unsupported') return N.ios() && !N.standalone()
      ? row('iPhone\'da bildirim için Amor\'u ana ekrana ekle (Safari → Paylaş → Ana Ekrana Ekle) ve oradan aç.')
      : row('Bu tarayıcı bildirimleri desteklemiyor.');
    if (p === 'denied') return row('İzin kapalı. Telefon Ayarlar → Bildirimler → Amor\'dan açabilirsin.');
    return row(N.on() ? 'Açık: kızlar yazınca bildirim gelir, ikonda okunmamış sayısı görünür.' : 'Kızlar yazınca uygulama arka plandayken bile haber ver.',
      `<button class="btn sm ${N.on() ? 'ghost' : 'pink'}" id="notifyBtn">${N.on() ? 'Kapat' : 'Aç'}</button>`) +
      '<small style="color:var(--muted)">Uygulama tamamen kapalıyken kızlar da yazmaz; açınca bekleyen cevaplar gelir.</small>';
  }

  function installCard() {
    if (standalone()) return '';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (installPrompt) {
      return `<div class="card install"><span>📲</span><div><b>Amor'u telefonuna yükle</b><small>Ana ekrandan uygulama gibi açılır, internetsiz de çalışır.</small></div><button class="btn sm pink" id="installBtn">Yükle</button></div>`;
    }
    if (ios) {
      return `<div class="card install"><span>📲</span><div><b>Ana ekrana ekle</b><small>Safari'de <b>Paylaş</b> → <b>Ana Ekrana Ekle</b>'ye dokun.</small></div></div>`;
    }
    return '';
  }

  /* ---------- Başlat ---------- */
  A.UI = { render, fmtTime, avatar, userAvatar, pushHer, refresh, commentReply, postTime, postDate, busy };
  A.Wallet.onChange = () => {
    const n = A.Wallet.coins().toLocaleString('tr-TR');
    document.querySelectorAll('[data-coins]').forEach(el => { el.textContent = n; });
    refreshCards();
  };
  // Hesap açıksa verileri hazırla; değilse render() hesap ekranını gösterir
  /* ---------- Yükleme göstergeleri ---------- */
  // Sayfa geçişi: üstte kısa bir ilerleme çubuğu
  function routeBar() {
    let bar = $('#routeBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'routeBar'; document.body.appendChild(bar); }
    bar.classList.remove('go');
    void bar.offsetWidth;
    bar.classList.add('go');
  }
  // Uzun süren iş: tam ekran "yükleniyor", iş ekran çizildikten sonra çalışır
  function busy(text, fn) {
    const el = document.createElement('div');
    el.className = 'busy';
    el.innerHTML = `<div class="spin"></div><b>${esc(text)}</b>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => setTimeout(() => { try { fn(); } finally { el.remove(); } }, 30));
  }
  // Fotoğraflar yüklenene kadar yer tutucu (CSS: img:not(.ok)), yüklenince belirerek gelir
  document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('ok'); }, true);
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('ok', 'broken'); }, true);

  /* ---------- Açılış ----------
   * Önce açılış ekranı (yükleniyor) çizilir, ağır hazırlık sonra adım adım yapılır: her adım arasında ekran güncellenir.
   * Hazırlık bitince ilk sayfa çizilir; açılış ekranı en az SPLASH_MIN kalır. */
  const SPLASH_MIN = 800, bootAt = performance.now();
  const splashMsg = t => { const el = $('#splashMsg'); if (el) el.textContent = t; };
  const steps = A.Store.account() ? [
    ['Hesabın açılıyor…', () => A.Wallet.st()],
    ['Profiller hazırlanıyor…', () => { A.Gen.seed(); A.Gen.load(); }],
    ['Son durum yükleniyor…', () => A.Background && A.Background.warmup()] // ilk açılış: geçmiş (bir kez)
  ] : [];
  function boot(i = 0) {
    if (i < steps.length) {
      splashMsg(steps[i][0]);
      setTimeout(() => { steps[i][1](); boot(i + 1); }, 30);
      return;
    }
    window.addEventListener('hashchange', () => { routeBar(); render(); });
    // Pencere 1024px eşiğini geçince mesaj/sohbet düzenini yeniden kur (tek sütun <-> iki sütun)
    wideMQ.addEventListener('change', () => { if (ui.route && ['chat', 'messages'].includes(ui.route.name)) render(); });
    render();
    setTimeout(() => $('#splash').classList.add('hide'), Math.max(0, SPLASH_MIN - (performance.now() - bootAt)));
    setTimeout(tick, 8000);
    setInterval(tick, 25000);
  }
  requestAnimationFrame(() => setTimeout(boot, 30));
})();
