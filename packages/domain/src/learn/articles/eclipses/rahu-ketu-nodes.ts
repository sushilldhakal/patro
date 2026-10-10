import type { ArticleData } from "../../article-schema";

export const rahuKetuNodes: ArticleData = {
  slug: "rahu-ketu-nodes",
  seeAlso: ["eclipses", "eclipse-seasons", "amavasya-purnima", "ecliptic"],
  sections: [
    {
      title: { ne: "राहु र केतु — ग्रह होइन, बिन्दु", en: "Rāhu and Ketu are points, not planets" },
      eyebrow: "The lunar nodes",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "ज्योतिषमा राहु र केतुलाई *छाया ग्रह* भनिन्छ। खगोलीय रूपमा यी पिण्ड होइनन् — यी **दुई गणितीय बिन्दु** हुन्, जहाँ चन्द्रको कक्षले क्रान्तिवृत्त काट्छ।",
            en: "Jyotish calls Rāhu and Ketu the *shadow grahas*. Astronomically they are not bodies at all but **two geometric points** — where the Moon's orbit crosses the ecliptic.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "राहु — उत्तर पात", en: "Rāhu — the north node" },
              p: {
                ne: "चन्द्र दक्षिणबाट उत्तरतिर क्रान्तिवृत्त काट्ने बिन्दु (आरोही पात)।",
                en: "Where the Moon crosses the ecliptic moving south to north — the ascending node.",
              },
            },
            {
              h: { ne: "केतु — दक्षिण पात", en: "Ketu — the south node" },
              p: {
                ne: "उत्तरबाट दक्षिणतिर काट्ने बिन्दु (अवरोही पात)। सधैँ राहुभन्दा ठ्याक्कै `१८०°` पर।",
                en: "Where it crosses north to south — the descending node. Always exactly `180°` from Rāhu.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "moon-orbit-tilt",
          caption: {
            ne: "चन्द्रको कक्ष क्रान्तिवृत्तसँग ~५° झुकेको — काट्ने दुई बिन्दु नै राहु र केतु।",
            en: "The Moon's orbit tilted ~5° to the ecliptic — the two crossing points are Rāhu and Ketu.",
          },
        },
      ],
    },
    {
      title: { ne: "पात रेखा किन महत्त्वपूर्ण छ", en: "Why the node line matters" },
      eyebrow: "Where eclipses live",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यदि चन्द्रको कक्ष क्रान्तिवृत्तसँग ठ्याक्कै मिल्थ्यो भने हरेक औंसीमा सूर्यग्रहण र हरेक पूर्णिमामा चन्द्रग्रहण लाग्थ्यो। `~५°` को झुकावले त्यसो हुन दिँदैन।",
            en: "If the Moon's orbit lay flat in the ecliptic there would be a solar eclipse every new moon and a lunar eclipse every full moon. The `~5°` tilt prevents that.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ग्रहण त्यहीँ मात्र सम्भव छ जहाँ तीनै पिण्ड एउटै तलमा आउँछन् — अर्थात् **पात नजिक**। त्यसैले परम्परागत भनाइ “राहुले सूर्य निल्यो” वास्तवमा सही ज्यामिति बताउँछ: ग्रहण पात बिन्दुमै हुन्छ।",
            en: "An eclipse is possible only where all three bodies come into the same plane — that is, **near a node**. So the traditional image of Rāhu swallowing the Sun encodes correct geometry: eclipses happen at the nodes.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "5.15°",
              label: { ne: "कक्ष झुकाव", en: "Orbital inclination" },
              desc: { ne: "चन्द्रको कक्ष र क्रान्तिवृत्तबीचको कोण।", en: "The angle between the Moon's orbit and the ecliptic." },
            },
            {
              big: "~18.6",
              unit: { ne: "वर्ष", en: "years" },
              label: { ne: "पात चक्र", en: "Nodal cycle" },
              desc: { ne: "पात रेखा राशिचक्रमा उल्टो दिशामा एक फेरो लगाउन लाग्ने समय।", en: "Time for the node line to travel once round the zodiac — backwards." },
            },
            {
              big: "~19.4°",
              unit: { ne: "/ वर्ष", en: "/ year" },
              label: { ne: "पातको गति", en: "Nodal motion" },
              desc: { ne: "सधैँ वक्री — त्यसैले राहु–केतु सधैँ उल्टो हिँड्छन्।", en: "Always retrograde — which is why Rāhu and Ketu always move backwards." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "सधैँ वक्री गति", en: "Always moving backwards" },
      eyebrow: "18.6 years",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "राहु र केतु राशिचक्रमा **उल्टो दिशामा** हिँड्छन् — अरू ग्रहको विपरीत। एक राशि पार गर्न झन्डै `१८` महिना लाग्छ, र पूरै चक्र `१८.६` वर्षमा।",
            en: "Rāhu and Ketu travel **backwards** through the zodiac, against the direction of the other grahas. A sign takes about `18` months, the full circuit `18.6` years.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यही चक्रले ग्रहणको ढाँचा तय गर्छ। पात रेखा सर्दै जाने हुनाले ग्रहण पर्ने समय पनि हरेक वर्ष झन्डै `१९` दिन अगाडि सर्छ — यसलाई ~ग्रहण ऋतु~ भनिन्छ।",
            en: "This cycle governs the pattern of eclipses. Because the node line keeps shifting, eclipse periods arrive about `19` days earlier each year — the ~eclipse seasons~.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "ज्योतिषमा राहु–केतुको `१८.६` वर्षे चक्रलाई महत्त्वपूर्ण मानिन्छ; खगोलशास्त्रमा यही चक्रले ज्वारभाटा र पृथ्वीको अक्षको सानो दोलन (nutation) मा पनि प्रभाव पार्छ।",
            en: "Jyotish treats the `18.6`-year Rāhu–Ketu cycle as significant; in astronomy the same cycle shows up in the tides and in nutation, the small nodding of Earth's axis.",
          },
        },
      ],
    },
  ],
};
