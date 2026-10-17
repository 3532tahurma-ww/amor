/*
 * Amor - Niyet (intent) kalıpları ve ortak cümleler
 * --------------------------------------------------
 * Kullanıcının mesajı küçük harfe çevrilir, Türkçe karakterler sadeleştirilir
 * (ç->c, ş->s, ı->i ...) ve tekrar eden harfler tek harfe indirilir
 * ("selaaam" -> "selam"). Kalıplar da aynı şekilde sadeleştirilip aranır.
 *
 *   'kelime'   -> mesajdaki herhangi bir kelimenin başında geçerse eşleşir (ek alabilir)
 *   '^kelime'  -> sadece mesajın başında, tam kelime olarak
 *   '+fiil'    -> fiilin bütün çekimleri (Amor.VERBS kökleri): '+ozlemek' = özledim, özlüyorum, özledin mi...
 *                 Olumsuz çekimler sayılmaz (özlemedim, sevmiyorum). Kelimelerle birlikte sıralı yazılır:
 *                 'seni +sevmek' -> "seni çok seviyorum" (arada en fazla 3 kelime olabilir)
 *
 * Sıra önemlidir: üstteki niyet önce kontrol edilir.
 */
window.Amor = window.Amor || {};

/* Fiil kökleri (sadeleştirilmiş: ç->c, ş->s, ı->i ...). '+fiil' kalıpları bu kökleri arar. */
Amor.VERBS = {
  sevmek: ['sev'],
  ozlemek: ['ozle', 'ozlu'],
  sarilmak: ['saril'],
  opmek: ['opuyor', 'opeyim', 'opmek', 'opecek', 'operim', 'optum', 'opsem', 'opebil', 'opelim', 'opsene', 'op beni'],
  dusunmek: ['dusun'],
  bulusmak: ['bulus'],
  gorusmek: ['gorus'],
  yapmak: ['yap'],
  begenmek: ['begen'],
  hoslanmak: ['hoslan'],
  hatirlamak: ['hatirla', 'hatirli'],
  unutmak: ['unut'],
  kiskanmak: ['kiskan'],
  guvenmek: ['guven'],
  izlemek: ['izle', 'izli'],
  acikmak: ['acikt', 'acikiyo', 'acikmis'],
  yemek: ['yedin', 'yedim', 'yiyor', 'yiyece'],
  uyumak: ['uyu'],
  uyanmak: ['uyan'],
  beklemek: ['bekle', 'bekli'],
  konusmak: ['konus'],
  anlatmak: ['anlat'],
  sormak: ['sorabil', 'soraca', 'sorayim', 'sorucam', 'sorsam']
};

Amor.INTENTS = [
  ['insult', ['aptal', 'salak', 'gerizekali', 'mal misin', 'siktir', 'amk', '^aq', 'orospu', 'kaltak', 'cirkinsin', 'igrenc', 'defol', 'ezik', 'sikicisin', 'sus lan', 'kapa ceneni', 'kes sesini', 'moron', 'yavsak', 'defol git', 'bıktım senden', 'nefret ediyorum']],
  ['night', ['iyi gece', 'yatiyorum', 'uyuyacam', 'uyuyacagim', 'uyumaya', 'tatli ruya', 'iyi uykular', 'ben kacar uyuyorum', 'uyu hadi', 'geceler', 'hadi iyi geceler', 'ben yatar', 'uykulu', 'uykum geldi']],
  ['morning', ['gunaydin', 'gnydn', 'gunaydn', 'gunaydinlar', 'aydinliklar', 'gunun guzel gecsin', 'uyandim', 'uyandim sonunda', 'mutlu sabahlar', 'guzel bir gun']],
  ['bye', ['gorusuruz', 'gorusmek uzere', 'hosca kal', 'hoscakal', 'bay bay', 'kactim', 'gitmem lazim', 'gidiyorum', 'sonra konusuruz', 'sonra yazarim', 'kendine iyi bak', 'ben kacayim', 'yazarim sana', 'optum bay', 'bye bye']],
  ['ask_call', ['arayabilir miyim', 'arayabilirmiyim', 'arayayim mi', 'arayim mi', 'arasam', 'ararsam', 'aramami', 'seni arayayim', 'beni ara', 'beni arar misin',
    'telefonda konusalim', 'telefonla konusalim', 'sesli konusalim', 'sesli arayayim', 'goruntulu konusalim', 'goruntulu arayayim', 'goruntulu arayabilir',
    'sesini duymak istiyorum', 'sesini duyabilir', 'aramak istiyorum', 'konusabilir miyiz telefonda', 'musait misin konusmaya', 'goruntuluye gecelim']],
  ['kiss', ['opuyorum', 'opucuk', 'opeyim', 'opmek', 'opebilir', 'operim', 'opucugum', 'muck', 'mucuk', 'mua', 'kocaman opuyorum', 'op beni', 'opucukler', 'dudagindan', 'yanagindan', '+opmek', '😘', '💋']],
  ['hug', ['sariliyorum', 'sarilmak', 'sarilalim', 'sarilsam', 'saril', 'kucakla', 'kucak', 'kocaman sarilalim', 'simsiki saril', 'sicacik sarilalim', 'saril bana', '+sarilmak', '🤗']],
  ['flirt', ['seni seviyorum', 'seviyorum seni', 'askim', 'sevgilim', 'evlen', 'asik oldum', 'asigim', 'hoslaniyorum', 'bebegim', 'balim',
    'sevgili olalim', 'cikalim mi', 'kalbimi caldin', 'kalbim senin', 'benimsin', 'sevdim seni', 'seni cok begeniyorum',
    'cok tatlisin ya', 'asigim sana', 'kalbimdesin', 'benim olur musun', 'hayatimin anlami', 'sensiz olmuyor', 'iyi ki varsin', 'canimsin', 'her seyimsin',
    'seni +sevmek', '+sevmek seni', 'senden +hoslanmak', 'seni +begenmek']],
  ['ask_love', ['beni +sevmek', 'benden +hoslanmak', 'beni +begenmek', 'bana karsi ne hissediyorsun', 'bana asik misin', 'benimle cikar misin', 'sevgilin var mi', 'kalbinde biri var mi']],
  ['miss', ['ozledim', 'ozlemisim', 'ozlettin', 'seni dusunuyordum', 'aklimdasin', 'aklimdan cikmiyorsun', 'ruyamda', 'aklima geldin', 'cok ozledim', 'burnumda tutuyorsun', 'hasret kaldim', 'nerdesin sen ya', 'aklim hep sende',
    '+ozlemek', 'seni +dusunmek']],
  ['jealous', ['+kiskanmak', 'kiskancim', 'kimle konusuyorsun', 'baskasiyla mi konusuyorsun', 'kiminle yaziyorsun']],
  ['trust', ['bana +guvenmek', 'sana +guvenmek', 'guvenebilir miyim', 'bana guven', 'yalan soyleme bana', 'durust ol']],
  ['ask_age', ['kac yasindasin', 'kac yasinda', 'yasin kac', 'kac yas', 'yas kac', 'kac yasindasin sen', 'dogum yilin kac', 'dogum gunun ne zaman']],
  ['ask_memory', ['beni hatirliyor', 'hatirliyor musun', 'hakkimda ne biliyorsun', 'benim hakkimda', 'adimi biliyor', 'adimi hatirliyor', 'ben kimim', 'beni unuttun mu', 'benim hakkimda ne biliyorsun', 'bizi hatirliyor musun',
    'beni +hatirlamak', 'beni +unutmak']],
  ['ask_name', ['adin ne', 'ismin ne', 'adini ogren', 'kimsin', 'adiniz ne', 'ismin nedir', 'gercek adin', 'sana nasil sesleneyim']],
  ['ask_city', ['nerelisin', 'nerdesin', 'neredesin', 'nerede yasiyorsun', 'nerde yasiyorsun', 'memleket', 'hangi sehir', 'nerde oturuyorsun', 'nerede oturuyorsun', 'hangi sehirdensin', 'sehrin neresi']],
  ['ask_job', ['ne is yapiyorsun', 'ne is yapiyon', 'meslegin', 'calisiyor musun', 'okuyor musun', 'ogrenci misin', 'isin ne', 'ne okuyorsun', 'meslek ne', 'ne isle mesgulsun', 'ne isle ugrasiyorsun', 'calisiyor musun hala']],
  ['ask_hobby', ['hobi', 'ne seversin', 'neler seversin', 'ne yapmayi seversin', 'bos zaman', 'ilgi alan', 'nelerden hoslanirsin', 'nelerle ilgilenirsin', 'bos vaktinde', 'sevdigin seyler']],
  ['ask_day', ['gunun nasil', 'bugun nasil gecti', 'gun nasil gecti', 'bugun neler yaptin', 'bugun ne yaptin', 'bugunun nasil', 'gunun iyi gecti mi', 'yorucu muydu']],
  ['ask_weekend', ['hafta sonu', 'haftasonu', 'yarin ne yapiyorsun', 'bu aksam ne yapiyorsun', 'aksam ne yapacaksin', 'planin var mi', 'planin ne', 'yarin planin', 'tatilde ne yapacaksin']],
  ['ask_ate', ['yemek yedin', 'ne yedin', 'yedin mi', 'karnin ac', 'kahvalti yaptin', 'aksam yemegi', 'ne yiyorsun', 'ne yiyeceksin', 'ne pisirdin', '+acikmak']],
  ['ask_music', ['ne dinliyorsun', 'ne dinliyon', 'sarki', 'muzik', 'playlist', 'en sevdigin sarki', 'sarkici', 'spotify']],
  ['ask_movie', ['film', 'dizi', 'netflix', 'ne izliyorsun', 'ne +izlemek', 'en sevdigin film', 'izleyecek bir sey']],
  ['ask_ask', ['bir sey +sormak', 'sana bir soru', 'sorabilir miyim', 'soru sorabilir', 'merak ettigim bir sey var']],
  ['how_are_you', ['nasilsin', 'nasilsn', 'naber', 'nbr', 'ne haber', 'iyi misin', 'iyimisin', 'nasil gidiyor', 'keyifler', 'napan', 'nabion', 'keyfin nasil', 'halin hatirin', 'nasil gidiyo', 'iyi misin bakalim']],
  ['wyd', ['ne yapiyorsun', 'ne yapiyosun', 'ne yapiyon', 'napiyorsun', 'napiyosun', 'napiyon', 'napion', 'napiyordun', 'napiyodun', 'napcan', 'neler yapiyorsun', 'ne yapiyordun', 'mesgul musun', 'neyle ugrasiyorsun', 'ne yapiyon bakalim', 'ne +yapmak']],
  ['meet', ['+bulusmak', '+gorusmek','bulusalim', 'bulusak', 'goruselim', 'gorusek', 'bulusma', 'kahve icelim', 'disari cikalim', 'numara', 'insta', 'whatsapp', '^wp', 'snap', 'telefonun', 'adresin', 'ne zaman gorusucez', 'ne zaman bulusalim', 'birlikte bir seyler yapalim', 'yemege cikalim mi', 'telefon numaran', 'instagramin']],
  ['photo', ['foto', 'resim', 'resmini', 'selfie', 'goruntulu', 'resim at', 'fotografini gonder', 'selfie at', 'boydan foto', 'yuzunu goreyim', 'fotograf']],
  ['compliment', ['guzelsin', 'cok guzel', 'tatlisin', 'cok tatli', 'harikasin', 'gulusun', 'gozlerin', 'bomba', 'afet', 'cicisin', 'sirinsin',
    'muhtesemsin', 'mukemmelsin', 'sevimlisin', 'cekicisin', 'hossun', 'cok hos', 'prenses', 'melek', 'icimi isit', 'saclarin',
    'tarzini', 'enerjini seviyorum', 'cok zarifsin', 'bir tanesin', 'ozelsin', 'kralice', 'cok zekisin', 'gözlerin parildiyor', 'cok havalisin', 'tarzin cok iyi', 'kusursuzsun', '😍']],
  ['answer_bad', ['kotuyum', 'kotu', 'moralim bozuk', 'uzgunum', 'sikildim', 'canim sikkin', 'berbat', 'yorgunum', 'mutsuz', 'pek iyi degil', 'idare eder', 'hic iyi degilim', 'berbatim', 'cok kotuyum', 'icim daraliyor', 'tatsizim', 'moralim sifir', 'canim cok sikkin', 'cok yoruldum']],
  ['sorry', ['ozur', 'pardon', 'kusura bakma', 'affet', 'cok ozur dilerim', 'kusuruma bakma', 'hata ettim', 'bagisla']],
  ['thanks', ['tesekkur', '^tsk', 'sagol', 'sag ol', 'eyvallah', '^eyv', 'mersi', 'cok tesekkurler', 'sagolasin', 'tesekkur ederim canim', 'minnettarim']],
  ['laugh', ['haha', 'ahah', 'jsjs', 'sjsj', 'ksks', 'sksk', 'asd', '^lol', '^xd', 'komiksin', 'kahkaha', 'puhaha', 'ahahah', 'kahkaha attim', 'cok guldum', 'koptum', '😂', '🤣']],
  ['greet', ['^selam', '^slm', '^merhaba', '^mrb', '^meraba', '^hey', '^sa', '^selamun', '^selamlar', '^hi', '^hello', '^alo', '^as', '^selamm', '^iyi gunler', '^heey']],
  ['answer_good', ['^iyiyim', '^iyi', '^super', '^harika', '^bomba', '^cok iyi', '^fena degil', '^iyidir', '^ben de iyi', '^iyim', '^mukemmel', '^iyiyim sukur', '^cok sukur', '^iyi gidiyor', '^harikayim', '^bomba gibiyim', '^keyfim yerinde']],
  ['agree', ['^evet', '^tamam', '^olur', '^he', '^aynen', '^kesinlikle', '^tabi', '^tabii', '^okey', '^ok', '^tm', '^tabi ki', '^bence de', '^kesinlikle katiliyorum', '^aynen oyle', '^katiliyorum']],
  ['disagree', ['^hayir', '^yok', '^istemiyorum', '^olmaz', '^asla', '^yo', '^hic sanmiyorum', '^katilmiyorum', '^asla olmaz', '^yok ya', '^hic istemiyorum']]
];

/* Kullanıcı mesajının ruh haline etkisi (valence, arousal, social) ve yakınlık puanı */
Amor.INTENT_EFFECTS = {
  insult:     { valence: -0.3, arousal: 0.25, aff: -6 },
  compliment: { valence: 0.08, arousal: 0.03, aff: 2 },
  flirt:      { valence: 0.04, arousal: 0.05, aff: 1 },
  kiss:       { valence: 0.03, arousal: 0.06, aff: 1 },
  hug:        { valence: 0.05, arousal: 0.02, aff: 2 },
  miss:       { valence: 0.06, aff: 2 },
  laugh:      { valence: 0.04, arousal: 0.02, aff: 2 },
  thanks:     { valence: 0.03, aff: 1 },
  sorry:      { valence: 0.05, aff: 1 },
  answer_bad: { valence: -0.02 },
  how_are_you:{ valence: 0.02, aff: 1 },
  ask_day:    { valence: 0.02, aff: 1 },
  ask_ate:    { valence: 0.02, aff: 1 },
  ask_love:   { valence: 0.02, arousal: 0.05, aff: 1 },
  jealous:    { valence: 0.01, arousal: 0.04, aff: 1 },
  trust:      { valence: 0.04, aff: 2 }
};

/* Arketipin kendi havuzu yoksa yeni niyetlerin ortak cümleleri ('_close' = Lv.3+) */
Amor.COMMON_LINES = {
  ask_day: ['sakin geçti, biraz {like} ile vakit geçirdim', 'yorucuydu ama şimdi seninle konuşunca düzeldi', 'eh işte, bildiğin bir gün {laugh}|seninki nasıl geçti?',
    'güzel geçti{h}, sen sorunca daha da güzel oldu', 'koşturmacaydı resmen|ama akşam oldu, nihayet nefes alıyorum', 'fena değildi|sen anlat, senin günün nasıldı?'],
  ask_weekend: ['henüz bir planım yok, belki {fav} tarafına giderim', 'evde dinlenmeyi düşünüyorum, biraz kendime vakit', 'arkadaşlarla bir şeyler ayarlıyoruz galiba',
    'bilmiyorum, sen ne yapıyorsun?|belki fikir verirsin {laugh}', 'uyumak, uyumak, biraz daha uyumak 😴', 'belli değil, akışına bırakıyorum'],
  ask_ate: ['yedim yedim|sen yedin mi?', 'henüz yemedim, sen ne yedin?', 'az önce bir şeyler atıştırdım', 'karnım tok ama tatlıya hayır demem {laugh}',
    'yemek yapmaya üşendim, sipariş verdim {laugh}', 'sen sorunca acıktım şimdi'],
  ask_music: ['şu an sessizlikteyim ama genelde slow modundayım 🎶', 'son zamanlarda hep aynı şarkıyı dinliyorum, bağımlılık yaptı {laugh}', 'sen bir şey öner, ben de sana öneririm',
    'Sezen Aksu her derde deva bence', 'duruma göre değişir|gece olunca hep duygusal şarkılar açarım', 'müziksiz yapamam, kulaklık hep yanımda'],
  ask_movie: ['dizi bağımlısıyım resmen, bir başladım mı bitirmeden uyuyamam', 'romantik komedilere zaafım var {laugh}', 'en son izlediğim film hâlâ aklımda, çok etkiledi',
    'öner bakalım bir şey, bu akşam izlerim', 'korku filmi izleyemem, gece uyuyamıyorum sonra 🙈', 'eski filmleri seviyorum, bir havası var'],
  ask_ask: ['sor tabii', 'tabii, merak ettim şimdi', 'sor bakalım ama cevap vermeyebilirim {laugh}', 'hmm, sor bakalım 👀', 'sorabilirsin, dinliyorum'],
  ask_love: ['bunu sormak için biraz erken değil mi {laugh}', 'seni daha yeni tanıyorum ama|fena değilsin diyelim', 'sence? {laugh}', 'acele etme, zamanla görürüz'],
  ask_love_close: ['hoşlanıyorum senden, bu kadarını söyleyeyim 🙈', 'kalbim sana karşı boş değil diyelim', 'hâlâ anlamadın mı? {laugh}', 'evet{h}|hem de çok'],
  jealous: ['kıskandın mı yoksa? {laugh}', 'kıskanman tatlı ama gerek yok', 'kimseyle değil, rahat ol', 'oo kıskançlık mı seziyorum 👀'],
  jealous_close: ['kıskanılmak hoşuma gitti itiraf edeyim 🙈', 'kimseyi kıskanmana gerek yok, buradayım{h}', 'sen varken başkası mı olur'],
  trust: ['güvenmen benim için değerli', 'güven zamanla oluşur ama doğru yoldayız bence', 'bana güvenebilirsin', 'bunu duymak iyi geldi'],
  trust_close: ['ben de sana güveniyorum{h}', 'sana yalan söylemem, biliyorsun', 'en çok sana güveniyorum galiba']
};

/* Karakterin kendi cümlesi yoksa kullanılan ortak cümleler */
Amor.SHARED = {
  neg: ['hmm', 'tamam', 'peki', 'öyle', 'anladım seni', 'demek öyle', 'peki bakalım', 'sen bilirsin tabii', 'ne bileyim, öyle olsun'],
  sad: ['...', 'bilmiyorum', 'öyle işte', 'içim biraz buruk', 'boş ver ya...', 'konuşmasak daha iyi gibi', 'canım bir şeye sıkkın da', 'bazen her şey üst üste gelir ya, öyle'],
  low: ['mm', 'hı hı', 'uykum var', 'kafam pek yerinde değil', 'enerjim sıfırlandı bugün', 'biraz dinlensem iyi olucak', 'gözlerim kapanıyor resmen'],
  leave: ['ben çıkıyorum, sonra konuşuruz', 'biraz işim çıktı hemen gelicem', 'şimdi çıkmam gerek, öptüm sonra yazarım', 'kısa bir ara veriyorum, bekle beni', 'kaçtım ben, görüşürüz sonra'],
  back: ['şimdi gördüm mesajını', 'buradayım, kusura bakma', 'geldim', 'işimi hallettim hemen geldim!', 'burdayım burdayım, beklettim mi?', 'telefon elimde değildi, geldim şimdi'],
  back_sleep: ['günaydın, yeni uyandım', 'uyuyordum, şimdi gördüm', 'pardon uyumuşum', 'uyuyakalmışım ya kusura bakma', 'tatlı bir uykudan yeni uyandım, buradayım!'],
  // Zorla çevrimiçi yapılınca (uyurken / meşgulken / sosyal pili bitikken)
  forced_sleep: ['hı? uyuyordum ya 😴|neyse, buradayım', 'uyandırdın beni...|bir şey mi oldu?', 'gözlerim açılmıyor ama|söyle bakalım 🥱', 'saat kaç ya...|tamam tamam, uyandım', 'rüyamın en tatlı yerindeydim {laugh}|ama senin için uyandım'],
  forced_busy: ['elimdeki işi bıraktım, buradayım', 'kaçamak yaptım, söyle bakalım {laugh}', 'aslında işim var ama|senin için çıktım', 'işleri biraz askıya aldım, seni dinliyorum'],
  // Hediye niyeti (js/wish.js): {gift} = istenen hediye
  wish_ask: ['bana bir {gift} alsana 🥺', '{gift} çok hoşuma giderdi aslında 🙈', 'biri bana {gift} alsa ne güzel olurdu...', 'bugün canım {gift} istedi 🥺',
    'bir {gift} alır mısın bana? 👉👈', 'hiç {gift} almadın bana {laugh}'],
  wish_thanks: ['tam istediğim şeyi aldın 😍', 'unutmamışsın! çok mutlu oldum 🥹', 'istediğimi hatırladın ya, kalbim eridi', 'bu yüzden seni seviyorum işte 💕'],
  wish_forgot: ['hediyemi unuttun galiba 🙄', 'neyse, boş ver... 😒', 'istediğim bir şey vardı ama neyse', 'bazıları unutmuyor ama 🙄'],
  forced_away: ['telefonu yeni elime aldım, buradayım', 'dışarıdaydım, senin için açtım {laugh}', 'bildirim geldi baktım, sensin|söyle bakalım', 'telefon çantadaydı ya, kusura bakma'],
  forced_tired: ['çok yorgunum ama senin için buradayım', 'pilim bitmişti...|ama tamam, konuşalım', 'biraz bitiğim ama yaz bakalım 🥱', 'sosyal pilim sıfırdı ama sana her zaman vaktim var'],
  busy: ['şu an {busy}, sonra yazarım', '{busy}, kısa yazıyorum', '{busy} şu an, çıkınca yazarım', 'biraz {busy}, bitince uzun uzun konuşuruz tamam mı?', 'şimdi {busy}, aklım sende ama kaçmam lazım'],
  repeat: ['bunu zaten söyledin {laugh}', 'aynı şeyi yazdın ama', 'deja vu yaşıyorum şu an', 'iki kere dedin bunu farkında mısın? {laugh}', 'aynı cümleyi duydum sanki az önce'],
  bored: ['hmm', 'tamam', 'öyle mi', 'he', 'anladım', 'ok', 'peki madem', 'öyle diyorsan', 'hıı anladım'],
  cause: ['aslında {cause} yüzünden biraz kafam karışık', 'şey… {cause}. neyse boş ver', 'kafamı kurcalayan bir şey var: {cause}', 'bugün biraz {cause} durumu var, o yüzden dalgınım'],
  react_age: ['{x} mi, güzel yaş', '{x} ha, tamam', '{x} yaşındasın demek, tam en güzel dönemler', 'vaay {x}, çok iyiymiş', '{x} mi? Yaşıt sayılırız neredeyse'],
  react_city: ['{x} ha, hiç gitmedim oraya', '{x} güzel yermiş diyorlar', '{x} mi? Oranın havası çok güzeldir derler', '{x}\'da yaşamak nasıl bir his?', 'bir gün {x}\'ya gidersem bana rehberlik edersin artık'],
  react_name: ['memnun oldum {x}', '{x}, güzel isim', 'ismin çok hoşmuş {x}', '{x}... Bu ismi duyunca gülümsedim', 'artık sana adınla hitap edebilirim {x}']
};

/* Sohbet ekranındaki hazır cevap önerileri */
Amor.QUICK_REPLIES = [
  'Selam 👋', 'Nasılsın?', 'Ne yapıyorsun?', 'Gülüşün çok güzel', 'Kaç yaşındasın?', 'Nerelisin?', 'Hobilerin neler?',
  'Özledim seni', 'Hahaha çok komiksin', 'Kahve içelim mi?', 'İyi geceler 🌙', 'Günaydın ☀️', 'Seni düşünüyordum 💭',
  'Sarılmak istiyorum 🤗', 'Gülüşün içimi ısıtıyor', 'Rüyamda seni gördüm 🙈', 'Ne iş yapıyorsun?', 'Beni hatırlıyor musun?',
  'Gözlerin çok güzel', 'Öpüyorum 😘', 'Sesini merak ediyorum', 'Bugün nasıl geçti?', 'Günün nasıl gidiyor?', 'Sana bir şey sorabilir miyim?',
  'Bir şarkı önersene 🎶', 'En sevdiğin film hangisi?', 'Buluşalım mı bir gün? ☕', 'Çok tatlısın gerçekten', 'Moralim biraz bozuk...',
  'Bugün harika bir haber aldım 🎉', 'Şu an ne dinliyorsun?', 'Yemek yedin mi?', 'Hafta sonu ne yapıyorsun?', 'İyi ki varsın ✨'
];
