/**
 * Long-form element page copy — mirrors `element_descriptions.*` in the web
 * app's ne.json / en.json. Mobile has no i18next runtime, so the strings live
 * here as a typed table.
 */

export type ElementDescriptionSection = "what" | "how" | "meaning";

export const ELEMENT_DESCRIPTION_SECTIONS: ElementDescriptionSection[] = [
  "what",
  "how",
  "meaning",
];

export const ELEMENT_SECTION_LABELS: Record<
  ElementDescriptionSection,
  { ne: string; en: string }
> = {
  what: { ne: "यो के हो?", en: "What is it?" },
  how: { ne: "कसरी गणना गरिन्छ?", en: "How is it calculated?" },
  meaning: { ne: "यसको अर्थ", en: "What it means" },
};

type Bilingual = { ne: string; en: string };

export const ELEMENT_DESCRIPTIONS: Record<
  string,
  Partial<Record<ElementDescriptionSection, Bilingual>>
> = {
  "tithi": {
    what: {
      ne: "तिथि चन्द्र दिन हो — चन्द्र महिनाका ३० अवस्थामध्ये एक। सूर्यबाट चन्द्रमा १२° टाढा जान लाग्ने समय एक तिथि हो।",
      en: "A tithi is a lunar day — one of the 30 phases of the Moon in a lunar month. It is the time the Moon takes to gain 12° of angular separation (elongation) from the Sun.",
    },
    how: {
      ne: "चन्द्रमा र सूर्यको राशिचक्रीय देशान्तरको अन्तरबाट गणना गरिन्छ। यो अन्तर प्रत्येक १२° मा एक तिथि (३० तिथि × १२° = ३६०°)। चन्द्रमाको गतिअनुसार तिथि सौर दिनभन्दा छोटो वा लामो हुन सक्छ; आरम्भ र अन्त्यको ठ्याक्कै क्षण देशान्तर १२° को गुणन पार गर्दा निकालिन्छ।",
      en: "Computed from the difference between the Moon's and Sun's ecliptic longitudes. Each 12° of that gap is one tithi (30 tithis × 12° = 360°). Because it depends on the Moon's varying speed, a tithi can be shorter or longer than a solar day; the exact begin/end instants are found where the elongation crosses each multiple of 12°.",
    },
    meaning: {
      ne: "तिथिले धेरैजसो चाडपर्व, व्रत (एकादशी, पूर्णिमा, औंसी) र मुहूर्त निर्धारण गर्छ। शुक्ल पक्ष (बढ्दो) १–१५ पूर्णिमातर्फ, कृष्ण पक्ष (घट्दो) १–१५ औंसीतर्फ जान्छ।",
      en: "The tithi governs most festivals, fasts (Ekadashi, Purnima, Aaushi) and muhurta selection. Shukla paksha (waxing) tithis 1–15 lead to the full moon; Krishna paksha (waning) tithis 1–15 lead to the new moon.",
    },
  },
  "nakshatra": {
    what: {
      ne: "नक्षत्र २७ चन्द्र भवनमध्ये एक हो — राशिचक्रका १३°२०′ का बराबर भाग जसबाट चन्द्रमा गुज्रन्छ। चन्द्रमा प्रत्येकमा झन्डै एक दिन रहन्छ।",
      en: "A nakshatra is one of the 27 lunar mansions — equal 13°20′ divisions of the zodiac through which the Moon passes, occupying each for roughly a day.",
    },
    how: {
      ne: "राशिचक्र (३६०°) लाई १३°२०′ का २७ बराबर भागमा बाँडिन्छ। लाहिरी अयनांश लगाएपछि चन्द्रमाको निरयन (sidereal) देशान्तरबाट नक्षत्र निकालिन्छ; आरम्भ–अन्त्य चन्द्रमाले प्रत्येक १३°२०′ सीमा पार गर्ने क्षण हुन्।",
      en: "The ecliptic (360°) is divided into 27 equal arcs of 13°20′. After applying the Lahiri ayanamsha, the nakshatra is read from the Moon's sidereal longitude; begin/end times are the instants the Moon crosses each 13°20′ boundary.",
    },
    meaning: {
      ne: "नक्षत्रले जन्म नक्षत्र, ताराबल र मुहूर्त निर्धारण गर्छ। प्रत्येकको आफ्नै देवता, स्वामी ग्रह र स्वभाव (ध्रुव, चर, उग्र आदि) हुन्छ।",
      en: "The nakshatra drives the birth star (janma nakshatra), tarabala, and muhurta. Each is ruled by a deity and a planet and carries its own nature (fixed, movable, fierce, and so on).",
    },
  },
  "yoga": {
    what: {
      ne: "(नित्य) योग २७ सूर्य–चन्द्र संयोगमध्ये एक हो। यो भौतिक स्थिति होइन, दुवैको देशान्तर जोडेर निकालिएको मान हो।",
      en: "A (nitya) yoga is one of 27 Sun–Moon combinations. It is not a physical position but a value derived from their combined longitudes.",
    },
    how: {
      ne: "सूर्य र चन्द्रमाको निरयन देशान्तर जोड्नुहोस्; कुल (०–३६०°) लाई १३°२०′ का २७ बराबर भागमा बाँड्नुहोस्। प्रत्येक भाग एक योग। संयुक्त देशान्तरले सीमा पार गर्दा आरम्भ–अन्त्य हुन्छ।",
      en: "Add the Sun's and Moon's sidereal longitudes and divide the total (0–360°) into 27 equal parts of 13°20′. Each part is one yoga; begin/end are when the combined longitude crosses each boundary.",
    },
    meaning: {
      ne: "केही योग शुभ (सिद्धि, अमृत) र केही अशुभ (व्यतिपात, वैधृति, विष्कुम्भको प्रारम्भ) हुन्छन्। मुहूर्तका लागि जाँचिने पञ्चाङ्गका पाँच अंगमध्ये योग एक हो।",
      en: "Some yogas are auspicious (Siddhi, Amrita) and some malefic (Vyatipata, Vaidhriti, the opening of Vishkumbha). Yoga is one of the five limbs of the almanac checked when choosing a muhurta.",
    },
  },
  "karana": {
    what: {
      ne: "करण तिथिको आधा हो। चन्द्र महिनामा ६० करण हुन्छन् — ११ प्रकार (७ चर दोहोरिने, ४ स्थिर)।",
      en: "A karana is half of a tithi. There are 60 karanas in a lunar month, of 11 distinct types (7 movable that repeat, and 4 fixed).",
    },
    how: {
      ne: "प्रत्येक तिथि (१२° अन्तर) लाई ६°–६° का दुई भागमा बाँडिन्छ; प्रत्येक भाग एक करण। ७ चर करण चक्रमा घुम्छन्, ४ स्थिर करण औंसीवरिपरि रहन्छन्।",
      en: "Each tithi (12° of elongation) is split into two 6° halves, and each half is a karana. The 7 movable karanas cycle round, while the 4 fixed karanas are anchored around the new moon (Aaushi).",
    },
    meaning: {
      ne: "करणले तिथिभित्रको समय झन् सूक्ष्म बनाउँछ। विष्टि (भद्रा) करण शुभ कार्यका लागि अशुभ मानिन्छ; स्थिर करण (शकुनि, चतुष्पद, नाग, किंस्तुघ्न) भारी हुन्छन्।",
      en: "Karana refines timing within a tithi. The Vishti (Bhadra) karana is inauspicious for auspicious work; the fixed karanas (Shakuni, Chatushpada, Naga, Kimstughna) are considered heavy.",
    },
  },
  "chandra-rashi": {
    what: {
      ne: "चन्द्र राशि भनेको चन्द्रमा रहेको राशि हो — १२ बराबर ३०° राशिमध्ये एक। यो झन्डै हरेक २¼ दिनमा फेरिन्छ।",
      en: "The Moon sign is the zodiac sign (rashi) the Moon occupies — one of 12 equal 30° signs. It changes about every 2¼ days.",
    },
    how: {
      ne: "चन्द्रमाको निरयन देशान्तरलाई ३०° ले भाग गरेर राशि निकालिन्छ। चन्द्रमाले प्रत्येक ३०° राशि सीमा पार गर्दा सङ्क्रमण समय हुन्छ।",
      en: "From the Moon's sidereal longitude, the rashi is longitude ÷ 30°. Transition times are the moments the Moon crosses each 30° sign boundary.",
    },
    meaning: {
      ne: "चन्द्र राशि वैदिक राशिफल, चन्द्रबल र नामकरण–मिलनमा प्रयोग हुने जन्म राशिको आधार हो।",
      en: "The Moon sign is the basis of Vedic rashiphal (horoscope), chandrabala, and the janma rashi used in naming and matchmaking.",
    },
  },
  "choghadiya": {
    what: {
      ne: "चौघडियाले दिन (सूर्योदय→सूर्यास्त) र रात (सूर्यास्त→सूर्योदय) लाई ८–८ मुहूर्तमा बाँड्छ — जम्मा १६ खण्ड, पालैपालो ग्रहद्वारा शासित, प्रत्येक शुभ/अशुभ/सामान्य।",
      en: "Choghadiya divides the day (sunrise→sunset) and night (sunset→sunrise) into 8 muhurtas each — 16 slots ruled in turn by planets, each marked good, bad, or neutral.",
    },
    how: {
      ne: "दिनको उज्यालोलाई ८ र रातलाई ८ बराबर भाग गरिन्छ (त्यसैले लम्बाइ ऋतुअनुसार फेरिन्छ)। प्रत्येक खण्डको स्वामी ग्रह वार-स्वामीबाट सुरु हुने निश्चित क्रममा चल्छ; ग्रहको स्वभावले गुण तय गर्छ।",
      en: "Daylight is split into 8 equal parts and night into 8 equal parts, so each part's length varies with the season. The ruling planet of each slot follows a fixed sequence starting from the weekday's lord, and the planet's nature sets the quality.",
    },
    meaning: {
      ne: "दैनिक काम र यात्राका लागि सजिलो, लोकप्रिय मुहूर्त — शुभ/अमृत/लाभ खण्ड रोज्नुहोस्, रोग/काल/उद्वेग त्याग्नुहोस्।",
      en: "A quick, popular muhurta guide for daily tasks and travel — pick a Shubha/Amrita/Labha slot and avoid Roga/Kala/Udvega.",
    },
  },
  "hora": {
    what: {
      ne: "होरा ग्रह-घण्टा हो — दिनका २४ घण्टा प्रत्येक ७ ग्रह (सूर्य, चन्द्र, मंगल, बुध, बृहस्पति, शुक्र, शनि) मध्ये एकद्वारा शासित।",
      en: "Hora is the planetary hour — the 24 hours of a day, each ruled by one of the 7 planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn).",
    },
    how: {
      ne: "सूर्योदयदेखि दिन र रातलाई ग्रह-घण्टामा बाँडिन्छ। दिनको पहिलो होरा वार-स्वामीद्वारा शासित हुन्छ, त्यसपछि कल्डियन क्रम अनुसरण गर्दै प्रत्येक होरा एक ग्रह अगाडि बढ्छ।",
      en: "Day and night are divided into planetary hours from sunrise. The first hora of the day is ruled by the weekday's lord, then the sequence follows the Chaldean order, each hora advancing by one planet.",
    },
    meaning: {
      ne: "कामअनुसार उपयुक्त स्वामी ग्रह भएको होरा रोज्नुहोस् (ज्ञानका लागि बृहस्पति, कलाका लागि शुक्र, व्यापारका लागि बुध), र संवेदनशील कामका लागि अशुभ होरा (शनि, मंगल, सूर्य) त्याग्नुहोस्।",
      en: "Choose a hora whose ruling planet suits the task (Jupiter for study, Venus for the arts, Mercury for trade), and avoid malefic horas (Saturn, Mars, Sun) for delicate work.",
    },
  },
  "lagna": {
    what: {
      ne: "लग्न भनेको कुनै क्षणमा पूर्वी क्षितिजमा उदाउँदै गरेको राशि हो। दिनभरि सबै १२ राशि पालैपालो उदाउँछन्।",
      en: "Lagna (the ascendant) is the zodiac sign rising on the eastern horizon at a given moment. Over a day all 12 signs rise in turn.",
    },
    how: {
      ne: "स्थानीय नक्षत्र समय (sidereal time) र observer को अक्षांशबाट गणना गरिन्छ — पूर्वी क्षितिज काट्ने क्रान्तिवृत्त बिन्दु। प्रत्येक राशिको उदय अवधि अक्षांश र राशिअनुसार फरक हुन्छ।",
      en: "Computed from the local sidereal time and the observer's latitude — the point of the ecliptic crossing the eastern horizon. Each sign's rising duration differs by latitude and by sign (short and long ascension).",
    },
    meaning: {
      ne: "लग्न कुण्डलीको पहिलो भाव र मुहूर्त–कुण्डलीको आधार हो; घटनाको समयको उदय राशिले त्यसको फल आकार दिन्छ।",
      en: "The lagna is the first house of a chart and the anchor for muhurta and kundali; the sign rising at an event's time shapes its outcome.",
    },
  },
  "udaya-lagna": {
    what: {
      ne: "उदय लग्नले दिनभरि प्रत्येक लग्न राशि उदाउने ठ्याक्कै घडी समय देखाउँछ, र तीभित्रका पुष्कर नवांश क्षण चिन्ह लगाउँछ।",
      en: "Udaya Lagna lists the exact clock times each ascendant sign rises through the day, and flags the Pushkara Navamsha moments within them.",
    },
    how: {
      ne: "लग्नकै गणना, तर प्रत्येक राशिको उदय→अस्त समय तालिकाका रूपमा प्रस्तुत गरिन्छ; पुष्कर नवांश अंश (शुभ उपविभाजन) परेको ठाउँमा चिन्ह लगाइन्छ।",
      en: "The same ascendant maths as Lagna, but presented as a table of rising→setting times for each sign, with the Pushkara navamsha degrees (auspicious sub-divisions) marked where they fall.",
    },
    meaning: {
      ne: "मुहूर्तलाई ठ्याक्कै उदय-राशि अवधिमा टाँस्न र महत्त्वपूर्ण आरम्भका लागि शुभ पुष्कर क्षण समात्न प्रयोग हुन्छ।",
      en: "Used to pin a muhurta to the exact rising-sign window, and to catch the auspicious Pushkara moments for important beginnings.",
    },
  },
  "chandrabala": {
    what: {
      ne: "चन्द्रबल (\"चन्द्र बल\") ले व्यक्तिको जन्म चन्द्र राशिको तुलनामा अहिलेको चन्द्र राशि कति अनुकूल छ भन्ने नाप्छ।",
      en: "Chandrabala (\"Moon strength\") measures how favourable the Moon's current sign is relative to a person's birth Moon sign.",
    },
    how: {
      ne: "जन्म चन्द्र राशि (जन्म राशि) बाट चन्द्रमाको गोचर राशिसम्म गनिन्छ। स्थान २, ५, ७, ९, ११ (र परम्पराअनुसार अरू) बलियो/अनुकूल; १, ३, ६, १० कमजोर — प्रत्येक राशिका लागि तालिकाबद्ध।",
      en: "Count signs from the birth Moon sign (janma rashi) to the Moon's transit sign. Positions 2, 5, 7, 9, 11 (and others by tradition) are strong and favourable; 1, 3, 6, 10 are weaker — tabulated for each rashi.",
    },
    meaning: {
      ne: "बलियो चन्द्रबल भएको दिन यात्रा, अनुष्ठान र नयाँ कामलाई साथ दिन्छ; कमजोर चन्द्रबलले त्यो राशिलाई सावधानीको सङ्केत गर्छ।",
      en: "A strong Chandrabala day supports travel, ceremonies and new work; weak Chandrabala warns that rashi to be cautious.",
    },
  },
  "tarabala": {
    what: {
      ne: "ताराबल (\"तारा बल\") ले दिनको नक्षत्रलाई व्यक्तिको जन्म नक्षत्रसँग नौ-तारा चक्रमार्फत मूल्याङ्कन गर्छ।",
      en: "Tarabala (\"star strength\") rates the day's nakshatra against a person's birth nakshatra through the nine-tara cycle.",
    },
    how: {
      ne: "जन्म ताराबाट दिनको तारासम्म गनेर ९ ले भाग (modulo) गर्दा नौ तारामध्ये एक (जन्म, सम्पत्, विपत्, क्षेम, प्रत्यरि, साधक, वध, मित्र, अतिमित्र) आउँछ। केही शुभ, केही त्याज्य।",
      en: "Count from the birth star to the day's star and take it modulo 9 → one of nine taras (Janma, Sampat, Vipat, Kshema, Pratyari, Sadhaka, Vadha, Mitra, Ati-mitra). Some are auspicious, some to be avoided.",
    },
    meaning: {
      ne: "शुभ तारा (सम्पत्, क्षेम, साधक, मित्र, अतिमित्र) ले कार्यलाई साथ दिन्छ; विपत्, प्रत्यरि र वध महत्त्वपूर्ण कामका लागि त्यागिन्छ।",
      en: "The good taras (Sampat, Kshema, Sadhaka, Mitra, Ati-mitra) favour action; Vipat, Pratyari and Vadha are avoided for important work.",
    },
  },
  "panchaka-rahita": {
    what: {
      ne: "पञ्चक रहितले पाँच \"पञ्चक\" दोष (मृत्यु, अग्नि, राज, चोर, रोग) बाट मुक्त दिनका अवधि देखाउँछ, जसले केही कामलाई अशुभ बनाउँछन्।",
      en: "Panchaka Rahita shows the windows of the day free of the five \"panchaka\" faults (Mrityu, Agni, Raja, Chora, Roga) that make certain acts inauspicious.",
    },
    how: {
      ne: "वार, तिथि, नक्षत्र र लग्न मिलाइन्छ; तिनको संयोजन पाँच पञ्चक दोषमध्ये कुनैमा पर्दा चिन्ह लगाइन्छ। बाँकी सफा समय \"पञ्चक रहित\" हो।",
      en: "The weekday, tithi, nakshatra and lagna are combined; when their combination lands on one of the five panchaka faults it is flagged. The remaining clear time is \"panchaka-rahita\" (panchaka-free).",
    },
    meaning: {
      ne: "छाना हाल्ने, दक्षिण यात्रा, दाउरा/इन्धन किन्ने वा अन्त्येष्टि जस्ता पाँच दोषले विशेष रूपमा रोक्ने कामका लागि पञ्चक रहित अवधि रोज्नुहोस्।",
      en: "Choose panchaka-free windows for acts the five faults specifically prohibit — roofing, travelling south, buying fuel or wood, or funerary rites.",
    },
  },
  "pushkara": {
    what: {
      ne: "पुष्कर नवांश विशेष शुभ उपखण्ड हुन्: केही नक्षत्रभित्रका निश्चित नवांश (१/९ भाग) विभाजन जहाँ लग्न \"पुष्कर\" (पोषक) बन्छ।",
      en: "Pushkara Navamsha are especially auspicious sub-segments: specific navamsha (1/9th) divisions within certain nakshatras where the ascendant becomes \"Pushkara\" (nourishing).",
    },
    how: {
      ne: "प्रत्येक राशिको ३०° लाई ३°२०′ का नौ नवांशमा बाँडिन्छ; तोकिएका राशि/नवांश जोडीमा उदय बिन्दु पुष्कर मानिन्छ। पृष्ठले लग्न ती हुँदै जाने घडी क्षण चिन्ह लगाउँछ।",
      en: "Each sign's 30° is split into nine 3°20′ navamshas; in defined sign/navamsha pairs the rising point qualifies as Pushkara. The page marks the clock moments the lagna passes through these.",
    },
    meaning: {
      ne: "पुष्कर नवांश क्षणमा सुरु गरिएका काम (किनमेल, लगानी, जग) फस्टाउने र बढ्ने विश्वास गरिन्छ।",
      en: "Acts begun in a Pushkara Navamsha moment (purchases, investments, foundations) are held to prosper and multiply.",
    },
  },
};

export function descriptionBlocksFrom(
  table: Record<string, Partial<Record<ElementDescriptionSection, { ne: string; en: string }>>>,
  id: string,
  lang: string,
): { section: ElementDescriptionSection; body: string }[] {
  const entry = table[id];
  if (!entry) return [];
  const key = lang.startsWith("en") ? "en" : "ne";
  return ELEMENT_DESCRIPTION_SECTIONS.flatMap((section) => {
    const body = entry[section]?.[key];
    return body ? [{ section, body }] : [];
  });
}

export function elementDescriptionBlocks(
  elementId: string,
  lang: string,
): { section: ElementDescriptionSection; body: string }[] {
  const entry = ELEMENT_DESCRIPTIONS[elementId];
  if (!entry) return [];
  const key = lang.startsWith("en") ? "en" : "ne";
  return ELEMENT_DESCRIPTION_SECTIONS.flatMap((section) => {
    const body = entry[section]?.[key];
    return body ? [{ section, body }] : [];
  });
}
