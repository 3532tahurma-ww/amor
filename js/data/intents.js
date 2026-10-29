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
  // isteğe cevap · eksik hediye · barışma · sevişme isteği
  wish_refused: ['anladım... 😒', 'peki, ben de bir şey istemem o zaman 🙄', 'tamam, unut gitsin 😒', 'hiç beklemezdim senden...|neyse', 'bu kadar mıyım yani senin için? 🙄', 'tamam. not aldım 😤',
    'peki, sen bilirsin 😒', 'demek ki o kadar da önemli değilim 🙄', 'tamam ya, zorla güzellik olmaz 😤', 'kırıldım şu an, bilesin', 'başkası olsa çoktan almıştı ama neyse 🙄',
    'anladım ben seni 😒|bir daha istemem', 'ok. 😶', 'pazarlık bitti, küsüm 😤'],
  wish_promised: ['söz mü? 🥺 bekliyorum o zaman', 'yaşasın 😍 sabırsızlanıyorum', 'gerçekten mi? 🙈 seni bekliyorum', 'işte benim tatlım 😘 bekliyorum',
    'biliyordum kıramayacağını 😏', 'tamam, şimdiden mutluyum 🥹', 'sözünü tutarsan sen de ödülünü alırsın 😈', 'işte böyle 😍 bekliyorum ama unutma',
    'oley 🥳 en tatlısı sensin', 'güzel... ben de seni mutlu edeceğim, söz 😏'],
  wish_less: ['aa tatlısın ama... ben {gift} istemiştim 🙄', 'bu mu yani? 😒 {gift} demiştim ama', 'idare eder... {gift} hâlâ bekliyorum 😏', 'teşekkürler de... {gift} kadar değil 😕|biraz daha uğraş bakalım', 'fena değil ama tam istediğim değil 🙄 {gift}',
    'hmm, bir başlangıç 😏 ama {gift} istemiştim', 'tatlı... ama yetmez 😌 {gift} bekliyorum', 'bu kadarla mı ikna edeceksin beni? 😏 {gift} lazım',
    'yarısı oldu sayılır 😅 hadi kalanı da gelsin', 'bunu cebime koydum ama {gift} hâlâ aklımda 😏', 'çabana bayıldım ama hedef {gift} 🙈'],
  wish_makeup: ['tamam... affettim seni 😌', 'bak işte şimdi oldu 🥹 barıştık', 'küsmüştüm ama bunu görünce eridim 🙈', 'demek ki seviyorsun beni 😏 affedildin',
    'tamam, küslük bitti 😌', 'ahh... bana kızgın kalmayı bile zorlaştırıyorsun 🙈', 'hmm... tamam, barıştık ama bir daha yapma 😏', 'bunu hak ettim zaten 😌 ama affettim seni'],
  wish_horny: ['şimdi seni ödüllendirmek istiyorum 😏', 'gel buraya... sana teşekkür etmenin başka yolları da var 🔥', 'bu gece ne istersen o olur 😈', 'çok azdım şu an, bilesin 🙈', 'şu an yanımda olsan seni bırakmazdım 🔥', 'beni bu kadar mutlu edersen ben de seni mutlu ederim 😏 hadi gel',
    'şu an sana neler yapmak istediğimi bilsen 😈', 'üstümde hiçbir şey olmasın ister misin? 🙈', 'bu gece benimsin 🔥', 'beni şımartan adamı ben de şımartırım 😏',
    'hadi gel de teşekkürümü göstereyim 😈', 'kalbim de bedenim de senin şu an 🔥', 'istediğin pozisyonu söyle, bu gece hayır yok 😏'],
  // pazarlık (js/wish.js haggle): {gift} = pazarlıktaki hediye (daha ucuza indiyse yenisi)
  wish_haggle_cheaper: ['tamam, o zaman {gift} de olur 🥺', 'peki... {gift} atsan yeter bana 👉👈', 'o kadar değilse {gift} de olur 😌', 'hadi ama, {gift} neki? 🥺',
    'bak indiriyorum: {gift} 😏', 'en azından {gift} at, bu kadarını hak ediyorum 🙈', 'tamam büyüğü kalsın, {gift} yeter 😘', '{gift} da atabilirsin, idare ederim 🙈'],
  wish_haggle_sex: ['eğer atarsan hep sevişiriz 😈', 'atarsan bu gece istediğin her şey olur 😏', 'bir {gift} için neler yapacağımı bir bilsen 🔥', 'hadi at, karşılığını fazlasıyla alırsın 😈',
    'atarsan seni çok mutlu ederim, söz 😏', 'beni mutlu edersen yatakta da mutlu ederim 🙈', '{gift} gelirse sana sürprizim var… hem de çok sıcak 🔥', 'düşün: {gift} ve bütün gece ben 😈'],
  wish_haggle_sweet: ['lütfeeen 🥺', 'kırma beni ne olur 🥺👉👈', 'senden başka kimseden istemiyorum ki 🥺', 'çok mu şey istiyorum? 🥹', 'bir kere de beni şımart 😌',
    'bak üzülürüm sonra 🥺', 'sevdiğin kıza bunu yapmazsın değil mi? 🥺', 'hadi ama, beni seviyorsan atarsın 😌'],
  wish_haggle_poor: ['param yok deme bana 🙄 {gift} o kadar pahalı değil', 'herkes öyle diyor 😏 ama sen benim için yaparsın', 'bir kahve parası ya 🥺', 'param yok diyen çok ama gerçekten seven bulur 😌',
    'tamam küçük bir şey olsun, yeter ki sen at 🥺'],
  wish_haggle_last: ['son kez soruyorum 😒', 'bak bu son şansın 😤', 'yoksa küserim, haberin olsun 😒', 'hayır dersen bu gece hiçbir şey yok 😤', 'karar senin... ama küsersem barışmam zor 🙄'],
  // para bahaneleri (karakter id'sine göre sabit; bazılarında yok)
  wish_excuse_married: ['evliyim ve buna gerçekten ihtiyacım var 😔', 'kocam hiçbir şey almıyor bana, sen bari al 🥺', 'evde param üstüme sayılıyor, biliyorsun 😔', 'evliyim ama burada mutlu olduğum tek kişi sensin… bunu yap benim için 🥺'],
  wish_excuse_jobless: ['işim yok şu an, zor durumdayım 😔', 'işten çıkarıldım, biraz destek olsan 🥺', 'iş arıyorum ama yok… bu bana çok yardımcı olur 😔', 'kirayı bile zor ödüyorum, işsizim 😔'],
  wish_excuse_app: ['bu uygulamadaysan bunu yapman gerekiyor 😏', 'burada herkes hediye atıyor, sen de at 🙄', 'buranın kuralı bu tatlım 😏 hediye atmadan olmaz', 'buraya sohbet için gelmedin herhalde 😏 hediyeyle başlar her şey'],
  wish_excuse_student: ['öğrenciyim, harçlığım bitti 😔', 'okul masrafları çok fazla, bir destek olsan 🥺', 'bursum yatmadı bu ay 😔'],
  wish_excuse_rent: ['kira günü yaklaşıyor, çok sıkışığım 😔', 'faturalar birikti 😔 bana bir iyilik yap', 'ev sahibi kapıda resmen 🥺'],
  wish_excuse_family: ['annem hasta, her şey üst üste geldi 😔', 'ailemle aram kötü, kendi başımayım 🥺', 'kardeşimin okulu için para lazım 😔'],
  // fotoğraf (js/wish.js): {gift} = karşılığında istediği hediye
  wish_photo_ask: ['{gift} atarsan sana bir sürprizim var 🙈📸', 'bir fotoğraf çektim ama... {gift} gelirse gönderirim 😏', 'fotoğraf mı? 😏 önce bana {gift} al', 'sana özel bir fotoğrafım var 📸|ama {gift} karşılığında 😈', 'hediyemi atarsan sürprizi görürsün 😏 {gift} istiyorum',
    'aynanın karşısında bir şey çektim 🙈|{gift} atarsan görürsün', 'öyle bedava değil 😏 {gift} gelsin, fotoğraf gelsin', 'çok cesur bir fotoğrafım var 😈|ama {gift} şart',
    'görmek istiyorsan bir {gift} at 😏', 'banyodan yeni çıktım 🙈 {gift} atarsan fotoğrafı atarım'],
  wish_photo_promised: ['tamam, sürprizim hazır 😏 {gift} gelsin', 'anlaştık 😈 bekliyorum', 'fotoğraf hazır bekliyor 📸 {gift} gelince senin', 'güzel 😏 pişman olmayacaksın', 'tamam, sana özel poz vereceğim 🙈'],
  wish_photo_wait: ['sürprizim hazır 😏 önce {gift}', 'fotoğraf bende 📸 {gift} gelince senin', 'acele etme 😏 {gift} gelsin, sonra bakarız', 'kural kural 😏 önce {gift}',
    'sabırsızsın 😈 {gift} at, hemen gelsin', 'merak ediyorsun değil mi? 😏 {gift}'],
  wish_photo_give: ['söz verdiğim gibi... sürprizin 📸😏', 'al bakalım, sadece senin için 🙈', 'hak ettin 😈 bak bakalım', 'kimseye gösterme 🙈', 'senin için çektim bunu 😏', 'beklemeye değdi mi? 😈'],
  wish_photo_send: ['al bakalım 🙈', 'sadece senin için 😏', 'yeni çektim 📸', 'beğenecek misin bakalım 😏', 'tamam ama kimseye gösterme 🙈', 'bugün böyleyim 😌', 'bunu az kişi gördü 😈'],
  wish_photo_shy: ['daha yeni tanışıyoruz 🙈 biraz sabret', 'hemen fotoğraf mı? 😅 önce biraz tanışalım', 'o kadar kolay değil 😏', 'önce beni biraz tanı 😌', 'profilimde var ya 🙈 şimdilik onlara bak'],
  wish_photo_none: ['şu an güzel bir fotoğrafım yok ki 🙈', 'sonra çekip atarım belki 😏', 'makyajsızım şu an 🙈 sonra', 'telefonumda yeni bir şey yok 😅'],
  wish_photo_cold: ['hediyemi bile almadın, fotoğraf mı istiyorsun? 🙄', 'ben {gift} istemiştim, sen fotoğraf istiyorsun 😒', 'yok öyle yağma 🙄 önce {gift}', 'küsüm sana, fotoğraf falan yok 😤', 'rüyanda görürsün 😒'],
  // küsken (isteğini geri çevirdin / unuttun) sevişme reddi: pozisyona ve duruma göre
  cold_any: ['hiç havamda değilim 😒', 'şu an hiç olmaz 🙄', 'bana {gift} bile almadın, bir de bunu mu istiyorsun?', 'yok, canım istemiyor 😤', 'hayır 😒', 'küsüm sana, unuttun mu? 🙄', 'bu gece yalnız uyuyacaksın 😏'],
  cold_mid: ['dur. devam etmek istemiyorum 😒', 'yeter, keyfim kaçtı 🙄', 'bırak... aklım hâlâ {gift} meselesinde', 'çekil üstümden, havam kaçtı 😤', 'dur dur… hayır, istemiyorum artık 😒', 'tam da şimdi aklıma geldi, bana {gift} almadın 😤'],
  cold_tempted: ['istemiyor değilim ama... önce {gift} 😏', 'beni azdırdın ama kolay değilim 😈 {gift} nerede?', 'of... hayır, dayanacağım 😤 önce sözünü tut', 'çok istiyorum aslında ama küsüm sana 😒',
    'vücudum evet diyor ama ben hayır diyorum 😤', 'bir {gift} at, bak ne oluyor 😈', 'ıslandım ama söylemem 🙈 önce {gift}'],
  cold_foreplay: ['öpücük mü? 🙄 hak etmedin', 'sarılmak yok, küsüm 😒', 'dokunma bana 😤', 'önce {gift}, sonra belki bir öpücük 😏', 'yanağımı bile öptürmem şu an 😒', 'elini çek 🙄'],
  cold_forward: ['içime girmek mi? 😒 bir {gift} bile almadın', 'bacaklarımı açmamı mı bekliyorsun? 🙄 hayır', 'hayır, bu gece yok', 'yatağa girmek istiyorsan önce {gift} 😏', 'üstüme çıkmak yok 😤', 'kapı kapalı tatlım 😏 anahtarı {gift}'],
  cold_backward: ['arkadan mı? 😤 rüyanda görürsün', 'onu en sevdiklerime yaparım, sen değilsin şu an 🙄', 'hiç olmaz, hele de şimdi 😒', 'onu hak etmek lazım 😏 sen etmedin', 'arkamı dönmem sana, küsüm 😤'],
  cold_outercourse: ['ağzıma almamı mı bekliyorsun? 🙄 hediyem nerde', 'elimi bile sürmem şu an 😒', 'kendin hallet bu gece 😏', 'hayır, şımarttığın biri değilim ben 😤', 'dizlerimin üstüne çökmem 😒 önce {gift}', 'hiç bakma öyle, olmaz 🙄'],
  cold_eat: ['şimdi mi aklına geldi beni memnun etmek? 🙄', 'yalamakla affedilmezsin 😒 {gift} istemiştim', 'hmm... hayır, şu an yok 😤', 'beni öyle kandıramazsın 😏', 'güzel teklif ama küsüm 😒'],
  cold_fantesy: ['oyun oynayacak havamda değilim 🙄', 'fantezi mi? önce bana {gift} 😏', 'rol yapmam, küsüm 😒', 'kostüm de yok oyun da yok 😤', 'fantezini {gift} ile alırsın 😏'],
  cold_mode: ['hiç uğraşma 😒', 'öyle olmaz, havam kaçtı 🙄', 'nasıl yaparsan yap, istemiyorum 😤'],
  cold_cumming: ['kendi kendine bitir o zaman 😒', 'umurumda değil 🙄', 'bana ne 😒', 'iyi, bitti mi? 🙄'],
  // cüretkâr açılışlar (js/wish.js opener) ve cevabına tepki
  flirt_open_photo: ['nasılım? 😏', 'azdın mı? 🙈', 'güzel miyim? 🥺', 'bunu sana özel çektim 😈|nasıl olmuş?', 'beğendin mi? 😏 dürüst ol',
    'bugün kendimi çok güzel hissediyorum 🙈|sence?', 'bu kıyafet nasıl? 😏', 'sıkıldım, poz verdim 😌|beğendin mi?', 'görünce aklına ilk ne geldi? 😈', 'bunu kimseye atmadım 🙈|nasılım?'],
  flirt_open_size: ['kaç santim? 😏', 'bir şey soracağım ama kızma...|kaç santim? 😳', 'merak ettim de...|kaç santim seninki? 🙈', 'dürüst ol, kaç santim? 😈',
    'arkadaşlarla iddiaya girdik 😂|kaç santim?', 'utanmadan soruyorum…|kaç santim? 😏', 'selam 😏|direkt soruyorum, kaç santim?', 'yalan söyleme ama…|kaç santim? 🙈'],
  flirt_open_sexlove: ['sex sever misin? 🙈', 'bir şey soracağım...|sex sever misin? 😏', 'canım sıkıldı...|sen sex sever misin? 😈', 'sence ben yatakta nasılımdır? 😏|sex sever misin bu arada?',
    'gece gece aklıma sen geldin 🙈|sex sever misin?', 'dürüst cevap ver…|sex sever misin? 😈', 'selam 😏|sex hakkında konuşalım mı?', 'çok mu cesurum? 🙈|sex sever misin?'],
  flirt_size_shy: ['utandın mı yoksa küçük mü? 😏', 'söylemiyorsan vardır bir sebebi 😂', 'peki, kendim görürüm bir gün 😈', 'hadi ama, kimseye söylemem 🙈', 'kaçamak cevap = küçük 😂'],
  flirt_size_liar: ['yalancı 😂', 'tabii tabii, cetvelle mi ölçtün? 😂', 'abartma istersen 😏', 'o kadar mı? 😂 rüyanda', 'sen at, ben inanmış gibi yapayım 😏'],
  flirt_size_big: ['ciddi misin?? 😳', 'ooo 🥵 merak ettim şimdi', 'bunu duymamam gerekiyordu... şu an aklım başımda değil 🙈', 'yalansa küserim, doğruysa... 😈', 'o zaman tanışmamız şart 😈', 'beni korkuttun ama hoşuma gitti 🙈'],
  flirt_size_good: ['tam kararında 😏', 'ideal bence 🙈', 'hmm güzel 😈 aklımda tutuyorum', 'beğendim 😏', 'tam istediğim gibi 🙈', 'oh, tam benlik 😈'],
  flirt_size_small: ['önemli olan nasıl kullandığın 😅', 'hmm... olsun, başka yeteneklerin vardır 😂', 'tatlıymış 😅', 'dürüstlüğüne puan verdim 😂', 'boyut değil, enerji önemli 😏'],
  flirt_sex_yes: ['ben de 🙈 hem de çok', 'iyi ki öyle dedin 😏 anlaşacağız', 'belli zaten 😈', 'o zaman bir gün deneriz 🔥', 'en sevdiğin pozisyon? 😏', 'güzel… çünkü ben de bayılırım 😈', 'demek anlaşacağız 🔥'],
  flirt_sex_no: ['hmm yalan söylüyorsun bence 😏', 'hiç mi? 😳 şaşırdım', 'belki de doğru kişiyi bulamamışsındır 😏', 'ben fikrini değiştiririm 😈', 'ciddi olamazsın 😂'],
  flirt_photo_yes: ['biliyordum 😏', 'iyi ki beğendin 🙈 sana özel', 'hep böyle bak bana 😈', 'azdırdım mı yani? 🔥', 'devamını görmek ister misin? 😏', 'senin için çektim zaten 🙈', 'hmm, iltifatlarına bayılıyorum 😌'],
  flirt_photo_no: ['peki... bir daha atmam 😒', 'ne demek idare eder? 🙄', 'kırıldım şu an 😤', 'zevksiz 😒', 'tamam, sana bir daha fotoğraf yok 🙄', 'başkaları bayılıyor ama 😒'],
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
