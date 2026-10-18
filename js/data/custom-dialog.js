/* bot-editoru.bat > Diyalog ile duzenlenir (tools/dialog-editor.html) */
window.Amor = window.Amor || {};
Amor.CUSTOM_DIALOG = {
 "intents": {},
 "lines": {
  "flortoz": {
   "fallback": [
    "hmm 😏",
    "anlat anlat",
    "oha {laugh}",
    "sonraa?",
    "ciddi misin 😂",
    "bilmem ki 💋",
    "ilginç adamsın 😏",
    "offff yerim",
    "ye beni aşk"
   ]
  }
 },
 "kume": {
  "scenarios": {
   "bulusma": {
    "id": "bulusma",
    "name": "Örnek: buluşma ayarlama",
    "live": false,
    "states": [
     {
      "id": "sohbet",
      "kind": "S",
      "name": "Sohbet",
      "desc": "Gündelik sohbet",
      "icon": "💬",
      "color": "#8b87a0",
      "emojis": [
       "💬",
       "😊"
      ],
      "emojiChance": 0.5,
      "stay": [
       "hmm anlat",
       "başka ne var?"
      ],
      "stayRules": [],
      "x": 100,
      "y": 200,
      "start": true
     },
     {
      "id": "teklif",
      "kind": "X",
      "name": "Teklif",
      "desc": "Buluşma teklif edildi",
      "icon": "💌",
      "color": "#7b5cff",
      "emojis": [
       "💌",
       "🙈"
      ],
      "emojiChance": 0.5,
      "stay": [
       "eee? nereye?",
       "cevabını bekliyorum"
      ],
      "stayRules": [],
      "x": 330,
      "y": 200,
      "start": false
     },
     {
      "id": "kararsiz",
      "kind": "X1",
      "name": "Kararsız",
      "desc": "Karar verilemiyor",
      "icon": "🤔",
      "color": "#d98a00",
      "emojis": [
       "🤔"
      ],
      "emojiChance": 0.5,
      "stay": [
       "hadi ama",
       "çok düşünme"
      ],
      "stayRules": [],
      "x": 560,
      "y": 80,
      "start": false
     },
     {
      "id": "gun",
      "kind": "X1",
      "name": "Gün seçimi",
      "desc": "Kabul edildi, gün aranıyor",
      "icon": "🗓️",
      "color": "#d98a00",
      "emojis": [
       "🗓️",
       "😊"
      ],
      "emojiChance": 0.5,
      "stay": [
       "ne zaman müsaitsin?",
       "hangi gün olsun?"
      ],
      "stayRules": [],
      "x": 560,
      "y": 320,
      "start": false
     },
     {
      "id": "plan",
      "kind": "X2",
      "name": "Plan",
      "desc": "Gün ve saat belli",
      "icon": "📅",
      "color": "#1f9d6a",
      "emojis": [
       "📅",
       "✨"
      ],
      "emojiChance": 0.5,
      "stay": [
       "görüşmeye az kaldı",
       "ne giysem acaba"
      ],
      "stayRules": [],
      "x": 800,
      "y": 80,
      "start": false
     },
     {
      "id": "iptal",
      "kind": "X2",
      "name": "Vazgeçti",
      "desc": "Buluşma iptal",
      "icon": "💔",
      "color": "#e5484d",
      "emojis": [
       "💔"
      ],
      "emojiChance": 0.3,
      "stay": [
       "…",
       "tamam"
      ],
      "stayRules": [],
      "x": 800,
      "y": 320,
      "start": false
     }
    ],
    "edges": [
     {
      "id": "selam",
      "name": "Selam",
      "desc": "",
      "from": [
       "sohbet"
      ],
      "to": "sohbet",
      "need": "greet",
      "kw": [],
      "lines": [
       "selam{h}",
       "heyy"
      ]
     },
     {
      "id": "teklif",
      "name": "Teklif",
      "desc": "",
      "from": [
       "sohbet",
       "kararsiz"
      ],
      "to": "teklif",
      "need": "kw",
      "kw": [
       "buluşalım",
       "görüşelim",
       "kahve içelim",
       "dışarı çıkalım",
       "tanışalım"
      ],
      "lines": [
       "aa ciddi misin?|nereye gidelim?",
       "olabilir aslında… ne zaman?"
      ]
     },
     {
      "id": "kararsiz",
      "name": "Kararsızlık",
      "desc": "",
      "from": [
       "teklif"
      ],
      "to": "kararsiz",
      "need": "kw",
      "kw": [
       "bilmem",
       "emin değilim",
       "belki",
       "sonra bakarız",
       "düşüneyim"
      ],
      "lines": [
       "hmm ama sen teklif ettin ya|hadi karar ver",
       "düşün düşün, ben buradayım"
      ]
     },
     {
      "id": "kabul",
      "name": "Kabul",
      "desc": "",
      "from": [
       "teklif"
      ],
      "to": "gun",
      "need": "kw",
      "kw": [
       "olur",
       "tamam",
       "neden olmasın",
       "gelirim",
       "hadi"
      ],
      "lines": [
       "yaşasın!|ne zaman olsun?",
       "süper, gün söyle"
      ]
     },
     {
      "id": "plan",
      "name": "Plan",
      "desc": "",
      "from": [
       "kararsiz",
       "gun"
      ],
      "to": "plan",
      "need": "kw",
      "kw": [
       "yarın",
       "akşam",
       "cumartesi",
       "pazar",
       "saat",
       "anlaştık"
      ],
      "lines": [
       "tamamdır, not aldım",
       "süper, sabırsızlanıyorum"
      ]
     },
     {
      "id": "iptal",
      "name": "İptal",
      "desc": "",
      "from": [
       "kararsiz",
       "gun",
       "plan"
      ],
      "to": "iptal",
      "need": "kw",
      "kw": [
       "vazgeçtim",
       "iptal",
       "olmaz",
       "gelemem",
       "erteleyelim"
      ],
      "lines": [
       "hıı… peki",
       "anladım, başka zaman artık"
      ]
     },
     {
      "id": "baris",
      "name": "Barışma",
      "desc": "",
      "from": [
       "iptal"
      ],
      "to": "teklif",
      "need": "kw",
      "kw": [
       "şaka",
       "yine de",
       "tekrar düşündüm"
      ],
      "lines": [
       "hmm, ikna etmeye çalış bakalım"
      ]
     },
     {
      "id": "kapat",
      "name": "Konu kapandı",
      "desc": "",
      "from": [
       "plan",
       "iptal"
      ],
      "to": "sohbet",
      "need": "kw",
      "kw": [
       "neyse",
       "başka konu",
       "boşver"
      ],
      "lines": [
       "peki, ne anlatıyordun?"
      ]
     }
    ],
    "samples": [
     [
      "Teklif → plan",
      [
       "selam",
       "bu hafta kahve içelim mi?",
       "bilmem ki emin değilim",
       "cumartesi olur mu?",
       "neyse boşver"
      ]
     ],
     [
      "İptal ve barış",
      [
       "dışarı çıkalım mı",
       "olur, gelirim",
       "erteleyelim ya gelemem",
       "şaka şaka yine de gel",
       "tamam gelirim",
       "yarın saat 8 de"
      ]
     ]
    ]
   }
  },
  "order": [
   "bulusma"
  ],
  "removed": [
   "okul",
   "futbol",
   "kume"
  ],
  "active": "bulusma",
  "persona": {
   "nese": {
    "habits": [
     "iyiyim > iyidir ya",
     "sen nasılsın > sen?",
     "ne yapıyorsun > napıyon",
     "tamam > tmm"
    ],
    "tail": [
     " ya",
     " :d"
    ],
    "max": 3,
    "likes": [
     "futbol:X2a",
     "okul:X2a"
    ],
    "dislikes": []
   },
   "soguk": {
    "habits": [
     "tebrikler, çok sevindim > tebrikler",
     "helal olsun, gurur duydum > güzel",
     "devam et, dinliyorum > devam et"
    ],
    "tail": [
     "."
    ],
    "max": 1,
    "likes": [
     "okul:X1a"
    ],
    "dislikes": [
     "futbol:X"
    ]
   },
   "utangac": {
    "habits": [
     "iyiyim > ii",
     "sen nasılsın > sen?",
     "anlat > şey… anlatsana"
    ],
    "tail": [
     "..."
    ],
    "max": 2,
    "likes": [
     "okul:X1a"
    ],
    "dislikes": [
     "futbol:X1b"
    ]
   },
   "flortoz": {
    "habits": [
     "iyiyim > fena değilim :d",
     "ne yapıyorsun > napıyosun bakalım",
     "aferin sana > aferin benim akıllıma"
    ],
    "tail": [
     " 😏"
    ],
    "max": 2,
    "likes": [
     "futbol:X2a"
    ],
    "dislikes": [
     "okul:X1a"
    ]
   },
   "dramatik": {
    "habits": [
     "sonunda > SONUNDAAA",
     "çok > ÇOK",
     "süper > MUHTEŞEM",
     "gurur duydum > GURUR DUYDUM"
    ],
    "tail": [
     "!!!"
    ],
    "max": 3,
    "likes": [
     "futbol:X1b",
     "okul:X1b"
    ],
    "dislikes": []
   },
   "olgun": {
    "habits": [
     "napıyon > ne yapıyorsun",
     "eee > Eee"
    ],
    "tail": [
     "."
    ],
    "max": 2,
    "likes": [
     "okul:X2a"
    ],
    "dislikes": [
     "futbol:X1b"
    ]
   }
  },
  "talk": {
   "refuse": {
    "nese": [
     "ayy bu konu hiç bana göre değil ya|başka şey anlat",
     "hmm bunu pek sevmem, sen başka ne yaptın?"
    ],
    "soguk": [
     "Bu konu ilgimi çekmiyor.",
     "Başka bir şey konuşalım."
    ],
    "utangac": [
     "şey… bu konuda pek konuşmasak mı?",
     "bu konu beni biraz geriyor…"
    ],
    "flortoz": [
     "bu konu beni sıkar|bana biraz kendini anlat",
     "yok yok, bunu konuşmayalım"
    ],
    "dramatik": [
     "HAYIR bu konuyu açma lütfen",
     "bu konu bana hiç iyi gelmiyor, gerçekten"
    ],
    "olgun": [
     "Açıkçası bu konuya pek girmek istemiyorum.",
     "Bunu konuşmasak daha iyi olur bence."
    ]
   },
   "love": {
    "nese": [
     "ayy bayılırım buna!!",
     "en sevdiğim konu ya"
    ],
    "soguk": [
     "Bu konu ilginç aslında.",
     "Bunu severim."
    ],
    "utangac": [
     "ben de buna bayılırım aslında…",
     "bu konuyu çok severim {laugh}"
    ],
    "flortoz": [
     "ooo tam benim konum",
     "bayılırım böyle şeylere"
    ],
    "dramatik": [
     "AYY EN SEVDİĞİM ŞEY",
     "bu konu benim aşkım resmen"
    ],
    "olgun": [
     "Bu konuyu konuşmayı çok severim.",
     "Ne güzel, bunu konuşmayı seviyorum."
    ]
   }
  },
  "talkMap": {
   "greet": {
    "outs": [
     {
      "id": "sabah",
      "name": "Sabah selamı",
      "lines": [
       "günaydın{h}! uyandın mı?",
       "günaydııın|kahveni içtin mi?"
      ]
     },
     {
      "id": "aksam",
      "name": "Akşam selamı",
      "lines": [
       "iyi akşamlar{h}|günün nasıl geçti?",
       "akşamın güzel olsun"
      ]
     },
     {
      "id": "samimi",
      "name": "Samimi selam",
      "lines": [
       "heyy naber{h}",
       "oo kimler gelmiş"
      ]
     }
    ],
    "ins": [
     {
      "kw": "günaydın",
      "out": "sabah"
     },
     {
      "kw": "gnydn",
      "out": "sabah"
     },
     {
      "kw": "sabah",
      "out": "sabah"
     },
     {
      "kw": "aydınlık",
      "out": "sabah"
     },
     {
      "kw": "iyi akşamlar",
      "out": "aksam"
     },
     {
      "kw": "akşam",
      "out": "aksam"
     },
     {
      "kw": "hey",
      "out": "samimi"
     },
     {
      "kw": "slm",
      "out": "samimi"
     }
    ]
   }
  }
 }
};
