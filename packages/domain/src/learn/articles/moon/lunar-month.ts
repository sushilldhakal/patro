import type { ArticleData } from "../../article-schema";

export const lunarMonth: ArticleData = {
  slug: "lunar-month",
  seeAlso: ["chandramana", "amavasya-purnima", "lunar-solar-drift", "adhik-kshaya-maas"],
  sections: [
    {
      title: { ne: "सांयोगिक मास — औंसीदेखि औंसीसम्म", en: "The synodic month — new moon to new moon" },
      eyebrow: "29.53 days",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक औंसीदेखि अर्को औंसीसम्मको अवधिलाई *सांयोगिक मास* भनिन्छ। यसको औसत लम्बाइ हो:",
            en: "The span from one new moon to the next is the *synodic month*. Its average length is:",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "29.53",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सांयोगिक मास", en: "Synodic month" },
              desc: {
                ne: "चन्द्रले सूर्यसँगको उही सम्बन्धमा फर्किन लाग्ने समय — चान्द्र पात्रोको आधार।",
                en: "The time for the Moon to return to the same relationship with the Sun — the basis of the lunar calendar.",
              },
            },
            {
              big: "27.32",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "नाक्षत्र मास", en: "Sidereal month" },
              desc: {
                ne: "चन्द्र ताराको सापेक्ष उही ठाउँमा फर्किन लाग्ने समय — नक्षत्र गणनाको आधार।",
                en: "The time for the Moon to return to the same place against the stars — the basis of nakshatra counting.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यी दुई किन फरक? किनभने चन्द्रले पृथ्वीको एक फेरो पूरा गर्दा पृथ्वी आफैँ सूर्यको वरिपरि झन्डै `२७°` अघि बढिसकेको हुन्छ। सूर्यसँगको उही कोणमा फर्किन चन्द्रले **थप दुई दिनजति** पछ्याउनुपर्छ।",
            en: "Why do they differ? Because while the Moon completes one orbit, Earth itself has moved about `27°` along its own orbit. To restore the same angle with the Sun the Moon must **chase for roughly two more days**.",
          },
        },
        {
          kind: "diagram",
          id: "moon-phases",
        },
      ],
    },
    {
      title: { ne: "३० तिथि, तर ३० दिन होइन", en: "Thirty tithis, but not thirty days" },
      eyebrow: "The half-day remainder",
      blocks: [
        {
          kind: "note",
          text: {
            ne: "चान्द्र मासमा ३० तिथि हुन्छन् र दिन झन्डै २९.५३ मात्र। तिथि २४ घण्टाको किन हुँदैन, र कहिले दोहोरिन्छ वा हराउँछ, [[tithi-not-24-hours|तिथि २४ घण्टाको किन हुँदैन]] र [[tithi-vriddhi-kshaya|तिथि वृद्धि र क्षय]] मा छ।",
            en: "A lunar month holds 30 tithis and only about 29.53 days. Why a tithi is not 24 hours, and when one repeats or disappears, is [[tithi-not-24-hours|why a tithi is not 24 hours]] and [[tithi-vriddhi-kshaya|when a tithi repeats or skips]].",
          },
        },
      ],
    },
    {
      title: { ne: "मासका नाम कहाँबाट आउँछन्", en: "Where the month names come from" },
      eyebrow: "Nakshatra of the full moon",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चान्द्र मासका नाम त्यो महिनाको **पूर्णिमामा चन्द्र कुन नक्षत्रमा पर्छ** भन्नेबाट आएका हुन्।",
            en: "The lunar months are named after the **nakshatra the Moon occupies at that month's full moon**.",
          },
        },
        {
          kind: "table",
          caption: {
            ne: "मासको नाम र सम्बन्धित नक्षत्र",
            en: "Month names and the nakshatra behind each",
          },
          headers: [
            { ne: "चान्द्र मास", en: "Lunar month" },
            { ne: "नक्षत्र", en: "Nakshatra" },
          ],
          rows: [
            [{ ne: "वैशाख", en: "Vaiśākha" }, { ne: "विशाखा", en: "Vishakha" }],
            [{ ne: "ज्येष्ठ", en: "Jyeṣṭha" }, { ne: "ज्येष्ठा", en: "Jyeshtha" }],
            [{ ne: "आषाढ", en: "Āṣāḍha" }, { ne: "पूर्वाषाढा", en: "Purvashadha" }],
            [{ ne: "श्रावण", en: "Śrāvaṇa" }, { ne: "श्रवण", en: "Shravana" }],
            [{ ne: "भाद्र", en: "Bhādra" }, { ne: "पूर्वभाद्रपद", en: "Purvabhadrapada" }],
            [{ ne: "आश्विन", en: "Āśvina" }, { ne: "अश्विनी", en: "Ashwini" }],
            [{ ne: "कार्तिक", en: "Kārtika" }, { ne: "कृत्तिका", en: "Krittika" }],
            [{ ne: "मार्गशीर्ष", en: "Mārgaśīrṣa" }, { ne: "मृगशिरा", en: "Mrigashira" }],
            [{ ne: "पौष", en: "Pauṣa" }, { ne: "पुष्य", en: "Pushya" }],
            [{ ne: "माघ", en: "Māgha" }, { ne: "मघा", en: "Magha" }],
            [{ ne: "फाल्गुन", en: "Phālguna" }, { ne: "उत्तरफाल्गुनी", en: "Uttaraphalguni" }],
            [{ ne: "चैत्र", en: "Caitra" }, { ne: "चित्रा", en: "Chitra" }],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "नेपाली पात्रोका महिनाका नाम यिनै हुन् — तर तिनको **लम्बाइ** चान्द्र मासले होइन, सूर्यको राशि–गतिले तय गर्छ। नाम चन्द्रबाट, गते सूर्यबाट।",
            en: "These are the names the Nepali months carry — but their **length** is set by the Sun's motion through the signs, not by the lunar month. Names from the Moon, gate from the Sun.",
          },
        },
      ],
    },
  ],
};
