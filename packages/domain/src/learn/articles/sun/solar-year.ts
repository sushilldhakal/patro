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
          kind: "note",
          text: {
            ne: "“सुरुको बिन्दु” तारा हो कि विषुव — यही [[sidereal-vs-tropical|निरयन र सायन]] को विषय हो। नेपाली वर्ष मेषको निरयन फिर्ती हो; ग्रेगोरियन वर्ष विषुवको सायन फिर्ती। दुवै सँगै स्थिर रहँदैनन्, त्यसैले ऋतु सर्छ।",
            en: "Which starting point — the stars or the equinox — is [[sidereal-vs-tropical|sidereal and tropical]]. The Nepali year is the sidereal return to Mesha; the Gregorian year is the tropical return to the equinox. Both cannot stay fixed, which is why the ṛtus drift.",
          },
        },
      ],
    },
  ],
};
