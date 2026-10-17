/*
 * Amor - Akış (#/feed)
 * --------------------
 * Bütün kızların "Anlar" gönderileri tek sayfada, yeniden eskiye. Beğenilebilir ve yorum yazılabilir:
 * yorum yazınca kız sohbette cevap verir (A.UI.commentReply). Arka plandaki erkekler de beğenir ve yorum yazar
 * (js/background.js feedActivity). Beğeni ve yorum sayıları gerçek kişilerden sayılır. Gönderi anahtarı: "kızId:sıra".
 *   Store.state.likes[anahtar]    = true (senin beğenin)
 *   Store.state.comments[anahtar] = [{ text, ts }] (senin yorumların)
 */
window.Amor = window.Amor || {};

(() => {
  const A = window.Amor;
  const S = () => A.Store.state;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const PAGE = 30;
  let shown = PAGE, openKey = null;

  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
  const bg = () => (A.Background ? A.Background.st() : { likes: {}, comments: {} });
  const likes = () => (S().likes = S().likes || {});
  const myComments = () => (S().comments = S().comments || {});

  function posts() {
    const out = [];
    (A.CHARACTERS || []).forEach(c => (c.posts || []).forEach((p, i) => out.push({ c, p, i, key: `${c.id}:${i}` })));
    return out.sort((a, b) => A.UI.postTime(b.p) - A.UI.postTime(a.p) || hash(a.key) - hash(b.key));
  }

  // Beğeniler gerçek: beğenen erkekler (js/background.js) + senin beğenin
  const likeCount = x => (bg().likes[x.key] || []).length + (likes()[x.key] ? 1 : 0);
  // Yorumlar: erkeklerinki + seninkiler, zamana göre
  function comments(x) {
    const males = (bg().comments[x.key] || []).map(k => ({ who: (A.Background.maleById(k.m) || {}).name || '?', text: k.text, ts: k.ts }));
    const mine = (myComments()[x.key] || []).map(k => ({ who: S().user.name || 'Sen', me: true, text: k.text, ts: k.ts }));
    return [...males, ...mine].sort((a, b) => a.ts - b.ts);
  }

  function card(x) {
    const { c, p, key } = x;
    const cs = comments(x);
    const open = openKey === key;
    const list = open ? cs : cs.slice(-2);
    return `<div class="fpost" data-key="${key}">
      <a class="p-head" href="#/p/${c.id}">${A.UI.avatar(c, 44)}<div><b>${esc(c.display)}</b><small>${esc(A.UI.postDate(p))} · ${esc(c.city)}</small></div></a>
      <p>${esc(p.text)}</p>
      ${p.photo ? `<div class="p-img" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})"><img src="${esc(p.photo)}" alt="" loading="lazy"></div>` : ''}
      <div class="f-acts">
        <button data-like class="${likes()[key] ? 'on' : ''}">${likes()[key] ? '❤️' : '🤍'} ${likeCount(x)}</button>
        <button data-open>💬 ${cs.length}</button>
      </div>
      ${list.length ? `<div class="f-cmts">${!open && cs.length > 2 ? `<button class="f-more" data-open>Tüm ${cs.length} yorumu gör</button>` : ''}
        ${list.map(k => `<div class="${k.me ? 'me' : ''}"><b>${esc(k.who)}</b> ${esc(k.text)}</div>`).join('')}</div>` : ''}
      <form class="f-form" data-form autocomplete="off"><input maxlength="200" placeholder="Yorum yaz… (${esc(c.name)} sohbette cevap verir)"><button>Gönder</button></form>
    </div>`;
  }

  A.Pages = A.Pages || {};
  A.Pages.feed = () => {
    const view = $('#view');
    const all = posts();
    view.innerHTML = `<div class="page-pad feed">
      <div class="feed-head"><h1>Akış</h1><a class="btn sm pink" href="#/rooms">🎙️ Sesli odalar</a></div>
      ${all.length ? all.slice(0, shown).map(card).join('') : '<div class="empty"><span class="big">📷</span>Henüz paylaşım yok</div>'}
      ${all.length > shown ? '<button class="btn ghost block" id="feedMore">Daha fazla</button>' : ''}
    </div>`;
    const more = $('#feedMore');
    if (more) more.onclick = () => { shown += PAGE; A.Pages.feed(); };
    view.querySelectorAll('.fpost').forEach(el => {
      const key = el.dataset.key;
      const x = all.find(y => y.key === key);
      const redraw = () => { const y = window.scrollY; A.Pages.feed(); window.scrollTo(0, y); };
      el.onclick = e => {
        if (e.target.closest('[data-like]')) {
          likes()[key] = !likes()[key];
          if (likes()[key]) A.Mood.nudge(x.c, { valence: 0.01 });
          A.Store.save();
          redraw();
        } else if (e.target.closest('[data-open]')) {
          openKey = openKey === key ? null : key;
          redraw();
        }
      };
      el.querySelector('[data-form]').onsubmit = e => {
        e.preventDefault();
        const inp = e.target.querySelector('input');
        const text = inp.value.trim();
        if (!text) return;
        (myComments()[key] = myComments()[key] || []).push({ text, ts: Date.now() });
        A.Store.save();
        A.UI.commentReply(x.c, text, x.p);
        A.Eco.notify(`${x.c.name} yorumunu gördü, sohbette cevap verecek`, '💬');
        redraw();
      };
    });
  };
})();
