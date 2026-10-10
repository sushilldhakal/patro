import type { ArticleData } from "../../article-schema";

export const poleStarChanges: ArticleData = {
  slug: "pole-star-changes",
  seeAlso: ["precession", "ancient-sky", "celestial-sphere", "sky-rotation"],
  sections: [
    {
      title: { ne: "ध्रुव तारा किन स्थिर देखिन्छ", en: "Why the pole star seems fixed" },
      eyebrow: "The axis points at it",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "रातभर सबै तारा आकाशमा घुमेको देखिन्छ, तर *ध्रुव तारा* झन्डै उही ठाउँमा रहन्छ। कारण सरल छ — पृथ्वीको घुर्णन अक्ष ठ्याक्कै त्यसैतिर फर्किएको छ।",
            en: "Through the night every star wheels across the sky, yet the *pole star* stays almost put. The reason is simple — Earth's axis of rotation points nearly straight at it.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अक्षको सोझो अगाडि पर्ने आकाशको बिन्दुलाई **उत्तर आकाशीय ध्रुव** भनिन्छ। अहिले त्यहाँ *ध्रुव* (Polaris) तारा छ — ठ्याक्कै त्यहीँ होइन, झन्डै `०.७°` पर।",
            en: "The point of sky the axis aims at is the **north celestial pole**. At present the star *Polaris* sits there — not exactly, but within about `0.7°`.",
          },
        },
        {
          kind: "diagram",
          id: "precession-sky",
          caption: {
            ne: "आकाशीय ध्रुवले शताब्दीयौँमा बनाउने वृत्त — बाटोमा पर्ने तारा पालैपालो ध्रुव तारा बन्छन्।",
            en: "The circle the celestial pole traces over millennia — stars along that path take turns being the pole star.",
          },
        },
      ],
    },
    {
      title: { ne: "तर अक्ष सर्दै छ", en: "But the axis is moving" },
      eyebrow: "A 26,000-year circle",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अयन चलनका कारण अक्षको दिशा बिस्तारै बदलिन्छ, र आकाशीय ध्रुवले `२६,०००` वर्षमा ताराबीच एउटा ठूलो वृत्त पूरा गर्छ। बाटोमा पर्ने विभिन्न तारा पालैपालो “ध्रुव तारा” बन्छन्।",
            en: "Precession slowly turns the axis, and the celestial pole traces a great circle among the stars over `26,000` years. Different stars along that path take turns as \"the pole star\".",
          },
        },
        {
          kind: "table",
          caption: { ne: "समयअनुसार उत्तर ध्रुव तारा", en: "The north pole star through time" },
          headers: [
            { ne: "समय", en: "Epoch" },
            { ne: "ध्रुव तारा", en: "Pole star" },
            { ne: "टिप्पणी", en: "Note" },
          ],
          rows: [
            [
              "~3000 BCE",
              "Thuban (α Draconis)",
              { ne: "इजिप्टका पिरामिड यसैतिर फर्काइएका।", en: "The Egyptian pyramids were aligned to it." },
            ],
            [
              { ne: "आज / today", en: "Today" },
              "Polaris (α Ursae Minoris)",
              { ne: "ध्रुवबाट ~०.७° पर — अहिलेसम्मकै नजिक।", en: "About 0.7° from the pole — the closest it gets." },
            ],
            [
              "~4000 CE",
              "Gamma Cephei",
              { ne: "अर्को पालो।", en: "Next in line." },
            ],
            [
              "~14000 CE",
              "Vega (α Lyrae)",
              { ne: "अत्यन्तै चम्किलो, तर ध्रुवबाट ~५° पर हुनेछ।", en: "Very bright, but it will sit some 5° off the pole." },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "ध्यान दिनुहोस् — हरेक युगमा राम्रो ध्रुव तारा हुँदैन। कहिलेकाहीँ ध्रुव नजिक कुनै उल्लेख्य तारा नै हुँदैन, र त्यसबेला उत्तर पत्ता लगाउन अरू तरिका चाहिन्छ।",
            en: "Note that not every era has a good pole star. Sometimes no notable star lies near the pole at all, and finding north then needs other methods.",
          },
        },
      ],
    },
    {
      title: { ne: "दक्षिणी गोलार्धको अवस्था", en: "The southern sky" },
      eyebrow: "No bright southern pole star",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "दक्षिणी गोलार्धमा अहिले उज्यालो ध्रुव तारा छैन। दक्षिण आकाशीय ध्रुव नजिकको *Sigma Octantis* यति मधुरो छ कि खुला आँखाले मुस्किलले देखिन्छ।",
            en: "The southern hemisphere has no bright pole star at present. *Sigma Octantis*, nearest the south celestial pole, is so faint it is barely visible to the naked eye.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "त्यसैले दक्षिणी गोलार्धका नाविकहरूले **क्रक्स** (Southern Cross) तारापुञ्जबाट दिशा पत्ता लगाउने अभ्यास विकास गरे — तारा होइन, ज्यामिति प्रयोग गरेर।",
            en: "Southern navigators therefore learned to find direction from the **Southern Cross** — using geometry rather than a single star.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "ध्रुव तारा बदलिनु अयन चलनको सबैभन्दा प्रत्यक्ष प्रमाण हो — प्राचीन अभिलेखमा कुन तारा ध्रुवमा थियो भन्ने हेरेर त्यो अभिलेखको मिति अनुमान गर्न सकिन्छ।",
            en: "The changing pole star is precession's most tangible evidence — noting which star an ancient record treats as polar can help date the record itself.",
          },
        },
      ],
    },
  ],
};
