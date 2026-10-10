import type { ArticleData } from "../../article-schema";

export const meanVsTrueMotion: ArticleData = {
  slug: "mean-vs-true-motion",
  seeAlso: ["ancient-planetary-motion", "solar-longitude", "retrograde-motion", "calc-tithi"],
  sections: [
    {
      title: { ne: "मध्यम र स्पष्ट", en: "Madhyama and spashta" },
      eyebrow: "Average vs actual",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सिद्धान्तिक गणनामा हरेक ग्रहको दुई स्थान हुन्छ — *मध्यम* (औसत, कल्पित एकनास गतिबाट) र *स्पष्ट* (वास्तविक, आकाशमा देखिने)।",
            en: "In siddhantic computation every graha has two positions — the *madhyama*, an average from an idealised uniform motion, and the *spashta*, the true one seen in the sky.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "मध्यम गति", en: "Mean motion" },
              p: {
                ne: "समयको **रैखिक** फलन — गणना गर्न सजिलो, तर आकाशमा कहीँ छैन।",
                en: "A **linear** function of time — easy to compute, but corresponds to nothing in the sky.",
              },
            },
            {
              h: { ne: "स्पष्ट गति", en: "True motion" },
              p: {
                ne: "सुधार लगाएपछिको वास्तविक स्थान — पञ्चाङ्गले यही प्रयोग गर्छ।",
                en: "The real position after corrections — what a panchanga actually uses.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यो भेद सूर्यमा पनि लागू हुन्छ। **मध्यम सूर्य** ठ्याक्कै `०.९८५६°` प्रति दिन हिँड्छ; **स्पष्ट सूर्य** `०.९५३°` देखि `१.०१९°` सम्म।",
            en: "The distinction applies to the Sun too. The **mean Sun** advances by exactly `0.9856°` a day; the **true Sun** by anywhere from `0.953°` to `1.019°`.",
          },
        },
        {
          kind: "diagram",
          id: "earth-orbit",
          caption: {
            ne: "अण्डाकार कक्षमा पृथ्वी उपसौर नजिक छिटो, अपसौर नजिक ढिलो — माध्य र साँचो गतिको फरक यहीँबाट।",
            en: "On an elliptical orbit Earth runs fast near perihelion and slow near aphelion — the gap between mean and true motion starts here.",
          },
        },
      ],
    },
    {
      title: { ne: "पात्रोमा किन स्पष्ट चाहिन्छ", en: "Why the calendar needs the true position" },
      eyebrow: "Up to 2° apart",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "मध्यम र स्पष्ट सूर्यबीचको फरक `२°` सम्म पुग्न सक्छ — र `२°` भनेको सूर्यका लागि झन्डै **दुई दिन**को यात्रा हो।",
            en: "The gap between the mean and true Sun can reach `2°` — and `2°` is nearly **two days** of solar travel.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यदि सङ्क्रान्ति मध्यम सूर्यबाट गणना गरियो भने महिनाको पहिलो गते दुई दिनसम्म चुक्न सक्छ। त्यसैले पात्रो **सधैँ स्पष्ट स्थानमा** आधारित हुनुपर्छ।",
            en: "Computing a sankranti from the mean Sun could put the month's first gate off by two days. The calendar must therefore always rest on the **true position**.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "0.9856°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "मध्यम सूर्य", en: "Mean Sun" },
              desc: { ne: "३६०° ÷ ३६५.२५ — स्थिर, काल्पनिक।", en: "360° ÷ 365.25 — constant, and fictitious." },
            },
            {
              big: "±2°",
              label: { ne: "अधिकतम फरक", en: "Maximum difference" },
              desc: { ne: "मध्यम र स्पष्ट सूर्यबीच — झन्डै दुई दिनको यात्रा।", en: "Between mean and true — nearly two days of travel." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "मध्यम गति अझै किन प्रयोग हुन्छ", en: "Why mean motion is still used" },
      eyebrow: "A starting point",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यदि स्पष्ट स्थान नै चाहिन्छ भने मध्यम गति किन गणना गर्ने? किनभने यो **सुरुको बिन्दु** हो।",
            en: "If only the true position matters, why compute a mean one at all? Because it is the **starting point**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "सुधारहरू मध्यम स्थानमा लगाइने *थप* हुन्। मध्यम स्थान बिना सुधार कसमा लगाउने भन्ने आधार नै रहँदैन। यो आधुनिक गणनामा पनि उही छ — ग्रहपातले पनि आधारभूत कक्षीय तत्त्वबाट सुरु गरेर विक्षोभ (perturbation) थप्छ।",
            en: "The corrections are *additions* to the mean position. Without it there is nothing to correct. Modern computation works the same way — an ephemeris also begins from base orbital elements and adds perturbations.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "अर्थात् “मध्यमबाट स्पष्टमा” भन्ने संरचना पन्ध्र सय वर्ष पुरानो भए पनि **आजको गणनाको पनि आधारभूत ढाँचा** हो — केवल सुधारका पदहरू धेरै बढी र सूक्ष्म भएका छन्।",
            en: "So the \"mean to true\" structure, fifteen centuries old, remains **the basic shape of computation today** — only with far more, and far finer, correction terms.",
          },
        },
      ],
    },
  ],
};
