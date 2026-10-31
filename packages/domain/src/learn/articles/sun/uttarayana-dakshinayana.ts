import type { ArticleData } from "../../article-schema";

/**
 * The two अयन, and why the traditional gate is no longer the astronomical one.
 *
 * Absorbed `sankranti-vs-solstice`, which was arguing the same case from the
 * other end: that article existed to say a सङ्क्रान्ति and an अयनान्त answer
 * different questions, and this one existed to say the अयन turn moved off the
 * सङ्क्रान्ति. That is one argument, and it reads better without the seam —
 * longitude against declination, then the ~२४ day gap that follows from it.
 */
export const uttarayanaDakshinayana: ArticleData = {
  slug: "uttarayana-dakshinayana",
  seeAlso: ["equinox-solstice", "makara-sankranti", "sidereal-vs-tropical", "ritu-drift"],
  sections: [
    {
      title: { ne: "सूर्यको उत्तर–दक्षिण यात्रा", en: "The Sun's north–south journey" },
      eyebrow: "Two half-years",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वर्षभरि सूर्य क्षितिजमा उही ठाउँबाट उदाउँदैन। यो बिस्तारै उत्तरतिर सर्छ, फेरि दक्षिणतिर फर्किन्छ — र यही आवतजावतले वर्षलाई दुई *अयन* मा बाँड्छ।",
            en: "The Sun does not rise from the same spot on the horizon all year. It drifts north, then turns back south — and that swing divides the year into two *ayanas*.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "उत्तरायण", en: "Uttarāyaṇa" },
              p: {
                ne: "सूर्य दक्षिणबाट **उत्तरतिर** सर्ने छ महिना — दिन लामो हुँदै जान्छ। परम्परामा शुभ अवधि मानिन्छ।",
                en: "The six months in which the Sun moves **northward** — days lengthen. Traditionally an auspicious period.",
              },
            },
            {
              h: { ne: "दक्षिणायन", en: "Dakṣiṇāyana" },
              p: {
                ne: "सूर्य उत्तरबाट **दक्षिणतिर** सर्ने छ महिना — दिन छोटो हुँदै जान्छ। वर्षा र चतुर्मास यही अवधिमा।",
                en: "The six months in which the Sun moves **southward** — days shorten. The monsoon and Chaturmas fall here.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यो ओहोरदोहोर माथि विषुव र अयनान्तको वक्रमा देखिन्छ — वक्रको उकालो आधा उत्तरायण, ओरालो आधा दक्षिणायन।",
            en: "That swing is the curve above, in the equinoxes and solstices — its rising half is Uttarāyaṇa, its falling half Dakṣiṇāyana.",
          },
        },
      ],
    },
    {
      title: { ne: "यो वास्तवमा क्रान्तिको कुरा हो", en: "What is really moving is declination" },
      eyebrow: "±23.44°",
      blocks: [
        {
          kind: "note",
          text: {
            ne: "“सूर्य उत्तर लाग्यो” भनेको क्रान्ति बढ्नु हो, र अयनको साँचो सन्धि अयनान्त हो। चार बिन्दु, ±२३.४४°, र सङ्क्रान्तिसँग नमिल्ने कारण [[equinox-solstice|विषुव र अयनान्त]] र [[declination|क्रान्ति]] मा छन्। परम्परागत मिति र वास्तविक मिति [[uttarayana-in-calendar|उत्तरायण र दक्षिणायनको पात्रोमा प्रयोग]] मा छन्।",
            en: "\"The Sun turns north\" means declination is increasing, and an ayana's true hinge is a solstice. The four points, ±23.44°, and why that is not a sankranti are in [[equinox-solstice|equinoxes and solstices]] and [[declination|declination]]. The traditional dates against the real ones are in [[uttarayana-in-calendar|Uttarayana and Dakshinayana in the calendar]].",
          },
        },
      ],
    },
    {
      title: { ne: "परम्परागत मिति र वास्तविक मिति", en: "The traditional date and the real one" },
      eyebrow: "24 days apart",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "परम्परामा उत्तरायण मकर सङ्क्रान्ति (माघ १) बाट र दक्षिणायन कर्क सङ्क्रान्ति (साउन १) बाट गनिन्छ। खगोलीय रूपमा भने यी अयनान्तमा सुरु हुन्छन्।",
            en: "Tradition counts Uttarāyaṇa from Makara Sankranti (Magh 1) and Dakshinayana from Karka Sankranti (Shrawan 1). Astronomically, though, they begin at the solstices.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "अयन", en: "Ayana" },
            { ne: "परम्परागत आरम्भ", en: "Traditional start" },
            { ne: "खगोलीय आरम्भ", en: "Astronomical start" },
          ],
          rows: [
            [
              { ne: "उत्तरायण", en: "Uttarāyaṇa" },
              { ne: "मकर सङ्क्रान्ति · माघ १", en: "Makara Sankranti · ~14 Jan" },
              { ne: "शीत अयनान्त · ~पुष ६–७", en: "Winter solstice · ~22 Dec" },
            ],
            [
              { ne: "दक्षिणायन", en: "Dakṣiṇāyana" },
              { ne: "कर्क सङ्क्रान्ति · साउन १", en: "Karka Sankranti · ~16 Jul" },
              { ne: "ग्रीष्म अयनान्त · ~असार ६–७", en: "Summer solstice · ~21 Jun" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यो अन्तर सधैँ थिएन। जब अयनांश शून्य थियो — झन्डै `२८५` ई.मा — सायन र निरयन राशिचक्र ठ्याक्कै मिलेका थिए, र मकर सङ्क्रान्ति शीत अयनान्तकै दिन पर्थ्यो।",
            en: "The gap was not always there. When the ayanamsha was zero — around `285` CE — the tropical and sidereal zodiacs lined up exactly, and Makara Sankranti fell on the winter solstice itself.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "विषुव बिन्दु ताराको सापेक्ष कसरी सर्दै आयो भन्ने चलचित्र [[tropical-year-gap|२० मिनेटको फरकले पात्रोमा के गर्छ]] मा छ।",
            en: "How the equinox point has slid against the stars is animated in [[tropical-year-gap|what the 20-minute gap does to a calendar]].",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यसैले पुराना ग्रन्थमा “मकर सङ्क्रान्तिमा सूर्य उत्तर लाग्छ” लेखिएको भेटिन्छ — त्यो लेखिँदा **ठ्याक्कै सही** थियो। यो `~२४` दिनको फरक त्रुटि होइन, अयन चलनको सञ्चित परिणाम हो, र भविष्यमा झन् बढ्दै जानेछ।",
            en: "So when older texts say the Sun turns north at Makara Sankranti, they were **exactly right** when written. The `~24`-day gap is not an error but the accumulated effect of precession, and it will keep widening.",
          },
        },
      ],
    },
    {
      title: { ne: "किन दुवै राख्ने", en: "Why keep both" },
      eyebrow: "Each does a job",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यदि दुई प्रणाली छुट्टिँदै छन् भने एउटा छाडे हुँदैन? हुँदैन — किनभने दुवैले फरक काम गर्छन्।",
            en: "If the two systems are drifting apart, why not drop one? Because each does a different job.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "कामका लागि", en: "For" },
            { ne: "कुन प्रणाली", en: "Which system" },
            { ne: "किन", en: "Why" },
          ],
          rows: [
            [
              { ne: "ऋतु, कृषि, दिनको लम्बाइ", en: "Seasons, farming, day length" },
              { ne: "सायन (अयनान्त–विषुव)", en: "Tropical (solstice–equinox)" },
              { ne: "यी सूर्यको क्रान्तिमा निर्भर छन्।", en: "These depend on the Sun's declination." },
            ],
            [
              { ne: "महिना, गते, ग्रह स्थिति", en: "Months, gate, planetary positions" },
              { ne: "निरयन (राशि–सङ्क्रान्ति)", en: "Sidereal (rashi–sankranti)" },
              { ne: "यी ताराको सन्दर्भमा नापिन्छन्।", en: "These are measured against the stars." },
            ],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "पञ्चाङ्गले दुवै बोक्छ — ऋतुको हिसाब सायनबाट, महिनाको हिसाब निरयनबाट। भ्रम तब मात्र हुन्छ जब एउटा प्रणालीको नामलाई अर्को प्रणालीको घटना ठानिन्छ।",
            en: "A panchanga carries both — ṛtus from the tropical frame, months from the sidereal one. Confusion arises only when a name from one system is mistaken for an event in the other.",
          },
        },
      ],
    },
  ],
};
