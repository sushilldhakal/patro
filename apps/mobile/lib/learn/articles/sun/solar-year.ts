import type { ArticleData } from "../../article-schema";

export const solarYear: ArticleData = {
  slug: "solar-year",
  seeAlso: ["sauramana", "rashi", "sankranti", "sidereal-vs-tropical"],
  sections: [
    {
      title: { ne: "वर्ष = राशिचक्रको एक फेरो", en: "A year is one lap of the zodiac" },
      eyebrow: "360° of solar longitude",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सौर वर्षको परिभाषा दिन गनेर होइन, **कोण नापेर** दिइन्छ: सूर्य क्रान्तिवृत्तमा `३६०°` पूरा गरेर सुरुको बिन्दुमा फर्किँदा एक वर्ष पूरा हुन्छ।",
            en: "A solar year is defined not by counting days but by **measuring an angle**: one year is complete when the Sun has covered `360°` along the ecliptic and returned to its starting point.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसै कारण वर्षमा दिनको सङ्ख्या पूर्णाङ्क हुँदैन। पृथ्वीले परिक्रमा पूरा गर्दा घुर्णनको सङ्ख्या ठ्याक्कै मिल्ने कुनै कारण छैन — र मिल्दैन पनि।",
            en: "This is why a year is not a whole number of days. There is no reason for Earth's rotations to come out even against one orbit — and they do not.",
          },
        },
        {
          kind: "diagram",
          id: "earth-orbit",
          caption: {
            ne: "पृथ्वीको परिक्रमा — पृथ्वीबाट हेर्दा यही गति सूर्यको राशिचक्र यात्रा बनेर देखिन्छ।",
            en: "Earth's orbit — seen from Earth, this same motion appears as the Sun's journey through the zodiac.",
          },
        },
      ],
    },
    {
      title: { ne: "सूर्यको देखिने गति", en: "The Sun's apparent motion" },
      eyebrow: "About 1° a day",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीबाट हेर्दा सूर्य ताराको पृष्ठभूमिमा दिनको झन्डै `१°` का दरले पूर्वतिर सर्दै जान्छ।",
            en: "Seen from Earth, the Sun creeps eastward against the background stars by roughly `1°` a day.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "0.953°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "न्यूनतम गति", en: "Slowest" },
              desc: {
                ne: "असार–साउनतिर, पृथ्वी अपसौर (सूर्यबाट सबैभन्दा टाढा) नजिक हुँदा।",
                en: "Around Asar–Shrawan, when Earth is near aphelion — farthest from the Sun.",
              },
            },
            {
              big: "1.019°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "अधिकतम गति", en: "Fastest" },
              desc: {
                ne: "पुष–माघतिर, पृथ्वी उपसौर (सूर्यको सबैभन्दा नजिक) हुँदा।",
                en: "Around Poush–Magh, when Earth is at perihelion — closest to the Sun.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यो `०.९५°`–`१.०२°` को घटबढ सानो देखिन्छ, तर यसैले नेपाली महिनाको लम्बाइ तय गर्छ। सूर्य ढिलो हिँड्दा राशि पार गर्न बढी दिन लाग्छ — त्यसैले **असार `३२` दिनको र पुष `२९` दिनको** हुन सक्छ।",
            en: "That swing between `0.95°` and `1.02°` looks small, but it is what sets Nepali month lengths. When the Sun moves slowly it needs more days to cross a sign — which is why **Asar can run to `32` days while Poush runs to `29`**.",
          },
        },
      ],
    },
    {
      title: { ne: "कुन वर्ष — नाक्षत्र कि सायन?", en: "Which year — sidereal or tropical?" },
      eyebrow: "The choice that defines a calendar",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "“सूर्य सुरुको बिन्दुमा फर्कियो” भन्दा — **कुन सुरुको बिन्दु**? उत्तर फरक भए वर्षको लम्बाइ पनि फरक हुन्छ।",
            en: "\"The Sun returns to its starting point\" — but **which starting point**? Different answers give different year lengths.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "वर्ष", en: "Year" },
            { ne: "सन्दर्भ बिन्दु", en: "Reference point" },
            { ne: "लम्बाइ", en: "Length" },
            { ne: "प्रयोग", en: "Used by" },
          ],
          rows: [
            [
              { ne: "नाक्षत्र वर्ष", en: "Sidereal year" },
              { ne: "स्थिर तारा", en: "The fixed stars" },
              "365.2564",
              { ne: "नेपाली / वैदिक पात्रो", en: "Nepali / Vedic calendar" },
            ],
            [
              { ne: "सायन वर्ष", en: "Tropical year" },
              { ne: "वसन्त विषुव", en: "The vernal equinox" },
              "365.2422",
              { ne: "ग्रेगोरियन पात्रो", en: "Gregorian calendar" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "नेपाली पात्रोले **नाक्षत्र वर्ष** रोज्छ — सूर्य ताराको सापेक्ष मेषको आरम्भमा फर्किँदा नयाँ वर्ष। ग्रेगोरियनले सायन वर्ष रोज्छ, जसले ऋतु स्थिर राख्छ।",
            en: "The Nepali calendar chooses the **sidereal year** — a new year when the Sun returns to the start of Mesha against the stars. The Gregorian chooses the tropical year, which holds the seasons fixed.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "दुवै सँगै स्थिर राख्न सकिँदैन — यही अनिवार्य छनोटको परिणाम ~ऋतु सर्ने~ घटना हो।",
            en: "Both cannot be held fixed at once — and that unavoidable choice is what produces the ~drift of the ṛtus~.",
          },
        },
      ],
    },
  ],
};
