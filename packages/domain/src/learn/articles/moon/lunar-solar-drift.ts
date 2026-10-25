import type { ArticleData } from "../../article-schema";

export const lunarSolarDrift: ArticleData = {
  slug: "lunar-solar-drift",
  seeAlso: ["adhik-kshaya-maas", "lunar-month", "chandramana"],
  sections: [
    {
      title: { ne: "वर्षमा ११ दिनको खाडल", en: "The eleven-day gap each year" },
      eyebrow: "354 vs 365",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "समस्या सरल अङ्कगणितबाट सुरु हुन्छ। सौर वर्ष र बाह्र चान्द्र मास बराबर छैनन्।",
            en: "The problem starts with simple arithmetic. A solar year and twelve lunar months are not the same length.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "365.24",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सौर वर्ष", en: "Solar year" },
              desc: { ne: "ऋतु र सङ्क्रान्तिको चक्र।", en: "The cycle of seasons and sankrantis." },
            },
            {
              big: "354.37",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "चान्द्र वर्ष", en: "Lunar year" },
              desc: { ne: "१२ × २९.५३ — तिथि र पर्वको चक्र।", en: "12 × 29.53 — the cycle of tithis and festivals." },
            },
            {
              big: "10.87",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "वार्षिक फरक", en: "Gap per year" },
              desc: { ne: "हरेक वर्ष चान्द्र पात्रो यति दिन अगाडि सर्छ।", en: "The lunar calendar runs ahead by this much every year." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "फरक जम्मा हुँदै जान्छ", en: "The gap accumulates" },
      eyebrow: "Three years, one month",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक वर्षको `११` दिन ठूलो देखिँदैन। तर यो हरेक वर्ष थपिँदै जान्छ।",
            en: "Eleven days in a year does not look like much. But it adds on, year after year.",
          },
        },
        {
          kind: "diagram",
          id: "lunar-solar-gap",
        },
        {
          kind: "para",
          text: {
            ne: "सुधार नगरे के हुन्थ्यो? दसैँ हरेक वर्ष `११` दिन सर्दै जान्थ्यो — नौ वर्षमा तीन महिना, र करिब `३३` वर्षमा पूरै वर्ष घुमेर फर्किन्थ्यो। शरद्‌को पर्व वर्षामा पर्थ्यो।",
            en: "Left uncorrected, Dashain would move `11` days earlier every year — three months in nine years, and a full lap of the year in about `33`. An autumn festival would end up in the monsoon.",
          },
        },
      ],
    },
    {
      title: { ne: "समाधान — मास थप्ने र घटाउने", en: "The fix — insert a month, or drop one" },
      eyebrow: "Intercalation",
      blocks: [
        {
          kind: "note",
          text: {
            ne: "मिल्ने उपाय मास थप्नु वा, कहिलेकाहीँ, घटाउनु हो। नियम — चान्द्र मासभित्र कति सङ्क्रान्ति पर्छन् — र दुवै नतिजा अर्को खण्ड [[adhik-kshaya-maas|अधिक र क्षय मास]] मा छन्।",
            en: "The fix is to insert a month or, rarely, to drop one. The rule — how many sankrantis fall inside a lunar month — and both outcomes are the next chapter, [[adhik-kshaya-maas|the extra and the skipped month]].",
          },
        },
      ],
    },
  ],
};
