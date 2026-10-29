/*
 * Amor - Service worker (çevrimdışı çalışma)
 * -------------------------------------------
 * Uygulama dosyaları kurulumda önbelleğe alınır; açılışta önbellekten gelir,
 * arka planda güncellenir (stale-while-revalidate). Fotoğraflar ilk görüldüklerinde saklanır.
 * Yeni sürüm yayınlarken VERSION'ı artır, eski önbellek silinir.
 */
const VERSION = 'amor-v94';
const CORE = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/store.js', './js/data/photos.js', './js/data/pools.js', './js/data/archetypes.js', './js/data/intents.js', './js/data/males.js', './js/kume.js',
  './js/data/shop.js', './js/data/questions.js', './js/data/memory-data.js', './js/data/reflect.js','./js/data/custom-characters.js',
  './js/data/custom-dialog.js', './js/data/bot-rules.js', './js/bot.js', './js/data/intent-map.js', './js/data/char-traits.js', './js/data/carmen-bot.js', './js/params.js', './js/intent.js', './js/notify.js', './js/schedule.js', './js/mood.js',
  './js/memory.js', './js/interest.js', './js/nlu.js', './js/reflect.js','./js/engine.js', './js/generator.js', './js/wallet.js', './js/wish.js', './js/shop.js', './js/games.js', './js/background.js', './js/broadcast.js', './js/feed.js', './js/rooms.js', './js/agency.js', './js/match.js', './js/guide.js', './js/app.js', './js/call.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
const IMG_CACHE = 'amor-img';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMG_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Bildirime dokununca (js/notify.js): açık uygulamayı öne getirip o sohbete geç, kapalıysa sohbetle aç
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const hash = (e.notification.data || {}).hash || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const w = list[0];
    if (w) { w.postMessage({ type: 'open', hash }); return w.focus(); }
    return self.clients.openWindow(new URL('./' + hash, self.registration.scope).href);
  }));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Yerel araçlar (diyalog editörü) her zaman ağdan gelsin
  if (url.pathname.includes('/tools/') || url.pathname.startsWith('/api/') || req.referrer.includes('/tools/')) return;

  // Karakter fotoğrafları: önce önbellek
  if (url.origin === location.origin && url.pathname.includes('/characters/')) {
    e.respondWith(caches.open(IMG_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Sayfanın kendisi: önce ağ (yeni sürüm ilk açılışta gelsin), ağ yoksa önbellek
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // Uygulama dosyaları ve Google Fonts: önbellekten ver, arka planda güncelle
  if (url.origin === location.origin || url.host.endsWith('googleapis.com') || url.host.endsWith('gstatic.com')) {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }).catch(() => hit || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
      return hit || net;
    }));
  }
});
