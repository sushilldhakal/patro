import type { ArticleData } from "../../article-schema";

export const locationDifferentResults: ArticleData = {
  slug: "location-different-results",
  seeAlso: ["why-location-matters", "calc-sunrise", "calc-tithi", "time-scales"],
  sections: [
    {
      title: { ne: "एउटै क्षण, फरक उत्तर", en: "One instant, different answers" },
      eyebrow: "What is global and what is not",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्गका परिमाणलाई दुई वर्गमा बाँड्न सकिन्छ — जुन विश्वभरि उही हुन्छन्, र जुन स्थानअनुसार बदलिन्छन्।",
            en: "Panchanga quantities fall into two classes — those identical everywhere, and those that change with location.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "परिमाण", en: "Quantity" },
            { ne: "स्थाननिरपेक्ष?", en: "Location-independent?" },
            { ne: "किन", en: "Why" },
          ],
          rows: [
            [
              { ne: "तिथि सकिने क्षण", en: "The instant a tithi ends" },
              { ne: "हो", en: "Yes" },
              { ne: "कोणीय अवस्था — पृथ्वीभरि एउटै।", en: "An angular state — the same across Earth." },
            ],
            [
              { ne: "सङ्क्रान्तिको क्षण", en: "The instant of a sankranti" },
              { ne: "हो", en: "Yes" },
              { ne: "सूर्यको देशान्तर सबैका लागि उही।", en: "The Sun's longitude is the same for everyone." },
            ],
            [
              { ne: "सूर्योदय", en: "Sunrise" },
              { ne: "होइन", en: "No" },
              { ne: "अक्षांश, देशान्तर, उचाइमा निर्भर।", en: "Depends on latitude, longitude and altitude." },
            ],
            [
              { ne: "आजको तिथि", en: "Today's tithi" },
              { ne: "होइन", en: "No" },
              { ne: "सूर्योदयको सीमाले तोक्ने भएकाले।", en: "Because the sunrise boundary assigns it." },
            ],
            [
              { ne: "वार", en: "Vāra" },
              { ne: "होइन", en: "No" },
              { ne: "सूर्योदयबाट सुरु हुने भएकाले।", en: "Because it begins at sunrise." },
            ],
            [
              { ne: "लग्न", en: "Lagna" },
              { ne: "होइन", en: "No" },
              { ne: "क्षितिज स्थानअनुसार फरक हुने भएकाले।", en: "Because the horizon differs from place to place." },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "ध्यान दिनुहोस् — पहिलो दुई **स्थाननिरपेक्ष** भए पनि, तिनलाई *कुन दिनमा राख्ने* भन्ने प्रश्न स्थानसापेक्ष हुन्छ। यही मोडमा भ्रम सुरु हुन्छ।",
            en: "Note that although the first two are **location-independent**, the question of *which day they belong to* is not. That turn is where the confusion begins.",
          },
        },
        {
          kind: "diagram",
          id: "sunrise-vriddhi",
        },
      ],
    },
    {
      title: { ne: "एउटा ठोस उदाहरण", en: "A concrete example" },
      eyebrow: "Kathmandu vs Sydney",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "मानौँ कुनै तिथि **UTC मा `२२:००`** बजे सकिन्छ। यो क्षण विश्वभरि उही हो — तर दुई सहरमा यसको अर्थ फरक हुन्छ।",
            en: "Suppose a tithi ends at **`22:00` UTC**. That instant is the same worldwide — yet it means different things in two cities.",
          },
        },
        {
          kind: "diagram",
          id: "tithi-across-zones",
        },
        {
          kind: "para",
          text: {
            ne: "यसैले विदेशमा बस्ने नेपालीले **कुन पञ्चाङ्ग पछ्याउने** भन्ने छनोट गर्नुपर्छ — नेपालको (काठमाडौँको सूर्योदयमा आधारित) कि स्थानीय। दुवै आ–आफ्नो हिसाबले सही हुन्छन्।",
            en: "Nepalis abroad must therefore choose **which panchanga to follow** — Nepal's, keyed to Kathmandu's sunrise, or the local one. Each is correct on its own terms.",
          },
        },
      ],
    },
    {
      title: { ne: "वेदिक पात्रोले कसरी सम्हाल्छ", en: "How Vedic Patro handles it" },
      eyebrow: "Location as an input",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वेदिक पात्रोले स्थानलाई **इनपुट** मान्छ, स्थिर मान होइन। तपाईंले छानेको स्थानको अक्षांश, देशान्तर, उचाइ र समय क्षेत्रले सबै स्थानसापेक्ष परिमाण पुनः गणना हुन्छन्।",
            en: "Vedic Patro treats location as an **input**, not a constant. The latitude, longitude, altitude and timezone you choose drive a recomputation of every location-dependent quantity.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "पूर्वनिर्धारित स्थान **काठमाडौँ** हो — नेपालको आधिकारिक पात्रोसँग मिल्ने गरी।",
              en: "The default location is **Kathmandu**, so results match Nepal's official calendar.",
            },
            {
              ne: "नेपालभित्रका स्थानका लागि `Asia/Kathmandu` नै प्रयोग हुन्छ, **ऐतिहासिक अफसेट सहित** — पुराना मितिका लागि `+०५:३०` वा `+०५:४१:१६`।",
              en: "Locations inside Nepal resolve through `Asia/Kathmandu` **including its historical offsets** — `+05:30` or `+05:41:16` for older dates.",
            },
            {
              ne: "उचाइ नदिइए अक्षांश–देशान्तरबाट अनुमान गरिन्छ, किनभने पहाडी स्थानमा यसले सूर्योदयमा फरक पार्छ।",
              en: "If altitude is not supplied it is estimated from the coordinates, since in hill locations it shifts sunrise.",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "छोटोमा: पञ्चाङ्ग **आकाशको** मात्र होइन, **आकाश कहाँबाट हेरिँदै छ** भन्ने कुराको पनि विवरण हो।",
            en: "In short: a panchanga describes not only the sky but **where the sky is being watched from**.",
          },
        },
      ],
    },
  ],
};
