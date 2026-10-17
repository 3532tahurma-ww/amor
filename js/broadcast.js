/*
 * Amor - Hediye yayını
 * --------------------
 * Pahalı bir hediye gönderildiğinde (Amor.BROADCAST_MIN ve üstü) ekranın üstünden kayan bir bant geçer:
 *   "🐉 Kerem → Rabia: Altın ejderha · 39.999 ♥"
 * Amor.BIG_FX ve üstü hediyeler ayrıca tam ekran animasyonla gelir. Kaynaklar 'amor:gift' olayını yayar:
 * arka plandaki erkekler (js/background.js), sesli odalar (js/rooms.js) ve kullanıcının kendi hediyeleri (js/wallet.js).
 * Bantlar sırayla gösterilir (kuyruk en fazla QUEUE_MAX); banda dokununca kızın profili açılır.
 */
window.Amor = window.Amor || {};

Amor.Broadcast = (() => {
  const A = window.Amor;
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const BANNER_MS = 7000, FX_MS = 3200, QUEUE_MAX = 6;
  const queue = [];
  let busy = false;

  window.addEventListener('amor:gift', e => {
    if (queue.length >= QUEUE_MAX) queue.shift(); // en eskisini at, yenisi gelsin
    queue.push(e.detail);
    next();
  });
  document.addEventListener('visibilitychange', next);

  function next() {
    if (busy || !queue.length || document.hidden) return;
    if (!A.Store.account()) { queue.length = 0; return; }
    busy = true;
    const d = queue.shift();
    if (d.gift.price * d.qty >= (A.BIG_FX || 10000)) fx(d);
    banner(d);
    setTimeout(() => { busy = false; next(); }, BANNER_MS + 300);
  }

  function banner(d) {
    const total = d.gift.price * d.qty;
    const el = document.createElement('div');
    el.className = 'bcast' + (total >= (A.BIG_FX || 10000) ? ' big' : '');
    el.innerHTML = `<div class="bc-track" style="animation-duration:${BANNER_MS}ms">
      <span class="bc-e">${d.gift.e}</span><b>${esc(d.from)}</b><i>→</i><b>${esc(d.to)}</b>
      <span>${esc(d.gift.name)}${d.qty > 1 ? ' x' + d.qty : ''}</span><em>${total.toLocaleString('tr-TR')} ♥</em></div>`;
    el.onclick = () => { if (d.toId) location.hash = `#/p/${d.toId}`; };
    document.body.appendChild(el);
    setTimeout(() => el.remove(), BANNER_MS);
  }

  // Tam ekran: büyüyen hediye, etrafında parıltılar; dokununca kapanır
  function fx(d) {
    const el = document.createElement('div');
    el.className = 'bfx';
    const sparks = Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--d:${(i % 3) * 120}ms">✦</i>`).join('');
    el.innerHTML = `<div class="bfx-in"><div class="bfx-e">${d.gift.e}${sparks}</div>
      <b>${esc(d.gift.name)}${d.qty > 1 ? ' x' + d.qty : ''}</b><small>${esc(d.from)} → ${esc(d.to)}</small></div>`;
    el.onclick = () => el.remove();
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); }, FX_MS);
  }

  return { banner, fx };
})();
