import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `TithiVriddhiKshaya` — see `what-is-panchang.ts` header note. */
export const tithiVriddhiKshaya: ArticleData = {
  slug: "tithi-vriddhi-kshaya",
  sections: [
    {
      title: { ne: "एउटै तिथि दुई दिन — वृद्धि", en: "One tithi, two days — vriddhi" },
      eyebrow: "Repeated tithi",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "जब चन्द्र *मन्द गतिमा* (करिब १०.७°/दिन) हिँड्छ, एउटै १२° को तिथि–खण्डले **लगातार दुई सूर्योदय** समेट्छ। दुवै बिहान त्यही तिथि चलिरहेकाले पात्रोमा त्यो तिथि ~दुई दिन~ देखिन्छ।",
            en: "When the Moon moves *slowly* (about 10.7°/day), a single 12° tithi-segment spans **two consecutive sunrises**. Since the same tithi is running on both mornings, the calendar shows that tithi on ~two days~.",
          },
        },
        {
          kind: "diagram",
          id: "sunrise-vriddhi",
          caption: {
            ne: "तृतीया खण्ड यति फराकिलो छ कि १० र ११ गते — दुवै सूर्योदय यसैभित्र परे। त्यसैले तृतीया दोहोरियो।",
            en: "The Tritiya segment is so wide that both the 10th and 11th sunrises fall within it — so Tritiya repeats.",
          },
        },
      ],
    },
    {
      title: { ne: "हराएको तिथि — क्षय", en: "A skipped tithi — kshaya" },
      eyebrow: "Skipped tithi",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "उल्टो, जब चन्द्र *द्रुत गतिमा* (करिब १४.३°/दिन) हिँड्छ, कुनै १२° को तिथि–खण्ड **दुई सूर्योदयको बीचमै** पूरै सकिन्छ। कुनै पनि सूर्योदयमा त्यो तिथि नभेटिएकाले त्यो ~क्षय~ भई पात्रोबाट हराउँछ।",
            en: "Conversely, when the Moon moves *fast* (about 14.3°/day), a 12° tithi-segment finishes entirely **between two sunrises**. Since that tithi is present at no sunrise, it is ~skipped (kshaya)~ and disappears from the calendar.",
          },
        },
        {
          kind: "diagram",
          id: "sunrise-kshaya",
          caption: {
            ne: "अष्टमी खण्ड साँघुरो भएर एक सूर्योदयदेखि अर्कोको बीचमै सकियो — कुनै बिहान अष्टमी परेन, त्यसैले त्यो क्षय भयो।",
            en: "The Ashtami segment is so narrow it ended between one sunrise and the next — no morning landed on Ashtami, so it was skipped.",
          },
        },
      ],
    },
    {
      title: { ne: "एउटै नियमका दुई पक्ष", en: "Two sides of one rule" },
      eyebrow: "Two sides of one rule",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "दुवै अवस्था एउटै नियमबाट आउँछन् — **सूर्योदयमा जुन तिथि चलिरहेको छ, त्यही दिनको तिथि**। तिथि–खण्ड सूर्योदयको अन्तरभन्दा *फराकिलो* भए वृद्धि, *साँघुरो* भए क्षय। चन्द्रको गति स्थिर नभएकाले दुवै अनिवार्य छन्।",
            en: "Both cases fall out of the same rule — **the tithi running at sunrise is the tithi of that day**. If a tithi-segment is *wider* than the gap between sunrises you get a vriddhi; *narrower*, a kshaya. Since the Moon's speed is not constant, both are inevitable.",
          },
        },
      ],
    },
  ],
};
