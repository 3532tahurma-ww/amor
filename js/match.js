/*
 * Amor - Eşleş (#/match)
 * ----------------------
 * Hızlı eşleşme: rastgele çevrimiçi bir kızla eşleşir (daha önce yazışmadıkların önce).
 *   - "Merhaba de": sohbet açılır, ilk mesaj ücretsizdir (Store.state.freeFirst; app.js sendUser).
 *   - "Sesli eşleş": hemen arar; eşleştiği için açar, arama dakika ücretlidir (js/call.js).
 * Yakınındakiler: senin şehrindekiler önce, yaklaşık uzaklıkla (şehir merkezleri: Amor.CITY_COORDS;
 * aynı şehirdekilere kişiye özgü sabit 1-18 km).
 */
window.Amor = window.Amor || {};

Amor.Match = (() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const NEAR_MAX = 30, SEARCH_MS = 2600;
  const fold = s => String(s || '').trim().toLocaleLowerCase('tr');
  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };

  // Kullanıcının şehri (Ben sayfasındaki serbest yazı) -> bilinen şehir adı
  const myCity = () => Object.keys(A.CITY_COORDS).find(n => fold(n) === fold(S().user.city)) || null;

  function km(a, b) {
    const [la1, lo1] = A.CITY_COORDS[a], [la2, lo2] = A.CITY_COORDS[b];
    const r = Math.PI / 180, x = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(x));
  }
  // Yaklaşık uzaklık (km) ya da null (şehrin bilinmiyorsa)
  function distance(c) {
    const me = myCity();
    if (!me || !A.CITY_COORDS[c.city]) return null;
    if (me === c.city) return 1 + hash(c.id + ':' + S().user.name) % 18;
    return Math.round(km(me, c.city) / 10) * 10;
  }
  const distText = d => (d == null ? '' : d < 20 ? `${d} km` : `${d.toLocaleString('tr-TR')} km`);

  /* ---------- Hızlı eşleşme ---------- */
  function candidates() {
    const online = (A.CHARACTERS || []).filter(A.Mood.isOnline);
    const fresh = online.filter(c => !(S().chats[c.id] || []).length);
    return fresh.length ? fresh : online;
  }

  function search() {
    const box = $('#mtStage');
    box.innerHTML = `<div class="mt-radar"><i></i><i></i><i></i>${A.UI.userAvatar(72)}</div><b>Eşleşiyor…</b><small>Çevrimiçi biri aranıyor</small>`;
    setTimeout(() => {
      if (!document.body.contains(box)) return;
      const list = candidates();
      if (!list.length) {
        box.innerHTML = '<div class="empty"><span class="big">😴</span>Şu an çevrimiçi kimse yok, biraz sonra tekrar dene</div><button class="btn pink" data-mt="again">Tekrar dene</button>';
        return;
      }
      show(pick(list));
    }, SEARCH_MS);
  }

  function show(c) {
    const box = $('#mtStage');
    const d = distance(c);
    const cost = (A.Call && A.Call.COST) ? A.Call.COST.voice : 400;
    box.innerHTML = `
      <div class="mt-card" style="--c1:${c.colors[0]};--c2:${c.colors[1]}">
        ${c.photo ? `<img src="${esc(c.photo)}" alt="">` : ''}
        <div class="mt-info"><b>${esc(c.display)}, ${c.age}</b><small>📍 ${esc(c.city)}${d != null ? ' · ' + distText(d) : ''} · ${esc(c.job)}</small><p>${esc(c.bio)}</p></div>
        <span class="mt-badge">✨ Eşleştiniz</span>
      </div>
      <div class="mt-acts">
        <button class="btn ghost" data-mt="again">Geç</button>
        <button class="btn pink" data-mt="hi" data-id="${c.id}">💬 Merhaba de · ilk mesaj ücretsiz</button>
        <button class="btn primary" data-mt="voice" data-id="${c.id}">📞 Sesli eşleş · ${cost} ♥/dk</button>
      </div>`;
  }

  // Eşleşme kaydı: sohbete not düşer, ilgisi biraz artar (seni o da seçti)
  function matched(c) {
    const chat = (S().chats[c.id] = S().chats[c.id] || []);
    if (!chat.some(m => m.type === 'match')) chat.push({ from: 'sys', type: 'match', text: '✨ Hızlı eşleşmeyle tanıştınız', ts: Date.now() });
    A.Interest.add(c, 0.08);
    A.Store.save();
  }

  /* ---------- Sayfa ---------- */
  A.Pages = A.Pages || {};
  A.Pages.match = () => {
    const view = $('#view');
    const me = myCity();
    const near = [...(A.CHARACTERS || [])].map(c => ({ c, d: distance(c), on: A.Mood.isOnline(c) }))
      .sort((a, b) => (b.on - a.on) || ((a.d ?? 1e9) - (b.d ?? 1e9)))
      .slice(0, NEAR_MAX);
    view.innerHTML = `<div class="page-pad match">
      <div class="feed-head"><h1>Eşleş</h1></div>
      <div class="mt-stage card" id="mtStage">
        <div class="mt-radar idle"><i></i><i></i><i></i>${A.UI.userAvatar(72)}</div>
        <b>Yeni biriyle tanış</b><small>Rastgele çevrimiçi biriyle eşleş; kim çıkacağı sürpriz</small>
        <button class="btn pink" data-mt="search">⚡ Hızlı eşleş</button>
      </div>
      <div class="sec-title">Yakınındakiler ${me ? `<small>· ${esc(me)}</small>` : ''}</div>
      ${me ? '' : '<p class="mt-note">Uzaklıkları görmek için Ben sayfasında şehrini yaz.</p>'}
      <div class="list">${near.map(({ c, d }) => `
        <a class="row" href="#/p/${c.id}">${A.UI.avatar(c, 64)}
          <div class="info"><div class="name">${esc(c.display)}</div>
            <div class="chips"><span class="chip">${c.age}yş</span><span class="chip">📍 ${esc(c.city)}</span>${d != null ? `<span class="chip dist">${distText(d)}</span>` : ''}</div>
            <div class="bio">${esc(c.bio)}</div></div></a>`).join('')}</div>
    </div>`;

    view.querySelector('.match').onclick = e => {
      const b = e.target.closest('[data-mt]');
      if (!b) return;
      const act = b.dataset.mt, c = b.dataset.id && A.byId(b.dataset.id);
      if (act === 'search' || act === 'again') search();
      if (act === 'hi' && c) {
        matched(c);
        (S().freeFirst = S().freeFirst || {})[c.id] = true;
        A.Store.save();
        location.hash = `#/chat/${c.id}`;
      }
      if (act === 'voice' && c) {
        matched(c);
        // eşleştiği için açar (izin kaydı: call.js decide); dakika ücreti aramada alınır
        (S().callOk = S().callOk || {})[c.id] = { type: 'voice', until: Date.now() + 2 * 60000 };
        A.Store.save();
        A.Call.start(c, 'voice');
      }
    };
  };

  return { distance, distText };
})();
