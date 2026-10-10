import type { ArticleData } from "../../article-schema";

export const chandramana: ArticleData = {
  slug: "chandramana",
  seeAlso: ["sauramana", "tithi", "adhik-kshaya-maas", "bs-calendar"],
  sections: [
    {
      title: { ne: "चान्द्रमान भनेको के हो", en: "What Chāndramāna is" },
      eyebrow: "चान्द्रमान · the lunar measure",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*चान्द्रमान* समय नाप्ने त्यो प्रणाली हो जसले **चन्द्र र सूर्यबीचको सम्बन्ध**लाई आधार बनाउँछ। तिथि, पक्ष, चान्द्र मास र लगभग सबै चाडपर्व यही प्रणालीबाट आउँछन्।",
            en: "*Chāndramāna* is the system of reckoning time that takes the **Moon's relationship with the Sun** as its basis. Tithi, paksha, the lunar month and very nearly every festival come from it.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ध्यान दिनुपर्ने कुरा — यो चन्द्रको आकार वा स्थान मात्रको नाप होइन। मूल परिमाण चन्द्र र सूर्यको **कोणीय दूरी** हो।",
            en: "Note what it is not: it is not a measure of the Moon's shape or position alone. The fundamental quantity is the **angular separation** between Moon and Sun — the elongation.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "12°",
              label: { ne: "एक तिथि", en: "One tithi" },
              desc: {
                ne: "चन्द्र–सूर्य कोणान्तर १२° बढ्दा एक तिथि पूरा हुन्छ।",
                en: "A tithi completes as the Moon–Sun separation grows by 12°.",
              },
            },
            {
              big: "30",
              label: { ne: "तिथि / मास", en: "Tithis per month" },
              desc: {
                ne: "३६० ÷ १२ = ३० — एक चान्द्र चक्रमा तीस तिथि।",
                en: "360 ÷ 12 = 30 — thirty tithis in one lunar cycle.",
              },
            },
            {
              big: "29.53",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सांयोगिक मास", en: "Synodic month" },
              desc: {
                ne: "एक औंसीदेखि अर्को औंसीसम्मको औसत अवधि।",
                en: "The average span from one new moon to the next.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "tithi-elongation",
          caption: {
            ne: "चन्द्र र सूर्यबीचको कोणान्तर बढ्दै जाँदा तिथि क्रमशः अघि बढ्छ।",
            en: "As the angular separation between Moon and Sun grows, the tithi advances.",
          },
        },
      ],
    },
    {
      title: { ne: "दुई पक्ष", en: "The two pakshas" },
      eyebrow: "Shukla · Krishna",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तीस तिथिलाई दुई *पक्ष* मा बाँडिन्छ, प्रत्येक पन्ध्र तिथिको।",
            en: "The thirty tithis are divided into two *pakshas*, each of fifteen tithis.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "शुक्ल पक्ष", en: "Shukla Paksha" },
              p: {
                ne: "बढ्दो चन्द्र — प्रतिपदा → द्वितीया → तृतीया → … → **पूर्णिमा**। कोणान्तर ०° बाट १८०° तिर बढ्छ।",
                en: "The waxing half — Pratipada → Dvitīyā → Tritīyā → … → **Pūrṇimā**. The separation grows from 0° toward 180°.",
              },
            },
            {
              h: { ne: "कृष्ण पक्ष", en: "Krishna Paksha" },
              p: {
                ne: "घट्दो चन्द्र — प्रतिपदा → द्वितीया → तृतीया → … → **औंसी**। कोणान्तर १८०° बाट ३६०° तिर बढ्छ।",
                en: "The waning half — Pratipada → Dvitīyā → Tritīyā → … → **Amāvasyā**. The separation grows from 180° toward 360°.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "moon-phases",
        },
      ],
    },
    {
      title: { ne: "चान्द्र मास र ११ दिनको समस्या", en: "The lunar month and the 11-day problem" },
      eyebrow: "Why a fix is needed",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक औंसीदेखि अर्कोसम्म झन्डै `२९.५३` दिन लाग्छ — यसलाई **सांयोगिक मास** भनिन्छ। बाह्र सांयोगिक मास जोड्दा:",
            en: "From one new moon to the next takes about `29.53` days — the **synodic month**. Add twelve of them:",
          },
        },
        {
          kind: "diagram",
          id: "lunar-solar-gap",
        },
        {
          kind: "para",
          text: {
            ne: "यदि पात्रोले चान्द्र मास मात्र प्रयोग गर्थ्यो भने महिना बिस्तारै ऋतुभरि सर्दै जान्थे — दसैँ कहिले वर्षामा, कहिले जाडोमा पर्थ्यो। त्यसैले परम्परागत चान्द्र–सौर पात्रोलाई दुई चक्र मिलाउने **व्यवस्था** आवश्यक हुन्छ।",
            en: "If a calendar used only lunar months, its months would gradually walk through the seasons — Dashain would land in the monsoon one era and in winter another. Traditional lunisolar calendars therefore need a **mechanism** for reconciling the two cycles.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "अधिक मास", en: "Adhika māsa" },
              p: {
                ne: "झन्डै हरेक तीन वर्षमा एक **थप** चान्द्र महिना — जम्मा भएको फरक मिलाउन।",
                en: "An **extra** lunar month roughly every three years, absorbing the accumulated gap.",
              },
            },
            {
              h: { ne: "क्षय मास", en: "Kṣaya māsa" },
              p: {
                ne: "दुर्लभ अवस्थामा एक महिना **घट्छ** — जब एउटै चान्द्र मासभित्र दुई सङ्क्रान्ति पर्छन्।",
                en: "In rare cases a month is **dropped** — when two sankrantis fall within one lunar month.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "adhik-maas",
        },
      ],
    },
    {
      title: { ne: "दुवै किन चाहिन्छ", en: "Why the calendar needs both" },
      eyebrow: "The lunisolar idea",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यही चान्द्र–सौर प्रणालीको केन्द्रीय विचार हो — **सूर्यले लामो ऋतु ढाँचा** दिन्छ, **चन्द्रले छोटा विभाजन**।",
            en: "This is the central idea of a lunisolar system — the **Sun provides the long seasonal frame**, the **Moon the shorter divisions**.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "कुन प्रणाली", en: "System" },
            { ne: "के तय गर्छ", en: "What it sets" },
            { ne: "उदाहरण", en: "Example" },
          ],
          rows: [
            [
              { ne: "सौरमान", en: "Sauramāna" },
              { ne: "गते, महिनाको लम्बाइ, वर्षारम्भ, ऋतु", en: "Gate, month length, year start, ṛtu" },
              { ne: "बैशाख १, माघे सङ्क्रान्ति", en: "Baisakh 1, Maghe Sankranti" },
            ],
            [
              { ne: "चान्द्रमान", en: "Chāndramāna" },
              { ne: "तिथि, पक्ष, चाडपर्व, व्रत, मुहूर्त", en: "Tithi, paksha, festivals, fasts, muhurta" },
              { ne: "दसैँ, तिहार, पूर्णिमा, एकादशी", en: "Dashain, Tihar, Pūrṇimā, Ekādaśī" },
            ],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "एउटै पात्रोले दुवै बोक्ने हुनाले नेपाली पात्रोमा एउटै दिन “१ गते” र “शुक्ल तृतीया” दुवै हुन सक्छ — एउटा सूर्यको नाप, अर्को चन्द्रको।",
            en: "Because one calendar carries both, a single Nepali day can be \"gate 1\" and \"Shukla Tritīyā\" at once — one measured by the Sun, the other by the Moon.",
          },
        },
      ],
    },
  ],
};
