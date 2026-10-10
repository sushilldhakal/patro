import type { ArticleData } from "../../article-schema";

export const shuklaKrishnaPaksha: ArticleData = {
  slug: "shukla-krishna-paksha",
  seeAlso: ["tithi", "amavasya-purnima", "lunar-month", "chandramana"],
  sections: [
    {
      title: { ne: "पक्ष — चान्द्र मासका दुई आधा", en: "Paksha — the two halves of a lunar month" },
      eyebrow: "15 tithis each",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चान्द्र मासका `३०` तिथिलाई दुई बराबर भागमा बाँडिन्छ, प्रत्येक `१५` तिथिको। यी भागलाई *पक्ष* भनिन्छ।",
            en: "The `30` tithis of a lunar month are divided into two equal halves of `15` tithis each. Each half is a *paksha*.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "शुक्ल पक्ष", en: "Shukla Paksha" },
              p: {
                ne: "**उज्यालो पक्ष** — औंसीपछि चन्द्र बढ्दै जान्छ, पूर्णिमामा टुङ्गिन्छ। कोणान्तर `०°` → `१८०°`।",
                en: "The **bright half** — after the new moon the Moon waxes, ending at the full moon. Separation `0°` → `180°`.",
              },
            },
            {
              h: { ne: "कृष्ण पक्ष", en: "Krishna Paksha" },
              p: {
                ne: "**अँध्यारो पक्ष** — पूर्णिमापछि चन्द्र घट्दै जान्छ, औंसीमा टुङ्गिन्छ। कोणान्तर `१८०°` → `३६०°`।",
                en: "The **dark half** — after the full moon the Moon wanes, ending at the new moon. Separation `180°` → `360°`.",
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
      title: { ne: "तिथिका नाम दोहोरिन्छन्", en: "The tithi names repeat" },
      eyebrow: "Why the paksha must be named",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "दुवै पक्षमा तिथिका नाम उही हुन्छन् — प्रतिपदा, द्वितीया, तृतीया … चतुर्दशी। फरक पन्ध्रौँमा मात्र आउँछ।",
            en: "Both pakshas use the same tithi names — Pratipadā, Dvitīyā, Tritīyā … Caturdaśī. Only the fifteenth differs.",
          },
        },
        {
          kind: "diagram",
          id: "paksha-strip",
        },
        {
          kind: "para",
          text: {
            ne: "यसैले “तृतीया” मात्र भन्नु अपूर्ण हुन्छ — **शुक्ल तृतीया** र **कृष्ण तृतीया** महिनामा दुई फरक दिन हुन्, झन्डै पन्ध्र दिनको अन्तरमा।",
            en: "Saying just \"Tritīyā\" is therefore incomplete — **Shukla Tritīyā** and **Krishna Tritīyā** are two different days about a fortnight apart.",
          },
        },
        {
          kind: "diagram",
          id: "table-tithi",
        },
      ],
    },
    {
      title: { ne: "मास कहाँ सुरु हुन्छ — दुई परम्परा", en: "Where the month starts — two traditions" },
      eyebrow: "Amanta vs Purnimanta",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पक्षको क्रम कुन पहिले भन्ने कुरा चान्द्र मास कहाँ सुरु हुन्छ भन्नेमा निर्भर छ, र यहाँ दुई परम्परा छन्।",
            en: "Which paksha comes first depends on where the lunar month is taken to begin, and here two traditions differ.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "परम्परा", en: "Tradition" },
            { ne: "मास सुरु", en: "Month begins" },
            { ne: "पक्षको क्रम", en: "Paksha order" },
            { ne: "प्रचलन", en: "Followed in" },
          ],
          rows: [
            [
              { ne: "अमान्त", en: "Amānta" },
              { ne: "औंसीपछि", en: "After the new moon" },
              { ne: "शुक्ल → कृष्ण", en: "Shukla → Krishna" },
              { ne: "नेपाल, दक्षिण भारत", en: "Nepal, South India" },
            ],
            [
              { ne: "पूर्णिमान्त", en: "Pūrṇimānta" },
              { ne: "पूर्णिमापछि", en: "After the full moon" },
              { ne: "कृष्ण → शुक्ल", en: "Krishna → Shukla" },
              { ne: "उत्तर भारत", en: "North India" },
            ],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "तिथि आफैँ दुवैमा उही हुन्छ — फरक त्यो तिथि **कुन महिनाको** भनिन्छ भन्नेमा मात्र पर्छ। यही कारण नेपाल र उत्तर भारतमा एउटै पर्व फरक नाम गरेको महिनामा पर्न सक्छ।",
            en: "The tithi itself is the same in both — what differs is **which month** it is said to belong to. This is why one festival can fall in differently-named months in Nepal and North India.",
          },
        },
      ],
    },
  ],
};
