import type { ArticleData } from "../../article-schema";

export const amavasyaPurnima: ArticleData = {
  slug: "amavasya-purnima",
  seeAlso: ["shukla-krishna-paksha", "eclipses", "tithi", "lunar-month"],
  sections: [
    {
      title: { ne: "चान्द्र मासका दुई सन्धि बिन्दु", en: "The two hinge points of the lunar month" },
      eyebrow: "0° and 180°",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "औंसी र पूर्णिमा केवल “अँध्यारो” र “उज्यालो” रात होइनन् — यी चन्द्र र सूर्यको कोणान्तरका **ठ्याक्कै दुई अवस्था** हुन्।",
            en: "Amāvasyā and Pūrṇimā are not merely a dark night and a bright one — they are **two exact states** of the Moon–Sun separation.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "0°",
              label: { ne: "औंसी", en: "Amāvasyā" },
              desc: {
                ne: "चन्द्र र सूर्य एउटै दिशामा — चन्द्रको उज्यालो भाग पृथ्वीबाट देखिँदैन।",
                en: "Moon and Sun in the same direction — the lit face turns away from Earth.",
              },
            },
            {
              big: "180°",
              label: { ne: "पूर्णिमा", en: "Pūrṇimā" },
              desc: {
                ne: "चन्द्र सूर्यको ठीक विपरीत — पूरै उज्यालो भाग पृथ्वीतिर फर्किन्छ।",
                en: "Moon opposite the Sun — the whole lit face faces Earth.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यी दुई बिन्दुले चान्द्र मासलाई दुई पक्षमा काट्छन्, र चान्द्र पात्रोका सबै गणना यिनैबाट सुरु र समाप्त हुन्छन्।",
            en: "These two points cut the lunar month into its two pakshas, and every lunar-calendar count begins and ends at one of them.",
          },
        },
      ],
    },
    {
      title: { ne: "हरेक औंसीमा ग्रहण किन लाग्दैन", en: "Why every new moon is not an eclipse" },
      eyebrow: "The 5° tilt",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "औंसीमा चन्द्र सूर्य र पृथ्वीको बीचमा पर्छ, र पूर्णिमामा पृथ्वी बीचमा — त्यसो भए हरेक महिना ग्रहण किन लाग्दैन?",
            en: "At new moon the Moon sits between Sun and Earth; at full moon Earth sits between them. So why is there not an eclipse every month?",
          },
        },
        {
          kind: "para",
          text: {
            ne: "कारण — चन्द्रको कक्ष क्रान्तिवृत्तसँग ठ्याक्कै मिल्दैन, झन्डै `५°` झुकेको छ। त्यसैले प्रायः औंसीमा चन्द्र सूर्यभन्दा माथि वा तल हुन्छ, ठीक अगाडि हुँदैन।",
            en: "Because the Moon's orbit is not flush with the ecliptic — it is tilted by about `5°`. At most new moons the Moon passes above or below the Sun rather than across it.",
          },
        },
        {
          kind: "diagram",
          id: "moon-orbit-tilt",
          caption: {
            ne: "चन्द्र कक्षको ~५° झुकाव — यसैले ग्रहण दुर्लभ बन्छ।",
            en: "The Moon's ~5° orbital tilt — what makes eclipses rare rather than monthly.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ग्रहण त्यतिबेला मात्र सम्भव हुन्छ जब औंसी वा पूर्णिमा ~पात~ नजिक पर्छ — जहाँ चन्द्रको कक्ष क्रान्तिवृत्त काट्छ। परम्परामा यी दुई बिन्दुलाई **राहु** र **केतु** भनिन्छ।",
            en: "An eclipse is possible only when a new or full moon falls near a ~node~ — where the Moon's orbit crosses the ecliptic. Tradition names those two points **Rāhu** and **Ketu**.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "औंसी + पात", en: "New moon + node" },
              p: { ne: "**सूर्यग्रहण** — चन्द्रले सूर्य छेक्छ।", en: "**Solar eclipse** — the Moon covers the Sun." },
            },
            {
              h: { ne: "पूर्णिमा + पात", en: "Full moon + node" },
              p: { ne: "**चन्द्रग्रहण** — पृथ्वीको छायाँ चन्द्रमा पर्छ।", en: "**Lunar eclipse** — Earth's shadow falls on the Moon." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "पात्रोमा यिनको भूमिका", en: "Their role in the calendar" },
      eyebrow: "Anchors and festivals",
      blocks: [
        {
          kind: "list",
          items: [
            {
              ne: "**मासको सीमा** — अमान्त परम्परामा औंसीले, पूर्णिमान्तमा पूर्णिमाले चान्द्र मास टुङ्ग्याउँछ।",
              en: "**Month boundary** — in the Amānta tradition the new moon closes the lunar month; in Pūrṇimānta, the full moon does.",
            },
            {
              ne: "**अधिक मासको परीक्षण** — कुनै चान्द्र मासभित्र सङ्क्रान्ति परेन भने त्यो अधिक मास हुन्छ; यो जाँच औंसीदेखि औंसीसम्म गरिन्छ।",
              en: "**The adhika-masa test** — a lunar month containing no sankranti is an extra month, and that test runs from new moon to new moon.",
            },
            {
              ne: "**पर्व** — बुद्ध जयन्ती, जनै पूर्णिमा, कोजाग्रत पूर्णिमा पूर्णिमामा; औंसी श्राद्ध र कुशे औंसी औंसीमा।",
              en: "**Festivals** — Buddha Jayanti, Janai Purnima and Kojagrat Purnima fall on full moons; Aunsi Shraddha and Kushe Aunsi on new moons.",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "औंसी र पूर्णिमा क्षणिक घटना हुन् — कुनै निश्चित घडीमा ठ्याक्कै `०°` वा `१८०°` पुगिन्छ। त्यो क्षण कुन दिनमा पर्छ भन्ने कुरा फेरि स्थानीय सूर्योदयले तय गर्छ।",
            en: "Both are instantaneous — the separation hits exactly `0°` or `180°` at one moment. Which day that moment belongs to is, once again, decided by local sunrise.",
          },
        },
      ],
    },
  ],
};
