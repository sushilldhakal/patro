import type { ArticleData } from "../../article-schema";

export const eclipseSeasons: ArticleData = {
  slug: "eclipse-seasons",
  seeAlso: ["rahu-ketu-nodes", "eclipses", "amavasya-purnima", "lunar-month"],
  sections: [
    {
      title: { ne: "ग्रहण झुण्डमा किन आउँछन्", en: "Why eclipses arrive in clusters" },
      eyebrow: "Eclipse seasons",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "ग्रहण वर्षभरि छरिएर आउँदैनन्। यी **झुण्डमा** आउँछन् — प्रायः दुई हप्ताको अन्तरमा दुई वा तीन ग्रहण, अनि महिनौँ केही नहुने।",
            en: "Eclipses are not spread evenly through the year. They come in **clusters** — two or three within a fortnight of each other, then months with none.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "कारण सरल छ: ग्रहण पात नजिक मात्र सम्भव छ, र सूर्य वर्षमा दुई पटक मात्र पात रेखा नजिक पुग्छ। त्यो अवधिलाई *ग्रहण ऋतु* भनिन्छ।",
            en: "The reason is simple: eclipses need a node, and the Sun passes near the node line only twice a year. Those windows are the *eclipse seasons*.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "~34",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "ग्रहण ऋतुको लम्बाइ", en: "Length of an eclipse season" },
              desc: { ne: "चान्द्र मास (२९.५३ दिन) भन्दा लामो — त्यसैले कम्तीमा एक ग्रहण निश्चित।", en: "Longer than a lunar month (29.53 days) — so at least one eclipse is guaranteed." },
            },
            {
              big: "~173",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "दुई ऋतुबीच", en: "Between seasons" },
              desc: { ne: "आधा वर्षभन्दा छोटो, किनभने पात रेखा उल्टो सर्दै छ।", en: "Slightly under half a year, because the node line is sliding backwards." },
            },
            {
              big: "4–7",
              label: { ne: "वर्षमा ग्रहण", en: "Eclipses per year" },
              desc: { ne: "न्यूनतम ४ (२ सूर्य + २ चन्द्र), अधिकतम ७।", en: "At least 4 (2 solar + 2 lunar), at most 7." },
            },
          ],
        },
        {
          kind: "diagram",
          id: "moon-orbit-tilt",
        },
      ],
    },
    {
      title: { ne: "जोडी ग्रहण", en: "Eclipses come in pairs" },
      eyebrow: "Two weeks apart",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक ग्रहण ऋतुभित्र प्रायः **दुई ग्रहण** पर्छन् — एउटा सूर्यग्रहण (औंसीमा) र एउटा चन्द्रग्रहण (पूर्णिमामा), झन्डै `१४` दिनको अन्तरमा।",
            en: "One eclipse season usually brings **two eclipses** — a solar one at new moon and a lunar one at full moon, about `14` days apart.",
          },
        },
        {
          kind: "diagram",
          id: "eclipse-season-window",
        },
        {
          kind: "para",
          text: {
            ne: "यसैले “यो महिना दुई ग्रहण छन्” भन्ने सुन्दा अचम्म मान्नु पर्दैन — यो नियमको सामान्य परिणाम हो, कुनै असामान्य घटना होइन।",
            en: "So hearing that a month holds two eclipses is not remarkable — it is the ordinary consequence of the rule, not an unusual event.",
          },
        },
      ],
    },
    {
      title: { ne: "सरोस चक्र", en: "The saros cycle" },
      eyebrow: "18 years, 11 days, 8 hours",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "प्राचीन ज्योतिषीहरूले पत्ता लगाएका थिए — ग्रहण झन्डै `१८` वर्ष `११` दिनमा उस्तै ढाँचामा दोहोरिन्छन्। यसलाई *सरोस चक्र* भनिन्छ।",
            en: "Ancient astronomers noticed that eclipses repeat in a similar pattern every `18` years and `11` days. This is the *saros cycle*.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यो तीन फरक चान्द्र अवधि झन्डै एकैचोटि पूरा हुने संयोगबाट बन्छ:",
            en: "It arises because three different lunar periods come out very nearly equal:",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "अवधि", en: "Period" },
            { ne: "के नाप्छ", en: "What it measures" },
            { ne: "६,५८५.३ दिनमा", en: "In 6,585.3 days" },
          ],
          rows: [
            [
              { ne: "सांयोगिक मास", en: "Synodic month" },
              { ne: "औंसीदेखि औंसी", en: "New moon to new moon" },
              "223",
            ],
            [
              { ne: "पात मास", en: "Draconic month" },
              { ne: "पातदेखि पात", en: "Node to node" },
              "242",
            ],
            [
              { ne: "विषम मास", en: "Anomalistic month" },
              { ne: "उपभूदेखि उपभू", en: "Perigee to perigee" },
              "239",
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "तीनै लगभग पूर्णाङ्कमा मिल्ने हुनाले `१८` वर्षपछि सूर्य, चन्द्र र पात झन्डै उही सापेक्ष स्थितिमा फर्किन्छन् — र उस्तै ग्रहण दोहोरिन्छ। तर `८` घण्टाको बाँकीले पृथ्वी `१२०°` घुमिसकेको हुन्छ, त्यसैले अर्को पटक ग्रहण **संसारको फरक भागबाट** देखिन्छ।",
            en: "Because all three land so close to whole numbers, after `18` years Sun, Moon and node return to nearly the same arrangement and a similar eclipse recurs. But the leftover `8` hours means Earth has turned `120°`, so the repeat is visible from **a different third of the world**.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "सरोस चक्रको ज्ञानले नै प्राचीन ज्योतिषीहरूलाई ग्रहणको भविष्यवाणी गर्न सक्षम बनाएको थियो — आधुनिक गणित बिनै।",
            en: "Knowledge of the saros is what let ancient astronomers predict eclipses at all, long before modern computation.",
          },
        },
      ],
    },
  ],
};
