import type { ArticleData } from "../../article-schema";

export const ancientSky: ArticleData = {
  slug: "ancient-sky",
  seeAlso: ["precession", "pole-star-changes", "history", "ancient-calendars"],
  sections: [
    {
      title: { ne: "आकाश सधैँ यस्तै थिएन", en: "The sky was not always like this" },
      eyebrow: "Precession over millennia",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अयन चलनले हरेक `७२` वर्षमा `१°` सार्छ — मानव जीवनकालमा नगण्य, तर सहस्राब्दीको दायरामा आकाशको चित्र नै फेरिदिने।",
            en: "Precession shifts the sky by `1°` every `72` years — negligible in a lifetime, but over millennia it redraws the picture entirely.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसको अर्थ — वेद र सिद्धान्त ग्रन्थ लेखिँदा आकाश आजको भन्दा **मापनयोग्य रूपमा फरक** थियो। ती ग्रन्थका खगोलीय वर्णन बुझ्न यो कुरा ध्यानमा राख्नु आवश्यक छ।",
            en: "Which means that when the Vedas and the siddhantas were composed the sky was **measurably different** from today's. Reading their astronomical descriptions requires keeping that in mind.",
          },
        },
        {
          kind: "diagram",
          id: "precession-sky",
          caption: {
            ne: "अयन चलनले शताब्दीयौँमा आकाश बदल्छ — प्राचीन अवलोकन आजकै आकाशमा मिल्दैन।",
            en: "Precession reshapes the sky over centuries — ancient observations do not match today's.",
          },
        },
      ],
    },
    {
      title: { ne: "विषुव कुन नक्षत्रमा थियो", en: "Which nakshatra held the equinox" },
      eyebrow: "A rough dating tool",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अयन चलनका कारण वसन्त विषुव नक्षत्रचक्रमा उल्टो सर्दै जान्छ। कुन नक्षत्रमा विषुव थियो भन्ने कुराले युगको मोटामोटी सङ्केत दिन्छ।",
            en: "Because of precession the vernal equinox slides backwards through the nakshatras. Which nakshatra held it gives a rough indication of the epoch.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "समय", en: "Epoch" },
            { ne: "विषुवको नक्षत्र", en: "Equinox nakshatra" },
          ],
          rows: [
            [{ ne: "~४००० ई.पू.", en: "~4000 BCE" }, { ne: "मृगशिरा", en: "Mrigashira" }],
            [{ ne: "~२५०० ई.पू.", en: "~2500 BCE" }, { ne: "कृत्तिका", en: "Krittika" }],
            [{ ne: "~५०० ई.पू.", en: "~500 BCE" }, { ne: "अश्विनी", en: "Ashwini" }],
            [{ ne: "आज", en: "Today" }, { ne: "उत्तरभाद्रपद–रेवती", en: "Uttarabhadrapada–Revati" }],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "पुराना सूचीहरूमा नक्षत्र गणना **कृत्तिका** बाट सुरु हुन्थ्यो, जबकि पछिका ग्रन्थमा **अश्विनी** बाट। यो परिवर्तन आफैँमा अयन चलनको छाप हो — गणना त्यसबेलाको विषुवबाट सुरु गरिन्थ्यो।",
            en: "Older lists begin the nakshatras at **Krittika**, later texts at **Ashwini**. That shift is itself a fingerprint of precession — the count started from the equinox of the day.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यस्ता सङ्केतबाट ग्रन्थको मिति अनुमान गर्ने काम सावधानीपूर्वक गर्नुपर्छ — पाठ्य परम्परा शताब्दीयौँसम्म चल्ने हुनाले कुनै एउटा उल्लेखले पूरै ग्रन्थको मिति तय गर्दैन।",
            en: "Dating a text from such clues calls for caution — textual traditions run for centuries, so a single reference does not date a whole work.",
          },
        },
      ],
    },
    {
      title: { ne: "अरू के फरक थियो", en: "What else was different" },
      eyebrow: "A different night sky",
      blocks: [
        {
          kind: "list",
          items: [
            {
              ne: "**ध्रुव तारा** — `३०००` ई.पू.मा थुबन ध्रुवमा थियो, ध्रुवतारा (पोलारिस) होइन।",
              en: "**The pole star** — at `3000` BCE it was Thuban, not Polaris.",
            },
            {
              ne: "**मकर सङ्क्रान्ति र शीत अयनान्त** — `२८५` ई.तिर एउटै दिन पर्थे।",
              en: "**Makara Sankranti and the winter solstice** — around `285` CE they fell on the same day.",
            },
            {
              ne: "**तारा आफैँ सरेका** — तारा स्थिर छैनन्; हजारौँ वर्षमा तिनको आफ्नै गतिले तारापुञ्जको आकार पनि बिस्तारै बदलिन्छ।",
              en: "**The stars themselves have moved** — stars are not fixed, and over millennia their own motion slowly reshapes the constellations.",
            },
            {
              ne: "**अक्ष झुकाव** — त्यसबेला `२३.४४°` भन्दा केही बढी थियो, त्यसैले ऋतु अलि तीव्र थिए।",
              en: "**The axial tilt** — slightly greater than `23.44°` then, making the seasons a touch sharper.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसैले पुराना पात्रो नियमलाई “गलत” भन्नु उचित हुँदैन। ती **आफ्नो समयको आकाशका लागि सही** थिए; आकाश सरेको हो, नियम बिग्रेको होइन।",
            en: "It is therefore unfair to call the old calendrical rules wrong. They were **right for the sky of their time**; it is the sky that has moved, not the rules that failed.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यही कारण पात्रो परम्परामा समय–समयमा सुधार आवश्यक हुन्छ — र यही कारण अयनांशको मान पनि निरन्तर अद्यावधिक गरिन्छ।",
            en: "Which is exactly why calendrical traditions need periodic reform — and why the value of the ayanamsha is continually updated.",
          },
        },
      ],
    },
  ],
};
