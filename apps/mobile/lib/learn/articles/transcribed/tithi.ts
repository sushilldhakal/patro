import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `TithiArticle` — see `what-is-panchang.ts` header note. */
export const tithi: ArticleData = {
  slug: "tithi",
  sections: [
    {
      title: { ne: "तिथि = १२° कोणीय दूरी", en: "Tithi = 12° of elongation" },
      eyebrow: "12° of elongation",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीबाट हेर्दा चन्द्रमा सूर्यभन्दा जति *कोणले अगाडि* पुग्छ, त्यही कोणले तिथि निर्धारण गर्छ। **०°** मा औंसी, **१८०°** मा पूर्णिमा। यो चित्रमा पृथ्वी पनि सूर्यको वरिपरि ~२९°~ सर्छ (एक चान्द्र मास) — त्यसैले चन्द्रले नक्षत्रमा फर्कन करिब २७ दिन, अर्को औंसीसम्म करिब २९.५ दिन। तल तानेर वा चलाउनुहोस्।",
            en: "Seen from Earth, the angle by which the Moon runs *ahead of the Sun* determines the tithi. **0°** is the new moon (Aaushi), **180°** the full moon (Purnima). In this diagram the Earth also moves ~29°~ around the Sun (one lunar month) — so the Moon takes about 27 days to return to a nakshatra, and about 29.5 days to the next new moon. Drag or press play below.",
          },
        },
        {
          kind: "diagram",
          id: "tithi-elongation",
        },
        {
          kind: "formula",
          cards: [
            {
              big: "१२",
              unit: { ne: "°", en: "°" },
              label: { ne: "= १ तिथि", en: "= 1 tithi" },
              desc: {
                ne: "३६०° ÷ ३० तिथि। हरेक १२° कोण पार गर्दा नयाँ तिथि सुरु हुन्छ।",
                en: "360° ÷ 30 tithis. Each 12° of angle crossed starts a new tithi.",
              },
            },
            {
              big: "~१२",
              unit: { ne: "°/दिन", en: "°/day" },
              label: { ne: "चन्द्रको औसत गति", en: "Moon's average speed" },
              desc: {
                ne: "वास्तवमा १०.७°–१४.३° सम्म घटबढ हुन्छ — चन्द्र कक्षको आकारका कारण।",
                en: "Actually varies 10.7°–14.3° — due to the shape of the Moon's orbit.",
              },
            },
            {
              big: { ne: "सूर्योदय", en: "Sunrise" },
              label: { ne: "तिथि कहिले गनिन्छ?", en: "When is the tithi counted?" },
              desc: {
                ne: "जुन तिथि सूर्योदयमा चलिरहेको हुन्छ, त्यही दिनको तिथि मानिन्छ — यही नियमले वृद्धि र क्षय जन्माउँछ।",
                en: "Whichever tithi is running at sunrise is taken as that day's tithi — this rule is what creates vriddhi and kshaya.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "चन्द्रको गति स्थिर नभएकाले तिथिको लम्बाइ पनि स्थिर हुँदैन — कहिले एउटै तिथि दुई दिन (वृद्धि), कहिले बीचमै हराउँछ (क्षय)। ती छुट्टै लेखमा हेर्नुहोस्।",
            en: "Because the Moon's speed is not constant, the length of a tithi is not constant either — sometimes one tithi spans two days (vriddhi), sometimes it is skipped entirely (kshaya). See those in separate articles.",
          },
        },
      ],
    },
  ],
};
