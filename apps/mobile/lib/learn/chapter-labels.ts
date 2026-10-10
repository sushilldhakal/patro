/** Bilingual text for the day-sim chapter tour — titles, parts, transport
 * chrome, tips and still captions. Mirrors web's `learn.chapters.*` catalogue
 * keys 1:1, resolved locally instead of through i18next. */

const CHAPTER_LABELS: Record<string, [ne: string, en: string]> = {
  // Chapter titles
  welcome: ["स्वागत", "Welcome"],
  stellar: ["नाक्षत्र दिन", "Stellar Days"],
  solar: ["सौर दिन", "Solar Days"],
  elliptic: ["पृथ्वीको अण्डाकार कक्षा", "Earth's Elliptic Orbit"],
  axial: ["पृथ्वीको अक्ष झुकाव", "Earth's Axial Tilt"],
  reality: ["यथार्थ चित्र", "A Realistic Picture"],
  playground: ["खेलमैदान", "Playground"],
  week: ["सात दिनको वार", "The Seven-Day Week"],
  solar_month: ["सङ्क्रान्तिदेखि सङ्क्रान्तिसम्म", "Sankranti to Sankranti"],
  lunar_month: ["चन्द्रमाका दुई महिना", "The Moon's Two Months"],
  year: ["३६५ दिन, ३६६ फन्को", "365 Days, 366 Turns"],
  rashi_belt: ["राशि पेटी कसरी बन्यो", "How the Rashi Belt Forms"],
  nakshatra_belt: ["नक्षत्र पेटी — सत्ताइस भाग", "The Nakshatra Belt — Twenty-Seven"],
  pole_star: ["ध्रुव तारा बदलिन्छ", "The Pole Star Changes"],
  tithi: ["तिथि — बाह्र अंशको खुड्किलो", "Tithi — Twelve Degrees at a Time"],
  paksha: ["शुक्ल र कृष्ण पक्ष", "The Two Fortnights"],
  adhik_maas: ["अधिक मास किन चाहिन्छ", "Why There Is a Leap Month"],
  five_limbs: ["पाँच अङ्ग एकै ठाउँमा", "The Five Limbs Together"],

  // Track opening overlay
  welcome_title: ["दिन के हो?", "What is a Day?"],
  welcome_subtitle: [
    "दिनदेखि ध्रुव तारासम्म — पात्रोका हरेक एकाइ, एउटै आकाशमा।",
    "From the day to the pole star — every unit of the calendar, in one sky.",
  ],
  day_only_subtitle: [
    "सात अध्यायमा — दिन के हो, र किन एउटा घुर्णन मात्र काफी छैन।",
    "Seven chapters — what a day is, and why one turn is not enough.",
  ],
  eyebrow: ["अन्तरक्रियात्मक अध्याय", "An interactive adventure"],
  begin: ["सुरु गर्नुहोस्", "Begin"],

  // Parts (table of contents groupings)
  part_day: ["भाग १ · दिन", "Part 1 · The Day"],
  part_week: ["भाग २ · वार", "Part 2 · The Week"],
  part_month: ["भाग ३ · महिना", "Part 3 · The Month"],
  part_year: ["भाग ४ · वर्ष", "Part 4 · The Year"],
  part_belts: ["भाग ५ · राशि र नक्षत्र", "Part 5 · The Belts"],
  part_pole: ["भाग ६ · ध्रुव तारा", "Part 6 · The Pole Star"],
  part_panchanga: ["भाग ७ · पञ्चाङ्ग", "Part 7 · The Panchanga"],
  part_free: ["स्वतन्त्र", "Free explore"],

  // Transport
  chapter: ["अध्याय", "Chapter"],
  prev: ["अघिल्लो अध्याय", "Previous chapter"],
  next: ["अर्को अध्याय", "Next chapter"],
  replay: ["फेरि चलाउनुहोस्", "Play again"],
  scrub: ["अध्याय समय", "Chapter time"],
  explore: ["स्वतन्त्र रूपमा हेर्नुहोस्", "Explore freely"],
  voiceover_pending: [
    "आवाज पछि थपिनेछ — अहिले एनिमेसन आफ्नै समयमा चल्छ।",
    "Voiceover comes later — the animation already runs on that clock.",
  ],

  // Tips
  tip_zoom: ["सुझाव — स्क्रोल वा पिन्च गरेर नजिक-टाढा गर्न सकिन्छ।", "Tip: scroll or pinch to zoom."],
  tip_drag_earth: [
    "सुझाव — पृथ्वीलाई तानेर कक्षमा जहाँ पनि सार्न सकिन्छ।",
    "Tip: drag the planet to move it anywhere on its orbit.",
  ],
  tip_scrub: [
    "सुझाव — तलको पट्टीबाट वर्षभरि जहाँ पनि पुग्न सकिन्छ।",
    "Tip: the bar below moves you anywhere in the year.",
  ],
  tip_layers: [
    "सुझाव — तलका चिप्सले जुनसुकै तह खोल्न वा बन्द गर्न सकिन्छ।",
    "Tip: the chips below turn any layer on or off.",
  ],

  // Still captions
  still_mesha: [
    "मेष — वर्ष सुरु हुने राशि। बैशाख १ सूर्य यहाँ पुगेकै दिन हो।",
    "Mesha — where the year opens. Baisakh 1 is the day the Sun arrives here.",
  ],
  still_mrigashira: [
    "मृगशिरा — सत्ताइस नक्षत्रमध्ये एक। चन्द्रमा एक रातमा यत्ति टेक्छ।",
    "Mrigashira — one of the twenty-seven. About one night's travel for the Moon.",
  ],
  still_saptarshi: [
    "सप्तर्षि — यिनका दुई ताराले सधैँ ध्रुव तारातिर देखाउँछन्।",
    "Saptarshi — its two end stars have always pointed at the pole.",
  ],
  still_shishumara: [
    "शिंशुमार — ध्रुवको वरिपरि बेरिएको। चार हजार वर्षअघि ध्रुव यसैभित्रको थुबन थियो।",
    "Shishumara, coiled round the pole. Four thousand years ago the pole star was Thuban, inside it.",
  ],
};

export function chapterLabel(key: string, lang: "ne" | "en"): string {
  const pair = CHAPTER_LABELS[key];
  if (!pair) return key;
  return lang === "en" ? pair[1] : pair[0];
}
