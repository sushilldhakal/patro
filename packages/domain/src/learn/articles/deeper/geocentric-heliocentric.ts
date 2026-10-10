import type { ArticleData } from "../../article-schema";

export const geocentricHeliocentric: ArticleData = {
  slug: "geocentric-heliocentric",
  seeAlso: ["retrograde-motion", "celestial-sphere", "ancient-planetary-motion", "solar-system"],
  sections: [
    {
      title: { ne: "दुई दृष्टिकोण", en: "Two points of view" },
      eyebrow: "Frames of reference",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*भूकेन्द्रित* ढाँचाले पृथ्वीलाई केन्द्रमा राख्छ; *सूर्यकेन्द्रित* ढाँचाले सूर्यलाई। पाठ्यपुस्तकले प्रायः पहिलोलाई “गलत” भन्छ — तर कुरा त्यति सरल छैन।",
            en: "The *geocentric* frame places Earth at the centre; the *heliocentric* frame the Sun. Textbooks often call the first \"wrong\" — but the matter is less simple than that.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "कुन भौतिक रूपमा सही", en: "Which is physically right" },
              p: {
                ne: "**सूर्यकेन्द्रित** — ग्रह सूर्यको वरिपरि घुम्छन्, र यही ढाँचामा गति सरल नियमले वर्णन हुन्छ।",
                en: "**Heliocentric** — the planets orbit the Sun, and in that frame the motions obey simple laws.",
              },
            },
            {
              h: { ne: "कुन अवलोकनका लागि उपयोगी", en: "Which is useful for observation" },
              p: {
                ne: "**भूकेन्द्रित** — हामी पृथ्वीबाटै हेर्छौँ, र आकाशमा जे देखिन्छ त्यो यही ढाँचाको वर्णन हो।",
                en: "**Geocentric** — we observe from Earth, and what appears in the sky is a description in that frame.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "पञ्चाङ्ग **भूकेन्द्रित** छ — र हुनुपर्छ। “सूर्य मेष राशिमा छ” भन्नु पृथ्वीबाट हेर्दा सूर्य त्यो दिशामा देखिन्छ भन्नु हो। सूर्यबाट हेर्दा त्यो वाक्यको अर्थ नै रहँदैन।",
            en: "A panchanga is **geocentric** — and must be. \"The Sun is in Mesha\" means the Sun appears in that direction as seen from Earth. From the Sun the statement has no meaning at all.",
          },
        },
        {
          kind: "diagram",
          id: "two-systems",
        },
      ],
    },
    {
      title: { ne: "रूपान्तरण सम्भव छ", en: "The frames are interconvertible" },
      eyebrow: "Same sky, different origin",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "दुई ढाँचा **समतुल्य** छन् — एउटाबाट अर्कोमा गणितीय रूपान्तरण गर्न सकिन्छ। कुनै सूचना हराउँदैन; केवल मूल बिन्दु सर्छ।",
            en: "The two frames are **equivalent** — a mathematical transformation carries you from one to the other. No information is lost; only the origin moves.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "Swiss Ephemeris ले दुवै दिन सक्छ। पञ्चाङ्ग गणनाले **भूकेन्द्रित** माग्छ, र engine ले त्यही झिक्छ — तर भित्री गणना सूर्यकेन्द्रित ग्रहपातबाटै आउँछ।",
            en: "Swiss Ephemeris can supply either. Panchanga computation asks for the **geocentric** values, and the engine requests exactly those — though internally they derive from a heliocentric ephemeris.",
          },
        },
      ],
    },
    {
      title: { ne: "“सूर्य उदायो” भन्नु गलत हो?", en: "Is \"the Sun rose\" wrong?" },
      eyebrow: "Description, not claim",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वी घुम्छ, सूर्य उदाउँदैन — यो हामीलाई थाहा छ। तैपनि “सूर्योदय” शब्द प्रयोग गर्नु गलत होइन।",
            en: "Earth turns; the Sun does not rise — we know this. Yet the word \"sunrise\" is not wrong.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "किनभने यो **अवलोकनकर्ताको ढाँचामा गरिएको सही वर्णन** हो। भौतिकशास्त्रमा पनि पृथ्वीको सतहमा गरिने गणना पृथ्वी–केन्द्रित ढाँचामै गरिन्छ।",
            en: "Because it is an **accurate description in the observer's frame**. Physics does the same: calculations at Earth's surface are carried out in an Earth-centred frame.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "त्यसैले पञ्चाङ्गलाई “पुरानो भूकेन्द्रित विश्वदृष्टि” भनेर खारेज गर्नु भ्रम हो। यो विश्वदृष्टिको दाबी होइन — यो **पृथ्वीबाट देखिने आकाशको विवरण** हो, र त्यसका लागि भूकेन्द्रित ढाँचा नै सही उपकरण हो।",
            en: "Dismissing a panchanga as an outdated geocentric worldview therefore misreads it. It makes no cosmological claim — it is **a record of the sky as seen from Earth**, and for that the geocentric frame is precisely the right tool.",
          },
        },
      ],
    },
  ],
};
