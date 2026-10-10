import type { ArticleData } from "../../article-schema";

export const leapYears: ArticleData = {
  slug: "leap-years",
  seeAlso: ["calendar-drift", "adhik-kshaya-maas", "sidereal-vs-tropical", "calendars-aligned-with-nature"],
  sections: [
    {
      title: { ne: "अंशको समस्या", en: "The problem of the remainder" },
      eyebrow: "0.2422 of a day",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वर्ष `३६५.२४२२` दिनको हुन्छ। पात्रोले पूर्णाङ्क दिन मात्र गन्न सक्छ। त्यो `०.२४२२` कहाँ जान्छ?",
            en: "A year is `365.2422` days. A calendar can only count whole days. Where does that `0.2422` go?",
          },
        },
        {
          kind: "para",
          text: {
            ne: "कतै नराखे यो जम्मा हुँदै जान्छ — चार वर्षमा झन्डै एक दिन, शताब्दीमा `२४` दिन। लीप दिन यही अंश फर्काउने उपाय हो।",
            en: "Left unabsorbed it accumulates — nearly a day in four years, `24` days in a century. The leap day is the device that gives it back.",
          },
        },
        {
          kind: "diagram",
          id: "equinox-precession",
          caption: {
            ne: "लीप वर्षको नियम विषुवलाई एउटै मितिमा अड्याउन बनेको हो।",
            en: "The leap-year rule exists to hold the equinox on one date.",
          },
        },
      ],
    },
    {
      title: { ne: "जुलियनबाट ग्रेगोरियनसम्म", en: "From Julian to Gregorian" },
      eyebrow: "Refining the rule",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "जुलियन पात्रोले सरल नियम राख्यो: हरेक चार वर्षमा एक लीप दिन। यसले वर्षको औसत `३६५.२५` बनायो — नजिक, तर ठ्याक्कै होइन।",
            en: "The Julian calendar used a simple rule: one leap day every four years, making the average year `365.25` — close, but not exact.",
          },
        },
        {
          kind: "diagram",
          id: "year-length-ladder",
        },
        {
          kind: "para",
          text: {
            ne: "`१५८२` मा ग्रेगोरियन सुधारले दुई काम गर्‍यो — जम्मा भएका `१०` दिन एकैचोटि हटायो, र नियम सूक्ष्म बनायो।",
            en: "The Gregorian reform of `1582` did two things — it removed the accumulated `10` days at a stroke, and refined the rule.",
          },
        },
        {
          kind: "list",
          ordered: true,
          items: [
            { ne: "`४` ले भाग जाने वर्ष लीप हुन्छ।", en: "A year divisible by `4` is a leap year." },
            { ne: "तर `१००` ले भाग जाने वर्ष **लीप हुँदैन**।", en: "Unless it is divisible by `100` — then it is **not**." },
            { ne: "तर `४००` ले भाग जाने वर्ष **फेरि लीप हुन्छ**।", en: "Unless it is also divisible by `400` — then it **is** again." },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसले औसत वर्ष `३६५.२४२५` बनाउँछ — वास्तविकभन्दा प्रति वर्ष `०.०००३` दिन मात्र फरक, अर्थात् झन्डै `३,३००` वर्षमा एक दिन।",
            en: "The average year becomes `365.2425` — off by only `0.0003` days a year, about one day in `3,300` years.",
          },
        },
      ],
    },
    {
      title: { ne: "बि.सं.मा लीप दिन किन छैन", en: "Why BS has no leap day" },
      eyebrow: "A different mechanism",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नेपाली पात्रोमा “लीप वर्ष” छैन — किनभने यसलाई आवश्यक नै छैन। कारण मौलिक छ।",
            en: "The Nepali calendar has no leap year, because it does not need one. The reason is structural.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ग्रेगोरियन पात्रोले महिनाको लम्बाइ **पहिल्यै तय** गर्छ, त्यसैले अंश मिलाउन थप दिन चाहिन्छ। बि.सं.ले भने महिनाको लम्बाइ **हरेक वर्ष सूर्यको वास्तविक स्थितिबाट** निकाल्छ — अंश आफैँ भित्रै समायोजित हुन्छ।",
            en: "The Gregorian calendar **fixes month lengths in advance**, so it needs an extra day to absorb the remainder. BS instead derives month lengths **each year from the Sun's actual position** — the remainder is absorbed automatically.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "पात्रो", en: "Calendar" },
            { ne: "समस्या", en: "Problem" },
            { ne: "समाधान", en: "Solution" },
          ],
          rows: [
            [
              { ne: "ग्रेगोरियन", en: "Gregorian" },
              { ne: "वर्षमा ०.२४२२ दिनको अंश", en: "0.2422 of a day left over each year" },
              { ne: "लीप दिन (फेब्रुअरी २९)", en: "A leap day (29 February)" },
            ],
            [
              { ne: "बि.सं. — सौर पक्ष", en: "BS — solar side" },
              { ne: "उही अंश", en: "The same remainder" },
              { ne: "महिनाको लम्बाइ आफैँ बदलिन्छ (२९–३२ दिन)", en: "Month lengths simply vary (29–32 days)" },
            ],
            [
              { ne: "बि.सं. — चान्द्र पक्ष", en: "BS — lunar side" },
              { ne: "वर्षमा ११ दिनको फरक", en: "An 11-day gap each year" },
              { ne: "अधिक मास — थप महिना", en: "Adhika masa — an extra month" },
            ],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "अर्थात् बि.सं.मा “लीप” को समकक्ष **अधिक मास** हो — तर यो सौर अंश मिलाउन होइन, **चान्द्र–सौर फरक** मिलाउन प्रयोग हुन्छ। दुई फरक समस्याका दुई फरक समाधान।",
            en: "So the BS counterpart of a leap day is **adhika masa** — but it corrects the **lunar–solar gap**, not the solar remainder. Two different problems, two different fixes.",
          },
        },
      ],
    },
  ],
};
