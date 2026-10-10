import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `AstronomyBasics` — see `what-is-panchang.ts` header note. */
export const astronomyBasics: ArticleData = {
  slug: "astronomy-basics",
  sections: [
    {
      title: { ne: "आकाश कसरी देखिन्छ", en: "What we see from Earth" },
      eyebrow: "What we see from Earth",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "रातको आकाशमा *ताराहरू* टाढाका सूर्यजस्तै उज्यालो बिन्दु हुन्। दिनमा ~सूर्य~ सबैभन्दा चम्किलो देखिन्छ; रातमा *चन्द्रमा* सबैभन्दा नजिकको खगोलीय पिण्ड हो — यिनै तीनले नेपाली पात्रो र पञ्चाङ्गको गणनाको आधार बनाउँछन्।",
            en: "In the night sky the *stars* are bright points like distant suns. By day the ~Sun~ is the brightest; at night the *Moon* is the nearest celestial body — these three form the basis of the Nepali patro and almanac calculations.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "क्षितिज र शिरोबिन्दु", en: "Horizon and zenith" },
              p: {
                ne: "जहाँ आकाश र जमिन भेटिन्छ — क्षितिज; सिधै माथि — शिरोबिन्दु। सबै खगोलीय वस्तु यही गोलाकार आकाशमा देखिन्छ।",
                en: "Where sky meets ground — the horizon; straight overhead — the zenith. Every celestial object appears on this dome of sky.",
              },
            },
            {
              h: { ne: "सूर्य पूर्व → पश्चिम", en: "Sun: east → west" },
              p: {
                ne: "सूर्य नभई पृथ्वी घुमिरहेको हुनाले सूर्य उदाएजस्तो लाग्छ — यो घूर्णनको परिणाम हो, परिक्रमा होइन।",
                en: "It's the Earth rotating, not the Sun moving, that makes the Sun appear to rise — a result of rotation, not revolution.",
              },
            },
            {
              h: { ne: "चन्द्रमा र ताराहरू", en: "Moon and stars" },
              p: {
                ne: "चन्द्रमा सूर्यको प्रकाश परावर्तन गर्छ (आफैं बल्दैन); ताराहरू आफैं चम्किन्छन्।",
                en: "The Moon reflects the Sun's light (it does not shine on its own); the stars shine by themselves.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "घूर्णन र परिक्रमा", en: "Rotation vs revolution" },
      eyebrow: "Rotation vs revolution",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "खगोलमा **दुई फरक गति** छन् — यिनलाई नमिलाउँदा धेरै भ्रम हुन्छ। *घूर्णन* = आफ्नै अक्षमा फर्किने (दिन–रात)। ~परिक्रमा~ = अर्को वस्तुको वरिपरि फर्किने (वर्ष, महिना)।",
            en: "Astronomy has **two different motions** — confusing them causes a lot of mix-ups. *Rotation* = spinning on one's own axis (day–night). ~Revolution~ = orbiting around another body (year, month).",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "पृथ्वीको घूर्णन ≈ २४ घण्टा", en: "Earth's rotation ≈ 24 hours" },
              p: {
                ne: "एक सौर दिन — सूर्य फेरि उस्तै स्थानमा देखा पर्ने समय।",
                en: "One solar day — the time for the Sun to return to the same place.",
              },
            },
            {
              h: { ne: "पृथ्वीको परिक्रमा ≈ ३६५ दिन", en: "Earth's revolution ≈ 365 days" },
              p: {
                ne: "सूर्यको वरिपरि एक फेरो — वर्ष र ऋतु यसैले बन्छ।",
                en: "One orbit around the Sun — this makes the year and seasons.",
              },
            },
            {
              h: { ne: "चन्द्रको परिक्रमा ≈ २९.५ दिन", en: "Moon's revolution ≈ 29.5 days" },
              p: {
                ne: "पृथ्वीको वरिपरि — तिथि र पक्ष यसै गतिमा आधारित।",
                en: "Around the Earth — tithi and paksha are based on this motion.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "पछिल्लो लेखमा यी गतिहरू चित्रसहित विस्तारमा हेर्न सकिन्छ — तर पहिले यो भिन्नता स्पष्ट हुनु जरूरी छ।",
            en: "A later article covers these motions in detail with diagrams — but this distinction must be clear first.",
          },
        },
      ],
    },
    {
      title: { ne: "कोण किन महत्त्वपूर्ण", en: "Why degrees matter" },
      eyebrow: "Why degrees matter",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्गमा सूर्य, चन्द्र र अन्य ग्रहहरूको स्थिति **कोण (°)** मा मापिन्छ। पूर्ण आकाशलाई **३६०°** मा बाँडेर “चन्द्र सूर्यभन्दा कति अगाडि छ” भन्ने प्रश्नको उत्तर दिइन्छ — तिथि, नक्षत्र र योग यही कोणबाट निकालिन्छ।",
            en: "In the almanac, the positions of the Sun, Moon and other planets are measured in **degrees (°)**. The full sky is divided into **360°** to answer \"how far ahead of the Sun is the Moon\" — tithi, nakshatra and yoga are all derived from this angle.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "३६०",
              unit: { ne: "°", en: "°" },
              label: { ne: "पूर्ण वृत्त", en: "Full circle" },
              desc: {
                ne: "आकाशको एक पूरा फेरो — सबै राशि र नक्षत्र यसैभित्र।",
                en: "One complete turn of the sky — all rashis and nakshatras within it.",
              },
            },
            {
              big: "१२",
              unit: { ne: "°", en: "°" },
              label: { ne: "१ तिथि", en: "1 tithi" },
              desc: {
                ne: "चन्द्र–सूर्यको कोणीय दूरी — ३६०° ÷ ३० तिथि।",
                en: "The Moon–Sun angular gap — 360° ÷ 30 tithis.",
              },
            },
            {
              big: "~१३",
              unit: { ne: "°२०′", en: "°20′" },
              label: { ne: "१ नक्षत्र", en: "1 nakshatra" },
              desc: {
                ne: "३६०° ÷ २७ नक्षत्र — चन्द्रको गति यसै स्केलमा मापिन्छ।",
                en: "360° ÷ 27 nakshatras — the Moon's motion is measured on this scale.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "हाम्रो दृष्टिकोण", en: "Our viewpoint" },
      eyebrow: "Geocentric framing",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वास्तवमा पृथ्वी सूर्यको वरिपरि घुम्छ, तर पात्रो बनाउँदा हामी *पृथ्वीबाट हेर्दा* के देखिन्छ भन्ने दृष्टिकोण (**भूकेन्द्रित**) प्रयोग गर्छौं — “आज सूर्य कुन राशिमा छ”, “चन्द्र कति अगाडि सर्‍यो”। यो सुविधाजनक हो र हजारौं वर्षदेखि प्रयोग भइरहेको छ।",
            en: "In reality the Earth orbits the Sun, but to build a calendar we use the viewpoint of *what we see from Earth* (**geocentric**) — \"which sign is the Sun in today\", \"how far the Moon has moved\". It is convenient and has been used for thousands of years.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सूर्यको मार्ग (क्रान्तिवृत्त)", en: "The Sun's path (ecliptic)" },
              p: {
                ne: "सूर्य, चन्द्र र ग्रहहरू लगभग एउटै पट्टीमा देखिन्छ — यही चन्द्र–मार्ग हो।",
                en: "The Sun, Moon and planets appear in nearly the same band — this is the ecliptic.",
              },
            },
            {
              h: { ne: "राशि चक्र", en: "The zodiac" },
              p: {
                ne: "यो मार्गलाई १२ भाग — मेषदेखि मीनसम्म; सङ्क्रान्ति = सूर्य अर्को राशिमा।",
                en: "This path split into 12 parts — Mesha to Meena; a sankranti = the Sun moving to the next sign.",
              },
            },
            {
              h: { ne: "सूर्यकेन्द्रित र भूकेन्द्रित", en: "Heliocentric vs geocentric" },
              p: {
                ne: "वास्तविक गति सूर्य–केन्द्रित; पात्रो गणना पृथ्वी–केन्द्रित — दुवै सही, प्रयोजन फरक।",
                en: "The real motion is Sun-centred; the patro calculation is Earth-centred — both correct, different purposes.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "१२ राशि", en: "12 rashis" },
      eyebrow: "Zodiac signs",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्यको मार्ग (क्रान्तिवृत्त) लाई **१२ बराबर भाग** मा बाँडिएको छ — प्रत्येक ~३०°~ को एक राशि। सङ्क्रान्ति = सूर्य अर्को राशिमा प्रवेश; बि.सं. को महिना पनि यही सूर्य–राशिमा आधारित।",
            en: "The Sun's path (ecliptic) is divided into **12 equal parts** — each a ~30°~ rashi. A sankranti = the Sun entering the next sign; the BS months are also based on this solar sign.",
          },
        },
        { kind: "diagram", id: "table-rashi" },
      ],
    },
    {
      title: { ne: "नव ग्रह", en: "Nine grahas" },
      eyebrow: "Nine grahas",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्ग र कुण्डलीमा **९ ग्रह** (नव ग्रह) प्रयोग हुन्छ — सात वास्तविक ग्रह र दुई *छाया बिन्दु* (राहु, केतु)। सबैको स्थिति कोणमा मापिन्छ।",
            en: "The almanac and kundali use **9 grahas** (nava graha) — seven real bodies and two *shadow points* (Rahu, Ketu). Every position is measured as an angle.",
          },
        },
        { kind: "diagram", id: "table-graha" },
      ],
    },
    {
      title: { ne: "२७ नक्षत्र र पद", en: "27 nakshatras & padas" },
      eyebrow: "Lunar mansions & padas",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्र–मार्ग **२७ नक्षत्र** मा बाँडिन्छ (प्रत्येक **१३°२०′**)। हरेक नक्षत्र फेरि **४ पद** (३°२०′ प्रति पद) — जन्म नामाक्षर र कुण्डलीका लागि यही पद प्रयोग हुन्छ।",
            en: "The Moon's path is divided into **27 nakshatras** (each **13°20′**). Each nakshatra is further split into **4 padas** (3°20′ per pada) — this pada is used for the birth name-syllable and the chart.",
          },
        },
        { kind: "diagram", id: "table-nakshatra" },
      ],
    },
    {
      title: { ne: "३० तिथि", en: "30 tithis" },
      eyebrow: "Lunar days",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्र र सूर्यबीचको कोण हरेक **१२°** बढ्दा नयाँ तिथि सुरु — शुक्ल पक्ष १–१५ (पूर्णिमासम्म), कृष्ण पक्ष १–१५ (औंसीसम्म)।",
            en: "Each time the Moon–Sun angle increases by **12°** a new tithi begins — Shukla Paksha 1–15 (to the full moon), Krishna Paksha 1–15 (to the new moon).",
          },
        },
        { kind: "diagram", id: "table-tithi" },
      ],
    },
    {
      title: { ne: "२७ योग", en: "27 yogas" },
      eyebrow: "Yogas",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्य र चन्द्रको **देशान्तर जोड** बढ्दै गए बढ्दै २७ योग बन्दै जान्छ — विष्कम्भदेखि वैधृतिसम्म। शुभ–अशुभ मुहूर्तमा योग पनि हेरिन्छ।",
            en: "As the **sum of the Sun's and Moon's longitudes** increases, the 27 yogas form in turn — from Vishkambha to Vaidhriti. Yoga is also checked for auspicious/inauspicious muhurtas.",
          },
        },
        { kind: "diagram", id: "table-yoga" },
      ],
    },
    {
      title: { ne: "११ करण", en: "11 karanas" },
      eyebrow: "Karanas",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "प्रत्येक तिथिको **आधा** (= ६° कोण) एक करण — महिनामा जम्मा ~६० करण~। नाम ११ मात्र: ७ चर (बारम्बार) र ४ स्थिर (महिनामा एक पटक)।",
            en: "**Half** of each tithi (= 6° of angle) is one karana — 60 karanas per month in all. Only 11 names: 7 movable (recurring) and 4 fixed (once a month).",
          },
        },
        { kind: "diagram", id: "table-karana" },
      ],
    },
    {
      title: { ne: "अर्को कदम", en: "What comes next" },
      eyebrow: "What comes next",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अब तपाईंले जान्नुपर्ने मूल कुरा — **के हेर्दैछौं**, **कसरी घुमिरहेको छ**, र **किन कोण गनिन्छ** — स्पष्ट भयो। अर्को लेखमा सौर्यमण्डल, पृथ्वीको झुकाव, चन्द्र कला र वास्तविक परिक्रमा चित्रसहित हेर्नुहोस्।",
            en: "Now the core ideas are clear — **what we're looking at**, **how it's moving**, and **why angles are counted**. In the next article, see the solar system, Earth's tilt, the Moon's phases and the real orbits with diagrams.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सौर्यमण्डल र चन्द्र गति", en: "Solar system & lunar motion" },
              p: {
                ne: "पृथ्वीको अण्डाकार कक्ष, २३.५° झुकाव, चन्द्रका कला।",
                en: "Earth's elliptical orbit, 23.5° tilt, the Moon's phases.",
              },
            },
            {
              h: { ne: "सौर vs चान्द्र पात्रो", en: "Solar vs lunar calendar" },
              p: {
                ne: "विक्रम सम्वत् किन दुई घडी मिलाएर चल्छ।",
                en: "Why Vikram Samvat runs by aligning two clocks.",
              },
            },
            {
              h: { ne: "पञ्चाङ्गका पाँच अङ्ग", en: "The five limbs of the almanac" },
              p: {
                ne: "तिथि, वार, नक्षत्र, योग, करण — कोणबाट कसरी जन्मिन्छन्।",
                en: "Tithi, vaara, nakshatra, yoga, karana — how they arise from angles.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यी आधार बुझिसकेपछि बाँकी लेखहरू सजिलो लाग्नेछ — प्रत्येकले माथिको एउटै भाषा (कोण, परिक्रमा, पृथ्वी–केन्द्रित दृष्टि) प्रयोग गर्छ।",
            en: "Once these basics are understood, the rest of the articles will feel easy — each uses the same language above (angle, revolution, Earth-centred view).",
          },
        },
      ],
    },
  ],
};
