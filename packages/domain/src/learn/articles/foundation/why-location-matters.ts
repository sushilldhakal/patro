import type { ArticleData } from "../../article-schema";

export const whyLocationMatters: ArticleData = {
  slug: "why-location-matters",
  seeAlso: ["what-is-panchang", "tithi", "how-we-calculate", "chandramana"],
  sections: [
    {
      title: { ne: "पञ्चाङ्ग स्थाननिरपेक्ष हुँदैन", en: "A panchanga is not location-independent" },
      eyebrow: "Global instant, local day",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "केही खगोलीय परिमाण विश्वव्यापी हुन्छन् — तिथि सुरु हुने *क्षण* पृथ्वीभरि एउटै हो। तर व्यवहारमा काम लाग्ने कैयन् पञ्चाङ्ग घटना **अवलोकनकर्ताको स्थान**मा निर्भर हुन्छन्।",
            en: "Some astronomical quantities are global — the *instant* a tithi begins is the same everywhere on Earth. But many of the panchanga events that actually matter in practice depend on the **observer's location**.",
          },
        },
        {
          kind: "list",
          items: [
            { ne: "सूर्योदय र सूर्यास्त", en: "sunrise and sunset" },
            { ne: "चन्द्रोदय र चन्द्रास्त", en: "moonrise and moonset" },
            { ne: "स्थानीय दिनको सीमा", en: "the local day boundary" },
            { ne: "घटना घट्दा स्थानीय नागरिक मिति कुन थियो", en: "which civil date it was locally when the event occurred" },
            { ne: "स्थानीय लग्न र भाव", en: "the local lagna and houses" },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यी सबै निम्न कुरामा निर्भर हुन्छन्: **अक्षांश + देशान्तर + उचाइ + समय क्षेत्र + मिति**।",
            en: "All of these depend on **latitude + longitude + elevation + time zone + date**.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "त्यसैले एउटै तिथि काठमाडौँ, मेलबर्न र न्युयोर्कका लागि फरक देखिन सक्छ — घटना एउटै हो, तर स्थानीय सूर्योदय र मितिको परिभाषा फरक।",
            en: "This is why the same tithi can be displayed differently for Kathmandu, Melbourne and New York — one event, but different local sunrises and date conventions.",
          },
        },
      ],
    },
    {
      title: { ne: "सूर्योदय किन महत्त्वपूर्ण छ", en: "Why sunrise is important" },
      eyebrow: "The day boundary",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "परम्परागत पञ्चाङ्ग प्रणालीले दैनिक जानकारी बाँड्ने सीमा प्रायः **स्थानीय सूर्योदय** मान्छ — मध्यरात होइन। वैदिक दिन सूर्योदयदेखि अर्को सूर्योदयसम्म चल्छ।",
            en: "Traditional panchanga systems generally take **local sunrise** as the boundary for assigning each day's information — not midnight. The Vedic day runs from one sunrise to the next.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसबाट एक महत्त्वपूर्ण छुट्टयाइ निस्कन्छ: **खगोलीय घटनाको ठ्याक्कै एक क्षण हुन्छ**, तर **त्यो घटना कुन पञ्चाङ्ग दिनको भनेर तोक्ने काम पात्रोको दिन–सीमा नियमले गर्छ**।",
            en: "From this follows a crucial distinction: **an astronomical event has an exact instant**, but **which panchanga day contains it is decided by the calendar's day-boundary rule**.",
          },
        },
        {
          kind: "diagram",
          id: "sunrise-samples-tithi",
        },
        {
          kind: "para",
          text: {
            ne: "त्यसैले “मध्यरातमा कुन तिथि छ?” भन्ने प्रश्नले “आजको पञ्चाङ्ग तिथि कुन?” भन्ने प्रश्नको उत्तर दिँदैन। दुई फरक प्रश्न हुन्।",
            en: "So asking \"what tithi is it at midnight?\" does not answer \"what is today's panchanga tithi?\" They are two different questions.",
          },
        },
        {
          kind: "diagram",
          id: "sunrise-vriddhi",
          caption: {
            ne: "सूर्योदय–सीमाले तिथि दिनमा कसरी बाँडिन्छ देखाउँछ — यहाँ एउटै तिथि दुई दिन (वृद्धि) परेको।",
            en: "How the sunrise boundary distributes tithis across days — here one tithi spanning two days (vriddhi).",
          },
        },
      ],
    },
    {
      title: { ne: "व्यवहारमा यसको अर्थ", en: "What this means in practice" },
      eyebrow: "Using Vedic Patro",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वेदिक पात्रोले पञ्चाङ्ग देखाउँदा तपाईंले छानेको स्थानको अक्षांश, देशान्तर र समय क्षेत्र प्रयोग गर्छ। स्थान बदल्दा तिथि, सूर्योदय र कहिलेकाहीँ **पर्वको दिन** पनि बदलिन सक्छ।",
            en: "When Vedic Patro shows a panchanga it uses the latitude, longitude and time zone of the location you have chosen. Change the location and the tithi, the sunrise and sometimes even the **day of a festival** can change with it.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "विदेशमा बस्ने नेपालीका लागि", en: "For Nepalis abroad" },
              p: {
                ne: "नेपालको पात्रो र स्थानीय पात्रो एक दिन फरक पर्न सक्छ — कुन आधार मान्ने आफैँ छान्नुपर्छ।",
                en: "The Nepali calendar and your local one can differ by a day — which basis to follow is a choice you make.",
              },
            },
            {
              h: { ne: "पर्व र व्रतका लागि", en: "For festivals and fasts" },
              p: {
                ne: "प्रायः परम्परा नेपालको (काठमाडौँ) पञ्चाङ्ग पछ्याउँछ, तर स्थानीय सूर्योदयअनुसार गर्ने प्रचलन पनि छ।",
                en: "Most communities follow the Nepal (Kathmandu) panchanga, though observing by local sunrise is also practised.",
              },
            },
            {
              h: { ne: "कुण्डली र मुहूर्तका लागि", en: "For kundali and muhurta" },
              p: {
                ne: "यहाँ स्थान अनिवार्य हुन्छ — लग्न र भाव पूरै अक्षांश–देशान्तरमा निर्भर छन्।",
                en: "Here location is mandatory — lagna and the houses depend entirely on latitude and longitude.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "एउटै आकाश, फरक क्षितिज — यही कारण पञ्चाङ्ग सधैँ “कहाँ” भन्ने प्रश्नसँग जोडिएर आउँछ।",
            en: "One sky, different horizons — which is why a panchanga always arrives attached to the question \"where?\"",
          },
        },
      ],
    },
  ],
};
