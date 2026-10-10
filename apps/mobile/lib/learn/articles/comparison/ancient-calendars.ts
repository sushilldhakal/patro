import type { ArticleData } from "../../article-schema";

export const ancientCalendars: ArticleData = {
  slug: "ancient-calendars",
  seeAlso: ["history", "ancient-sky", "calendars-aligned-with-nature", "sky-rotation"],
  sections: [
    {
      title: { ne: "घडी बिना समय नाप्नु", en: "Measuring time without a clock" },
      eyebrow: "Shadow, water, stars",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "आधुनिक उपकरण बिना पनि प्राचीन ज्योतिषीहरूले उल्लेख्य शुद्धतामा समय नापे। तीन मुख्य विधि थिए।",
            en: "Without modern instruments ancient astronomers still measured time to remarkable accuracy. Three methods carried most of the weight.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "शङ्कु / गनोमन", en: "Gnomon" },
              p: {
                ne: "जमिनमा गाडिएको ठाडो डण्डी। छायाँ सबैभन्दा छोटो हुँदा **मध्याह्न**; छायाँको दैनिक लम्बाइले **ऋतु** र **अयनान्त**।",
                en: "An upright rod. The shortest shadow gives **noon**; its day-to-day length gives the **season** and the **solstices**.",
              },
            },
            {
              h: { ne: "जल यन्त्र / घटिका", en: "Water clock" },
              p: {
                ne: "प्वाल भएको भाँडो पानीमा राख्दा निश्चित समयमा डुब्थ्यो — एक ~घटिका~, झन्डै २४ मिनेट।",
                en: "A pierced bowl set on water sank in a fixed interval — one ~ghatika~, about 24 minutes.",
              },
            },
            {
              h: { ne: "नक्षत्र अवलोकन", en: "Nakshatra observation" },
              p: {
                ne: "चन्द्र कुन तारापुञ्जमा छ हेरेर चान्द्र मासको दिन गनिन्थ्यो — कुनै उपकरण नै नचाहिने।",
                en: "Noting which star group the Moon occupied gave the day of the lunar month — needing no instrument at all.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "earth-rotation",
        },
      ],
    },
    {
      title: { ne: "परम्परागत समय एकाइ", en: "The traditional units of time" },
      eyebrow: "From nimesha to day",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वैदिक परम्परामा समयका सूक्ष्म एकाइको विस्तृत शृङ्खला थियो — आँखा झिम्काउने क्षणदेखि दिनसम्म।",
            en: "The Vedic tradition kept a detailed ladder of time units — from the blink of an eye up to the day.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "एकाइ", en: "Unit" },
            { ne: "बराबर", en: "Equals" },
            { ne: "आधुनिक", en: "Modern" },
          ],
          rows: [
            [
              { ne: "निमेष", en: "Nimeṣa" },
              { ne: "आँखा झिम्काउने समय", en: "A blink" },
              "~0.2 s",
            ],
            [
              { ne: "विपल", en: "Vipala" },
              "—",
              "0.4 s",
            ],
            [
              { ne: "पल", en: "Pala" },
              { ne: "६० विपल", en: "60 vipalas" },
              "24 s",
            ],
            [
              { ne: "घटिका", en: "Ghaṭikā" },
              { ne: "६० पल", en: "60 palas" },
              "24 min",
            ],
            [
              { ne: "मुहूर्त", en: "Muhūrta" },
              { ne: "२ घटिका", en: "2 ghatikas" },
              "48 min",
            ],
            [
              { ne: "प्रहर", en: "Prahara" },
              { ne: "~७.५ घटिका", en: "~7.5 ghatikas" },
              "~3 hr",
            ],
            [
              { ne: "अहोरात्र", en: "Ahorātra" },
              { ne: "६० घटिका", en: "60 ghatikas" },
              "24 hr",
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "ध्यान दिनुहोस् — यो प्रणाली **६० को आधार** मा चल्छ, `२४` को होइन। दिनका `६०` घटिका, प्रत्येकका `६०` पल — ठ्याक्कै कोण नाप्ने `६०` विकला प्रणालीजस्तै।",
            en: "Note that the system runs on **base 60**, not 24. Sixty ghatikas to a day, sixty palas to each — exactly like the sexagesimal division of angles.",
          },
        },
      ],
    },
    {
      title: { ne: "कति शुद्ध थिए", en: "How accurate were they" },
      eyebrow: "Surprisingly so",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्य सिद्धान्तमा दिइएका मान आधुनिक मानसँग तुलना गर्दा उल्लेख्य रूपमा नजिक देखिन्छन्।",
            en: "The values given in the Surya Siddhanta stand up remarkably well against modern ones.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "परिमाण", en: "Quantity" },
            { ne: "सूर्य सिद्धान्त", en: "Surya Siddhanta" },
            { ne: "आधुनिक", en: "Modern" },
          ],
          rows: [
            [
              { ne: "नाक्षत्र वर्ष", en: "Sidereal year" },
              "365.2587 दिन/days",
              "365.2564 दिन/days",
            ],
            [
              { ne: "सांयोगिक मास", en: "Synodic month" },
              "29.5306 दिन/days",
              "29.5306 दिन/days",
            ],
            [
              { ne: "अक्ष झुकाव", en: "Axial tilt" },
              "24°",
              { ne: "23.44° (त्यसबेला ~23.9°)", en: "23.44° (~23.9° then)" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सांयोगिक मासको मान त **चार दशमलव स्थानसम्म** मिल्छ। खुला आँखा र गनोमनले हजारौँ अवलोकन जोडेर पाइएको नतिजा हो यो।",
            en: "The synodic month agrees to **four decimal places**. That is the fruit of thousands of naked-eye observations accumulated with nothing but a gnomon.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "फरक भएका ठाउँमा पनि कारण बुझ्न सकिन्छ — नाक्षत्र वर्षको `०.००२३` दिनको त्रुटिले शताब्दीमा झन्डै `०.२` दिन जम्मा गर्छ, जुन ती अवलोकनको सीमाभित्रै पर्छ।",
            en: "Even where they differ the reason is intelligible — the `0.0023`-day error in the sidereal year amounts to about `0.2` days a century, well within the limits of those observations.",
          },
        },
      ],
    },
  ],
};
