import type { ArticleData } from "../../article-schema";

export const calcKarana: ArticleData = {
  slug: "calc-karana",
  seeAlso: ["karana", "calc-tithi", "calc-yoga", "five-limbs-together"],
  sections: [
    {
      title: { ne: "करण — तिथिको आधा", en: "Karana — half a tithi" },
      eyebrow: "6° instead of 12°",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "करणको गणना तिथिकै हो, केवल भाजक आधा — `१२°` को सट्टा `६°`। त्यसैले एक चान्द्र मासमा `६०` करण खण्ड हुन्छन्।",
            en: "Karana is computed exactly like tithi with half the divisor — `6°` instead of `12°`. A lunar month therefore holds `60` karana slots.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "करणको चौडाइ = `६°` — तिथिको ठ्याक्कै आधा", en: "karana span = `6°` — exactly half a tithi" },
            { ne: "करण सूचकाङ्क = (कोणान्तर ÷ `६°`) को पूर्णांक भाग", en: "karana index = integer part of (elongation ÷ `6°`)" },
          ],
          example: [
            { k: { ne: "पूरा वृत्त", en: "full circle" }, v: "360°" },
            { k: { ne: "३६० ÷ ६", en: "360 ÷ 6" }, v: "60" },
          ],
          result: {
            ne: "एक चान्द्र मासमा **६० करण खण्ड** — ३० तिथि × २। त्यसैले हरेक तिथिमा ठ्याक्कै दुई करण पर्छन्।",
            en: "**60 karana slots** in a lunar month — 30 tithis × 2. Every tithi therefore carries exactly two karanas.",
          },
        },
      ],
    },
    {
      title: { ne: "६० खण्ड, तर ११ नाम", en: "Sixty slots, but only eleven names" },
      eyebrow: "Movable and fixed",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "`६०` खण्ड छन् तर नाम जम्मा `११`। कारण — सात नाम बारम्बार दोहोरिन्छन्, र चार नाम मासमा एक पटक मात्र आउँछन्।",
            en: "There are `60` slots but only `11` names. Seven of them repeat over and over; four occur just once in the month.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "चर करण — ७ नाम", en: "Movable — 7 names" },
              p: {
                ne: "बव, बालव, कौलव, तैतिल, गर, वणिज, **विष्टि** — यी `५६` खण्डमा आठ पटक चक्रमा दोहोरिन्छन्।",
                en: "Bava, Balava, Kaulava, Taitila, Gara, Vanija, **Vishti** — cycling eight times through `56` slots.",
              },
            },
            {
              h: { ne: "स्थिर करण — ४ नाम", en: "Fixed — 4 names" },
              p: {
                ne: "शकुनि, चतुष्पद, नाग, किंस्तुघ्न — मासमा एक–एक पटक मात्र, चक्रको दुई छेउमा।",
                en: "Shakuni, Chatushpada, Naga, Kimstughna — once each per month, at the two ends of the cycle.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "engine मा यही संरचना देखिन्छ: सूचकाङ्क `५७` भन्दा माथि पुगेपछि स्थिर पुच्छर (`Shakuni, Chatushpada, Naga`) प्रयोग हुन्छ; बाँकीमा सात चर नामको चक्र `(index − 1) % 7` ले चल्छ।",
            en: "The engine mirrors that structure: past index `57` it uses the fixed tail (`Shakuni, Chatushpada, Naga`); elsewhere the seven movable names cycle by `(index − 1) % 7`.",
          },
        },
        {
          kind: "diagram",
          id: "table-karana",
        },
      ],
    },
    {
      title: { ne: "विष्टि — भद्रा", en: "Vishti — Bhadrā" },
      eyebrow: "The one to avoid",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एघार करणमध्ये **विष्टि** विशेष रूपमा उल्लेख्य छ, किनभने यसलाई ~भद्रा~ भनिन्छ र यस अवधिमा शुभ कार्य गरिँदैन।",
            en: "Among the eleven, **Vishti** stands out: it is called ~Bhadrā~, and auspicious undertakings are not begun during it.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "विष्टि चर करण भएकाले मासमा **आठ पटक** आउँछ — झन्डै हरेक चार दिनमा एक पटक, र प्रत्येक पटक करिब आधा दिन रहन्छ। त्यसैले पञ्चाङ्गमा भद्राको सुरु र अन्त्य समय छुट्टै देखाइन्छ।",
            en: "Being a movable karana, Vishti comes round **eight times** a month — roughly every four days, lasting about half a day each time. Panchangas therefore print Bhadrā's start and end times separately.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "करण आधा तिथिको भएकाले यसको अवधि पनि तिथिजस्तै लचिलो हुन्छ — `९` देखि `१३` घण्टासम्म, चन्द्रको गतिअनुसार।",
            en: "Because a karana is half a tithi its length is equally elastic — anywhere from `9` to `13` hours, depending on the Moon's speed.",
          },
        },
      ],
    },
  ],
};
