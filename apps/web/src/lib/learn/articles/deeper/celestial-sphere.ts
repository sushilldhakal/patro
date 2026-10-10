import type { ArticleData } from "../../article-schema";

export const celestialSphere: ArticleData = {
  slug: "celestial-sphere",
  seeAlso: ["ecliptic", "celestial-equator", "right-ascension", "sky-rotation"],
  sections: [
    {
      title: { ne: "आकाशलाई गोला मान्नु", en: "Treating the sky as a sphere" },
      eyebrow: "A useful fiction",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तारा फरक–फरक दूरीमा छन् — कुनै केही प्रकाशवर्ष, कुनै हजारौँ। तर आकाश हेर्दा सबै **एउटै गुम्बजमा टाँसिएका** जस्तै देखिन्छन्।",
            en: "The stars lie at wildly different distances — some a few light years away, some thousands. Yet to the eye they all appear **fixed to a single dome**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "*खगोलीय गोला* यही देखिने अवस्थालाई औपचारिक बनाउँछ: पृथ्वीलाई केन्द्रमा राखेर अनन्त त्रिज्याको काल्पनिक गोला कल्पना गर्नु, र हरेक पिण्डलाई त्यसको सतहमा एउटा बिन्दु मान्नु।",
            en: "The *celestial sphere* formalises that appearance: imagine a sphere of infinite radius centred on Earth, and treat every body as a point on its surface.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "दूरी हटाइदिँदा प्रश्न सरल हुन्छ — “त्यो कति टाढा छ” होइन, **“त्यो कुन दिशामा छ”**। पात्रो गणनाका लागि दिशा नै पर्याप्त छ।",
            en: "Dropping distance simplifies the question — not \"how far is it\" but **\"in which direction is it\"**. For calendar computation, direction is all you need.",
          },
        },
      ],
    },
    {
      title: { ne: "गोलाका मुख्य रेखा", en: "The sphere's principal circles" },
      eyebrow: "Landmarks on the dome",
      blocks: [
        {
          kind: "table",
          headers: [
            { ne: "रेखा / बिन्दु", en: "Circle or point" },
            { ne: "के हो", en: "What it is" },
          ],
          rows: [
            [
              { ne: "खगोलीय विषुवत् रेखा", en: "Celestial equator" },
              { ne: "पृथ्वीको विषुवत् रेखा आकाशमा प्रक्षेपित।", en: "Earth's equator projected onto the sky." },
            ],
            [
              { ne: "क्रान्तिवृत्त", en: "ecliptic" },
              { ne: "सूर्यको वार्षिक मार्ग — विषुवत् रेखासँग २३.४४° ढल्केको।", en: "The Sun's annual path, tilted 23.44° to the equator." },
            ],
            [
              { ne: "आकाशीय ध्रुव", en: "Celestial poles" },
              { ne: "पृथ्वीको अक्ष सोझै पुग्ने दुई बिन्दु।", en: "The two points Earth's axis aims at." },
            ],
            [
              { ne: "क्षितिज", en: "Horizon" },
              { ne: "अवलोकनकर्ताको स्थानले तय गर्ने रेखा — स्थानसापेक्ष।", en: "Set by the observer's location — the one local circle." },
            ],
            [
              { ne: "याम्योत्तर", en: "Meridian" },
              { ne: "उत्तर, शिरोबिन्दु र दक्षिण जोड्ने वृत्त।", en: "The circle through north, the zenith and south." },
            ],
            [
              { ne: "शिरोबिन्दु", en: "zenith" },
              { ne: "अवलोकनकर्ताको ठीक माथिको बिन्दु।", en: "The point directly overhead." },
            ],
          ],
        },
        {
          kind: "diagram",
          id: "ecliptic-belt",
        },
      ],
    },
    {
      title: { ne: "किन आजसम्म प्रयोगमा छ", en: "Why it is still in use" },
      eyebrow: "Not obsolete",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "खगोलीय गोला “पुरानो” अवधारणा होइन — आधुनिक खगोलशास्त्रले पनि यही प्रयोग गर्छ, किनभने दूरबीन ताकाउन दूरी होइन **दिशा** चाहिन्छ।",
            en: "The celestial sphere is not an obsolete idea — modern astronomy uses it too, because pointing a telescope needs **direction**, not distance.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "सूचीहरूले पिण्डको स्थान गोलाकार समन्वयमै दिन्छन् — विषुवांश र क्रान्ति, वा देशान्तर र शर। दूरी छुट्टै जानकारी हो, स्थानको अंश होइन।",
            en: "Catalogues still give positions in spherical coordinates — right ascension and declination, or longitude and latitude. Distance is separate information, not part of the position.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "पञ्चाङ्गका सबै परिमाण — राशि, नक्षत्र, तिथि, लग्न — यही गोलामाथिका **कोण** हुन्। त्यसैले पञ्चाङ्ग बुझ्नु भनेको यो गोला बुझ्नु हो।",
            en: "Every panchanga quantity — rashi, nakshatra, tithi, lagna — is an **angle on this sphere**. To understand the panchanga is to understand the sphere.",
          },
        },
      ],
    },
  ],
};
