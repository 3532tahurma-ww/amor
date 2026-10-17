/*
 * Amor - Ajanslar (#/agencies)
 * ----------------------------
 * Kızların çoğu bir yayıncı ajansına bağlıdır (c.agency; Amor.AGENCIES, generator.js atar; bir kısmı bağımsız).
 * Haftalık sıralama, kızların bu hafta aldığı hediyelerin değerinden hesaplanır (Background.week: senden + erkeklerden,
 * sohbette ve sesli odada). Hafta pazartesi başlar; geçen haftanın kazananı gösterilir.
 *   Ajanslar sekmesi: ajansların toplamı, üye sayısı, en çok kazandıran üç yayıncısı
 *   Yayıncılar sekmesi: bu hafta en çok hediye alan kızlar
 */
window.Amor = window.Amor || {};

Amor.Agency = (() => {
  const A = window.Amor;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => Number(n || 0).toLocaleString('tr-TR');
  const medal = i => ['🥇', '🥈', '🥉'][i] || `<b>${i + 1}</b>`;
  let tab = 'agencies';

  const of = c => (c && c.agency ? (A.AGENCIES || []).find(a => a.id === c.agency) || null : null);
  // Profil / oda kartı rozeti: o ajansın sayfasına gider
  const chip = c => { const a = of(c); return a ? `<a class="chip agency" href="#/agency/${a.id}" style="--ac:${a.color}">${a.e} ${esc(a.name)}</a>` : ''; };

  // Haftalık durum: ajanslar (çoktan aza) ve yayıncılar
  function standings(girlsMap) {
    const chars = A.CHARACTERS || [];
    const score = c => girlsMap[c.id] || 0;
    const agencies = (A.AGENCIES || []).map(a => {
      const members = chars.filter(c => c.agency === a.id);
      const top = [...members].sort((x, y) => score(y) - score(x)).filter(score).slice(0, 3);
      return { a, members: members.length, total: members.reduce((s, c) => s + score(c), 0), top };
    }).sort((x, y) => y.total - x.total);
    const hosts = chars.filter(score).sort((x, y) => score(y) - score(x));
    return { agencies, hosts, score };
  }

  // Haftanın bitişine kalan süre (pazartesi 00:00)
  function untilWeekEnd() {
    const now = new Date(), end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + (8 - (now.getDay() || 7)));
    const ms = end - now, d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000);
    return d ? `${d} gün ${h} saat` : `${h} saat ${Math.floor(ms % 3600000 / 60000)} dk`;
  }

  A.Pages = A.Pages || {};
  A.Pages.agencies = () => {
    const view = $('#view');
    const B = A.Background;
    const w = B.week(), last = B.st().lastWeek;
    const { agencies, hosts, score } = standings(w.girls);
    const lastWin = last ? standings(last.girls).agencies[0] : null;
    view.innerHTML = `<div class="page-pad agencies">
      <div class="feed-head"><h1>Ajanslar</h1><a class="btn sm ghost" href="#/rooms">🎙️ Odalar</a></div>
      <div class="ag-week card"><span>🏆 Haftalık yarış</span><b>Bitişe ${untilWeekEnd()}</b>
        ${lastWin && lastWin.total ? `<small>Geçen haftanın kazananı: ${lastWin.a.e} ${esc(lastWin.a.name)} · ${fmt(lastWin.total)} ♥</small>` : '<small>Sıralama bu hafta alınan hediyelerden hesaplanır</small>'}</div>
      <div class="tabs" style="margin:10px 0">
        <button data-ag="agencies" class="${tab === 'agencies' ? 'active' : ''}">Ajanslar</button>
        <button data-ag="hosts" class="${tab === 'hosts' ? 'active' : ''}">Yayıncılar</button>
      </div>
      ${tab === 'agencies'
        ? agencies.map((x, i) => `<a class="ag-card card" href="#/agency/${x.a.id}" style="--ac:${x.a.color}">
            <span class="ag-rank">${medal(i)}</span><span class="ag-logo">${x.a.e}</span>
            <div class="ag-info"><b>${esc(x.a.name)}</b><small>${x.members} yayıncı · bu hafta ${fmt(x.total)} ♥</small>
              <div class="ag-top">${x.top.map(c => `<span title="${esc(c.name)} · ${fmt(score(c))} ♥">${A.UI.avatar(c, 30, { dot: false })}</span>`).join('')}</div></div>
            <span class="ag-go">›</span>
          </a>`).join('')
        : `<div class="card ag-hosts">${hosts.slice(0, 50).map((c, i) => `<a class="ag-host" href="#/p/${c.id}"><span class="ag-rank">${medal(i)}</span>
            ${A.UI.avatar(c, 44)}<div class="ag-host-info"><b>${esc(c.display)}</b><small>${of(c) ? `${of(c).e} ${esc(of(c).name)}` : 'Bağımsız'}</small></div>
            <em>${fmt(score(c))} ♥</em></a>`).join('') || '<div class="empty">Bu hafta henüz hediye yok</div>'}</div>`}
    </div>`;
    view.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => { tab = b.dataset.ag; A.Pages.agencies(); });
  };

  /* ---------- Bir ajansın sayfası (#/agency/<id>) ----------
   * Haftalık sıra ve toplam, tüm zamanların kazancı (üyelerin aldığı hediyelerin değeri), şu an yayında olan üyeleri
   * (açık sesli odaları) ve bütün yayıncıları (bu hafta çoktan aza). */
  A.FULL_PAGES = [...(A.FULL_PAGES || []), 'agency'];
  A.Pages.agency = (r) => {
    const view = $('#view');
    const a = (A.AGENCIES || []).find(x => x.id === (r && r.id));
    if (!a) { location.hash = '#/agencies'; return; }
    const B = A.Background;
    const { agencies, score } = standings(B.week().girls);
    const rank = agencies.findIndex(x => x.a.id === a.id);
    const me = agencies[rank];
    const members = (A.CHARACTERS || []).filter(c => c.agency === a.id)
      .sort((x, y) => score(y) - score(x) || B.charm(y.id).points - B.charm(x.id).points);
    const allTime = members.reduce((s, c) => s + B.charm(c.id).points, 0);
    const online = members.filter(A.Mood.isOnline);
    const live = A.Rooms ? A.Rooms.hosts().filter(c => c.agency === a.id) : [];
    view.innerHTML = `<div class="agency-page" style="--ac:${a.color}">
      <div class="ag-hero">
        <div class="ag-hero-top">${A.Eco.back('#/agencies')}<span></span></div>
        <span class="ag-hero-logo">${a.e}</span>
        <h1>${esc(a.name)}</h1>
        <div class="ag-hero-stats">
          <div><b>${rank >= 0 ? '#' + (rank + 1) : '–'}</b><small>bu hafta</small></div>
          <div><b>${fmt(me ? me.total : 0)}</b><small>haftalık ♥</small></div>
          <div><b>${fmt(allTime)}</b><small>toplam ♥</small></div>
          <div><b>${members.length}</b><small>yayıncı · ${online.length} çevrimiçi</small></div>
        </div>
      </div>
      <div class="page-pad">
        ${live.length ? `<div class="sec-title">🎙️ Şu an yayında</div>
          <div class="ag-live">${live.map(c => `<a href="#/room/${c.id}">${A.UI.avatar(c, 56, { dot: false })}<b>${esc(c.name)}</b><small>odaya gir</small></a>`).join('')}</div>` : ''}
        <div class="sec-title">Yayıncılar</div>
        <div class="card ag-hosts">${members.map((c, i) => `<a class="ag-host" href="#/p/${c.id}"><span class="ag-rank">${medal(i)}</span>
          ${A.UI.avatar(c, 44)}<div class="ag-host-info"><b>${esc(c.display)}</b><small>✨ Lv.${B.charm(c.id).lv} · ${c.age}yş · ${esc(c.city)}</small></div>
          <em>${fmt(score(c))} ♥</em></a>`).join('') || '<div class="empty">Henüz yayıncı yok</div>'}</div>
      </div>
    </div>`;
  };

  return { of, chip, standings };
})();
