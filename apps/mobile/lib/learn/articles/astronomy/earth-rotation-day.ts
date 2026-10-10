import type { ArticleData } from "../../article-schema";

export const earthRotationDay: ArticleData = {
  slug: "earth-rotation-day",
  seeAlso: ["sidereal-time", "solar-system", "vara", "sky-rotation"],
  sections: [
    {
      title: { ne: "दिन — पृथ्वीको एक फेरो", en: "A day is one turn of Earth" },
      eyebrow: "But one turn against what?",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "दिन पृथ्वीको आफ्नै अक्षमा एक घुर्णन हो। तर तुरुन्तै प्रश्न उठ्छ — **कसको सापेक्ष** एक फेरो? सूर्यको कि ताराको? उत्तर फरक भए दिनको लम्बाइ पनि फरक हुन्छ।",
            en: "A day is one rotation of Earth on its axis. But at once the question arises — one turn **relative to what**? The Sun, or the stars? Different answers give different day lengths.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "23h 56m 4s",
              label: { ne: "नाक्षत्र दिन", en: "Sidereal day" },
              desc: {
                ne: "ताराको सापेक्ष एक पूरा घुर्णन — वास्तविक घुर्णन काल।",
                en: "One full rotation against the stars — Earth's true rotation period.",
              },
            },
            {
              big: "24h 00m",
              label: { ne: "सौर दिन", en: "Solar day" },
              desc: {
                ne: "सूर्य फेरि उही स्थानमा फर्किन लाग्ने समय — हाम्रो घडीको आधार।",
                en: "The time for the Sun to return to the same place — what our clocks keep.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "४ मिनेटको फरक किन", en: "Where the four minutes go" },
      eyebrow: "Earth also orbits",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वी घुम्दै मात्र छैन — सूर्यको वरिपरि पनि सर्दै छ। एक दिनमा यो कक्षमा झन्डै `१°` अघि बढ्छ।",
            en: "Earth is not only spinning — it is also moving along its orbit, advancing about `1°` a day.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "त्यसैले पूरा घुर्णन सकिँदा सूर्य ठीक उही ठाउँमा हुँदैन; पृथ्वीले त्यो `१°` पुर्‍याउन **थप ~४ मिनेट** घुम्नुपर्छ। तारा असीम टाढा भएकाले तिनका लागि यो थप घुर्णन आवश्यक पर्दैन।",
            en: "So when a full rotation ends the Sun is not quite back in place; Earth must turn an extra `1°`, which takes about **four more minutes**. The stars, being effectively infinitely far, need no such catch-up.",
          },
        },
        {
          kind: "diagram",
          id: "sidereal-solar-day",
        },
        {
          kind: "diagram",
          id: "earth-rotation",
        },
      ],
    },
    {
      title: { ne: "सौर दिन पनि स्थिर छैन", en: "Even the solar day is not constant" },
      eyebrow: "The equation of time",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "हाम्रो `२४` घण्टाको दिन वास्तवमा **औसत** हो। वास्तविक सौर दिन वर्षभरि केही सेकेन्ड घटबढ हुन्छ।",
            en: "Our `24`-hour day is in fact an **average**. The true solar day varies by seconds through the year.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "**अण्डाकार कक्ष** — पृथ्वी उपसौरमा छिटो हिँड्छ, त्यसैले पछ्याउनुपर्ने कोण बढी हुन्छ र दिन लामो।",
              en: "**The elliptical orbit** — Earth moves faster at perihelion, so there is more angle to catch up and the day runs long.",
            },
            {
              ne: "**अक्ष झुकाव** — सूर्य क्रान्तिवृत्तमा हिँड्छ, विषुवत् रेखामा होइन; यसले पनि दैनिक फरक ल्याउँछ।",
              en: "**Axial tilt** — the Sun moves along the ecliptic, not the equator, which adds its own daily difference.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यी दुईको संयुक्त प्रभावलाई ~कालसमीकरण~ भनिन्छ। यसैले वास्तविक मध्याह्न र घडीको १२ बजे वर्षभरि `−१४` देखि `+१६` मिनेटसम्म फरक पर्छ।",
            en: "Their combined effect is the ~equation of time~, which is why true noon and clock noon differ by anywhere from `−14` to `+16` minutes across the year.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "पञ्चाङ्ग गणनामा यो फरक महत्त्वपूर्ण हुन्छ — सूर्योदयको समय निकाल्दा औसत सौर समय होइन, वास्तविक सूर्यको स्थिति चाहिन्छ।",
            en: "This matters in panchanga computation: deriving a sunrise time needs the Sun's real position, not mean solar time.",
          },
        },
      ],
    },
  ],
};
