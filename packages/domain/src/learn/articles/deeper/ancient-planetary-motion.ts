import type { ArticleData } from "../../article-schema";

export const ancientPlanetaryMotion: ArticleData = {
  slug: "ancient-planetary-motion",
  seeAlso: ["mean-vs-true-motion", "history", "retrograde-motion", "geocentric-heliocentric"],
  sections: [
    {
      title: { ne: "समस्या — ग्रह एकनासले हिँड्दैनन्", en: "The problem — planets do not move evenly" },
      eyebrow: "What the siddhantas had to explain",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यदि ग्रह पृथ्वीको वरिपरि पूर्ण वृत्तमा स्थिर गतिले घुम्थे भने तिनको स्थान निकाल्न साधारण गुणन पुग्थ्यो। तर अवलोकनले त्यसो भन्दैन — ग्रह कहिले छिटो, कहिले ढिलो, कहिले पछाडि नै हिँडेको देखिन्छ।",
            en: "If planets circled Earth at a steady rate on perfect circles, finding their positions would be simple multiplication. Observation says otherwise — they speed up, slow down, and sometimes move backwards.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "सिद्धान्त ग्रन्थहरूको केन्द्रीय कार्य यही थियो: **सरल एकनास गतिबाट सुरु गरेर, सुधार थपेर वास्तविक स्थानमा पुग्नु**।",
            en: "The central task of the siddhantas was exactly this: **start from a simple uniform motion and add corrections until you reach the true position**.",
          },
        },
        {
          kind: "diagram",
          id: "two-systems",
          caption: {
            ne: "भूकेन्द्रित ढाँचामा वक्री गति देखाउन मन्द र शीघ्र सुधार चाहिन्थ्यो।",
            en: "Explaining retrograde motion in a geocentric frame is what the manda and shighra corrections were for.",
          },
        },
      ],
    },
    {
      title: { ne: "मन्द र शीघ्र — दुई सुधार", en: "Manda and shighra — the two corrections" },
      eyebrow: "Epicycles by another name",
      blocks: [
        {
          kind: "keys",
          items: [
            {
              h: { ne: "मन्द फल", en: "Manda phala" },
              p: {
                ne: "ग्रहको आफ्नै कक्षको अण्डाकारपनका कारण हुने असमानता — आधुनिक भाषामा **केन्द्र समीकरण** (equation of centre)।",
                en: "The unevenness caused by the eccentricity of the planet's own orbit — in modern terms the **equation of centre**.",
              },
            },
            {
              h: { ne: "शीघ्र फल", en: "Shighra phala" },
              p: {
                ne: "पृथ्वीको आफ्नै गतिका कारण देखिने असमानता — यही सुधारले **वक्री गति** पनि व्याख्या गर्छ।",
                en: "The apparent unevenness caused by Earth's own motion — the same correction that explains **retrogression**.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "उल्लेखनीय कुरा — **शीघ्र फल वास्तवमा पृथ्वीको कक्षीय गतिको छाप हो**। भूकेन्द्रित ढाँचामा काम गर्दा पनि सिद्धान्तकारहरूले त्यो प्रभाव सही रूपमा समेटेका थिए, यद्यपि तिनले त्यसलाई पृथ्वीको गति भनेर व्याख्या गरेनन्।",
            en: "What is striking is that **the shighra correction is in effect the imprint of Earth's orbital motion**. Working in a geocentric frame, the siddhantic authors captured that effect correctly without describing it as Earth's motion.",
          },
        },
        {
          kind: "diagram",
          id: "manda-shighra",
        },
      ],
    },
    {
      title: { ne: "ज्या तालिका", en: "The sine tables" },
      eyebrow: "A Vedic contribution",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यी सुधार गणना गर्न त्रिकोणमितीय फलन चाहिन्थ्यो। वैदिक ज्योतिषले यसका लागि *ज्या* (jyā) तालिका विकास गरे — जुन आधुनिक **साइन** फलनको प्रत्यक्ष पूर्वज हो।",
            en: "Computing those corrections required trigonometric functions. Vedic astronomy developed *jyā* tables for the purpose — the direct ancestor of the modern **sine**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "शब्दको यात्रा रोचक छ: संस्कृतको *ज्या* → अरबीमा *jiba* → ल्याटिनमा गलत अनुवाद हुँदा *sinus* (खाडल) → अङ्ग्रेजीमा **sine**।",
            en: "The word's journey is itself notable: Sanskrit *jyā* → Arabic *jiba* → mistranslated into Latin as *sinus* (a fold or bay) → English **sine**.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "आर्यभटको ज्या तालिका (५ औँ शताब्दी) मा `३.७५°` को अन्तरालमा `२४` मान थिए — त्यो युगका लागि पर्याप्त शुद्धता, र आजका सूत्रकै संरचनामा।",
            en: "Aryabhata's fifth-century sine table gave `24` values at `3.75°` intervals — accuracy enough for its age, and structurally the same idea as today's formulas.",
          },
        },
      ],
    },
  ],
};
