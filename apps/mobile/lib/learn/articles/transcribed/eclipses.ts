import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `Eclipses` — see `what-is-panchang.ts` header note. */
export const eclipses: ArticleData = {
  slug: "eclipses",
  sections: [
    {
      title: { ne: "चन्द्रग्रहण — पृथ्वीको छायाँमा चन्द्र", en: "Lunar eclipse — Moon in Earth's shadow" },
      eyebrow: "Lunar eclipse: Earth's shadow",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रग्रहण सधैँ **पूर्णिमा** मा हुन्छ — जब सूर्य, पृथ्वी र चन्द्रमा एकै रेखामा आउँछन् र पृथ्वीको *छायाँ* चन्द्रमाथि पर्छ। चन्द्र रातो देखिन सक्छ (“ब्लड मुन”), किनकि पृथ्वीको वायुमण्डलले रातो प्रकाश मोडेर पठाउँछ।",
            en: "A lunar eclipse always occurs at the **full moon** — when the Sun, Earth and Moon line up and the Earth's *shadow* falls on the Moon. The Moon can look red (\"blood moon\") because Earth's atmosphere bends red light onto it.",
          },
        },
      ],
    },
    {
      title: { ne: "सूर्य–पृथ्वी–चन्द्र र राहु–केतु", en: "Sun–Earth–Moon & Rahu–Ketu" },
      eyebrow: "Shadow geometry & the nodes",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्यको उज्यालोले पृथ्वीपछाडि *प्रच्छायाँ* र *उपछायाँ* को शंकु बनाउँछ। तल **▶ चलाउनुहोस्** — पृथ्वी क्रान्तिवृत्तमा घुम्छ, चन्द्र छिटो चर्किन्छ; **पात-चक्र** बटनले मात्र राहु–केतु ढिलो घुमाउँछ। ग्रहण त्यतिबेला मात्र हुन्छ जब पूर्णिमा/औंसी **पात रेखा** नजिक पर्छ — वर्षमा झन्डै दुई पटक मात्र।",
            en: "The Sun's light casts an *umbra* and *penumbra* cone behind the Earth. Press **▶ play** below — the Earth moves on the ecliptic, the Moon cycles quickly; the **node-cycle** button rotates only Rahu–Ketu slowly. An eclipse happens only when a full/new moon falls near the **node line** — roughly twice a year.",
          },
        },
        { kind: "diagram", id: "lunar-eclipse" },
      ],
    },
    {
      title: { ne: "चन्द्र कक्षको ५° झुकाव र ग्रहण रेखा", en: "The 5° tilted orbit, eclipse line & 18.6-year nodal cycle" },
      eyebrow: "The tilted orbit, the eclipse line & 18.6-year nodal cycle",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तलको **त्रिआयामिक** चित्रमा *क्रान्तिवृत्त तल* (सूर्यपथको समतल) र त्यसमाथि ~५° झुकेको~ चन्द्र-कक्ष देखिन्छ। पृथ्वीको बीचबाट ~सूर्य–पृथ्वी रेखा~ गएको छ। **▶ चलाउनुहोस्** — सूर्यसँगै यो रेखा घुम्छ; जब यो **राहु वा केतु** मा पुग्छ र त्यहीँ चन्द्र (पूर्णिमा/औंसी) पर्छ तब मात्र ग्रहण हुन्छ। तल्लो स्लाइडरले पात रेखालाई **१८.६ वर्षे** चक्रमा घुमाउँछ।",
            en: "The **3-D** diagram below shows the *ecliptic plane* (the Sun's path) and the Moon's orbit tilted ~5°~ above it. The ~Sun–Earth line~ runs through the centre of the Earth. Press **▶ play** — this line turns with the Sun; an eclipse happens only when it reaches **Rahu or Ketu** and a moon (full/new) is there. The lower slider rotates the node line on its **18.6-year** cycle.",
          },
        },
        { kind: "diagram", id: "moon-orbit-tilt" },
      ],
    },
    {
      title: { ne: "चन्द्रग्रहण — प्रकार र सुरक्षा", en: "Lunar eclipse — types & safety" },
      eyebrow: "Lunar types & safety",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रको कक्ष पृथ्वीको कक्षभन्दा **करिब ५° ढल्केको** छ, त्यसैले धेरैजसो पूर्णिमामा चन्द्र छायाँभन्दा माथि वा तल हुन्छ। ग्रहण त्यतिबेला मात्र हुन्छ जब पूर्णिमा ~राहु–केतु (पात बिन्दु)~ नजिक पर्छ।",
            en: "The Moon's orbit is tilted **about 5°** to Earth's, so at most full moons the Moon is above or below the shadow. An eclipse happens only when the full moon falls near ~Rahu–Ketu (the nodes)~.",
          },
        },
        {
          kind: "keys",
          items: [
            { h: { ne: "पूर्ण ग्रहण", en: "Total eclipse" }, p: { ne: "चन्द्र पूरै पृथ्वीको गाढा छायाँ (umbra) भित्र।", en: "The Moon fully inside Earth's dark shadow (umbra)." } },
            { h: { ne: "खण्डग्रास", en: "Partial" }, p: { ne: "चन्द्रको केही भाग मात्र छायाँमा।", en: "Only part of the Moon in the shadow." } },
            { h: { ne: "उपछायाँ ग्रहण", en: "Penumbral eclipse" }, p: { ne: "चन्द्र penumbra मा मात्र — हल्का मलिन देखिन्छ।", en: "The Moon only in the penumbra — appears slightly dimmed." } },
            { h: { ne: "खुला आँखाले सुरक्षित", en: "Safe to the naked eye" }, p: { ne: "सूर्यग्रहणभन्दा फरक — चन्द्रग्रहण सीधै हेर्न सकिन्छ।", en: "Unlike a solar eclipse — a lunar eclipse can be viewed directly." } },
          ],
        },
      ],
    },
    {
      title: { ne: "सूर्यग्रहण — चन्द्रको छायाँमा पृथ्वी", en: "Solar eclipse — Earth in the Moon's shadow" },
      eyebrow: "Solar eclipse: Moon's shadow",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्यग्रहण सधैँ **औंसी** मा हुन्छ — जब चन्द्रमा सूर्य र पृथ्वीको ठ्याक्क बीचमा आएर सूर्यलाई *ढाक्छ*। चन्द्रको छायाँ पृथ्वीको सानो भागमा मात्र पर्ने हुनाले ग्रहण सीमित क्षेत्रबाट मात्र देखिन्छ।",
            en: "A solar eclipse always occurs at the **new moon** — when the Moon comes exactly between the Sun and Earth and *covers* the Sun. Because the Moon's shadow falls on only a small part of the Earth, the eclipse is seen from a limited region.",
          },
        },
      ],
    },
    {
      title: { ne: "चन्द्रको छायाँ–शंकु र पृथ्वीमा मार्ग", en: "The Moon's shadow cones & the path on Earth" },
      eyebrow: "Shadow cones: umbra, antumbra & penumbra",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तलको चित्रमा सूर्यको उज्यालोले चन्द्रपछाडि *प्रच्छायाँ (umbra)* को सानो गाढा शंकु र फराकिलो *उपछायाँ (penumbra)* बनाउँछ। **▶ चलाउनुहोस्** — चन्द्रको छायाँ पृथ्वीमाथि सर्छ, त्यही नै ~पूर्णताको मार्ग~ हो। तल्लो स्लाइडरले चन्द्र दूरी (perigee ↔ apogee) बदल्छ — हेर्नुहोस् कसरी प्रच्छायाँ पुग्दा **पूर्ण** र अपुग हुँदा **वलयाकार** ग्रहण हुन्छ।",
            en: "In the diagram below, the Sun's light casts a small dark *umbra* cone and a wide *penumbra* behind the Moon. Press **▶ play** — the Moon's shadow sweeps across the Earth; that is the ~path of totality~. The lower slider changes the Moon's distance (perigee ↔ apogee) — see how a **total** eclipse occurs when the umbra reaches Earth and an **annular** one when it falls short.",
          },
        },
        { kind: "diagram", id: "solar-eclipse" },
      ],
    },
    {
      title: { ne: "सूर्यग्रहण — प्रकार र सावधानी", en: "Solar eclipse — types & safety" },
      eyebrow: "Solar types & safety",
      blocks: [
        {
          kind: "keys",
          items: [
            { h: { ne: "पूर्ण (Total)", en: "Total" }, p: { ne: "चन्द्र नजिक हुँदा प्रच्छायाँले पृथ्वी छुन्छ — सूर्य पूरै ढाकिन्छ, दिनमै अँध्यारो र सूर्यमुकुट (corona) देखिन्छ।", en: "When the Moon is near, the umbra touches Earth — the Sun is fully covered, day turns dark and the corona appears." } },
            { h: { ne: "वलयाकार (Annular)", en: "Annular" }, p: { ne: "चन्द्र टाढा हुँदा प्रच्छायाँ अपुग — वलयच्छायाँ (antumbra) पुग्छ र सूर्यको किनारा “आगोको औँठी” झैँ देखिन्छ।", en: "When the Moon is far the umbra falls short — the antumbra reaches Earth and the Sun's edge looks like a \"ring of fire\"." } },
            { h: { ne: "खण्डग्रास (Partial)", en: "Partial" }, p: { ne: "उपछायाँभित्र पर्ने ठूलो क्षेत्रबाट सूर्यको केही भाग मात्र ढाकिएको देखिन्छ।", en: "From the large penumbra region only part of the Sun appears covered." } },
            { h: { ne: "⚠ कहिल्यै नाङ्गो आँखाले नहेर्नुहोस्", en: "⚠ Never look with the naked eye" }, p: { ne: "ग्रहण चश्मा वा प्रोजेक्सन मात्र — आँखा स्थायी बिग्रन सक्छ।", en: "Use eclipse glasses or projection only — permanent eye damage can result." } },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "राहु–केतु आकाशका भौतिक पिण्ड होइनन् — चन्द्रको कक्ष र सूर्यपथ (क्रान्तिवृत्त) काट्ने दुई गणितीय बिन्दु हुन्। यी पात बिस्तारै घुम्छन् (करिब १८.६ वर्षमा एक फेरो), त्यसैले ग्रहण ऋतु पनि सर्दै जान्छ। औंसी/पूर्णिमा पनि राहु–केतु नजिक परेमा मात्र ग्रहण हुन्छ — त्यसैले हरेक महिना हुँदैन। सूर्यग्रहणमा चन्द्रको छायाँ सानो हुनाले पृथ्वीको सीमित पट्टीबाट मात्र देखिन्छ।",
            en: "Rahu–Ketu are not physical bodies in the sky — they are two mathematical points where the Moon's orbit crosses the Sun's path (ecliptic). These nodes rotate slowly (one loop in about 18.6 years), so the eclipse seasons also drift. A new/full moon causes an eclipse only when it falls near Rahu–Ketu — which is why it doesn't happen every month. In a solar eclipse the Moon's shadow is small, so it is seen only from a limited strip of the Earth.",
          },
        },
      ],
    },
  ],
};
