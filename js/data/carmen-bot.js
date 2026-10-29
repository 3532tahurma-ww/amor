/* Otomatik uretilir: tools/sync-bot-rules.ps1 (Carmen/js/app.js'ten birebir). Elle duzenleme. */
window.Amor = window.Amor || {};
// H: Carmen'in yardimci fonksiyonlarinin Amor karsiliklari (js/params.js -> Params.helpers())
Amor.CarmenBot = H => {
  const { relV, traitVal, evAllowed, evDenied, likedTitles, likesTag, dislikesTag, hitapOf, pickOne, S, outfitItems, clItem, outfitOf, slotLine } = H;
  const BOT_ASK = {
    sert: { ok: c => ['forward', 'backward'].includes(c.cat), yes: ['Rough', 'Passionate'], no: ['Gentle'] },
    devam: { ok: c => c.cat === 'foreplay', yes: ['Missionary', 'Cowgirl', 'Spooning'], no: ['Kissing', 'Front Hugging'] },
    agiz: { ok: c => ['outercourse', 'foreplay'].includes(c.cat), yes: ['Blowjob', 'Deepthroat'], no: [] },
    arka: { ok: c => c.cat === 'forward', yes: ['Standing Anal', 'Spooning Anal', 'Cowgirl Anal'], no: [] },
    yala: { ok: c => ['foreplay', 'outercourse'].includes(c.cat), yes: ['Cunnilingus'], no: [] },
    icine: { ok: c => c.vaj && c.zevk >= 55, yes: [], no: [] },
    tekrar: { ok: c => c.done, yes: ['Kissing', 'Lap Kissing'], no: ['Front Hugging', 'Back Hugging'] },
    // 💦 boşalmadan sonra yeni pozisyon isteği: "İstersen bu kez arkama gir 😈" (anal sevmiyorsa sorulmaz) · "Bir dahakine nasıl istersin?"
    arkaistek: { ok: c => c.done, yes: ['Standing Anal', 'Spooning Anal', 'Cowgirl Anal', 'Rough Anal'], no: ['Back Hugging', 'Front Hugging'] },
    pozistek: { ok: c => c.done, yes: '@other', no: ['Back Hugging', 'Front Hugging'] },
    // "Beğendin mi?": evet → şu anki pozisyonla devam (@pos), hayır → başka bir pozisyon (@other, önce ❤️ sevdikleri)
    begen: { ok: c => ['forward', 'backward', 'outercourse', 'eat', 'foreplay'].includes(c.cat), yes: '@pos', no: '@other' }
  };
  const SEX_CATS = ['forward', 'backward', 'outercourse', 'eat'];
  // ❓ özel sorular (🤝 Güven ≤ 15 iken kaçamak cevap): kural kimliğinin başı
  const QPRIVATE = ['r_q_boob', 'r_q_pussy', 'r_q_anal', 'r_q_butt', 'r_q_exp', 'r_q_virgin', 'r_q_sever', 'r_q_sevmez', 'r_q_korunma', 'r_q_hamile',
    'r_q2_pozisyon', 'r_q2_fantezi', 'r_q2_bosal', 'r_q2_bebek', 'r_q2_ilk', 'r_q2_gecmis', 'r_q2_seks', 'r_q2_hassas', 'r_q2_anal', 'r_q2_oral',
    'r_q2_kondom', 'r_q2_hap', 'r_q2_azgin', 'r_q2_sut', 'r_q2_kiyafet', 'r_q2_sertyavas', 'r_q2_orgazmsay', 'r_q2_bosalmasay',
    'r_q2_disaribosal', 'r_q2_kondomsuz', 'r_q2_kiyas', 'r_q2_boy', 'r_q2_son', 'r_q2_kackez', 'r_q2_yut', 'r_q2_yuz', 'r_q2_hamilebirak', 'r_q2_arkadan', 'r_q2_mastur', 'r_q2_oyuncak', 'r_q2_baglan', 'r_q3_'];
  // ❓ cevaptan sonraki karşı soru konusu (kural kimliğinin başı → "=sor" konusu); yoksa k_genel
  const QCOUNTER = [['r_q_boob', 'k_buyuk'], ['r_q_pussy', 'k_dar'], ['r_q_anal', 'k_anal'], ['r_q2_anal', 'k_anal'], ['r_q_butt', 'k_kalca'],
    ['r_q_exp', 'k_deneyim'], ['r_q_virgin', 'k_deneyim'], ['r_q2_ilk', 'k_deneyim'], ['r_q2_gecmis', 'k_deneyim'], ['r_q_sever', 'k_sever'], ['r_q2_pozisyon', 'k_sever'],
    ['r_q2_fantezi', 'k_fantezi'], ['r_q2_sevgi', 'k_sevgi'], ['r_q2_ozledin', 'k_sevgi'], ['r_q2_kiskanc', 'k_kiskanc'], ['r_q2_sevgili', 'k_kiskanc'],
    ['r_q2_bebek', 'k_bebek'], ['r_q_hamile', 'k_bebek'], ['r_q2_bosal', 'k_icine'], ['r_q2_oral', 'k_oral'], ['r_q2_sertyavas', 'k_sert'],
    ['r_q2_disaribosal', 'k_icine'], ['r_q2_kondomsuz', 'k_icine'], ['r_q2_hamilebirak', 'k_bebek'], ['r_q2_kiyas', 'k_kiyas'], ['r_q2_boy', 'k_boy'],
    ['r_q2_yut', 'k_oral'], ['r_q2_arkadan', 'k_anal'], ['r_q2_oyuncak', 'k_fantezi'], ['r_q2_baglan', 'k_fantezi'], ['r_q2_yer', 'k_yer'],
    ['r_q3_meme', 'k_buyuk'], ['r_q3_sut', 'k_bebek'], ['r_q3_kalca', 'k_kalca']];
  // 🎭 soru cevabının kişiliğe göre çerçevesi (pre başa, add cevabın sonuna)
  const QFRAME = {
    'Utangaç': { pre: ['S-söylemem gerekiyor mu? 🙈 ', 'Utanıyorum ama… ', 'Ş-şey… '] }, 'Kibirli': { add: [' kıskandın mı? 💅', ' etkilendin değil mi? 💁‍♀️'] },
    'Flörtöz': { add: [' neden sordun bakalım? 😘', ' merak ettin demek 😉'] }, 'Alaycı': { pre: ['Bunu mu merak ettin? 🙄 ', 'Ciddi soru mu bu? 😏 '] },
    'Çocuksu': { pre: ['Hihi ', 'Yaa '] }, 'Duygusal': { add: [' 🥺', ' bunu sorman çok tatlı 😢💗'] }, 'Romantik': { add: [' …sana söyleyebilirim 💞', ' sadece sana söylüyorum 🌹'] },
    'Neşeli': { add: [' 😄', ' hihi 😆'] }, 'Şımarık': { add: [' ama önce iltifat etmeliydin 💅', ' hmpf 😤'] }, 'Asi': { pre: ['Sana ne? 😤 Neyse… ', 'Merak etme, söylerim: '] },
    'Özgüvenli': { add: [' 😎', ' başka sorun var mı? 😏'] }, 'Gizemli': { pre: ['Bu bir sır ama… ', 'Kimseye söyleme: '] }, 'Komik': { add: [' 😂', ' (bunu yazdığıma inanamıyorum)'] },
    'Güvensiz': { add: [' …bu kötü mü? 😟', ' sence sorun mu? 🥺'] }, 'Gergin': { pre: ['Ş-şey… ', '*boğazını temizler* '] }, 'Meraklı': { add: [' Peki seninki? 🤔'] },
    'Manipülatif': { add: [' …bunu sana bir iyilik olarak söylüyorum 😏'] }, 'Dürüst': { pre: ['Açık konuşayım: '] }
  };
  // "evet / hayır" cevabı mı? (kısa mesajda)
  function yesNo(text) {
    const w = String(text || '').toLocaleLowerCase('tr').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!w.length || w.length > 6) return '';
    const NO = ['hayır', 'hayir', 'yok', 'istemem', 'istemiyorum', 'olmaz', 'yapma', 'dur', 'sonra', 'no', 'ıh', 'ıhı', 'asla', 'değil', 'degil', 'beğenmedim', 'begenmedim', 'kötü', 'kotu', 'değiştir', 'degistir', 'başka', 'baska', 'sıkıldım', 'sikildim'];
    const YES = ['evet', 'eveet', 'tabi', 'tabii', 'tabiki', 'olur', 'aynen', 'hıhı', 'tamam', 'istiyorum', 'isterim', 'hadi', 'kesinlikle', 'he', 'ok', 'okey', 'elbette', 'evt', 'yes', 'olsun', 'lütfen',
      'çok', 'cok', 'bayıldım', 'bayildim', 'beğendim', 'begendim', 'harika', 'süper', 'super', 'güzel', 'guzel', 'mükemmel', 'mukemmel', 'iyi', 'devam', 'durma', 'muhteşem', 'muhtesem', 'evettt'];
    if (w.some(x => NO.includes(x))) return 'hayir';
    if (w.some(x => YES.includes(x))) return 'evet';
    return '';
  }
  const BOT_ANS = {
    'yaş': ch => ch.age ? pickOne([`${ch.age} yaşındayım 😊`, `${ch.age}… genç sayılırım değil mi? 😏`, `${ch.age} yaşındayım, neden sordun? 😌`]) : pickOne(['Yaşımı söylemem 😏', 'Kadına yaş sorulmaz 😌']),
    'şehir': ch => { const ben = s => s + ({ ı: 'yım', i: 'yim', u: 'yum', ü: 'yüm', a: 'yım', e: 'yim' })[s.slice(-1)];
      return ch.city ? pickOne([`${ben(trEk(ch.city, 'li'))} 😊`, `${ch.city}… gelmek ister misin? 😏`, `Ben ${ben(trEk(ch.city, 'de'))} 🏙️`]) : pickOne(['Bir yerlerden işte 😏', 'Söylesem gelir misin? 😌']); },
    hamile: ch => (ch.fields || {}).hamile ? pickOne(['Evet… hamileyim 🥺💗', 'Evet, karnımda bebeğimiz var 🤰', 'Evet… senden 🙈💕']) : pickOne(['Hayır, değilim… şimdilik 😏', 'Hayır 😌 ama dikkatli ol', 'Değilim… istiyor musun yoksa? 🙈']),
    // 🛡️ nereye boşalayım: korunmasına göre
    'boşal': ch => {
      if ((ch.fields || {}).hamile) return pickOne(['Zaten hamileyim, içime 😈💦', 'İçime… korkacak bir şey kalmadı 😏']);
      const ok = t => evAllowed(ch, t);
      if (ok('control pill')) return pickOne(['İçime, hap alıyorum 😈', 'İçime boşal, merak etme hap içiyorum 😏💦']);
      if (ok('nothing')) return pickOne(['İçime… hepsini istiyorum 🥵', 'Sorma bile, içime 😩💦']);
      if (ok('morning-after pill')) return pickOne(['İçime… sabah hap alırım 😳', 'İçime olsun, sabah hallederim 😏']);
      if (ok('pull-out method')) return pickOne(['Dışarı… göğüslerime 😏', 'Karnıma boşal, içime değil 😳', 'Son anda çek, ağzıma ver istersen 😈']);
      if (ok('condom') || ok('tight condom')) return pickOne(['Kondomla içime, kondomsuz asla 😳', 'Kondom taktıysan içime 😏']);
      return pickOne(['İçime olmaz, korunmuyoruz 😳', 'Dışarı, nereye istersen ama içime değil 😏']);
    },
    // ❤️ 🤝 😤 ilişki değerleri
    sevgi: ch => { const a = relV(ch, 'aşk'); return a >= 80 ? pickOne(['Deli gibi seviyorum 💞', 'Bunu sormana gerek var mı? Seni seviyorum 💗']) : a >= 50 ? pickOne(['Galiba evet… 💗', 'Seni seviyorum sanırım 🙈💕']) : a >= 20 ? pickOne(['Senden hoşlanıyorum 🙈', 'Kalbim bir şeyler söylüyor… 😌']) : pickOne(['Henüz bilmiyorum… 🤔', 'Biraz erken değil mi? 😅']); },
    'güven': ch => { const g = relV(ch, 'güven'); return g >= 70 ? pickOne(['Sana tamamen güveniyorum 🤝💗', 'Hem de çok 🥰']) : g >= 35 ? pickOne(['Güvenmeye başladım 😌', 'Evet… çoğu zaman 🙂']) : pickOne(['Henüz tam değil 😕', 'Bunu kazanman lazım 😏']); },
    'kıskanç': ch => { const k = relV(ch, 'kıskançlık'), t = (ch.traits || []).includes('Kıskanç'); return t || k >= 50 ? pickOne(['Hem de nasıl 😤', 'Başka kıza bakarsan görürsün 😠', 'Seni kimseyle paylaşamam 😤']) : pickOne(['Pek kıskanç değilimdir 😌', 'Biraz… belki 😏', 'Sana güveniyorum, kıskanmam 🙂']); },
    'özledin': ch => { const a = relV(ch, 'aşk'); return a >= 50 ? pickOne(['Çok özledim 🥺💗', 'Her dakika aklımdaydın 💭']) : pickOne(['Biraz 😏', 'Belki 🙈']); },
    'evlen': ch => { const a = relV(ch, 'aşk'); return a >= 80 ? pickOne(['Evet! 💍🥺', 'Bunu bekliyordum… evet 💞']) : a >= 50 ? pickOne(['Biraz erken ama… düşünürüm 🙈', 'Belki bir gün 💍😌']) : pickOne(['Daha çok erken 😅', 'Önce bir kahve içelim 😂']); },
    'sevgili': ch => (ch.traits || []).includes('Sadık') || relV(ch, 'aşk') >= 50 ? pickOne(['Sadece sen varsın 💗', 'Kimse yok, sadece sen 🥰']) : pickOne(['Şu an kimse yok… 😏', 'Neden sordun, aday mısın? 😉']),
    // 🤰 bebek / süt
    bebek: ch => (ch.fields || {}).hamile ? pickOne(['Zaten yolda 🤰💗', 'Bebeğimiz geliyor bile 🥺']) : evAllowed(ch, 'control pill') ? pickOne(['Şimdilik hap içiyorum, erken 😌', 'Bir gün… ama şimdi değil 🙈']) : evAllowed(ch, 'nothing') ? pickOne(['Seninle olsa… neden olmasın 🥺', 'Hiç korunmuyorum zaten 😏🍼']) : pickOne(['Şimdi değil, dikkatli olalım 😳', 'Henüz hazır değilim 🙈']),
    'süt': ch => { const s = relV(ch, 'süt');
      if (!(ch.fields || {}).hamile) return pickOne(['Hamile değilim ki 😅', 'Hamile kalırsam olur 😏', 'Şimdilik yok… ama beni hamile bırakırsan 🍼😈', 'Yok canım 🙈 hamile değilim', 'Daha değil… istiyor musun yoksa? 😏🍼', 'Süt mü? Önce bebek lazım 😂']);
      return s >= 70 ? pickOne(['Göğüslerim taşıyor, sütüm var 🍼🥵', 'Hem de çok… sızdırıyorum bile 😩🍼', 'Evet, dolu dolu… emersen rahatlarım 🥺', 'Tişörtüm ıslandı bak 🙈🍼', 'Sağmazsan patlayacaklar 😩'])
        : s >= 30 ? pickOne(['Evet, göğüslerim dolu 🍼', 'Sızlıyor bile… emmek ister misin? 😏', 'Var… tadına bakmak ister misin? 😈🍼', 'Geliyor, sıkınca damlıyor 😳'])
        : pickOne(['Biraz geliyor 🍼', 'Henüz az 🙈', 'Damla damla… daha yeni başladı 😳', 'Az ama tatlı 😏🍼']); },
    // 🍒 meme: emmek / yalamak / dokunmak / ısırmak / uçları. Göğüs bedeni, hamilelik ve 🍼 Süt, kişilik
    // 🙏 içine boşalmak için ısrar: korunmasına ve kaçıncı ısrar olduğuna göre (Pull-Out: önce "hayır, tut", 3. ısrarda Aşk 70+ ise yumuşar)
    'ısrar': (ch, ctx) => {
      const s = hitapOf(ch), n = ctx.israr || 1, k = (ch.fields || {}).hamile ? 'koricine' : ctx.kor, a = relV(ch, 'aşk');
      if (k === 'koricine' || k === 'korhap') return pickOne([`Boşal içime ${s}, rahatla 😩💦`, 'Tutma artık, hepsini içime ver 🥵', `Hadi rahatla ${s}, hak ettin bunu 😈`, 'İçimde rahatlamak istiyorsan hiç tutma kendini 😩', 'İzin mi? Yalvarıyorum, içime! 🥵', `Bırak kendini ${s}, ben buradayım 💗`]);
      if (k === 'korkondom') return pickOne(['Kondomun içine boşal, rahatla 😈', `Hadi ${s}, doldur o kondomu 🥵`, 'Boşal, kondom var, korkma 😏', 'Rahatla, istediğin kadar boşal 😩']);
      if (k === 'korsabah') return n >= 2 ? pickOne([`Peki… boşal ${s}, sabah hap alırım 😳`, 'Tamam tamam… içime, ama sabah eczaneye sen gidiyorsun 😩', 'Dayanamıyorsun değil mi… boşal o zaman 🥵']) : pickOne(['Emin misin? Sabah hap almam lazım… 😳', 'Biraz daha tut, sonra düşünürüz 😏', 'İçime mi? Hmm… bir kez daha iste 😈']);
      if (k === 'korpullout') {
        if (n >= 3 && a >= 70) return pickOne([`Peki ${s}… bu seferlik… içimde rahatla 😩`, 'Of… tamam, dayanamıyorum ben de, içime ver 🥵 ama bir daha yok!', 'Senin için… peki… ama sabah konuşacağız 😳']);
        if (n >= 2) return pickOne([`Lütfen ${s}… tut biraz, dışarı vereceksin 🥺`, 'Yalvarma… biliyorsun içime olmaz 😣', 'Hayır, tut içinde… sonra dışarı 😩', 'Göğüslerime ver, orada rahatla 😏💦']);
        return pickOne(['Hayır, tut! İçime değil 😣', 'İçime boşalma tamam mı, söz vermiştin 😤', `Hayır ${s}, tut… dışarı rahatlarsın 🥺`, 'Tut tut tut, sakın! 😳']);
      }
      return n >= 3 && a >= 80 ? pickOne(['Delirdin mi… peki, ama bu son 😰', 'Of… tamam, içime… ama korkuyorum 😳']) : pickOne(['Hayır! Korunmuyoruz, dışarı! 😰', 'Olmaz, hamile kalırım! Çık! 😣', `Lütfen ${s}, içime değil 🥺`, 'Hayır dedim, tut ve çık 😤']);
    },
    // 💦 "boşalıcam, az kaldı": korunmasına göre nereye
    'boşalıcam': (ch, ctx) => {
      const s = hitapOf(ch), k = (ch.fields || {}).hamile ? 'koricine' : ctx.kor;
      if (k === 'koricine' || k === 'korhap') return pickOne([`Hadi ${s}, içime boşal 😩💦`, 'Bembeyaz sütünü içime sal 🥛🥵', 'Tutma, hepsini içime ver 😈', `İçimde rahatla ${s} 😩`, 'Ben de geliyorum… birlikte, içime! 🥵', 'Doldur beni, şimdi 💦']);
      if (k === 'korkondom') return pickOne(['Bırak kendini, kondom var 😈', `Hadi ${s}, doldur o kondomu 🥵`, 'Boşal, korkma 😩', 'İçimdeyken bitir, korunuyoruz 😏']);
      if (k === 'korsabah') return pickOne(['İçime mi? Peki… sabah hap alırım 😳', `Boşal ${s}, gerisini sabah düşünürüz 😩`, 'Dışarı daha iyi ama… dayanamıyorsan içime 🥵']);
      if (k === 'korpullout') return pickOne(['Çık! Dışarı boşal 😰', `Karnıma ${s}, içime değil! 😣`, 'Çek şimdi, göğüslerime ver 😩💦', 'Söz vermiştin, dışarı! 😳', 'Çık ve sütünü üstüme akıt 🥛😈']);
      return pickOne(['Çık hemen, korunmuyoruz! 😱', 'İçime değil! Dışarı! 😰', `Lütfen ${s}, çek! 🥺`, 'Dur dur, çık! 😣']);
    },
    // 🍼 Breastfeeding: hamile ve sütü varsa süt, yoksa sadece emme
    // genel (sütlü / sütsüz) + 🍒 göğüs bedenine + 🎭 kişiliğe göre; kişilik %40, beden %30 öne geçer
    'emzir': ch => { const s = relV(ch, 'süt'), h = hitapOf(ch), milk = (ch.fields || {}).hamile && s >= 10, tr = ch.traits || [];
      const gen = milk ? ['Em beni, sütüm sana aksın 🍼😩', `İç ${h}, hepsi senin 🍼`, 'Sütüm ağzına doluyor, hissediyor musun? 😳🍼', 'Her emişinde içim titriyor 🥵🍼', 'Göğüslerim boşaldıkça rahatlıyorum… ahh 😩', 'Sıcacık sütüm dilinde 🍼😈', 'Emdikçe ıslanıyorum, durma 💦', 'Bebeğimizden önce sen içiyorsun 🙈🍼', 'Uçlarımı bırakma, süt geliyor 😩🍼', 'Ahh… emişin beni orgazma götürecek 🥵',
        'Sütüm dudaklarından taşıyor 🍼😳', 'Bir göğsüm boşaldı, öbürüne geç 😏🍼', 'Emdikçe sütüm daha çok geliyor 😩', `Doy ${h}, hepsi senin için birikti 🍼`, 'Göğsümü sıkıp ağzına sağıyorum 😈🍼', 'Sütümün tadı tatlı mı? 😏🍼', 'Ahh… sütüm akarken bacaklarım titriyor 🥵', 'Yudum yudum iç beni 🍼😩', 'Göğüslerim hafifliyor, sen doluyorsun 😈', 'Emzirirken gelmek üzereyim 😩🍼']
        : ['Emişin beni eritiyor 😩', 'Uçlarımı em, daha sert 🥵', `Ahh ${h}… dudakların göğsümde 😩`, 'Sütüm yok ama emmene bayılıyorum 😈', 'Her emişte bacaklarımın arası ıslanıyor 💦', 'Dilini uçlarımda gezdir 🥵', 'Göğüslerimi bebeğin gibi em 🙈', 'Hafif ısır… ahh 😩', 'Böyle emersen gelirim 🥵', 'Durma, uçlarım çok hassas 😳',
        'Sütüm olmasa da emzirmeye bayılıyorum 😈', 'Uçlarım ağzında dimdik oldu 🥵', 'Emdikçe göğsümden aşağı ürperti iniyor 🫠', `Başını göğsüme bastırıyorum ${h} 😩`, 'Bir gün süt de gelecek, şimdilik em 😏', 'Dilinle uçlarımı oyna, ahh 🥵', 'Öbür göğsümü de unutma 😈', 'Emişin içimi zonklatıyor 😩', 'Kucağıma uzan, emmeye devam et 🥰', 'Ahh… emerken gözlerime bak 🥵'];
      const bs = traitVal(ch, 'Boob Size'), size = /9[05]/.test(bs) ? 'big' : /8[05]/.test(bs) ? 'mid' : /7[05]/.test(bs) ? 'small' : '';
      const SIZE = {
        big: milk ? ['Bu kocaman göğüsler süt dolu, doyasıya iç 🍼😈', 'İri göğsüm ağzına sığmıyor ama sütüm akıyor 😩🍼', 'Ağır göğüslerim sütle şişti, boşalt beni 🥺🍼', 'Yüzünü dolgun göğsüme göm ve iç 🍼🥵', 'Göğsüm o kadar dolu ki sıkınca fışkırıyor 😳🍼', 'İki elinle tut, kocaman göğsümü sağ 😈🍼']
          : ['Bu kocaman göğsü ağzına sığdırabilecek misin? 😈', 'Yüzün iri göğsümde kayboldu 🥵', 'Ağır göğsümü ağzına bastırıyorum 😩', 'İki elinle tut, ancak öyle emersin 😏', 'Dolgun göğüslerim emilmeye bayılır 🥵', 'Göğsüm yüzünü kapladı, nefes alabiliyor musun? 😈'],
        mid: milk ? ['Göğsüm tam ağzına göre, sütüm akıyor 🍼😩', 'Avucunda sıkıp emdikçe süt geliyor 🍼', 'Dolgun ve sütlü, tam kıvamında 😈🍼', 'Bir yudum daha, göğsüm hâlâ dolu 🥵🍼', 'Göğsümü avuçla ve iç 😩🍼', 'Sütüm sana tam yetecek kadar 😏🍼']
          : ['Göğsüm tam ağzına göre 😏', 'Avuçlayıp em, dolgun dolgun 🥵', 'Uçlarım ağzında, göğsüm avucunda 😩', 'Tam kıvamında göğüslerim senin 😈', 'İkisi de sıra bekliyor 😏', 'Göğsümü sıkarak em 🥵'],
        small: milk ? ['Küçük ama sütle doldu, iç 🍼🥺', 'Minik göğsümden süt geliyor, inanamıyorum 😳🍼', 'Küçük göğsüm tamamen ağzında, sütüm dilinde 🍼😩', 'Hamilelikte büyüdüler, şimdi sütlüler 🍼😈', 'Az ama tatlı sütüm senin 🍼🙈', 'Minik göğsümü sağ, damla damla 🍼🥵']
          : ['Küçük göğsüm tamamen ağzında 🙈', 'Minik ama uçlarım çok hassas 😩', 'Küçük göğsümü ağzınla kapladın 🥵', 'Utanıyorum ama emmene bayılıyorum 🙈', 'Küçük olunca her emiş daha çok hissediliyor 😳', 'Minik göğsüm seni seviyor 🥺']
      };
      const PERS = {
        'Utangaç': ['B-bebek gibi emiyorsun… çok utanıyorum 🙈', 'Y-yüzüme bakma, sadece em 😳', 'B-böyle emzirmek garip ama… güzel 🥺', 'S-sesim çıkıyor, özür dilerim 🙈', 'K-kızardım ama durma 😳', 'B-başını okşayayım mı? 🥺'],
        'Flörtöz': ['Böyle emen bir bebek daha görmedim 😘', 'Uçlarımı bırakırsan seni bırakırım 😉', 'Dudakların göğsüme çok yakıştı 😏', 'Emdikçe seni daha çok istiyorum 😘', 'Biraz ısır, yaramaz 😉', 'Göğsümü sana hediye ediyorum 😏'],
        'Romantik': ['Seni göğsümde besliyorum, en özel an bu 💞', 'Başını okşarken kalbim eriyor 🌹', 'Bu kadar yakın olmak çok güzel 💗', 'Göğsümde nefesini hissediyorum 🥰', 'Seni böyle sevmek sonsuz olsun 💞', 'Bu bağ ikimize ait 🌹'],
        'Soğuk': ['Em. Konuşma.', 'Hm. Devam.', 'Daha yavaş.', 'Fena değil.', 'Isırma.', 'Tamam, öbürüne geç.'],
        'Kibirli': ['Göğsümü emmek bir ayrıcalık 💅', 'Teşekkür etmeyi unutma 💁‍♀️', 'Bu göğüsler herkese verilmez 💅', 'Doğru düzgün em, kraliçeni üzme 👑', 'Bana tapar gibi em 💁‍♀️', 'Şanslısın, biliyorsun 💅'],
        'Alaycı': ['Koca adam bebek gibi emiyor, ne tatlı 😏', 'Biberon mu getireyim? 🙄', 'Doydun mu kahraman? 😏', 'Bu kadar acıkmış mıydın? 🙄', 'Gülme beni, emmeye devam et 😏', 'Mama saati 🙄'],
        'Neşeli': ['Hihi gıdıklanıyorum 😆', 'Mama saati, yaşasın 🥳', 'Emişin çok komik ve çok güzel 😄', 'Haha, uçlarım kızardı 😂', 'Bebeğim acıkmış 😆', 'Gülerken inliyorum 😄'],
        'Duygusal': ['Seni beslemek gözlerimi doldurdu 🥺', 'Bu kadar yakınlık beni ağlatıyor 🥹', 'Göğsümde kalmanı istiyorum hep 💗', 'İçim sevgiyle doldu 😢', 'Başını göğsüme yasla, bırakma 🥺', 'Bu anı hiç unutmayacağım 🥹'],
        'Çocuksu': ['Hihi bebek oldun 🙈', 'Yaa gıdıklanıyor 😚', 'Mama yiyor musun? 🍼', 'Hihi uçlarım ıslandı 🙈', 'Sana ninni söyleyeyim mi? 🎶', 'Yaa çok tatlısın 🥺'],
        'Şımarık': ['Emdikten sonra bana masaj yapacaksın 💅', 'Sadece bana bu kadar ilgi göster 😤', 'Güzelce em, hak ediyorum 💅', 'Hmpf, yavaş ol 😤', 'Bunun karşılığında hediye isterim 🎁', 'Uçlarım kızardı, dikkat et 😤'],
        'Asi': ['Daha sert em, korkma 🔥', 'Isır, umurumda değil 😈', 'Kimse beni böyle emzirmedi 😤', 'Hayvan gibi em 🔥', 'Bırakırsan kızarım 😤', 'Göğsümü yağmala 😈'],
        'Özgüvenli': ['Göğsümü nasıl emeceğini ben göstereyim 😎', 'Tam böyle, iyi gidiyorsun 😏', 'Bu göğüsler mükemmel, biliyorum 😎', 'Ritmi ben ayarlarım 😏', 'Emdikçe seni yönetiyorum 😎', 'Böyle iyi 😏'],
        'Manipülatif': ['Em bakalım, karşılığını sonra konuşuruz 😏', 'Göğsüme bağımlı oldun, değil mi? 😈', 'Ben ne zaman dersem bırakırsın 💅', 'Her emiş bir söz demek 😏', 'Artık benimsin 😈', 'İyi çocuk, devam 💅'],
        'Gizemli': ['Sessizce em… 🌙', 'Bu sırrımız olsun 🤫', 'Göğsümün tadını kimse bilmez 🖤', 'Karanlıkta daha güzel 🌙', 'Fısıldamadan em 🤫', 'Bir sır daha paylaşıyoruz 🖤'],
        'Güvensiz': ['Göğüslerimi beğendin mi gerçekten? 🥺', 'İyi mi böyle? 😔', 'Ağzına uygun mu? 🥺', 'Beni böyle seviyor musun? 😣', 'Garip görünmüyor muyum? 🥺', 'Emdikçe kendimi güzel hissediyorum 😔'],
        'Meraklı': ['Tadı nasıl, söyle? 🤩', 'Sağ tarafla sol aynı mı? 😏', 'Böyle hissettireceğini bilmiyordum 😳', 'Bir de böyle dene 🤩', 'Her emişte ne hissediyorsun? 🤔', 'Daha önce hiç böyle denememiştim 😳']
      };
      const per = Object.keys(PERS).filter(k => tr.includes(k));
      const r = Math.random();
      if (per.length && r < .4) return pickOne(PERS[pickOne(per)]);
      if (size && r < .7) return pickOne(SIZE[size]);
      return pickOne(gen); },
    'sütiç': ch => { const s = relV(ch, 'süt');
      if (!(ch.fields || {}).hamile) return pickOne(['Önce hamile bırakman lazım 😏🍼', 'Sütüm yok ama emmene engel değil 😈', 'Hamile kalınca ilk sen içeceksin 🙈🍼', 'Şimdilik sadece hayal et 😏']);
      return s >= 50 ? pickOne(['İç… hepsi senin 😩🍼', 'Em de akıtayım ağzına 🥵🍼', 'Göğüslerim sana dolu dolu 😈🍼', 'Sağ beni, son damlasına kadar 😩', 'Tadı nasıl, tatlı mı? 😏🍼', 'Bebeğimizden önce sen 🙈🍼'])
        : pickOne(['Biraz var, sabırla em 😏🍼', 'Az geliyor, daha çok emmen lazım 😈', 'Damla damla… tadına bak 🙈🍼']); },
    memeem: ch => memeAns(ch, 'em'), memeyala: ch => memeAns(ch, 'yala'), memedokun: ch => memeAns(ch, 'dokun'), memeısır: ch => memeAns(ch, 'ısır'), memeuç: ch => memeAns(ch, 'uç'),
    // 🍑 kalça: yalamak / dokunmak (şaplak). Kalça bedeni, Anal Size, anal sevip sevmemesi
    'kalçayala': ch => kalcaAns(ch, 'yala'), 'kalçadokun': ch => kalcaAns(ch, 'dokun'),
    // 💗 onun durumu
    'azgın': ch => { const u = relV(ch, 'uyarılma'), s = relV(ch, 'şehvet'); return u >= 50 || s >= 60 ? pickOne(['Sırılsıklamım 😩', 'Seni şimdi istiyorum 🥵', 'Dokun da gör 😈']) : u >= 20 || s >= 20 ? pickOne(['Isınmaya başladım 😏', 'Biraz daha uğraş 😈']) : pickOne(['Henüz değil, ısıt beni 😏', 'Biraz yavaş başla 😌']); },
    'sertyavaş': ch => { const L = likedTitles(ch).map(t => t.toLocaleLowerCase('tr')), tr = ch.traits || [];
      if (L.some(t => /rough|brutal|assertive/.test(t)) || tr.includes('Asi') || tr.includes('Soğuk')) return pickOne(['Sert 😈', 'Hırpala beni 🔥', 'Yavaş mı? Asla 😤']);
      if (L.includes('gentle') || tr.includes('Utangaç') || tr.includes('Romantik')) return pickOne(['Yavaş ve derin 🥰', 'Nazik ol bana 💕']);
      return pickOne(['Önce yavaş, sonra sert 😏', 'Duruma göre 😈', 'Sen nasıl istersen 😉']); },
    // ✨ deneyim
    ilk: ch => { const e = traitVal(ch, 'Experience'); return e === 'Virgo' ? pickOne(['Daha olmadı… seninle olacak 🥺', 'Hiç olmadı ki 🙈']) : pickOne(['18\'imdeydim… 🙈', 'Lisede, utanç verici bir hikaye 😅', 'Bir yaz tatilinde… 😏', 'Üniversitede… anlatırım belki 😌']); },
    'geçmiş': ch => { const e = traitVal(ch, 'Experience'); return ({ Virgo: 'Hiç kimseyle 🙈', Little: 'Sadece biriyle 😳', Some: 'İki üç kişi 😌', Medium: 'Birkaç kişi, o kadar 😏', Much: 'Beş altı… saymadım 😏', 'A lot': 'Saymayı bıraktım 😈', Great: 'Sorma, çok 😏🔥' })[e] || pickOne(['Bunu söylemem 😏', 'Sır 🤫']); },
    'seks': ch => { const e = traitVal(ch, 'Experience'), s = relV(ch, 'şehvet'); return e === 'Virgo' ? pickOne(['Bilmiyorum… hiç denemedim 🙈', 'Merak ediyorum 😳']) : s >= 50 || ['Much', 'A lot', 'Great'].includes(e) ? pickOne(['Bayılırım 😈', 'Hem de nasıl 🥵']) : pickOne(['Doğru kişiyle evet 😌', 'Seninle seviyorum 🙈']); },
    hassas: ch => { const b = traitVal(ch, 'Boob Size'); return pickOne([+b >= 90 ? 'Göğüslerim… özellikle uçları 😳' : 'Boynum, öp de gör 😏', 'Kulak memem 🙈', 'Belimin altı… 😈', 'İç bacaklarım 😩', 'Boynum ve göğüslerim 😏']); },
    // 💋 sevdikleri / sevmedikleri
    anal: ch => likesTag(ch, 'anal') ? pickOne(['Bayılırım 😈🍑', 'En sevdiğim 😏']) : dislikesTag(ch, 'anal') ? pickOne(['Hiç sevmem 😣', 'Arkam yasak bölge 🙅‍♀️']) : traitVal(ch, 'Experience') === 'Virgo' ? pickOne(['Hiç denemedim… 😳']) : pickOne(['Bazen… nazik olursan 😏', 'Doğru anda olabilir 🙈']),
    oral: ch => likesTag(ch, 'oral') ? pickOne(['Ağzımın sana alışmasını istiyorum 😋', 'Çok severim 😈']) : dislikesTag(ch, 'oral') ? pickOne(['Pek sevmem 😕']) : pickOne(['Senin için yaparım 😏', 'Duruma göre 😋']),
    kondom: ch => evAllowed(ch, 'condom') ? pickOne(['Evet, kondomla rahat ederim 😌', 'Kondomsuz olmaz 😏']) : evDenied(ch, 'condom') ? pickOne(['Kondomu sevmem, hissetmek istiyorum 😈', 'Kondom mu? Hayır 😏']) : pickOne(['Sen bilirsin 😌', 'Olabilir 🙂']),
    hap: ch => evAllowed(ch, 'control pill') ? pickOne(['Evet, düzenli içiyorum 😌', 'Evet, rahat ol 😏']) : pickOne(['Hayır, içmiyorum 😳', 'Hayır… dikkatli olmalıyız 🙈']),
    // 🗂️ karakterin bilgileri
    'burç': ch => ch.zodiac ? pickOne([`${ch.zodiac} burcuyum ✨`, `${ch.zodiac}… uyumlu muyuz sence? 😏`]) : pickOne(['Tahmin et 😏', 'Burçlara inanmam 😌']),
    meslek: ch => ch.job ? pickOne([`${ch.job} olarak çalışıyorum 😊`, `${ch.job}… sıkıcı gelebilir 😅`]) : pickOne(['Şu an boştayım 😌', 'Sana ne yapacağımı düşünüyorum 😏']),
    // 👗 ne giyiyorsun: üstündekilere göre (giyim yoksa eski genel cümleler)
    'kıyafet': ch => {
      const xs = outfitItems(ch);
      if (!xs.length) return BOT_ANS['kıyafetEski'](ch);
      const nm = x => x.id === 'sutyensiz' ? 'sütyen yok' : x.id === 'icsiz' ? 'çamaşır yok' : x.name.toLocaleLowerCase('tr');
      const dis = xs.filter(x => ['elbise', 'ust', 'alt', 'corap'].includes(x.slot)), ic = xs.filter(x => ['sutyen', 'tanga'].includes(x.slot));
      const bold = xs.some(x => x.style === 'i');
      const s = dis.length ? `Üstümde ${dis.map(nm).join(', ')}${ic.length ? `; altında ${ic.map(nm).join(' ve ')}` : ''} ${bold ? '😈' : '😌'}` : ic.length ? `Sadece ${ic.map(nm).join(' ve ')}… 😏` : 'Hiçbir şey 😈';
      return Math.random() < .5 ? `${s} ${pickOne(pickOne(xs).t)}` : s;
    },
    'sütyen': ch => { const x = clItem(outfitOf(ch).sutyen); return !x ? pickOne(['Sütyen mi? Giymedim bugün 😏', 'Sütyensizim, belli olmuyor mu? 😈']) : x.id === 'sutyensiz' ? pickOne(x.t) : pickOne([`${x.name} giydim 😏`, `${x.name}… görmek ister misin? 😈`, ...x.t]); },
    'altiç': ch => { const x = clItem(outfitOf(ch).tanga); return !x ? pickOne(['Altımda hiçbir şey yok 😈', 'Bugün çamaşır giymedim 😏']) : x.id === 'icsiz' ? pickOne(x.t) : pickOne([`${x.name} giydim 😏`, `${x.name}… tahmin etmiştin değil mi? 😈`, ...x.t]); },
    'sütyençıkar': ch => slotLine(ch, 'sutyen', Math.random() < .5 ? 'off' : 'show') || pickOne(['Zaten sütyen giymedim 😈', 'Çıkaracak bir şey yok, bak 😏']),
    'tangaçıkar': ch => slotLine(ch, 'tanga', Math.random() < .5 ? 'off' : 'show') || pickOne(['Altımda bir şey yok zaten 😈', 'Çamaşırsızım, gerek yok 😏']),
    'kıyafetEski': ch => pickOne(['Sadece iç çamaşırı 😏', 'Senin tişörtün 🙈', 'Hiçbir şey… 😈', 'Pijama, ama çıkarabilirim 😏', 'Dar bir elbise 💃', 'Dantel bir gecelik… görmek ister misin? 😈',
      'Sadece bir havlu, duştan yeni çıktım 🚿', 'Kısa bir şort ve atlet 😌', 'Kırmızı iç çamaşırı, senin için 🔥', 'Üstümde sadece parfüm var 😏', (ch.fields || {}).hamile ? 'Bol bir elbise, karnım sığmıyor 🤰' : 'Dar bir kot, kalçamı saran 🍑',
      +traitVal(ch, 'Boob Size') >= 90 ? 'Sütyensiz bir tişört… belli oluyor mu? 😏' : 'Minik bir bralet 🙈']),
    // 🛡️ "içine gireyim, dışarı boşalırım" yalvarması ve "kondomsuz olur mu"
    'dışarıboşal': ch => {
      if ((ch.fields || {}).hamile) return pickOne(['Zaten hamileyim, dışarıya gerek yok 😈', 'İçime gir… içime de boşal, sorun yok 😏']);
      if (evAllowed(ch, 'nothing') || evAllowed(ch, 'control pill')) return pickOne(['Dışarı mı? İçime boşal bile 😈', 'Gir… nereye istersen bitir 😏💦']);
      if (evAllowed(ch, 'pull-out method')) return pickOne(['Peki… ama son anda çıkar, söz mü? 😳', 'Tamam, gir… ama dışarı, yemin et 🥺', 'Gir ama hissettiğin an çek 😩']);
      if (evAllowed(ch, 'condom') || evAllowed(ch, 'tight condom')) return pickOne(['Kondom tak, sonra istediğin kadar 😏', 'Kondomsuz olmaz, söz de olmaz 😣']);
      return pickOne(['Hayır, risk alamam 😣', 'O "son anda çıkarırım"ları bilirim 🙄', 'Nolur deme, olmaz 😳']);
    },
    kondomsuz: ch => {
      if ((ch.fields || {}).hamile) return pickOne(['Artık kondoma gerek yok 😏', 'Hamileyim zaten, olur 😈']);
      if (evAllowed(ch, 'nothing')) return pickOne(['Olur… seni hissetmek istiyorum 😈', 'Kondom mu? Hiç sevmem zaten 😏']);
      if (evAllowed(ch, 'control pill')) return pickOne(['Hap içiyorum, olur 😏', 'Olur, rahat ol 😌']);
      if (evAllowed(ch, 'pull-out method')) return pickOne(['Olur ama dışarı boşalacaksın 😳', 'Tamam… ama son anda çek 🥺']);
      if (evAllowed(ch, 'morning-after pill')) return pickOne(['Olur… sabah hap alırım 😳', 'Bir kereliğine olsun 🙈']);
      return pickOne(['Olmaz, kondomsuz asla 😣', 'Hayır, tak şunu 😤', 'Ya olmaz, korunmuyorum 😳']);
    },
    // 🏆 "benden daha iyisi oldu mu"
    'kıyas': ch => { const e = traitVal(ch, 'Experience'), tr = ch.traits || [];
      if (e === 'Virgo') return pickOne(['Sen ilksin zaten 🙈', 'Kıyaslayacak kimse yok ki 😳']);
      if (tr.includes('Kibirli') || tr.includes('Alaycı')) return pickOne(['Belki… sana söylemem 😏', 'Kıskandın mı? 💅', 'Daha çok çalışman lazım 🙄']);
      return relV(ch, 'aşk') >= 50 ? pickOne(['Hayır, sen en iyisisin 💗', 'Hiç kimse senin gibi değildi 😩', 'Seninle bambaşka 🥺']) : pickOne(['Hmm… sana söylemem 😏', 'Yarışma mı bu? 😂', 'Kanıtla bakalım 😈']); },
    // 📏 boyut: mesajdaki sayı (santim / cm) ya da daha önce söylediğin; karakterin darlığına ve deneyimine göre
    boy: (ch, ctx) => {
      const m = /(\d{1,2})\s*(cm|santim|santimetre|sm)?/i.exec(String(ctx.text || '')), u = S().user;
      const n = m ? +m[1] : +u.size || 0;
      if (m && n >= 5 && n <= 35) u.size = n;
      const p = traitVal(ch, 'Pussy Size'), tight = /tight/i.test(p), loose = /loose|relaxed/i.test(p), virgin = traitVal(ch, 'Experience') === 'Virgo', big = ['Much', 'A lot', 'Great'].includes(traitVal(ch, 'Experience'));
      if (!n) return pickOne(['Bakmadan bilemem 😏 göster', 'Ölçmemiz lazım 😈', 'Söyle bakalım kaç? 😏']);
      if (n >= 24) return pickOne([`${n} santim mi? Yalan söyleme 😂`, 'Bu kadar büyüğü sığmaz bana 😱', 'Abartma istersen 🙄']);
      if (n >= 18) return virgin ? pickOne([`${n} santim mi?! Bu benim için çok büyük 😳`, 'Korkutuyorsun beni… yavaş olmalıyız 🥺', 'İlk seferim için bu çok fazla değil mi? 🙈', `${n}… düşünmesi bile titretiyor beni 😳`])
        : tight ? pickOne([`${n} santim… ben çok darım, ikiye bölersin beni 😩`, 'Bunu nasıl sığdıracağız? 😳💦', 'Dar halime bu kadar büyüğü… yavaş girersen 🥵', `${n} santim, beni sonuna kadar açacak 😵‍💫`])
        : loose ? pickOne([`${n} santim, tam beni dolduracak boy 😈`, 'Ancak öyle doldurursun beni 🥵', 'İşte aradığım boy 😏', 'Sonunda beni hissettirecek biri 😈'])
        : pickOne([`${n} santim mi? Ooo 😳 hoşuma gider`, 'Şimdiden heyecanlandım 🥵', `${n}… bunu görmem lazım 😈`, 'Bu boyda biriyle hiç olmadım 😳', 'Yutkundum şu an 😏']);
      if (n >= 14) return tight ? pickOne([`${n} santim, bana tam olur 😏`, 'Dar olduğum için bana fazlasıyla yeter 😩']) : pickOne([`${n} santim, tam kıvamında 😏`, 'Mükemmel boy 😈', big ? 'Nasıl kullandığına bakarım 😏' : 'Bence harika 🥰']);
      return pickOne(['Boyut önemli değil, nasıl kullandığın önemli 😏', tight ? 'Ben darım zaten, bana yeter 😌' : 'Sen bana yetersin 🥰', `${n} santim da güzel, utanma 🙈`]);
    },
    // 📏 kaç santim seversin: darlığına ve deneyimine göre; söylediğin boyut varsa ona da değinir
    sevboy: ch => {
      const p = traitVal(ch, 'Pussy Size'), e = traitVal(ch, 'Experience'), n = +S().user.size || 0;
      const base = e === 'Virgo' ? pickOne(['Bilmiyorum… büyükleri düşününce korkuyorum 🙈', 'Çok büyük olmasın, ilk seferim 🥺'])
        : /tight/i.test(p) ? pickOne(['14-16 santim bana fazlasıyla yeter, darım 😳', 'Çok büyüğü sığmaz bana, orta boy 😏'])
        : /loose|relaxed/i.test(p) ? pickOne(['20 santimin üstü… beni doldursun 😈', 'Büyük olsun, kalın olsun 🥵'])
        : ['Much', 'A lot', 'Great'].includes(e) ? pickOne(['Boyuttan çok nasıl kullandığına bakarım 😏', '17-18 civarı, tam kıvam 😈']) : pickOne(['Orta boy, kalın olsun 😏', '16-18 arası ideal bence 🙈']);
      return n ? `${base} ${pickOne([`Seninki ${n}, ${n >= 18 ? 'beni zorlar 😩' : n >= 14 ? 'tam ideal 😈' : 'bana yeter 🥰'}`, `${n} santim… kafamda canlandırdım bile 😏`])}` : base;
    },
    // 🍒 "memenin arasına sokmak istiyorum": göğüs bedenine göre
    'memearası': ch => { const b = +traitVal(ch, 'Boob Size') || 0;
      return b >= 90 ? pickOne(['Gel, kaybol aralarında 😏🍒', 'Bu göğüsler tam bunun için 😈', 'Sıkıştırayım mı seni? 🥵']) : b && b <= 75 ? pickOne(['Küçükler ama denerim 🙈', 'Ellerimle yardım ederim 😏']) : pickOne(['Göğüslerimin arasına gel 😏', 'Hadi, bekliyorum 😈🍒']); },
    'son': ch => traitVal(ch, 'Experience') === 'Virgo' ? pickOne(['Hiç… daha olmadı 🙈']) : pickOne(['Uzun zaman oldu… özledim 😩', 'Geçen hafta… ama seninle değildi 😏', 'Hatırlamıyorum bile 😅', 'Dün gece… rüyamda seninle 😈']),
    'kaçkez': ch => relV(ch, 'şehvet') >= 50 ? pickOne(['Sen durana kadar 😈', 'Saymayı bırakırım 🥵']) : pickOne(['Bir iki kez… sonra bayılırım 😩', 'Beni bir kez doğru getir, yeter 😏']),
    yut: ch => likesTag(ch, 'oral') || (ch.traits || []).includes('Flörtöz') ? pickOne(['Hepsini yutarım 😋', 'Bir damlasını bile kaçırmam 😈']) : traitVal(ch, 'Experience') === 'Virgo' ? pickOne(['B-bilmiyorum… denerim 😳']) : pickOne(['Belki… nasıl hissettiğime bağlı 😏', 'Önce bir tadına bakayım 😋']),
    'yüz': ch => (ch.traits || []).some(t => ['Kibirli', 'Soğuk', 'Şımarık'].includes(t)) ? pickOne(['Yüzüme mi? Sakın 💅', 'Makyajım var 😤']) : pickOne(['Kızmam… hatta isterim 😈', 'Yüzüme boşal, gözlerime bakarak 😏', 'Bir kere deneriz 🙈']),
    'hamilebırak': ch => (ch.fields || {}).hamile ? pickOne(['Zaten bıraktın 🤰😏']) : evAllowed(ch, 'control pill') ? pickOne(['Hap içiyorum, boşuna uğraşma 😏', 'Deneyebilirsin ama tutmaz 😈']) : evAllowed(ch, 'nothing') && relV(ch, 'aşk') >= 50 ? pickOne(['Bırak… 🥺', 'Seninle olsa neden olmasın 💗']) : pickOne(['Delirdin mi 😳', 'Önce yüzük 💍😏', 'Daha çok erken 🙈']),
    arkadan: ch => likesTag(ch, 'anal') ? pickOne(['Gir… 😈🍑', 'Bekliyordum zaten 😏']) : dislikesTag(ch, 'anal') ? pickOne(['Hayır, orası olmaz 😣']) : /tight/i.test(traitVal(ch, 'Anal Size')) ? pickOne(['Çok yavaş olursan… 😳', 'Orası çok dar, dikkat et 🥺']) : pickOne(['Belki… nazik olursan 😏', 'Önce biraz ısıt beni 😈']),
    yer: () => pickOne(['Duşta 🚿😏', 'Mutfak tezgahında 😈', 'Arabada, gece 🚗', 'Senin yatağında 🛏️', 'Asansörde… riskli ama 😳', 'Plajda, gün batımında 🌅', 'Ofiste, masanın üstünde 💼😈']),
    mastur: ch => relV(ch, 'şehvet') >= 40 || ['Much', 'A lot', 'Great'].includes(traitVal(ch, 'Experience')) ? pickOne(['Her gece… seni düşünerek 😈', 'Sık sık 😏 itiraf ediyorum']) : pickOne(['Ç-çok nadir 🙈', 'Bunu söylemem 😳']),
    oyuncak: ch => likedTitles(ch).some(t => /toy/i.test(t)) ? pickOne(['Bayılırım, bir sürü var 😈', 'Hangisini getireyim? 😏']) : pickOne(['Hiç denemedim… merak ediyorum 😳', 'Seninle denerim 😏']),
    'bağlan': ch => likedTitles(ch).some(t => /bondage/i.test(t)) ? pickOne(['Bağla beni 😈', 'İplerimi getireyim mi? 😏']) : pickOne(['Biraz korkutucu ama… olur 😳', 'Sana güvenirsem 😌']),
    dokun: ch => relV(ch, 'güven') >= 35 ? pickOne(['Dokun… bekliyordum 😏', 'Sormana gerek yok 😈', 'Hadi, çekinme 🥰']) : pickOne(['Yavaş… önce beni tanı 😳', 'Biraz bekle 😌', 'Henüz değil 🙈']),
    neyim: () => pickOne(['Gözlerini 🥺', 'Gülüşünü 😊', 'Ellerini… ne yaptıklarını 😏', 'Sesini, hele fısıldayınca 😩', 'Beni nasıl baktığını 💗', 'Dudaklarını 💋']),
    'hamilekalırsa': ch => relV(ch, 'aşk') >= 50 ? pickOne(['Birlikte büyütürüz 💗', 'Seninle olursa korkmam 🥺', 'Baba olmaya hazır mısın? 😏🍼']) : pickOne(['Panik yapmayalım 😳', 'O yüzden dikkatli ol 😅', 'Bunu düşünmek bile istemiyorum 🙈']),
    // 🔢 bu sohbetteki sayılar (ctx)
    'orgazmsay': (ch, ctx) => ctx.orgN ? pickOne([`Bu gece ${ctx.orgN} kez 🥵`, `${ctx.orgN} kez… ve daha istiyorum 😩`]) : pickOne(['Daha hiç… sen yapmalısın 😏', 'Henüz sıfır, utan 🙄']),
    'boşalmasay': (ch, ctx) => ctx.cumN ? pickOne([`${ctx.cumN} kez 😏`, `Saydım, ${ctx.cumN} kez 😈💦`]) : pickOne(['Daha hiç 😏', 'Henüz değil, sabırsız 😈'])
  };
  const MEME_ACT = {
    em: ['Em… ahh, bekliyordum 😩', 'Gel, göğüslerime yasla başını 😈', 'Önce uçlarımı dilinle oyna 😏', 'Hmm… sert em 🥵', 'Emerken gözlerime bak 😈', 'Bebeğim gibi em beni 🥺💗', 'Dudaklarını hissetmek istiyorum oralarda 😩', 'Sırayla… önce sağ, sonra sol 😏', 'Emdikçe aşağısı ıslanıyor 🥵', 'Durmadan em, inletene kadar 😩'],
    yala: ['Yala… yavaş yavaş 😩', 'Dilinle daire çiz uçlarımda 😈', 'Islak ıslak yala, bayılırım 🥵', 'Göğüslerimin arasından boynuma kadar yala 😏', 'Dilin değince titriyorum 😳', 'Yala, sonra üfle… ahh 😩', 'Her yerini yala, hiçbir yer kalmasın 😈', 'Sıcak dilin… devam et 🥵'],
    dokun: ['Dokun… avuçlarına al 😏', 'Sık biraz… ahh evet 😩', 'Ellerin çok sıcak 🥵', 'Okşa, sonra sık 😈', 'Elini çekme, kalsın orada 🥺', 'Parmaklarınla uçlarımı sık 😩', 'Hissediyor musun ne kadar yumuşak? 😏', 'İki elinle tut, bırakma 😈'],
    'ısır': ['Hafif ısır… ahh 😩', 'Dişlerin… dikkat et ama durma 😈', 'Isır da iz kalsın 😏', 'Uçlarımı ısırınca çıldırıyorum 🥵', 'Yavaş… sonra biraz daha sert 😩', 'Of… ısırma öyle, dayanamıyorum 😵‍💫'],
    'uç': ['Sertleşti bile, dokun da gör 😏', 'Seni görünce dikleşiyorlar 😳', 'Çok hassaslar, yavaş 🥺', 'Tişörtümden belli oluyor mu? 😈', 'Dokunursan inlerim 😩', 'Pembe pembe… görmek ister misin? 🙈']
  };
  function memeAns(ch, kind) {
    const b = +traitVal(ch, 'Boob Size') || 0, tr = ch.traits || [], preg = (ch.fields || {}).hamile, s = relV(ch, 'süt');
    const pool = [...(MEME_ACT[kind] || MEME_ACT.em)];
    if (b >= 90) pool.push('İkisine birden yetişebilecek misin? 😏🍒', 'Yüzünü aralarına göm 😈', 'Bu kadar büyükleri nasıl taşıyorum sanıyorsun? Senin için 🥵', 'Avucuna sığmıyorlar değil mi? 😏', 'Kocamanlar ve hepsi senin 😈🍒');
    else if (b && b <= 75) pool.push('Küçükler ama çok hassaslar 😳', 'Ufaklar, tam ağzına göre 🙈', 'Küçük diye küçümseme, bak nasıl tepki veriyorlar 😏', 'Avucuna tam sığıyorlar 🥺');
    else if (b) pool.push('Tam avucunun içine göre 😏', 'Dolgunlar, sıkınca hissedersin 😈', 'Ne büyük ne küçük, tam senin için 🍒');
    if (preg && s >= 50) pool.push('Dikkat et, süt gelecek 🍼😏', 'Dolu dolu… emersen rahatlarım 🥺🍼', 'Sütümü içmek mi istiyorsun? Gel 😈🍼', 'Uçlarından damlıyor zaten 🥵🍼', 'Bütün sütümü sana veririm 😩🍼');
    else if (preg) pool.push('Hamileliğimden beri çok hassaslar 🥺', 'Büyüdüler, fark ettin mi? 🤰😏', 'Biraz süt gelebilir 🙈🍼');
    if (tr.includes('Utangaç')) pool.push('B-bilmem… ama istiyorsan 🙈', 'Utanıyorum ama… evet 😳', 'Işığı kapat önce 🙈');
    if (tr.includes('Kibirli') || tr.includes('Şımarık')) pool.push('Bunun bir ayrıcalık olduğunu bil 💅', 'Hak ettin mi bakalım? 😏', 'Sana izin veriyorum… bu seferlik 💅');
    if (tr.includes('Flörtöz')) pool.push('Sormana gerek yoktu ki 😘🍒', 'Ben de bunu bekliyordum 😏💋');
    if (tr.includes('Romantik') || tr.includes('Duygusal')) pool.push('Yavaşça… seni hissetmek istiyorum 💗', 'Kalbimin üstünde dur biraz 🥺');
    if (tr.includes('Asi') || tr.includes('Özgüvenli')) pool.push('Sor da sor… al artık 😈', 'Hadi, sert ol 🔥');
    return pickOne(pool);
  }
  function kalcaAns(ch, kind) {
    const z = traitVal(ch, 'Butt Size'), a = traitVal(ch, 'Anal Size'), tr = ch.traits || [], big = /^(L|XL)$/i.test(z), small = /^(XS|S)$/i.test(z);
    const pool = kind === 'yala'
      ? ['Yala… kalçamın her yerini 😈', 'Dilinle kalçamın arasında gezin 😩', 'Arkamı sana dönüyorum, yala 🍑', 'Islak ıslak yala, sonra ısır 😏', 'Kalçamı açıp yalamanı istiyorum 🥵', 'Hmm… dilin oraya gidince titriyorum 😳']
      : ['Sık… avuçlarına al 😈🍑', 'Şaplak at, iz kalsın 😏', 'Ellerini kalçamdan çekme 🥵', 'Bir şaplak daha… ahh 😩', 'Sıkınca nasıl titrediğini gör 😈', 'İki elinle aç kalçamı 😏'];
    if (big) pool.push('Bu kadar büyük kalçayı tek elle tutamazsın 😏🍑', 'Yüzünü göm aralarına 😈', 'Hepsi senin, istediğin kadar 🥵🍑');
    if (small) pool.push('Küçük ama sıkı 😏🍑', 'Avucuna tam sığıyor 🙈');
    if (kind === 'yala' && likesTag(ch, 'anal')) pool.push('Arkamı da yala… orayı çok severim 😈', 'Deliğimi yala, hazırla beni 🥵');
    if (kind === 'yala' && dislikesTag(ch, 'anal')) return pickOne(['Kalçamı yala ama içeri yok 😣', 'Sadece dışı… orası yasak 🙅‍♀️', 'Kalçam evet, arkam hayır 😳']);
    if (/tight/i.test(a)) pool.push('Orası çok dar, dilinle hazırla 🥺');
    if (tr.includes('Utangaç')) pool.push('O-oraya mı? 🙈', 'Utanıyorum ama… dur demeyeceğim 😳');
    if (tr.includes('Kibirli') || tr.includes('Şımarık')) pool.push('Kalçama tapmanı izleyeceğim 💅', 'Diz çök önce 😏');
    return pickOne(pool);
  }
  // bot cevapları için karakter bilgileri
  function trEk(word, kind) {
    const w = String(word || '').trim(), lw = w.toLocaleLowerCase('tr').split(/\s+/).pop(), v = (lw.match(/[aeıioöuü]/g) || ['e']).pop();
    const back = 'aıou'.includes(v), hard = /[çfhkpsşt]$/.test(lw);
    const ek = kind === 'li' ? 'l' + ({ a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' })[v]
      : (hard ? 't' : 'd') + (back ? 'a' : 'e') + (kind === 'den' ? 'n' : '');
    return `${w}'${ek}`;
  }
  return { BOT_ASK, SEX_CATS, QPRIVATE, QCOUNTER, QFRAME, yesNo, BOT_ANS, trEk };
};
