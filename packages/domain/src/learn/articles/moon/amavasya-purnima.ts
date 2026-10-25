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
          kind: "note",
          text: {
            ne: "हरेक औंसी वा पूर्णिमा ग्रहण होइन। चन्द्रको कक्ष झन्डै ५° ढल्केको छ, र ग्रहण पात नजिक मात्र लाग्छ — [[rahu-ketu-nodes|राहु–केतु र पात रेखा]] र [[eclipses|ग्रहण]]।",
            en: "Not every new or full moon is an eclipse. The Moon's orbit is tilted about 5°, and an eclipse falls only near a node — [[rahu-ketu-nodes|Rāhu, Ketu and the nodes]] and [[eclipses|eclipses]].",
          },
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
