import type { ArticleData } from "../../article-schema";

export const calcYoga: ArticleData = {
  slug: "calc-yoga",
  seeAlso: ["yoga", "calc-nakshatra", "solar-longitude", "five-limbs-together"],
  sections: [
    {
      title: { ne: "योग — घटाउ होइन, जोड", en: "Yoga — a sum, not a difference" },
      eyebrow: "Sun + Moon",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तिथि र करणले सूर्य र चन्द्रको **फरक** प्रयोग गर्छन्। योगले भने **जोड** — र यही सानो परिवर्तनले पूरै फरक आवधिकता जन्माउँछ।",
            en: "Tithi and karana use the **difference** between Sun and Moon. Yoga uses their **sum** — and that small change produces an entirely different periodicity.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "योगको चौडाइ = `३६०° ÷ २७` = `१३°२०′` — नक्षत्रकै जत्रो", en: "yoga span = `360° ÷ 27` = `13°20′` — the same as a nakshatra" },
            { ne: "योग = ((सूर्य + चन्द्र) mod `३६०°` ÷ `१३°२०′`) को पूर्णांक भाग + `१`", en: "yoga = integer part of ((Sun + Moon) mod `360°` ÷ `13°20′`) + `1`" },
          ],
          example: [
            { k: { ne: "सूर्यको देशान्तर", en: "Sun's longitude" }, v: "38.1°" },
            { k: { ne: "चन्द्रको देशान्तर", en: "Moon's longitude" }, v: "152.4°" },
            { k: { ne: "जोड", en: "sum" }, v: "190.5°" },
            { k: { ne: "१९०.५ ÷ १३.३३३३", en: "190.5 ÷ 13.3333" }, v: "14.29" },
          ],
          result: {
            ne: "पूर्णांक भाग `१४` + `१` = **योग १५**। तिथिले घटाउ प्रयोग गर्छ, योगले **जोड** — यही एउटा फरक हो।",
            en: "Integer part `14` + `1` = **yoga 15**. A tithi uses the difference, a yoga the **sum** — that is the only difference between them.",
          },
        },
      ],
    },
    {
      title: { ne: "जोडले के नाप्छ", en: "What a sum measures" },
      eyebrow: "A combined rate",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "फरकले चन्द्रको कला दिन्छ — यो सहज छ। तर **जोड**ले के दिन्छ? यसको कुनै सिधा दृश्य अर्थ छैन; यो दुवै पिण्डको संयुक्त गतिको नाप हो।",
            en: "The difference gives the Moon's phase, which is intuitive. But what does the **sum** give? It has no direct visual meaning — it measures the two bodies' combined motion.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "~13.2°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "चन्द्रको गति", en: "Moon's motion" },
              desc: { ne: "जोडमा योगदान गर्ने मुख्य भाग।", en: "The dominant contribution to the sum." },
            },
            {
              big: "~1°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "सूर्यको गति", en: "Sun's motion" },
              desc: { ne: "थोरै, तर जोडमा थपिन्छ — घटाउमा घट्थ्यो।", en: "Small, but here it adds rather than subtracts." },
            },
            {
              big: "~14.2°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "जोडको गति", en: "Rate of the sum" },
              desc: { ne: "त्यसैले योग तिथिभन्दा केही छिटो बदलिन्छ।", en: "So a yoga turns over a little faster than a tithi." },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "तिथिमा सूर्यको गति **घट्छ** (`१३.२ − १ = १२.२`), योगमा **थपिन्छ** (`१३.२ + १ = १४.२`)। त्यसैले योग औसतमा `~२२.६` घण्टामा बदलिन्छ, तिथि `~२३.६` घण्टामा।",
            en: "In a tithi the Sun's motion **subtracts** (`13.2 − 1 = 12.2`); in a yoga it **adds** (`13.2 + 1 = 14.2`). A yoga therefore turns every `~22.6` hours against a tithi's `~23.6`.",
          },
        },
      ],
    },
    {
      title: { ne: "व्यवहारमा योग", en: "Yoga in practice" },
      eyebrow: "Mostly muhurta",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "योग मुख्यतः मुहूर्त छान्दा हेरिन्छ। `२७` योगमध्ये केही शुभ मानिन्छन्, केही टार्नुपर्ने।",
            en: "Yoga is consulted mainly when choosing a muhurta. Of the `27`, some are held auspicious and some are avoided.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "**शुभ** — सिद्धि, शुभ, साध्य, वरीयान् जस्ता योगलाई अनुकूल मानिन्छ।",
              en: "**Favourable** — Siddhi, Shubha, Sadhya and Variyan among others.",
            },
            {
              ne: "**टार्नुपर्ने** — विष्कम्भ, अतिगण्ड, शूल, गण्ड, व्याघात, वज्र, व्यतीपात, परिघ, वैधृति।",
              en: "**Avoided** — Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha and Vaidhriti.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यहाँ ध्यान दिनुपर्ने कुरा — पञ्चाङ्गको *योग* र ज्योतिषका *राजयोग*, *गजकेसरी योग* आदि **फरक कुरा** हुन्। पहिलो पञ्चाङ्गको पाँचौँ अङ्ग हो; दोस्रो कुण्डलीमा ग्रहको विशेष संयोजन।",
            en: "One caution: the panchanga's *yoga* and jyotish's *rājayoga*, *gajakesari yoga* and the like are **different things**. The first is a limb of the panchanga; the second is a special planetary configuration in a chart.",
          },
        },
        {
          kind: "diagram",
          id: "table-yoga",
        },
      ],
    },
  ],
};
