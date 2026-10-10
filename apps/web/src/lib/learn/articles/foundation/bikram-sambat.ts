import type { ArticleData } from "../../article-schema";

export const bikramSambat: ArticleData = {
  slug: "bikram-sambat",
  seeAlso: ["year-begins-baisakh", "sauramana", "bs-vs-ad", "bs-ad-offset"],
  sections: [
    {
      title: { ne: "दुई फरक प्रश्न", en: "Two different questions" },
      eyebrow: "Era vs rules",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "विक्रम सम्वत् (बि.सं.) नेपालको नागरिक पात्रोमा प्रयोग हुने *सम्वत्* हो। तर यसलाई बुझ्न दुई फरक प्रश्न छुट्याउनु आवश्यक छ।",
            en: "Bikram Sambat (BS) is the *era* used by Nepal for its civil calendar. To understand it, though, two different questions must be kept apart.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "प्रश्न १ — सम्वत् के हो?", en: "Question 1 — What is the era?" },
              p: {
                ne: "यो **वर्षको गणना** सम्बन्धी प्रश्न हो — वर्षलाई कुन सङ्ख्या दिने।",
                en: "This concerns the **numbering of years** — which number a given year carries.",
              },
            },
            {
              h: { ne: "प्रश्न २ — महिना–गते कसरी बन्छन्?", en: "Question 2 — How are months and dates set?" },
              p: {
                ne: "यो **पात्रोका नियम र खगोलीय गणना** सम्बन्धी प्रश्न हो।",
                en: "This concerns the **calendar rules and astronomical calculations**.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यी दुई जोडिएका छन्, तर एउटै होइनन्। कुनै वर्ष एउटा सम्वत्अन्तर्गत पर्न सक्छ, जबकि त्यसका महिना र दिन बेग्लै पात्रो प्रणालीका नियमले तय हुन्छन्।",
            en: "The two are related, but they are not the same thing. A year can belong to one era while its months and days are determined by the rules of a particular calendrical system.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यही छुट्याइ नबुझ्दा “बि.सं. ग्रेगोरियनभन्दा ५७ वर्ष अगाडि छ” भन्ने वाक्यले पूरै पात्रो व्याख्या गरेको भ्रम पर्छ — वास्तवमा त्यसले वर्षको सङ्ख्या मात्र बताउँछ।",
            en: "Miss this distinction and \"BS runs 57 years ahead of the Gregorian\" starts to sound like a full account of the calendar — when in fact it describes only the year number.",
          },
        },
        {
          kind: "diagram",
          id: "calendar-hierarchy",
          caption: {
            ne: "वर्ष, महिना, गते र तिथि — विक्रम सम्वत्‌का तहहरू कसरी एकमाथि अर्को बस्छन्।",
            en: "Year, month, gate and tithi — how the layers of Bikram Sambat stack up.",
          },
        },
      ],
    },
    {
      title: { ne: "खगोलीय जग", en: "The astronomical foundation" },
      eyebrow: "Sauramāna",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "परम्परागत दक्षिण एसियाली पात्रो–खगोलशास्त्रमा समय नाप्ने कैयन् विधि छन्। बि.सं. का महिनाको आधार *सौरमान* हो — जसले राशिचक्रमा सूर्यको प्रगतिबाट सौर वर्ष नाप्छ।",
            en: "Traditional South Asian calendrical astronomy contains several methods of measuring time. The months of BS rest on *Sauramāna*, which measures the solar year by the Sun's progression through the zodiac.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "राशिचक्र बाह्र ~राशि~ मा बाँडिएको छ, प्रत्येक ठ्याक्कै `३०°` को।",
            en: "The zodiac is divided into twelve ~rashis~, each of exactly `30°`.",
          },
        },
        {
          kind: "table",
          caption: {
            ne: "बाह्र राशि — राशि/संस्कृत र पश्चिमी समकक्ष",
            en: "The twelve rashis — rashi/Sanskrit and Western equivalent",
          },
          headers: [
            { ne: "राशि / संस्कृत", en: "Rashi / Sanskrit" },
            { ne: "पश्चिमी समकक्ष", en: "Western equivalent" },
            { ne: "देशान्तर", en: "Longitude" },
          ],
          rows: [
            [{ ne: "मेष", en: "Mesha" }, "Aries", "0°–30°"],
            [{ ne: "वृषभ", en: "Vrishabha" }, "Taurus", "30°–60°"],
            [{ ne: "मिथुन", en: "Mithuna" }, "Gemini", "60°–90°"],
            [{ ne: "कर्क", en: "Karka" }, "Cancer", "90°–120°"],
            [{ ne: "सिंह", en: "Simha" }, "Leo", "120°–150°"],
            [{ ne: "कन्या", en: "Kanya" }, "Virgo", "150°–180°"],
            [{ ne: "तुला", en: "Tula" }, "Libra", "180°–210°"],
            [{ ne: "वृश्चिक", en: "Vrishchika" }, "Scorpio", "210°–240°"],
            [{ ne: "धनु", en: "Dhanu" }, "Sagittarius", "240°–270°"],
            [{ ne: "मकर", en: "Makara" }, "Capricorn", "270°–300°"],
            [{ ne: "कुम्भ", en: "Kumbha" }, "Aquarius", "300°–330°"],
            [{ ne: "मीन", en: "Meena" }, "Pisces", "330°–360°"],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सूर्य एक राशिबाट अर्को राशिमा प्रवेश गर्ने त्यो सङ्क्रमणलाई ~सङ्क्रान्ति~ भनिन्छ। त्यसैले **मेष सङ्क्रान्ति** = सूर्य मेषमा प्रवेश, र **मकर सङ्क्रान्ति** = सूर्य मकरमा प्रवेश। यी सङ्क्रमण परम्परागत सौर पात्रोका आधारभूत बिन्दु हुन्।",
            en: "The transition as the Sun moves from one rashi into the next is called a ~sankranti~. So **Mesha Sankranti** = the Sun enters Mesha, and **Makara Sankranti** = the Sun enters Makara. These transitions are fundamental to the traditional solar calendar.",
          },
        },
      ],
    },
    {
      title: { ne: "बि.सं.को महिना कसरी बन्छ", en: "How a BS month is formed" },
      eyebrow: "Gate and month length",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "बि.सं.मा महिनाको नाम चान्द्र मासबाट आउँछ, तर महिनाको **लम्बाइ सूर्यको राशि–गतिले** तय गर्छ। सूर्य कुनै राशिमा जति दिन बस्छ, त्यही महिनाको दिन–सङ्ख्या हुन्छ।",
            en: "In BS the month *names* come from the lunar months, but a month's **length is set by the Sun's motion through a sign**. However many days the Sun spends in a rashi is how many days that month has.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "29–32",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "महिनाको लम्बाइ", en: "Month length" },
              desc: {
                ne: "पृथ्वीको कक्ष अण्डाकार भएकाले सूर्यको देखिने गति घटबढ हुन्छ, त्यसैले हरेक महिना बराबर हुँदैन।",
                en: "Earth's orbit is elliptical, so the Sun's apparent speed varies — no two months are equal.",
              },
            },
            {
              big: "12",
              unit: { ne: "सङ्क्रान्ति", en: "sankrantis" },
              label: { ne: "एक वर्षमा", en: "Per year" },
              desc: {
                ne: "प्रत्येक सङ्क्रान्ति नयाँ सौर महिनाको पहिलो गते बन्छ।",
                en: "Each sankranti becomes the first gate of a new solar month.",
              },
            },
            {
              big: "1",
              unit: { ne: "गते", en: "gate" },
              label: { ne: "सङ्क्रान्तिको दिन", en: "The sankranti day" },
              desc: {
                ne: "बैशाख १ गते — सूर्य मेषमा प्रवेश गर्ने दिन।",
                en: "Baisakh 1 — the day the Sun enters Mesha.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यसैकारण आउँदो वर्षको पात्रो पहिल्यै ठ्याक्क भन्न खगोलीय गणना चाहिन्छ — महिनाको दिन–सङ्ख्या कुनै निश्चित नियमले नभई सूर्यको वास्तविक स्थितिले तय गर्छ।",
            en: "This is why next year's calendar cannot be written from a fixed rule — the number of days in a month is set by the Sun's actual position, and has to be computed.",
          },
        },
      ],
    },
  ],
};
