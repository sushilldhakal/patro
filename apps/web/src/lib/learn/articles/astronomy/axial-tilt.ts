import type { ArticleData } from "../../article-schema";

export const axialTilt: ArticleData = {
  slug: "axial-tilt",
  seeAlso: ["why-seasons", "declination", "equinox-solstice", "celestial-equator"],
  sections: [
    {
      title: { ne: "२३.४४° — एउटै कोण, धेरै परिणाम", en: "23.44° — one angle, many consequences" },
      eyebrow: "Obliquity of the ecliptic",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीको घुर्णन अक्ष यसको कक्षीय तलसँग ठाडो छैन — यो `२३.४४°` ले ढल्केको छ। यसलाई ~अक्ष झुकाव~ वा क्रान्तिवृत्तको तिर्यकता भनिन्छ।",
            en: "Earth's axis of rotation is not perpendicular to its orbital plane — it leans by `23.44°`. This is the ~axial tilt~, or the obliquity of the ecliptic.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "समान कुरा अर्को तरिकाले पनि भन्न सकिन्छ: **क्रान्तिवृत्त र खगोलीय विषुवत् रेखाबीचको कोण `२३.४४°` छ**। यी दुई भनाइ एउटै ज्यामितिका दुई रूप हुन्।",
            en: "The same fact can be stated another way: **the ecliptic and the celestial equator meet at `23.44°`**. These are two descriptions of one geometry.",
          },
        },
        {
          kind: "diagram",
          id: "earth-rotation",
          caption: {
            ne: "झुकिएको अक्ष — यही झुकावले ऋतु, अयन र दिनको लम्बाइको फेरबदल जन्माउँछ।",
            en: "The tilted axis — the source of the seasons, the ayanas and the changing length of day.",
          },
        },
      ],
    },
    {
      title: { ne: "यसबाट के–के निस्कन्छ", en: "What follows from it" },
      eyebrow: "Almost everything seasonal",
      blocks: [
        {
          kind: "keys",
          items: [
            {
              h: { ne: "ऋतु", en: "The seasons" },
              p: {
                ne: "झुकाव नभए ऋतु नै हुँदैनथ्यो — सूर्यको किरण वर्षभरि उही कोणमा पर्थ्यो।",
                en: "Without tilt there would be no seasons — sunlight would strike at the same angle all year.",
              },
            },
            {
              h: { ne: "दिनको लम्बाइ", en: "Length of day" },
              p: {
                ne: "गर्मीमा लामो, जाडोमा छोटो दिन — यो पूरै झुकावको परिणाम हो।",
                en: "Long summer days and short winter ones are entirely a consequence of the tilt.",
              },
            },
            {
              h: { ne: "अयनान्त र विषुव", en: "Solstices and equinoxes" },
              p: {
                ne: "क्रान्तिको चरम `±२३.४४°` अयनान्त, र `०°` विषुव — दुवै झुकावले तय गर्छ।",
                en: "Declination extremes of `±23.44°` are the solstices, `0°` the equinoxes — all set by the tilt.",
              },
            },
            {
              h: { ne: "कर्क र मकर रेखा", en: "The tropics" },
              p: {
                ne: "पृथ्वीमा `±२३.४४°` अक्षांशका रेखा — जहाँ सूर्य वर्षमा एक पटक ठीक शिरमा आउँछ।",
                en: "The lines at `±23.44°` latitude, where the Sun stands directly overhead once a year.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "**कर्क रेखा** नेपालको दक्षिणबाट जान्छ। नेपाल यसभन्दा उत्तर पर्ने हुनाले सूर्य कहिल्यै ठीक शिरमा आउँदैन — सधैँ केही दक्षिणतिर झुकेको हुन्छ।",
            en: "The **Tropic of Cancer** passes south of Nepal. Being north of it, Nepal never sees the Sun exactly overhead — it always stands a little to the south.",
          },
        },
      ],
    },
    {
      title: { ne: "झुकाव पनि स्थिर छैन", en: "The tilt itself is not fixed" },
      eyebrow: "22.1° to 24.5°",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "`२३.४४°` आजको मान हो। लामो कालक्रममा यो `२२.१°` देखि `२४.५°` बीच दोलन गर्छ, झन्डै `४१,०००` वर्षको चक्रमा।",
            en: "`23.44°` is today's value. Over long spans it oscillates between `22.1°` and `24.5°` on a cycle of about `41,000` years.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अहिले यो **घट्दै** छ — प्रति शताब्दी झन्डै `०.०१३°`। झुकाव घट्दा ऋतुको तीव्रता केही कम हुन्छ; बढ्दा बढी।",
            en: "At present it is **decreasing** by roughly `0.013°` a century. A smaller tilt makes the seasons milder, a larger one sharper.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यो अयन चलनभन्दा फरक कुरा हो। **अयन चलन** अक्षको *दिशा* बदल्छ (२६,००० वर्ष); **तिर्यकताको दोलन** अक्षको *झुकाव* बदल्छ (४१,००० वर्ष)। दुवै सँगै चलिरहेका छन्।",
            en: "This is distinct from precession. **Precession** changes the axis's *direction* (26,000 years); this oscillation changes its *angle* (41,000 years). Both run at once.",
          },
        },
      ],
    },
  ],
};
