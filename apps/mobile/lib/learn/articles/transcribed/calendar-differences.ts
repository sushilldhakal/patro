import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `CalendarDifferences` — see `what-is-panchang.ts` header note. */
export const calendarDifferences: ArticleData = {
  slug: "calendar-differences",
  sections: [
    {
      title: { ne: "तीन पात्रो, तीन आधार", en: "Three calendars, three bases" },
      eyebrow: "Three systems",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "**ग्रेगोरियन (ई.सं.)** शुद्ध सौर पात्रो हो — महिनाको दिन निश्चित। **नेपाली (बि.सं.)** चान्द्र–सौर हो — महिना सूर्यको राशिले तय हुन्छ। **वैदिक** मा दुई धारा छन्: नागरिक शक सम्वत् (सौर) र पञ्चाङ्ग आधारित विक्रम/शालिवाहन (चान्द्र–सौर)।",
            en: "The **Gregorian (AD)** is a purely solar calendar — fixed days per month. The **Nepali (BS)** is luni-solar — the month is set by the Sun's sign. The **Vedic** tradition has two streams: the civil Shaka Samvat (solar) and the almanac-based Vikram/Shalivahana (luni-solar).",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "वर्ष गणना", en: "Year count" },
              p: {
                ne: "बि.सं. ≈ ई.सं. + ५६/५७; शक सम्वत् ≈ ई.सं. − ७८।",
                en: "BS ≈ AD + 56/57; Shaka Samvat ≈ AD − 78.",
              },
            },
            {
              h: { ne: "वर्षारम्भ", en: "Year start" },
              p: {
                ne: "ग्रेगोरियन: जनवरी १; बि.सं.: बैशाख (मेष सङ्क्रान्ति); वैदिक चान्द्र: चैत्र शुक्ल प्रतिपदा।",
                en: "Gregorian: Jan 1; BS: Baisakh (Mesha Sankranti); Vedic lunar: Chaitra Shukla Pratipada.",
              },
            },
            {
              h: { ne: "महिनाको दिन", en: "Days per month" },
              p: {
                ne: "ग्रेगोरियन: २८–३१ निश्चित; बि.सं.: २९–३२ सूर्य–गति अनुसार।",
                en: "Gregorian: fixed 28–31; BS: 29–32 by the Sun's motion.",
              },
            },
            {
              h: { ne: "अधिक मास", en: "Adhik Maas" },
              p: {
                ne: "ग्रेगोरियनमा छैन; बि.सं./वैदिक चान्द्र–सौरमा करिब ३ वर्षमा थपिन्छ।",
                en: "None in the Gregorian; added about every 3 years in BS/Vedic luni-solar.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यही कारण मितिको रूपान्तरण साधारण जोडघटाउले मिल्दैन — पञ्चाङ्ग गणना नै सही उत्तर हो।",
            en: "This is why date conversion cannot be done by simple addition/subtraction — almanac calculation is the correct answer.",
          },
        },
      ],
    },
  ],
};
