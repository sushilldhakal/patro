import type { ArticleData } from "../../article-schema";

export const karkaSankranti: ArticleData = {
  slug: "karka-sankranti",
  seeAlso: ["uttarayana-dakshinayana", "makara-sankranti", "sankranti", "equinox-solstice"],
  sections: [
    {
      title: { ne: "कर्क सङ्क्रान्ति", en: "Karka Sankranti" },
      eyebrow: "Sun enters Karka",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*कर्क सङ्क्रान्ति* सूर्य कर्क राशिमा प्रवेश गर्ने क्षण हो — निरयन देशान्तर `९०°`। यसले **साउन १ गते** सुरु गर्छ, र ग्रेगोरियनमा `१६`–`१७` जुलाईतिर पर्छ।",
            en: "*Karka Sankranti* is the moment the Sun enters Karka — sidereal longitude `90°`. It opens **Shrawan 1**, falling around `16`–`17` July.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यो मकर सङ्क्रान्तिको ठीक विपरीत बिन्दु हो — राशिचक्रमा `१८०°` पर। परम्परामा यसलाई ~दक्षिणायन~ को आरम्भ मानिन्छ।",
            en: "It is the point diametrically opposite Makara Sankranti — `180°` away on the zodiac. Tradition treats it as the start of ~Dakshinayana~.",
          },
        },
        {
          kind: "diagram",
          id: "declination-year",
          caption: {
            ne: "कर्क सङ्क्रान्ति (साउन १) र वास्तविक ग्रीष्म अयनान्त (~असार ६–७) — बीचमा झन्डै २४ दिन।",
            en: "Karka Sankranti (साउन १) and the true summer solstice (~असार ६–७) — some 24 days apart.",
          },
        },
      ],
    },
    {
      title: { ne: "वर्षा र साउनको सम्बन्ध", en: "Monsoon and the month of Shrawan" },
      eyebrow: "Season, not coincidence",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "कर्क सङ्क्रान्ति नेपालमा मनसुनको बीचमा पर्छ। साउन वर्षाको महिना हो, र यससँग जोडिएका धेरै परम्परा प्रत्यक्ष रूपमा ऋतुसँग सम्बन्धित छन्।",
            en: "Karka Sankranti falls in the thick of the Nepali monsoon. Shrawan is the month of rain, and much of what surrounds it relates directly to the season.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "**रोपाइँ** — असार–साउन धान रोप्ने समय; असार १५ को दही–चिउरा यही चक्रसँग जोडिएको।",
              en: "**Rice planting** — Asar and Shrawan are the transplanting season; the dahi-chiura of Asar 15 belongs to this cycle.",
            },
            {
              ne: "**लुतो फाल्ने र श्रावण सोमबार** — वर्षायाममा रोग फैलिने समयसँग जोडिएका परम्परा।",
              en: "**Luto Phalne and the Mondays of Shrawan** — customs tied to a season when illness spreads.",
            },
            {
              ne: "**चतुर्मास** — वर्षाको चार महिना; परम्परागत रूपमा विवाह र शुभ कार्य रोकिने अवधि।",
              en: "**Chaturmas** — the four months of rain, traditionally a pause on weddings and auspicious undertakings.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "तर ध्यान दिनुहोस् — यो मेल **अहिलेको लागि** हो। महिना निरयन प्रणालीमा चल्ने हुनाले शताब्दीयौँमा साउन र वर्षाको सम्बन्ध बिस्तारै टुट्दै जान्छ।",
            en: "But note that this alignment holds **for now**. Because the months run on the sidereal frame, the link between Shrawan and the rains will slowly loosen over the centuries.",
          },
        },
      ],
    },
    {
      title: { ne: "कर्क र मकर — दुई मोड", en: "Karka and Makara — the two turns" },
      eyebrow: "The half-year pair",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यी दुई सङ्क्रान्तिले वर्षलाई दुई आधा भागमा बाँड्छन्, प्रत्येक छ महिनाको।",
            en: "These two sankrantis cut the year into two halves of six months each.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "सङ्क्रान्ति", en: "Sankranti" },
            { ne: "देशान्तर", en: "Longitude" },
            { ne: "अयन", en: "Ayana" },
            { ne: "महिना", en: "Month" },
          ],
          rows: [
            [
              { ne: "मकर", en: "Makara" },
              "270°",
              { ne: "उत्तरायण आरम्भ (परम्परागत)", en: "Uttarāyaṇa begins (traditionally)" },
              { ne: "माघ", en: "Magh" },
            ],
            [
              { ne: "कर्क", en: "Karka" },
              "90°",
              { ne: "दक्षिणायन आरम्भ (परम्परागत)", en: "Dakshinayana begins (traditionally)" },
              { ne: "साउन", en: "Shrawan" },
            ],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "मकरजस्तै यहाँ पनि उही सावधानी लागू हुन्छ: वास्तविक ग्रीष्म अयनान्त असार `६`–`७` तिर पर्छ, कर्क सङ्क्रान्तिभन्दा झन्डै `२४` दिन अघि। सङ्क्रान्ति निरयन घटना हो, अयनान्त सायन — पूरा कारण ~उत्तरायण र दक्षिणायन~ मा।",
            en: "The same caveat as for Makara applies here: the actual summer solstice falls around असार `6`–`7`, some `24` days before Karka Sankranti. A sankranti is sidereal and a solstice tropical — the full reason is in ~Uttarāyaṇa and Dakṣiṇāyana~.",
          },
        },
      ],
    },
  ],
};
