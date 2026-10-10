import type { ArticleData } from "../../article-schema";

export const calcTithi: ArticleData = {
  slug: "calc-tithi",
  seeAlso: ["tithi", "lunar-longitude", "calc-karana", "tithi-not-24-hours"],
  sections: [
    {
      title: { ne: "तिथिको सङ्ख्या — सजिलो भाग", en: "The tithi number — the easy part" },
      eyebrow: "One division",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "कुनै क्षणको तिथि निकाल्न दुई सङ्ख्या चाहिन्छ — सूर्य र चन्द्रको देशान्तर — र एउटा भाग।",
            en: "Getting the tithi at an instant takes two numbers — the longitudes of Sun and Moon — and one division.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "कोणान्तर = (चन्द्रको देशान्तर − सूर्यको देशान्तर) mod `३६०°`", en: "elongation = (Moon's longitude − Sun's longitude) mod `360°`" },
            { ne: "तिथि = (कोणान्तर ÷ `१२°`) को पूर्णांक भाग + `१`", en: "tithi = integer part of (elongation ÷ `12°`) + `1`" },
          ],
          example: [
            { k: { ne: "चन्द्रको देशान्तर", en: "Moon's longitude" }, v: "152.4°" },
            { k: { ne: "सूर्यको देशान्तर", en: "Sun's longitude" }, v: "38.1°" },
            { k: { ne: "कोणान्तर", en: "elongation" }, v: "114.3°" },
            { k: { ne: "११४.३ ÷ १२", en: "114.3 ÷ 12" }, v: "9.525" },
          ],
          result: {
            ne: "पूर्णांक भाग `९` + `१` = **तिथि १०**, र दशमलव `०.५२५` ले त्यो तिथि `५२.५%` सकिएको बताउँछ।",
            en: "Integer part `9` + `1` = **tithi 10**, and the fraction `0.525` says that tithi is `52.5%` elapsed.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "engine मा यो ठ्याक्कै यसरी लेखिएको छ: `TITHI_SPAN = 12.0`, अनि `int(elongation / TITHI_SPAN) + 1`। भागको बाँकीले तिथि कति प्रतिशत बितिसक्यो भन्ने दिन्छ।",
            en: "In the engine this is written exactly so: `TITHI_SPAN = 12.0`, then `int(elongation / TITHI_SPAN) + 1`. The remainder gives the fraction of the tithi elapsed.",
          },
        },
      ],
    },
    {
      title: { ne: "सन्धि समय — गाह्रो भाग", en: "The boundary times — the hard part" },
      eyebrow: "Binary search",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्गले तिथिको नाम मात्र होइन, **कहिले सकिन्छ** पनि भन्नुपर्छ। यो अर्को मूल-खोज समस्या हो — तर सङ्क्रान्तिभन्दा फरक तरिकाले हल गरिन्छ।",
            en: "A panchanga must give not just the tithi's name but **when it ends**. That is another root-finding problem — though solved differently from the sankranti.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "engine ले वर्तमान क्षणबाट **`३०` घण्टाको खोज सञ्झ्याल** लिन्छ — कुनै पनि तिथि यत्ति लामो हुँदैन, त्यसैले सन्धि यसभित्रै पर्छ।",
              en: "The engine takes a **`30`-hour search window** from the current instant — no tithi lasts that long, so the boundary must lie inside it.",
            },
            {
              ne: "बीचको क्षणमा तिथि गणना गर्छ। **उही** तिथि भए सन्धि पछाडि छ; **फरक** भए अगाडि।",
              en: "It computes the tithi at the midpoint. If it is **the same**, the boundary lies later; if **different**, earlier.",
            },
            {
              ne: "यसरी सञ्झ्याल आधा–आधा गर्दै जान्छ — **द्विआधारी खोज**, बढीमा `५०` पटक।",
              en: "The window halves each time — a **binary search**, capped at `50` iterations.",
            },
            {
              ne: "सञ्झ्याल **`६०` सेकेन्ड**भन्दा सानो भएपछि रोकिन्छ। त्यही सहनशीलता पञ्चाङ्गमा देखिने शुद्धता हो।",
              en: "It stops once the window is under **`60` seconds** — and that tolerance is the precision you see in the panchanga.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "`३०` घण्टामा `६०` सेकेन्डसम्म पुग्न झन्डै `११` पटक आधा गर्नु पर्याप्त हुन्छ (`३० घण्टा ÷ २¹¹ ≈ ५३` सेकेन्ड) — त्यसैले वास्तविक पुनरावृत्ति सीमाभन्दा धेरै कम हुन्छ।",
            en: "Halving `30` hours down to `60` seconds needs about `11` steps (`30 h ÷ 2¹¹ ≈ 53` s), so the real iteration count sits well under the cap.",
          },
        },
        {
          kind: "diagram",
          id: "tithi-elongation",
        },
      ],
    },
    {
      title: { ne: "अनि दिनमा राख्ने", en: "And then assigning it to a day" },
      eyebrow: "Sunrise rule",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तिथि र त्यसको सन्धि समय भेटिएपछि अन्तिम प्रश्न बाँकी रहन्छ — **आजको तिथि कुन**?",
            en: "With the tithi and its boundaries known, the last question remains — **which tithi is today's**?",
          },
        },
        {
          kind: "para",
          text: {
            ne: "उत्तर: **सूर्योदयको क्षणमा जुन तिथि चलिरहेको छ, त्यही दिनभरिको तिथि**। यसैले तिथि गणनाले सूर्योदय गणनालाई भर पर्छ, र सूर्योदय स्थानसापेक्ष भएकाले तिथि पनि स्थानसापेक्ष बन्छ।",
            en: "The answer: **whichever tithi is running at sunrise is the tithi for the whole day**. So the tithi computation depends on the sunrise computation — and since sunrise is local, so is the tithi.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "दुई सूर्योदय छोयो", en: "Touches two sunrises" },
              p: { ne: "**तिथि वृद्धि** — एउटै तिथि दुई दिनमा देखिन्छ।", en: "**Tithi vriddhi** — the same tithi appears on two days." },
            },
            {
              h: { ne: "कुनै सूर्योदय छोएन", en: "Touches no sunrise" },
              p: { ne: "**तिथि क्षय** — तिथि पात्रोबाट हराउँछ।", en: "**Tithi kshaya** — the tithi vanishes from the calendar." },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यसैले “तिथि कहिले सकिन्छ” र “आजको तिथि कुन” दुई फरक प्रश्न हुन् — पहिलोको उत्तर खगोलशास्त्रले, दोस्रोको पात्रोको नियमले दिन्छ।",
            en: "\"When does the tithi end\" and \"what is today's tithi\" are therefore different questions — astronomy answers the first, the calendar's rule answers the second.",
          },
        },
      ],
    },
  ],
};
