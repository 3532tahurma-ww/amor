/*
 * Amor - Gizli karakter özellikleri (js/params.js kullanır; bot kurallarının "traits" şartları buna bakar)
 *
 * arch: Amor kişiliği (archetype label) → Carmen kişilik özellikleri. core hep vardır, pool'dan karaktere göre 2 tanesi seçilir
 *       (aynı karakter hep aynısını alır). Carmen'in 28 kişiliğinin hepsi en az bir Amor kişiliğinde var.
 *       Listede olmayan kişilik (ör. özel diyalogdan eklenen) için bütün havuzdan seçilir.
 * body: Carmen beden / deneyim grupları (karakterde "Boob Size: 90" gibi). Değerler ağırlıklı seçilir.
 * cr  : Carmen uyumsuzluk kuralları: ifs varsa not'takiler seçilemez (Virgo → hep Extremely Tight).
 */
window.Amor = window.Amor || {};

Amor.CHAR_TRAITS = {
  arch: {
    'Neşeli': { core: ['Neşeli'], pool: ['Çocuksu', 'Komik', 'Meraklı', 'Romantik', 'Sadık', 'Dürüst'] },
    'Soğuk': { core: ['Soğuk'], pool: ['Kibirli', 'Alaycı', 'Gizemli', 'Mantıklı', 'Ciddi', 'Özgüvenli', 'İnatçı'] },
    'Utangaç': { core: ['Utangaç'], pool: ['Güvensiz', 'Romantik', 'Duygusal', 'Gergin', 'Alçakgönüllü', 'Sadık'] },
    'Flörtöz': { core: ['Flörtöz'], pool: ['Özgüvenli', 'Şımarık', 'Manipülatif', 'Asi', 'Meraklı', 'Komik'] },
    'Dramatik': { core: ['Duygusal'], pool: ['Kıskanç', 'Şımarık', 'Asi', 'İnatçı', 'Güvensiz', 'Romantik', 'Manipülatif'] },
    'Olgun': { core: ['Olgun'], pool: ['Sakin', 'Mantıklı', 'Dürüst', 'Korumacı', 'Sadık', 'Romantik', 'Gizemli'] }
  },
  body: {
    'Experience': [['Virgo', 2], ['Little', 2], ['Some', 3], ['Medium', 3], ['Much', 2], ['A lot', 1], ['Great', 1]],
    'Pussy Size': [['Extremely Tight', 1], ['Very Tight', 2], ['Tight', 3], ['Average', 3], ['Relaxed', 1], ['Loose', 1], ['Very Loose', 1]],
    'Anal Size': [['Extremely Tight', 3], ['Very Tight', 3], ['Tight', 2], ['Average', 1], ['Relaxed', 1], ['Loose', 1], ['Very Loose', 1]],
    'Boob Size': [['70', 1], ['75', 2], ['80', 3], ['85', 3], ['90', 2], ['95', 1]],
    'Butt Size': [['XS', 1], ['S', 2], ['M', 3], ['M/L', 3], ['L', 2], ['XL', 1]]
  },
  cr: [
    { ifs: ['Experience: Virgo'], not: ['Pussy Size: Very Loose', 'Pussy Size: Loose', 'Pussy Size: Relaxed', 'Pussy Size: Average', 'Pussy Size: Tight', 'Pussy Size: Very Tight',
      'Anal Size: Very Loose', 'Anal Size: Loose', 'Anal Size: Relaxed', 'Anal Size: Average', 'Anal Size: Tight', 'Anal Size: Very Tight'] },
    { ifs: ['Experience: Great'], not: ['Pussy Size: Extremely Tight', 'Pussy Size: Tight'] }
  ]
};
