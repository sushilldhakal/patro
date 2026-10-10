import type { ArticleData } from "../../article-schema";

export const yearBeginsBaisakh: ArticleData = {
  slug: "year-begins-baisakh",
  seeAlso: ["sankranti", "sauramana", "bikram-sambat", "ritu-drift"],
  sections: [
    {
      title: { ne: "वर्ष मेष सङ्क्रान्तिबाट सुरु हुन्छ", en: "The year starts at Mesha Sankranti" },
      eyebrow: "मेष संक्रान्ति",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "परम्परागत सौर वर्ष सूर्य *मेष* राशिमा प्रवेश गर्दा सुरु हुन्छ। त्यो क्षणलाई ~मेष सङ्क्रान्ति~ भनिन्छ, र त्यहीँबाट सुरु हुने सौर महिना **बैशाख** हो।",
            en: "The traditional solar year begins when the Sun enters *Mesha*. That event is called ~Mesha Sankranti~, and the solar month beginning at that transition is **Baisakh**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अवधारणात्मक रूपमा: सूर्यले राशिचक्रको पूरो फेरो लगाउँछ → फेरि मेषमा फर्किन्छ → नयाँ सौर वर्ष सुरु हुन्छ।",
            en: "Conceptually: the Sun completes its cycle through the zodiac → returns to Mesha → a new solar year begins.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "त्यसैले वर्षको आरम्भ कुनै मनपरी छानिएको मिति होइन — यो **सूर्यको खगोलीय स्थिति**सँग बाँधिएको छ।",
            en: "The beginning of the year is therefore tied to an **astronomical position of the Sun**, rather than to an arbitrarily chosen date.",
          },
        },
      ],
    },
    {
      title: { ne: "मेष पहिलो राशि किन?", en: "Why Mesha is the first rashi" },
      eyebrow: "0° of the zodiac",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "राशिचक्रलाई परम्परागत रूपमा `३०°` का बाह्र बराबर खण्डमा बाँडिन्छ, र गणना मेषबाट सुरु हुन्छ।",
            en: "The zodiac is conventionally divided into twelve equal sections of `30°`, and the count starts from Mesha.",
          },
        },
        {
          kind: "diagram",
          id: "two-zero-points",
        },
        {
          kind: "para",
          text: {
            ne: "यसले सौर पात्रोलाई एक **प्राकृतिक खगोलीय सीमा** दिन्छ — वर्ष कहाँ टुङ्गियो र कहाँ सुरु भयो भन्ने प्रश्नको उत्तर आकाशले दिन्छ, परम्पराले मात्र होइन।",
            en: "This gives the solar calendar a **natural astronomical boundary** — where the year ends and begins is answered by the sky, not by convention alone.",
          },
        },
        {
          kind: "diagram",
          id: "table-rashi",
        },
      ],
    },
    {
      title: {
        ne: "त्यो बिन्दु सूर्य विषुवत् रेखामा पुग्ने ठाउँ थियो",
        en: "That point was where the Sun crossed the equator",
      },
      eyebrow: "Equinox · वसन्त आरम्भ",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "मेषलाई शून्य मान्नु परम्परा मात्र होइन। जुन बेला यो राशिचक्र निश्चित गरियो — करिब `२८५` ई.सं., अर्थात् `३४२` बि.सं. तिर — मेषको ० अंश ठ्याक्कै **वसन्त विषुव** मा थियो।",
            en: "Taking Mesha as zero was not merely a convention. When this zodiac was fixed — around `285` CE, roughly `342` BS — the 0° point of Mesha sat exactly on the **vernal equinox**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "त्यो क्षणमा आकाशमा तीन कुरा एकैसाथ हुन्थे, र त्यही मेल नै वर्षारम्भको कारण हो।",
            en: "At that moment three things happened in the sky together, and it is that coincidence which made it the start of the year.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सूर्य विषुवत् रेखामा", en: "The Sun on the equator" },
              p: {
                ne: "सूर्य ~खगोलीय विषुवत् वृत्त~ ठ्याक्कै पार गर्थ्यो — क्रान्ति शून्य।",
                en: "The Sun crossed the ~celestial equator~ exactly — declination zero.",
              },
            },
            {
              h: { ne: "दिन र रात बराबर", en: "Day equal to night" },
              p: {
                ne: "पृथ्वीभरि दिन र रात दुवै झन्डै `१२`–`१२` घण्टाका हुन्थे।",
                en: "Everywhere on Earth, day and night were each about `12` hours.",
              },
            },
            {
              h: { ne: "वसन्त ऋतुको आरम्भ", en: "Spring begins" },
              p: {
                ne: "उत्तरी गोलार्धमा *वसन्त* सुरु — जाडो सकिएर उज्यालो बढ्न थाल्ने बिन्दु।",
                en: "In the northern hemisphere *spring* opened — winter done, daylight lengthening.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "त्यसैले बैशाख १ बनावटी मिति थिएन। यो **वर्षको त्यो दिन थियो जब सूर्य विषुवत् रेखा नाघेर उत्तरतिर जान्थ्यो** — नयाँ ऋतु, नयाँ वर्ष।",
            en: "So Baisakh 1 was not an invented date. It was **the day the Sun crossed the equator heading north** — a new season, and with it a new year.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यो मेल अब टुटिसक्यो। ~अक्ष–चलन~ ले विषुव बिन्दुलाई बिस्तारै पछाडि सारेको छ, र आज मेष सङ्क्रान्ति विषुवभन्दा करिब `२४` दिन पछि पर्छ। पात्रोले **ताराको सन्दर्भ** समात्यो, ऋतु भने सर्दै गयो — अर्को खण्डमा यही फरक।",
            en: "That alignment has since broken. ~Precession~ has slowly dragged the equinox backwards, and today Mesha Sankranti falls about `24` days after it. The calendar held on to **the stars**, and let the seasons drift — which is the next section.",
          },
        },
      ],
    },
    {
      title: { ne: "अप्रिल मध्यतिर किन पर्छ", en: "Why it lands in mid-April" },
      eyebrow: "Sidereal reference",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नयाँ वर्ष सामान्यतया `१३`–`१५` अप्रिलतिर पर्छ। यसको कारण नेपाली पात्रोले *निरयन* (ताराको सन्दर्भ) राशिचक्र प्रयोग गर्नु हो, ग्रेगोरियनले प्रयोग गर्ने *सायन* (विषुवको सन्दर्भ) राशिचक्र होइन।",
            en: "The new year usually falls around `13`–`15` April. The reason is that the Nepali calendar uses the *sidereal* zodiac — referenced to the stars — rather than the *tropical* zodiac referenced to the equinox, which underlies the Gregorian year.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "सायन प्रणालीमा मेषको आरम्भ वसन्त विषुव (करिब २१ मार्च) मा पर्छ। निरयन प्रणालीमा त्यही बिन्दु ~अयनांश~ (अहिले करिब `२४°`) ले पछाडि सरेको हुन्छ — र `२४°` सूर्यले पार गर्न झन्डै `२४` दिन लाग्छ। त्यसैले नयाँ वर्ष मार्चको अन्त्यमा नभई अप्रिल मध्यमा पर्छ।",
            en: "In the tropical system the start of Mesha coincides with the vernal equinox (about 21 March). In the sidereal system that same point sits behind it by the ~ayanamsha~ — currently about `24°` — and the Sun needs roughly `24` days to cover `24°`. Hence a mid-April new year rather than a late-March one.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "~24°",
              label: { ne: "वर्तमान अयनांश", en: "Ayanamsha today" },
              desc: {
                ne: "सायन र निरयन मेषबीचको कोणीय फरक।",
                en: "The angular gap between tropical and sidereal Mesha.",
              },
            },
            {
              big: "~1°",
              unit: { ne: "/ ७२ वर्ष", en: "/ 72 years" },
              label: { ne: "अयन चलनको दर", en: "Rate of precession" },
              desc: {
                ne: "यही दरले नयाँ वर्ष शताब्दीयौँमा बिस्तारै पछाडि सर्दै जान्छ।",
                en: "At this rate the new year slowly creeps later across centuries.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "अर्थात् बैशाख १ गते ऋतुसँग होइन, **ताराको सन्दर्भमा सूर्यको स्थिति**सँग बाँधिएको छ। ऋतु किन बिस्तारै सर्दै जान्छ भन्ने कुरा *ऋतु किन सर्छ* लेखमा छ।",
            en: "So Baisakh 1 is anchored to the **Sun's position against the stars**, not to the season. Why the seasons slowly drift away from it is covered in *Why Ṛtu Drifts*.",
          },
        },
      ],
    },
  ],
};
