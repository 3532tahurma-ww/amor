/*
 * Amor - Erkek karakterler (arka plan)
 * ------------------------------------
 * Erkek karakterler uygulamada görünmez. Kadın karakterler arka planda onlarla mesajlaşır
 * (js/background.js); konuşmalar sadece test panelinde (#/admin) izlenir.
 *
 * MALE_LINES[adım] = erkeğin yazabileceği cümleler. Cümleler kadın karakterin niyet motoruna
 * (intents.js) uyacak şekilde yazıldı: "nasılsın" -> how_are_you, "ne iş yapıyorsun" -> ask_job ...
 *   {her}  kadının adı · {job} erkeğin mesleği · {at} "İzmir'deyim" · {like} erkeğin sevdiği şey
 */
window.Amor = window.Amor || {};

Amor.MALE_NAMES = [
  'Emre', 'Burak', 'Can', 'Mert', 'Kerem', 'Arda', 'Efe', 'Deniz', 'Kaan', 'Onur', 'Barış', 'Serkan', 'Tolga', 'Umut',
  'Oğuz', 'Cem', 'Alp', 'Batuhan', 'Berk', 'Ege', 'Furkan', 'Gökhan', 'Hakan', 'İlker', 'Koray', 'Levent', 'Murat',
  'Ozan', 'Sarp', 'Selim', 'Sinan', 'Tuna', 'Uğur', 'Volkan', 'Yiğit', 'Yusuf', 'Ali', 'Mehmet', 'Ahmet', 'Eren',
  'Doruk', 'Kutay', 'Baran', 'Çağan', 'Taylan', 'Ercan', 'Kıvanç', 'Erdem', 'Orçun', 'Rüzgar'
];

Amor.MALE_JOBS = [
  'yazılımcı', 'mühendis', 'avukat', 'doktor', 'öğretmen', 'mimar', 'grafik tasarımcı', 'satış müdürü', 'bankacı',
  'fotoğrafçı', 'barista', 'personal trainer', 'pilot', 'eczacı', 'muhasebeci', 'girişimci', 'müzisyen', 'şef',
  'üniversite öğrencisi', 'yüksek lisans öğrencisi', 'emlakçı', 'polis', 'hemşire', 'gazeteci', 'veteriner'
];

Amor.MALE_LIKES = ['futbol', 'basketbol', 'kamp', 'motor', 'gitar', 'fotoğrafçılık', 'koşu', 'yüzme', 'kahve', 'oyun', 'seyahat', 'kitap', 'sinema', 'yemek yapmak', 'balık tutmak'];

// Sohbet adımları sırayla ilerler; konu adımları rastgele seçilir
Amor.MALE_LINES = {
  open: ['selam {her}', 'merhaba, profilin çok hoşuma gitti', 'selam, nasılsın?', 'hey selam 👋', 'selam {her}, tanışabilir miyiz?', 'merhaba, rahatsız etmiyorum umarım'],
  again: ['selam yine ben', 'naber, ne yapıyorsun?', 'selaam, günün nasıl geçti?', 'hey, özledim sohbetini', 'günaydın {her}', 'iyi akşamlar, nasılsın?'],
  how: ['nasılsın?', 'naber, keyifler nasıl?', 'iyi misin?', 'nasıl gidiyor?'],
  topic: [
    'ne iş yapıyorsun?', 'nerelisin?', 'hobilerin neler?', 'ne yapıyorsun şu an?', 'bugün nasıl geçti?', 'şu an ne dinliyorsun?',
    'en sevdiğin film hangisi?', 'hafta sonu ne yapıyorsun?', 'yemek yedin mi?', 'kaç yaşındasın?', 'boş zamanlarında ne seversin?',
    'dizi önerin var mı?', 'kahve mi çay mı?', 'tatil için deniz mi dağ mı?'
  ],
  self: [
    'ben {job} olarak çalışıyorum', 'ben {at} bu arada', 'boş zamanlarımda {like} yapıyorum', 'bugün işler yoğundu ama iyi geçti',
    'ben de iyiyim, sağ ol', 'ben de şimdi işten çıktım', 'hafta sonu {like} için plan yapıyorum', 'ben kahvesiz yapamam açıkçası'
  ],
  react: ['haha güzelmiş', 'anladım', 'aa ne güzel', 'vay, ilginç', 'çok tatlısın', 'cidden mi? 😄', 'harika', 'bence de'],
  compliment: ['çok güzelsin bu arada', 'gülüşün çok güzel', 'çok tatlısın', 'fotoğraflarında çok hoşsun', 'enerjin çok güzel'],
  flirt: ['seni düşünüyordum', 'özledim seni', 'seninle konuşmak çok iyi geliyor', 'çok hoşlanıyorum senden', 'aklımdan çıkmıyorsun'],
  meet: ['bir gün kahve içelim mi?', 'buluşalım mı bir ara?', 'hafta sonu müsaitsen görüşelim mi?', 'numaranı alabilir miyim?'],
  bye: ['benim çıkmam lazım, sonra yazarım', 'iyi geceler {her}', 'görüşürüz, kendine iyi bak', 'hadi ben kaçtım, sonra konuşuruz', 'yarın yazarım sana'],
  // Kadının isteğine cevap (js/background.js)
  giftYes: ['tabii ki, al bakalım 🎁', 'senin için her şey', 'gönderdim bile 😊', 'istemen yeter'],
  giftNo: ['şu an olmaz ama sonra alırım', 'bu ay biraz sıkışığım ya', 'hediye mi? sonra bakarız 😅', 'her şey hediye değil ama 😄'],
  callYes: ['arıyorum şimdi 📞', 'tamam, hemen arıyorum', 'sesini duymak istiyordum zaten'],
  callNo: ['şu an arayamam, yazışalım', 'sonra ararım olur mu?', 'şu an müsait değilim'],
  herCallAsk: ['beni arasana 📞', 'sesini duymak istiyorum, ara hadi 🥺', 'görüntülü arasana 🙈', 'yazmaktan sıkıldım, ara beni'],
  // Akış (js/feed.js): kızların gönderilerine yorum
  comment: ['çok güzelsin 😍', 'harika çıkmışsın', 'bu ne güzellik', 'mükemmel 🔥', 'gülüşüne bayıldım', 'nerde burası?', 'çok tatlı 💕', 'yine döktürmüşsün', '👏👏', 'enerjin çok güzel'],
  // Sesli oda (js/rooms.js)
  room: ['selam herkese 👋', 'selam {her}', 'sesin çok güzel', 'bir şarkı söyler misin?', 'günün nasıl geçti?', 'ben de geldim 😎', 'oda çok güzel bugün',
    'koltuk boş mu?', 'harikasın {her}', 'nerelisin?', 'bugün çok neşelisin', 'mikrofonu açar mısın?', 'hahaha', 'aynen öyle', 'kimler burada?', 'iyi akşamlar']
};

// Sesli oda başlıkları (js/rooms.js)
Amor.ROOM_TITLES = ['Gece sohbeti 🌙', 'Kahve molası ☕', 'Dertleşme odası 💬', 'Şarkı istekleri 🎶', 'Tanışma odası 💕', 'Sabaha kadar 🌃',
  'Neşeli muhabbet 😄', 'Film önerileri 🎬', 'Kafa dinleme 🎧', 'Yalnız olanlar gelsin 🥺', 'Hafta sonu keyfi 🎉', 'Burç sohbeti ✨'];
