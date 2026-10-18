/*
 * Amor - Telefon bildirimleri ve ikondaki okunmamış sayısı
 * Karakter yazınca, uygulama arka plandaysa ya da başka bir sayfadaysan sistem bildirimi gösterilir;
 * bildirime dokununca o sohbet açılır. Ana ekran ikonunda okunmamış mesaj sayısı görünür.
 * iPhone'da sadece ana ekrana eklenmiş uygulamada çalışır (iOS 16.4+). Sunucu yok: uygulama tamamen
 * kapalıyken karakterler de yazmaz, bildirim de gelmez (açınca bekleyen cevaplar gelir).
 */
window.Amor = window.Amor || {};

Amor.Notify = (() => {
  const S = () => Amor.Store.state;
  const supported = () => 'Notification' in window && 'serviceWorker' in navigator;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const permission = () => (supported() ? Notification.permission : 'unsupported');
  const on = () => permission() === 'granted' && S().notify !== false;
  const abs = u => new URL(u, location.href).href;

  // İzin sadece dokunuşla istenebilir (Ben → Bildirimler)
  async function enable() {
    if (!supported()) return 'unsupported';
    const p = await Notification.requestPermission();
    if (p === 'granted') { S().notify = true; Amor.Store.save(); }
    return p;
  }
  function disable() { S().notify = false; Amor.Store.save(); badge(0); }

  async function message(c, text) {
    if (!on()) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(c.name, {
        body: text, tag: 'chat-' + c.id, renotify: true,
        icon: abs(c.photo || 'icons/icon-192.png'), badge: abs('icons/icon-192.png'),
        data: { hash: '#/chat/' + c.id }
      });
    } catch (e) { /* izin geri alındı vb. */ }
  }

  function badge(n) {
    if (!('setAppBadge' in navigator)) return;
    try {
      const p = n && on() ? navigator.setAppBadge(n) : navigator.clearAppBadge();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* desteklenmiyor */ }
  }

  // Bildirime dokununca sw.js açık pencereye haber verir: o sohbete git
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.type === 'open' && e.data.hash) location.hash = e.data.hash;
    });
  }

  return { supported, standalone, ios, permission, on, enable, disable, message, badge };
})();
