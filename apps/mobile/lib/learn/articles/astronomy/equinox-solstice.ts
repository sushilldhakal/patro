import type { ArticleData } from "../../article-schema";

/**
 * विषुव and अयनान्त in one article.
 *
 * They were two pages, and each spent a section re-deriving the other to say
 * what it was *not* — which is the shape of an article that wants to be joined
 * to its neighbour. Read together they are one idea: the Sun's क्रान्ति swings
 * between ±२३.४४° once a year, and these four points are where that swing
 * crosses zero and where it turns.
 */
export const equinoxSolstice: ArticleData = {
  slug: "equinox-solstice",
  seeAlso: ["axial-tilt", "why-seasons", "uttarayana-dakshinayana", "declination"],
  sections: [
    {
      title: { ne: "एउटै यात्राका चार बिन्दु", en: "Four points on one journey" },
      eyebrow: "Declination through the year",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीको `२३.४४°` झुकावका कारण सूर्यको *क्रान्ति* वर्षभरि `+२३.४४°` देखि `−२३.४४°` सम्म झुल्छ। यही एउटा झुलाइका **चार बिन्दु** ले विषुव र अयनान्त बनाउँछन्।",
            en: "Because of Earth's `23.44°` tilt, the Sun's *declination* swings from `+23.44°` to `−23.44°` and back once a year. Four points on that one swing give us the equinoxes and the solstices.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "विषुव — वक्रले शून्य काट्ने ठाउँ", en: "Equinox — where the curve crosses zero" },
              p: {
                ne: "सूर्य ठ्याक्कै **खगोलीय विषुवत् रेखामा**, क्रान्ति `०°`। दिन र रात झन्डै बराबर, र सूर्यको उत्तर–दक्षिण गति यहीँ **सबैभन्दा छिटो** हुन्छ।",
                en: "The Sun sits exactly on the **celestial equator**, declination `0°`. Day and night are nearly equal, and the Sun's north–south motion is at its **fastest** here.",
              },
            },
            {
              h: { ne: "अयनान्त — वक्र फर्किने ठाउँ", en: "Solstice — where the curve turns" },
              p: {
                ne: "क्रान्ति **चरम** `±२३.४४°` मा पुगेर फर्किन्छ। वर्षको सबैभन्दा लामो र छोटो दिन, र सूर्यको उत्तर–दक्षिण गति यहाँ झन्डै **रोकिन्छ**।",
                en: "Declination reaches its **extreme**, `±23.44°`, and reverses. The year's longest and shortest day — and the Sun's north–south motion here nearly **halts**.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "declination-year",
        },
        {
          kind: "para",
          text: {
            ne: "दुवै नामले नै आफ्नो अर्थ बोक्छन्। *विषुव* — विषुवत् रेखाबाट; लैटिनमा पनि *aequi* (बराबर) + *nox* (रात), किनभने दिन–रात बराबर हुने यही एक अवस्था हो। *अयनान्त* — अयन + अन्त, अर्थात् अयनको अन्त्य; लैटिनमा *sol* (सूर्य) + *sistere* (रोकिनु), किनभने सूर्य यहाँ रोकिएर फर्किन्छ।",
            en: "Both names carry their own meaning. *Vishuva* comes from विषुवत् रेखा, the equator; the Latin *aequi* (equal) + *nox* (night) says the same, since the equator crossing is the one moment day and night match. *Ayanānta* is अयन + अन्त, the end of an ayana; the Latin *sol* (sun) + *sistere* (to stand still) marks the same turn.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "बिन्दु", en: "Point" },
            { ne: "क्रान्ति", en: "Declination" },
            { ne: "कहिले", en: "When" },
            { ne: "नेपालमा", en: "In Nepal" },
          ],
          rows: [
            [
              { ne: "वसन्त विषुव", en: "Spring equinox" },
              "0°",
              { ne: "~चैत ६–७", en: "~21 Mar" },
              { ne: "दिन र रात झन्डै बराबर", en: "Day and night nearly equal" },
            ],
            [
              { ne: "ग्रीष्म अयनान्त", en: "Summer solstice" },
              "+23.44°",
              { ne: "~असार ६–७", en: "~21 Jun" },
              { ne: "सबैभन्दा लामो दिन", en: "Longest day" },
            ],
            [
              { ne: "शरद् विषुव", en: "Autumn equinox" },
              "0°",
              { ne: "~असोज ६–७", en: "~23 Sep" },
              { ne: "दिन र रात झन्डै बराबर", en: "Day and night nearly equal" },
            ],
            [
              { ne: "शीत अयनान्त", en: "Winter solstice" },
              "−23.44°",
              { ne: "~पुष ६–७", en: "~22 Dec" },
              { ne: "सबैभन्दा छोटो दिन", en: "Shortest day" },
            ],
          ],
        },
      ],
    },
    {
      title: { ne: "अयनान्त नै अयनको सन्धि हो", en: "The solstice is the ayana's hinge" },
      eyebrow: "Uttarayana and Dakshinayana",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वक्रको **उकालो आधा** — शीत अयनान्तदेखि ग्रीष्म अयनान्तसम्म — *उत्तरायण* हो: सूर्य उत्तरतिर लाग्दै छ। **ओरालो आधा** *दक्षिणायन*।",
            en: "The **rising half** of the curve — winter solstice to summer solstice — is *Uttarāyaṇa*: the Sun is working north. The **falling half** is *Dakṣiṇāyana*.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसैले अयनको साँचो सन्धि **अयनान्तमा** पर्छ, विषुवमा होइन — अयनान्त नै त्यो क्षण हो जब सूर्य दिशा बदल्छ। विषुव त बाटोको बीचमा पर्ने बिन्दु मात्र हो, जहाँ सूर्य सबैभन्दा छिटो हिँडिरहेको हुन्छ।",
            en: "So the true hinge of an ayana is a **solstice**, not an equinox — the solstice is the moment the Sun changes direction. An equinox is a midpoint along the way, where the Sun happens to be moving fastest.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "ऋतुको कुरा गर्दा यही सायन वक्र नै सन्दर्भ हो — बि.सं. महिना होइन। महिना निरयन छन्, वक्र सायन; त्यसैले दुई बिस्तारै छुट्टिन्छन्।",
            en: "When the subject is the ṛtus, this tropical curve is the reference — not the बि.सं. months. The months are sidereal and the curve is tropical, so the two slowly part company.",
          },
        },
      ],
    },
    {
      title: { ne: "दिन र रात ठ्याक्कै बराबर हुँदैनन्", en: "Day and night are not exactly equal" },
      eyebrow: "A small surprise",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नामले जे भने पनि, विषुवको दिन दिन र रात ठ्याक्कै `१२`–`१२` घण्टा हुँदैनन् — दिन झन्डै `८` मिनेट लामो हुन्छ। दुई कारणले।",
            en: "Despite the name, day and night are not exactly `12` hours each at an equinox — the day runs about `8` minutes longer. For two reasons.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सूर्यको बिम्ब", en: "The Sun has a disc" },
              p: {
                ne: "सूर्योदय भनेको बिम्बको **माथिल्लो किनारा** देखिनु हो, केन्द्र होइन — यसैले केही मिनेट थपिन्छ।",
                en: "Sunrise is when the disc's **upper edge** appears, not its centre — which adds a few minutes.",
              },
            },
            {
              h: { ne: "वायुमण्डलीय अपवर्तन", en: "Atmospheric refraction" },
              p: {
                ne: "वायुमण्डलले प्रकाश बङ्ग्याउँछ, त्यसैले सूर्य वास्तवमा क्षितिजमुनि हुँदै देखिन थाल्छ।",
                en: "The atmosphere bends light, so the Sun becomes visible while still physically below the horizon.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "दिन र रात साँच्चै बराबर हुने दिनलाई ~इक्विलक्स~ भनिन्छ, र यो विषुवभन्दा केही दिन अगाडि वा पछाडि पर्छ — अक्षांशअनुसार फरक।",
            en: "The day on which they truly are equal is called the ~equilux~, and it falls a few days before or after the equinox, depending on latitude.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अयनान्ततिर उल्टो कुरा देखिन्छ: केही दिनसम्म सूर्य क्षितिजको झन्डै उही ठाउँबाट उदाउँछ, किनभने क्रान्ति परिवर्तनको दर शून्यतिर झरेको हुन्छ। यही कारण प्राचीन कालमा अयनान्त पत्ता लगाउन सजिलो थियो — ~गनोमन~ ले वर्षको सबैभन्दा लामो र छोटो मध्याह्न छायाँ देखाउँथ्यो।",
            en: "Around a solstice the opposite shows: for several days the Sun rises from almost the same spot on the horizon, because the rate of change of declination has dropped to nearly zero. This is why solstices were the easy ones to detect in antiquity — a ~gnomon~ showed the year's longest and shortest noon shadow.",
          },
        },
      ],
    },
    {
      title: { ne: "सङ्क्रान्तिसँग नमिसाउनुहोस्", en: "Do not confuse these with sankranti" },
      eyebrow: "Different frames",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "विषुव र अयनान्त **सायन** घटना हुन् — सूर्यको क्रान्तिले परिभाषित। सङ्क्रान्ति **निरयन** घटना हो — राशि सीमाले परिभाषित। यी फरक ढाँचाका नाप हुन्।",
            en: "Equinoxes and solstices are **tropical** events, defined by declination. A sankranti is a **sidereal** event, defined by a sign boundary. They are measurements in different frames.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "आज यीबीच झन्डै `२४` दिनको अन्तर छ, र अयन चलनका कारण यो बढ्दै जान्छ। कुनै समय यी मिल्थे — त्यसैले परम्परागत नामले अझै पुरानो मेल झल्काउँछ।",
            en: "Today they sit about `24` days apart, and precession keeps widening the gap. They once coincided, which is why the traditional names still echo the old alignment.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "छोटोमा: सबैभन्दा छोटो दिन पुषमा हुन्छ, माघे सङ्क्रान्तिमा होइन।",
            en: "In short: the shortest day falls in पुष, not at Maghe Sankranti.",
          },
        },
      ],
    },
    {
      title: { ne: "पात्रोका लागि किन महत्त्वपूर्ण", en: "Why it matters to a calendar" },
      eyebrow: "The tropical anchor",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वसन्त विषुव सायन प्रणालीको **आधारशिला** हो। ग्रेगोरियन पात्रोको लीप वर्ष नियम यसैलाई `२१` मार्चतिर स्थिर राख्न बनाइएको हो।",
            en: "The spring equinox is the **anchor** of the tropical system. The Gregorian leap-year rule exists to hold it near `21` March.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "नेपाली पात्रो भने निरयन भएकाले विषुवलाई सन्दर्भ मान्दैन — त्यसैले नेपाली नयाँ वर्ष विषुवको दिन नभई त्यसको झन्डै `२४` दिनपछि पर्छ। यही अन्तर ~अयनांश~ हो।",
            en: "The Nepali calendar, being sidereal, does not use the equinox as its reference — which is why its new year falls not on the equinox but about `24` days later. That interval is the ~ayanamsha~.",
          },
        },
        {
          kind: "diagram",
          id: "equinox-precession",
          caption: {
            ne: "विषुव बिन्दु ताराको सापेक्ष बिस्तारै सर्दै — सायन र निरयन प्रणालीको मूल भिन्नता।",
            en: "The equinox point sliding against the stars — the root difference between the tropical and sidereal systems.",
          },
        },
      ],
    },
  ],
};
