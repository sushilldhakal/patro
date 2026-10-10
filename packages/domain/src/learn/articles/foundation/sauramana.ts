import type { ArticleData } from "../../article-schema";

export const sauramana: ArticleData = {
  slug: "sauramana",
  seeAlso: ["chandramana", "sankranti", "year-begins-baisakh", "bs-calendar"],
  sections: [
    {
      title: { ne: "सौरमान भनेको के हो", en: "What Sauramāna is" },
      eyebrow: "सौरमान · the solar measure",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*सौरमान* (सौर + मान = सूर्यको नाप) समय नाप्ने त्यो प्रणाली हो जसले **राशिचक्रमा सूर्यको स्थिति**लाई आधार बनाउँछ। नेपाली पात्रोका गते, महिना र वर्ष यही प्रणालीबाट आउँछन्।",
            en: "*Sauramāna* (saura + māna — \"the Sun's measure\") is the system of reckoning time that takes the **Sun's position in the zodiac** as its basis. The gate, the month and the year of the Nepali calendar all come from it.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "एकाइ सरल छन्: सूर्यले राशिचक्रको `३०°` पार गर्दा एक **सौर मास**, र पूरै `३६०°` पार गर्दा एक **सौर वर्ष**।",
            en: "The units are simple: `30°` of the Sun's travel through the zodiac makes one **solar month**, and the full `360°` makes one **solar year**.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "30°",
              label: { ne: "एक सौर मास", en: "One solar month" },
              desc: {
                ne: "सूर्य एक राशिमा बिताउने अवधि — २९ देखि ३२ दिन।",
                en: "The Sun's stay in one rashi — between 29 and 32 days.",
              },
            },
            {
              big: "360°",
              label: { ne: "एक सौर वर्ष", en: "One solar year" },
              desc: {
                ne: "मेषबाट सुरु भई मेषमै फर्किने पूरो फेरो।",
                en: "The full circuit, from Mesha back to Mesha.",
              },
            },
            {
              big: "12",
              label: { ne: "सङ्क्रान्ति", en: "Sankrantis" },
              desc: {
                ne: "प्रत्येक राशि प्रवेशको क्षण — नयाँ महिनाको आरम्भ।",
                en: "Each entry into a sign — the start of a new month.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "solar-month-lengths",
        },
      ],
    },
    {
      title: { ne: "गते — सौर दिन", en: "Gate — the solar day" },
      eyebrow: "Counting from sankranti",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नेपाली पात्रोमा *गते* सौरमानको दिन गणना हो। सङ्क्रान्तिको दिन **१ गते** हुन्छ, र सूर्य त्यही राशिमा रहँदासम्म गते बढ्दै जान्छ। सूर्य अर्को राशिमा पस्नेबित्तिकै गणना फेरि १ बाट सुरु हुन्छ।",
            en: "In the Nepali calendar the *gate* is Sauramāna's day count. The day of a sankranti is **gate 1**, and the count climbs while the Sun remains in that sign. The moment it enters the next sign the count restarts at 1.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसैले गते सधैँ **सूर्यको वास्तविक स्थिति**को प्रतिबिम्ब हो — यो कुनै तालिकाबाट सारिएको सङ्ख्या होइन। यही कारण महिनाको लम्बाइ वर्षैपिच्छे फरक पर्छ।",
            en: "A gate is therefore always a reflection of the **Sun's actual position**, not a number copied from a table. It is also why month lengths differ from year to year.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सङ्क्रान्ति = १ गते", en: "Sankranti = gate 1" },
              p: {
                ne: "सूर्य नयाँ राशिमा प्रवेश गर्ने दिन महिनाको पहिलो गते बन्छ।",
                en: "The day the Sun enters a new sign becomes the month's first gate.",
              },
            },
            {
              h: { ne: "२९–३२ दिन", en: "29–32 days" },
              p: {
                ne: "अण्डाकार कक्षले सूर्यको देखिने गति बदल्ने हुनाले महिना बराबर हुँदैनन्।",
                en: "The elliptical orbit varies the Sun's apparent speed, so months are unequal.",
              },
            },
            {
              h: { ne: "ऋतुसँग बाँधिएको", en: "Tied to the seasons — loosely" },
              p: {
                ne: "सौर मास ऋतुसँग नजिक चल्छ, तर निरयन सन्दर्भ भएकाले अयन चलनले बिस्तारै सार्छ।",
                en: "Solar months track the seasons closely, but being sidereal they drift slowly with precession.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "बाह्र सङ्क्रान्ति", en: "The twelve sankrantis" },
      eyebrow: "One per 30°",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक सौर चक्रमा बाह्र प्रमुख सङ्क्रान्ति पर्छन् — प्रत्येकले सौर देशान्तरको अर्को `३०°` जनाउँछ।",
            en: "There are twelve major sankrantis in a solar cycle, each marking another `30°` of solar longitude.",
          },
        },
        {
          kind: "table",
          caption: {
            ne: "बाह्र सङ्क्रान्ति र तिनले सुरु गर्ने नेपाली महिना",
            en: "The twelve sankrantis and the Nepali month each one opens",
          },
          headers: [
            { ne: "सङ्क्रान्ति", en: "Sankranti" },
            { ne: "सूर्य प्रवेश", en: "Sun enters" },
            { ne: "नेपाली महिना", en: "Nepali month" },
            { ne: "करिब मिति (ई.)", en: "Approx. date (AD)" },
          ],
          rows: [
            [{ ne: "मेष", en: "Mesha" }, { ne: "मेष", en: "Aries" }, { ne: "बैशाख", en: "Baisakh" }, { ne: "१३–१५ अप्रिल", en: "13–15 Apr" }],
            [{ ne: "वृषभ", en: "Vrishabha" }, { ne: "वृषभ", en: "Taurus" }, { ne: "जेठ", en: "Jestha" }, { ne: "१४–१५ मे", en: "14–15 May" }],
            [{ ne: "मिथुन", en: "Mithuna" }, { ne: "मिथुन", en: "Gemini" }, { ne: "असार", en: "Asar" }, { ne: "१४–१५ जुन", en: "14–15 Jun" }],
            [{ ne: "कर्क", en: "Karka" }, { ne: "कर्क", en: "Cancer" }, { ne: "साउन", en: "Shrawan" }, { ne: "१६–१७ जुलाई", en: "16–17 Jul" }],
            [{ ne: "सिंह", en: "Simha" }, { ne: "सिंह", en: "Leo" }, { ne: "भदौ", en: "Bhadra" }, { ne: "१६–१७ अगस्ट", en: "16–17 Aug" }],
            [{ ne: "कन्या", en: "Kanya" }, { ne: "कन्या", en: "Virgo" }, { ne: "असोज", en: "Ashwin" }, { ne: "१६–१७ सेप्टेम्बर", en: "16–17 Sep" }],
            [{ ne: "तुला", en: "Tula" }, { ne: "तुला", en: "Libra" }, { ne: "कात्तिक", en: "Kartik" }, { ne: "१७–१८ अक्टोबर", en: "17–18 Oct" }],
            [{ ne: "वृश्चिक", en: "Vrishchika" }, { ne: "वृश्चिक", en: "Scorpio" }, { ne: "मंसिर", en: "Mangsir" }, { ne: "१६–१७ नोभेम्बर", en: "16–17 Nov" }],
            [{ ne: "धनु", en: "Dhanu" }, { ne: "धनु", en: "Sagittarius" }, { ne: "पुष", en: "Poush" }, { ne: "१५–१६ डिसेम्बर", en: "15–16 Dec" }],
            [{ ne: "मकर", en: "Makara" }, { ne: "मकर", en: "Capricorn" }, { ne: "माघ", en: "Magh" }, { ne: "१४–१५ जनवरी", en: "14–15 Jan" }],
            [{ ne: "कुम्भ", en: "Kumbha" }, { ne: "कुम्भ", en: "Aquarius" }, { ne: "फागुन", en: "Falgun" }, { ne: "१२–१३ फेब्रुअरी", en: "12–13 Feb" }],
            [{ ne: "मीन", en: "Meena" }, { ne: "मीन", en: "Pisces" }, { ne: "चैत", en: "Chaitra" }, { ne: "१४–१५ मार्च", en: "14–15 Mar" }],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "ग्रेगोरियन मिति दिइएको दायरा **करिब** मात्र हो — ठ्याक्कै दिन सूर्यको गणित गरेर मात्र निस्कन्छ, र अयन चलनले शताब्दीयौँमा यो दायरा पनि सार्दै जान्छ।",
            en: "The Gregorian dates above are **approximate** — the exact day comes only from computing the Sun's position, and precession slides even this range across centuries.",
          },
        },
      ],
    },
    {
      title: { ne: "सौरमान कहाँ प्रयोग हुन्छ", en: "Where Sauramāna is used" },
      eyebrow: "In practice",
      blocks: [
        {
          kind: "list",
          items: [
            {
              ne: "**नागरिक मिति** — बि.सं.को गते, महिना र वर्ष; सरकारी कागजात र दैनिक प्रयोग।",
              en: "**Civil dates** — the gate, month and year of BS; official documents and everyday use.",
            },
            {
              ne: "**सङ्क्रान्ति पर्व** — माघे सङ्क्रान्ति, वर्षारम्भ, र अन्य सौर पर्व।",
              en: "**Sankranti festivals** — Maghe Sankranti, the new year, and other solar observances.",
            },
            {
              ne: "**ऋतु गणना** — कृषि र मौसमी चक्रको परम्परागत विभाजन।",
              en: "**Reckoning the ṛtus** — the traditional division of the agricultural and seasonal cycle.",
            },
            {
              ne: "**उमेर र वर्षगाँठ** — नेपालमा जन्मदिन प्रायः गतेअनुसार गनिन्छ।",
              en: "**Age and anniversaries** — in Nepal a birthday is usually counted by gate.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "तर चाडपर्व, व्रत र मुहूर्त प्रायः सौरमानले तय गर्दैन — त्यसका लागि चन्द्रमा आधारित *चान्द्रमान* चाहिन्छ, जुन अर्को लेखमा छ।",
            en: "Festivals, fasts and muhurta, however, are mostly not set by Sauramāna — those need the Moon-based *Chāndramāna*, which the next article covers.",
          },
        },
      ],
    },
  ],
};
