import type { ArticleData } from "../../article-schema";

export const makaraSankranti: ArticleData = {
  slug: "makara-sankranti",
  seeAlso: ["uttarayana-dakshinayana", "sankranti", "equinox-solstice"],
  sections: [
    {
      title: { ne: "माघे सङ्क्रान्ति", en: "Maghe Sankranti" },
      eyebrow: "Sun enters Makara",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*मकर सङ्क्रान्ति* सूर्य मकर राशिमा प्रवेश गर्ने क्षण हो — निरयन देशान्तर `२७०°`। नेपालमा यो **माघे सङ्क्रान्ति** हो, र माघ १ गते पर्छ।",
            en: "*Makara Sankranti* is the moment the Sun enters Makara — sidereal longitude `270°`. In Nepal this is **Maghe Sankranti**, and it falls on Magh 1.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ग्रेगोरियन पात्रोमा यो सामान्यतया `१४`–`१५` जनवरीमा पर्छ, र वर्षभरिका सङ्क्रान्तिमध्ये सबैभन्दा व्यापक रूपमा मनाइने पर्व हो — तरुल, चाकु, तिलको लड्डु र घिउ–चाम्रे खाने चलनसहित।",
            en: "In the Gregorian calendar it usually falls on `14`–`15` January, and it is the most widely observed of the year's sankrantis — marked with yam, chaku, sesame sweets and ghee.",
          },
        },
      ],
    },
    {
      title: { ne: "यो शीत अयनान्त होइन", en: "It is not the winter solstice" },
      eyebrow: "A common confusion",
      blocks: [
        {
          kind: "note",
          text: {
            ne: "माघे सङ्क्रान्तिलाई प्रायः सबैभन्दा छोटो दिन ठानिन्छ। होइन। अयनान्त सायन हो, सङ्क्रान्ति निरयन — [[equinox-solstice|विषुव र अयनान्त]] ले छुट्याउँछ। परम्पराले उत्तरायण यहीँबाट गन्ने कारण, र आजको उत्तर मोड पुषतिर परिसकेको कारण, [[uttarayana-in-calendar|उत्तरायण र दक्षिणायनको पात्रोमा प्रयोग]] मा छ।",
            en: "Maghe Sankranti is often taken for the shortest day. It is not. A solstice is tropical and a sankranti is sidereal — [[equinox-solstice|equinoxes and solstices]] separates them. Why tradition still starts Uttarāyaṇa here, while today's northward turn already falls in Poush, is in [[uttarayana-in-calendar|Uttarayana and Dakshinayana in the calendar]].",
          },
        },
      ],
    },
  ],
};
