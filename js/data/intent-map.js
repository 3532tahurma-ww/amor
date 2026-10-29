/*
 * Amor - Niyet eşlemesi (js/intent.js kullanır): yazılan metinden Carmen'deki olaya.
 * Carmen'de olaylar butonla eklenir; Amor'da kullanıcı yazarak niyetini belli eder.
 *
 * catalog: Carmen olay kataloğu (Carmen/js/data/system.js) → başlık: [kategori, [etiketler]]
 *          Bot sorgusu buradan kurulur: "evt <etiketler> <kategori> <başlık>" (Carmen'deki "=evt" kurallarının beklediği biçim)
 * events : [{ titles: [olay başlıkları] (biri seçilir), words: [terimler], scene?: true (sadece sahne sürerken) }]
 *          yukarıdan aşağı ilk tutan kazanır (özel olan üstte).
 *          Terim biçimi bot kuralıyla aynı (js/bot.js): "kahve" geçsin · "yap-" kelime başı · "=sa" tam kelime · "a|b" alternatif.
 * cmd    : Carmen'deki komut kuralları (r_cmd_*) → tetiklenen olaylar (Carmen CMD_EV)
 * fant   : fantezi başlığının başı → sorgudaki "fant" anahtarı (Carmen FANT_KEYS)
 */
window.Amor = window.Amor || {};

Amor.INTENT_MAP = {
  catalog: {
    'Kissing': ['Foreplay', ['ön_sevişme']], 'Lap Kissing': ['Foreplay', []], 'Back Hugging': ['Foreplay', []], 'Front Hugging': ['Foreplay', []],
    'Show Tits': ['Foreplay', []], 'Show Ass': ['Foreplay', []],
    'Missionary': ['Forward', ['penetrasyon', 'vajinal']], 'Cowgirl': ['Forward', ['vajinal']], 'Ondesk': ['Forward', ['vajinal']],
    'Full Nelson': ['Forward', ['vajinal']], 'Doggy': ['Forward', ['vajinal']], 'Spooning': ['Forward', ['vajinal']],
    'Standing': ['Forward', ['vajinal']], 'Lap Sex': ['Forward', ['vajinal']],
    'Cowgirl Anal': ['Backward', ['anal']], 'Standing Anal': ['Backward', ['anal']], 'Rough Anal': ['Backward', ['anal']],
    'Spooning Anal': ['Backward', ['anal']], 'Standing doggy': ['Backward', ['anal']],
    'Footjob': ['Outercourse', ['bacak']], 'Legjob': ['Outercourse', ['bacak']], 'Handjob': ['Outercourse', ['el']], 'Masturbation': ['Outercourse', ['el']],
    'Titfuck': ['Outercourse', ['göğüs']], 'Reverse Titfuck': ['Outercourse', ['göğüs']], 'Buttjob': ['Outercourse', ['kalça']], 'Hotdogging': ['Outercourse', ['kalça']],
    'Blowjob': ['Outercourse', ['oral']], '69': ['Outercourse', ['oral']], 'Oral Sex': ['Outercourse', ['oral']], 'Deepthroat': ['Outercourse', ['oral']],
    'Cunnilingus': ['Eat', []], 'Squirt': ['Eat', []], 'On Mouth': ['Eat', []], 'Facesitting': ['Eat', []],
    'Vaginal Creampie': ['Cumming', ['vajinal', 'boşalma']], 'Anal Creampie': ['Cumming', ['anal', 'boşalma']], 'Ass Cumshot': ['Cumming', ['kalça', 'boşalma']],
    'Tit Cumshot': ['Cumming', ['göğüs', 'boşalma']], 'Oral Creampie': ['Cumming', ['oral', 'boşalma']], 'Face Cumming': ['Cumming', ['oral', 'el', 'boşalma']],
    'Mouth Cumming': ['Cumming', ['oral', 'boşalma']], 'Leg Cumshot': ['Cumming', ['bacak', 'boşalma']], 'Legs Creampie': ['Cumming', ['bacak', 'boşalma']],
    'Holding': ['Cumming', []], 'Hard Holding': ['Cumming', []], 'Cock Ring': ['Cumming', []],
    // Carmen'de genel boşalma olayı yok; yeri belirtilmeyen "boşalıyorum" için ("=boşalma , =cumming" kuralları)
    'Boşalma': ['Cumming', ['boşalma']],
    'Orgazm': ['Lactation', ['orgazm']],
    'Gentle': ['Mode', []], 'Passionate': ['Mode', []], 'Assertive': ['Mode', []], 'Rough': ['Mode', []], 'Brutal': ['Mode', []],
    'inletmeli': ['Mode', []], 'bağırtmalı': ['Mode', []], 'ağlatmalı': ['Mode', []],
    'Belly Bulge': ['Fantesy', []], 'Sex toys 🍆': ['Fantesy', []], 'Bondage': ['Fantesy', []], 'Cheating': ['Fantesy', []],
    'Doggy Girl ( Submission )': ['Fantesy', []], 'Cat Girl': ['Fantesy', []], 'Bunny Girl': ['Fantesy', []], 'Unicorn Girl': ['Fantesy', []],
    'Fox Girl ( Cunning )': ['Fantesy', []], 'Cumflation': ['Fantesy', []],
    'Patron – Sekreter': ['Fantesy', ['roleplay']], 'Hoca – Öğrenci (Üniversite)': ['Fantesy', ['roleplay']], 'Kadın Hoca – Öğrenci (Üniversite)': ['Fantesy', ['roleplay']],
    'Doktor – Hasta': ['Fantesy', ['roleplay']], 'Polis – Şüpheli': ['Fantesy', ['roleplay']], 'Yeni Komşu': ['Fantesy', ['roleplay']],
    'Hizmetçi – Ev Sahibi': ['Fantesy', ['roleplay']], 'Masöz – Müşteri': ['Fantesy', ['roleplay']],
    'Nothing': ['Protection', []], 'Pull-Out Method': ['Protection', []], 'Morning-After Pill': ['Protection', []],
    'Condom': ['Protection', []], 'Tight Condom': ['Protection', []], 'Control Pill': ['Protection', []]
  },

  events: [
    // 🛡️ korunma (boşalmadan önce: "dışarı boşalırım" korunma niyetidir)
    { titles: ['Nothing'], words: ['kondomsuz', 'korunmasız', 'korunmadan'] },
    { titles: ['Condom'], words: ['kondom', 'prezervatif'] },
    { titles: ['Morning-After Pill'], words: ['sabah hap', 'ertesi gün hap', 'acil hap'] },
    { titles: ['Control Pill'], words: ['doğum kontrol', 'hap iç-|hap kullan-'] },
    { titles: ['Pull-Out Method'], words: ['dışarı boşal-', 'son anda çek-', 'dışarıya boşal-'] },
    // 💦 boşalma (yeri belli olan önce)
    { titles: ['Holding', 'Hard Holding'], words: ['zor tut-', 'tutamıyorum', 'tutuyorum kendimi', 'gelmemek için'] },
    { titles: ['Vaginal Creampie'], words: ['içine boşal-', 'içine bırak-', 'içini doldur-', 'amına boşal-'] },
    { titles: ['Anal Creampie'], words: ['götüne boşal-', 'götünün içine boşal-'] },
    { titles: ['Oral Creampie', 'Mouth Cumming'], words: ['ağzına boşal-', 'yut-'] },
    { titles: ['Face Cumming'], words: ['yüzüne boşal-'] },
    { titles: ['Tit Cumshot'], words: ['göğüslerine boşal-', 'memelerine boşal-', 'göğsüne boşal-'] },
    { titles: ['Ass Cumshot'], words: ['kalçana boşal-', 'popona boşal-', 'kalçalarına boşal-'] },
    { titles: ['Leg Cumshot'], words: ['bacaklarına boşal-'] },
    { titles: ['Boşalma'], words: ['boşalıyorum', 'boşaldım', 'boşalıcam|boşalacağım|boşalıcağım'] },
    { titles: ['Orgazm'], words: ['orgazm ol-', 'sen de boşal-', 'boşal hadi|hadi boşal'] },
    { titles: ['Squirt'], words: ['fışkırt-', 'squirt'] },
    // 🦄 fantezi / rol
    { titles: ['Bondage'], words: ['ellerini bağla-', 'seni bağla-', 'kelepçe', 'bondage'] },
    { titles: ['Sex toys 🍆'], words: ['vibratör', 'oyuncak kullan-', 'seks oyuncağ'] },
    { titles: ['Cheating'], words: ['aldat-', 'sevgilin duymasın'] },
    { titles: ['Cat Girl'], words: ['kedi kız', 'miyav'] },
    { titles: ['Bunny Girl'], words: ['tavşan kız'] },
    { titles: ['Fox Girl ( Cunning )'], words: ['tilki kız'] },
    { titles: ['Doggy Girl ( Submission )'], words: ['köpek kız', 'köpeğim ol-'] },
    { titles: ['Unicorn Girl'], words: ['unicorn', 'tek boynuzlu'] },
    { titles: ['Belly Bulge'], words: ['karnında görün-', 'karnından belli'] },
    { titles: ['Patron – Sekreter'], words: ['sekreter-', 'patronun ol-'] },
    { titles: ['Kadın Hoca – Öğrenci (Üniversite)'], words: ['öğrencin ol-'] },
    { titles: ['Hoca – Öğrenci (Üniversite)'], words: ['öğrencim ol-', 'hocan ol-'] },
    { titles: ['Doktor – Hasta'], words: ['doktorculuk', 'doktor ol-', 'seni muayene'] },
    { titles: ['Polis – Şüpheli'], words: ['polisçilik', 'polis ol-', 'seni sorgula-'] },
    { titles: ['Yeni Komşu'], words: ['komşuculuk', 'komşum ol-'] },
    { titles: ['Hizmetçi – Ev Sahibi'], words: ['hizmetçim ol-', 'hizmetçi ol-'] },
    { titles: ['Masöz – Müşteri'], words: ['masaj yap-', 'masözüm ol-'] },
    // 🍑 arka
    { titles: ['Rough Anal'], words: ['götünü parçala-', 'sert anal'] },
    { titles: ['Cowgirl Anal'], words: ['götünle üstüme'] },
    { titles: ['Standing Anal', 'Spooning Anal', 'Cowgirl Anal'], words: ['götüne gir-', 'götünü sik-', 'götünden sik-', '=anal', 'arkandan gir-'] },
    // 👄 dış
    { titles: ['Deepthroat'], words: ['boğazına kadar', 'deepthroat', 'derine al-'] },
    { titles: ['Blowjob'], words: ['=em', '=emsene', 'emer misin', 'sakso', 'ağzına al-', 'yala beni'] },
    { titles: ['69'], words: ['=69'] },
    { titles: ['Facesitting'], words: ['yüzüme otur-'] },
    { titles: ['Cunnilingus'], words: ['amını yala-', 'seni yala-', 'yalayayım', 'yalamak istiyorum'] },
    { titles: ['Reverse Titfuck'], words: ['ters titfuck'] },
    { titles: ['Titfuck'], words: ['göğüslerinin arası', 'memelerinin arası', 'titfuck'] },
    { titles: ['Hotdogging'], words: ['hotdog', 'kalçalarının arası'] },
    { titles: ['Buttjob'], words: ['kalçanla', 'kalçana sürt-', 'popona sürt-'] },
    { titles: ['Footjob'], words: ['ayaklarınla', 'footjob'] },
    { titles: ['Legjob'], words: ['bacaklarınla', 'bacaklarının arası'] },
    { titles: ['Handjob'], words: ['elinle', 'elini al-', 'tut şunu'] },
    { titles: ['Masturbation'], words: ['mastürbasyon', 'kendine dokun-', 'parmakla-'] },
    // 🔥 ön
    { titles: ['Ondesk'], words: ['masaya yat-', 'masanın üst'] },
    { titles: ['Full Nelson'], words: ['full nelson'] },
    { titles: ['Lap Sex'], words: ['kucağımda sik-', 'kucağıma otur-'] },
    { titles: ['Spooning'], words: ['kaşık', 'yan yat-'] },
    { titles: ['Doggy', 'Standing doggy'], words: ['doggy', 'dört ayak', 'arkanı dön-', 'eğil-', 'kalçanı kaldır-'] },
    { titles: ['Cowgirl'], words: ['üstüme çık-', 'üstüme gel-', 'kovboy', 'cowgirl', 'zıpla-'] },
    { titles: ['Missionary'], words: ['misyoner', 'altıma al-', 'bacaklarını aç-', 'sırtüstü yat-', 'yat sırtüstü'] },
    { titles: ['Standing'], words: ['ayakta sik-', 'duvara yasla-'] },
    { titles: ['Missionary', 'Cowgirl', 'Spooning', 'Doggy'], words: ['içine gir-', 'içine sok-', 'sikeyim|sikiyorum|sikmek'] },
    // 💋 ısınma
    { titles: ['Show Tits'], words: ['memelerini göster-', 'göğüslerini göster-', 'sütyenini çıkar-'] },
    { titles: ['Show Ass'], words: ['götünü göster-', 'kalçanı göster-', 'popona bak-'] },
    { titles: ['Back Hugging'], words: ['arkandan sarıl-'] },
    { titles: ['Lap Kissing'], words: ['kucağıma al-', 'kucağımda öp-'] },
    { titles: ['Front Hugging'], words: ['sarıl-', 'kucakla-'] },
    { titles: ['Kissing'], words: ['öp-', 'dudakların-'] },
    // 🎚️ tempo (Mode): scene → sadece sahne sürerken (yoksa "yavaş yaz" da tutardı)
    { titles: ['Brutal'], words: ['acımadan', 'vahşice'], scene: true },
    { titles: ['Rough'], words: ['=sert|=sertçe|daha sert'], scene: true },
    { titles: ['Passionate'], words: ['tutkuyla', 'tutkulu'], scene: true },
    { titles: ['Gentle'], words: ['yavaş', 'nazikçe', 'usulca'], scene: true }
  ],

  cmd: {
    r_cmd_sert: ['Rough', 'Passionate', 'Brutal'], r_cmd_yavas: ['Gentle'], r_cmd_don: ['Doggy', 'Standing doggy'], r_cmd_ustume: ['Cowgirl'],
    r_cmd_gel: ['Lap Kissing', 'Front Hugging'], r_cmd_op: ['Kissing', 'Lap Kissing'], r_cmd_saril: ['Front Hugging', 'Back Hugging'],
    r_cmd_em: ['Blowjob', 'Deepthroat'], r_cmd_yala: ['Cunnilingus'], r_cmd_arka: ['Standing Anal', 'Spooning Anal', 'Cowgirl Anal'],
    r_cmd_goster: ['Show Tits', 'Show Ass'], r_cmd_otur: ['Facesitting'], r_cmd_gogus: ['Titfuck'],
    r_cmd_meme: ['Show Tits'], r_cmd_kalca: ['Show Ass'], r_cmd_kaldir: ['Doggy', 'Standing doggy'], r_cmd_dizcok: ['Blowjob', 'Deepthroat'],
    r_cmd_agiz: ['Blowjob', 'Deepthroat'], r_cmd_hotdog: ['Hotdogging'], r_cmd_rtit: ['Reverse Titfuck'], r_cmd_rtit2: ['Reverse Titfuck'],
    r_cmd_yat: ['Missionary'], r_cmd_gir: ['Missionary', 'Cowgirl', 'Spooning', 'Doggy']
  },

  fant: [['cat girl', 'fxkedi'], ['bunny girl', 'fxtavsan'], ['fox girl', 'fxtilki'], ['doggy girl', 'fxkopek'], ['unicorn girl', 'fxunikorn'],
    ['bondage', 'fxbag'], ['cheating', 'fxgizli'], ['sex toys', 'fxtoy'], ['belly bulge', 'fxkarin'], ['cumflation', 'fxdolum'],
    ['kadın hoca', 'fxrpprof'], ['patron', 'fxrpofis'], ['hoca', 'fxrpkampus'], ['doktor', 'fxrpmuayene'], ['polis', 'fxrpsorgu'],
    ['yeni komşu', 'fxrpkapi'], ['hizmetçi', 'fxrpev'], ['masöz', 'fxrpmasaj']]
};
