import type { ArticleData } from "../../article-schema";

export const calendarsAlignedWithNature: ArticleData = {
  slug: "calendars-aligned-with-nature",
  seeAlso: ["calendar-drift", "leap-years", "adhik-kshaya-maas", "ancient-calendars"],
  sections: [
    {
      title: { ne: "पात्रोलाई आकाशसँग बाँध्ने उपाय", en: "The devices that tie a calendar to the sky" },
      eyebrow: "Intercalation and reform",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "हरेक दीर्घजीवी पात्रोसँग आफ्नो सुधार संयन्त्र हुन्छ। संरचना फरक भए पनि उद्देश्य उही — **गणनालाई आकाशबाट भाग्न नदिने**।",
            en: "Every long-lived calendar carries a correction mechanism. The structures differ, the purpose does not — **stop the count from escaping the sky**.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "पात्रो", en: "Calendar" },
            { ne: "संयन्त्र", en: "Mechanism" },
            { ne: "आवृत्ति", en: "Frequency" },
          ],
          rows: [
            [
              { ne: "ग्रेगोरियन", en: "Gregorian" },
              { ne: "लीप दिन", en: "A leap day" },
              { ne: "~४ वर्षमा", en: "~every 4 years" },
            ],
            [
              { ne: "बि.सं. / हिन्दू", en: "BS / Hindu" },
              { ne: "अधिक मास", en: "An extra month" },
              { ne: "~३२.५ महिनामा", en: "~every 32.5 months" },
            ],
            [
              { ne: "हिब्रू", en: "Hebrew" },
              { ne: "अधिक मास (Adar II)", en: "A leap month (Adar II)" },
              { ne: "१९ वर्षमा ७ पटक", en: "7 times in 19 years" },
            ],
            [
              { ne: "चिनियाँ", en: "Chinese" },
              { ne: "अधिक मास", en: "A leap month" },
              { ne: "१९ वर्षमा ७ पटक", en: "7 times in 19 years" },
            ],
            [
              { ne: "इस्लामी", en: "Islamic" },
              { ne: "कुनै छैन — जानाजान", en: "None — deliberately" },
              "—",
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "हिब्रू र चिनियाँ पात्रोले प्रयोग गर्ने `१९`-वर्षे चक्रलाई ~मेटोनिक चक्र~ भनिन्छ — `१९` सौर वर्ष झन्डै ठ्याक्कै `२३५` चान्द्र मास बराबर हुने संयोगमा आधारित।",
            en: "The `19`-year cycle used by the Hebrew and Chinese calendars is the ~Metonic cycle~, resting on the near-exact equality of `19` solar years with `235` lunar months.",
          },
        },
        {
          kind: "diagram",
          id: "equinox-precession",
          caption: {
            ne: "विषुव बिन्दु ताराको सापेक्ष सर्दै — पात्रोलाई प्रकृतिसँग बाँध्न कुन सन्दर्भ रोज्ने भन्ने प्रश्नको जड।",
            en: "The equinox point sliding against the stars — the root of which reference a calendar must pick.",
          },
        },
      ],
    },
    {
      title: { ne: "नियम कि अवलोकन?", en: "Rule or observation?" },
      eyebrow: "Two philosophies",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पात्रो बनाउने दुई दर्शन छन्, र प्रत्येकको आफ्नै बल र कमजोरी छ।",
            en: "There are two philosophies of calendar-making, each with its own strengths.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "नियम–आधारित", en: "Rule-based" },
              p: {
                ne: "पहिल्यै तय नियमबाट पात्रो बन्छ — ग्रेगोरियन। **पूर्वानुमेय** तर आकाशबाट बिस्तारै छुट्टिन्छ।",
                en: "The calendar follows a rule fixed in advance — the Gregorian way. **Predictable**, but slowly parts from the sky.",
              },
            },
            {
              h: { ne: "अवलोकन–आधारित", en: "Observation-based" },
              p: {
                ne: "हरेक वर्ष आकाश हेरेर तय हुन्छ — वैदिक पञ्चाङ्ग। **सधैँ शुद्ध** तर गणना अनिवार्य।",
                en: "Each year is settled by looking at the sky — the Vedic panchanga. **Always accurate**, but computation is unavoidable.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "ग्रेगोरियन पात्रो कागजको एक पानामा अटाउँछ र सयौँ वर्षका लागि लेख्न सकिन्छ। वैदिक पञ्चाङ्ग हरेक वर्ष **गणना गर्नैपर्छ** — तर बदलामा यसले आकाशको वास्तविक अवस्था बताउँछ, अनुमान होइन।",
            en: "The Gregorian calendar fits on a page and can be written out for centuries. A Vedic panchanga **must be computed** each year — but in exchange it reports the sky's actual state rather than an approximation of it.",
          },
        },
      ],
    },
    {
      title: { ne: "आधुनिक गणनाले के बदल्यो", en: "What modern computation changed" },
      eyebrow: "Same tradition, better instruments",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "शताब्दीयौँसम्म पञ्चाङ्ग सिद्धान्त ग्रन्थका सूत्र र ज्या तालिकाबाट हातैले गणना गरिन्थ्यो। ती सूत्र उल्लेख्य रूपमा शुद्ध थिए, तर सञ्चित त्रुटिबाट मुक्त थिएनन्।",
            en: "For centuries a panchanga was computed by hand from siddhantic formulas and sine tables. Those formulas were remarkably accurate, but not free of accumulated error.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "आधुनिक ग्रहपात (Swiss Ephemeris, JPL) ले उही प्रश्नको **धेरै शुद्ध उत्तर** दिन्छ। परम्परा बदलिएको छैन — नियम, विभाजन र परिभाषा उही छन्; केवल सूर्य र चन्द्रको स्थान अझ शुद्धसँग थाहा हुन्छ।",
            en: "Modern ephemerides (Swiss Ephemeris, JPL) answer the same question **far more precisely**. The tradition has not changed — the rules, divisions and definitions are identical; only the positions of Sun and Moon are known better.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यसैले आधुनिक र परम्परागत पञ्चाङ्गमा कहिलेकाहीँ केही घण्टाको फरक देखिन्छ। यो परम्पराको त्याग होइन — यो **उही परम्परा, राम्रो उपकरणसहित** हो।",
            en: "This is why a modern and a traditional panchanga sometimes differ by a few hours. That is not an abandonment of the tradition — it is **the same tradition with better instruments**.",
          },
        },
      ],
    },
  ],
};
