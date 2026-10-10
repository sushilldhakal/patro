import type { ArticleData } from "../../article-schema";

export const precession: ArticleData = {
  slug: "precession",
  seeAlso: ["ayanamsha", "pole-star-changes", "sidereal-vs-tropical", "ritu-drift"],
  sections: [
    {
      title: { ne: "पृथ्वी लट्टुझैँ डग्मगाउँछ", en: "Earth wobbles like a spinning top" },
      eyebrow: "26,000 years",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "घुम्दै गरेको लट्टु ढल्किएपछि यसको अक्ष आफैँ बिस्तारै शङ्कु बनाउँदै घुम्छ। पृथ्वीको अक्षले पनि ठ्याक्कै त्यही गर्छ — तर एक फेरो पूरा गर्न `~२५,८००` वर्ष लाग्छ।",
            en: "A leaning spinning top has its own axis swing slowly round in a cone. Earth's axis does exactly the same — but takes `~25,800` years for one turn.",
          },
        },
        {
          kind: "diagram",
          id: "precession-cone",
          caption: {
            ne: "पृथ्वीको अक्षले आकाशमा बनाउने शङ्कु — २३.४४° अर्धकोणको वृत्त।",
            en: "The cone Earth's axis traces on the sky — a circle of 23.44° half-angle.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "कारण — पृथ्वी पूर्ण गोलो छैन, विषुवत् रेखातिर केही फुलेको छ। सूर्य र चन्द्रले त्यो फुलेको भागमा **ज्वारीय बल** लगाउँछन्, र घुम्दै गरेको पिण्डमा त्यो बलले अक्षलाई घुमाइदिन्छ।",
            en: "The cause is that Earth is not a perfect sphere but bulges at the equator. The Sun and Moon pull on that bulge, and on a spinning body such a **tidal torque** makes the axis swing.",
          },
        },
      ],
    },
    {
      title: { ne: "यसले के–के सार्छ", en: "What it moves" },
      eyebrow: "Everything referenced to the equinox",
      blocks: [
        {
          kind: "formula",
          cards: [
            {
              big: "50.3″",
              unit: { ne: "/ वर्ष", en: "/ year" },
              label: { ne: "विषुवको सरण", en: "Shift of the equinox" },
              desc: { ne: "प्रति वर्ष यति विकला — देखिनसक्नु सानो।", en: "Arc-seconds a year — imperceptible in a lifetime." },
            },
            {
              big: "1°",
              unit: { ne: "/ ७२ वर्ष", en: "/ 72 years" },
              label: { ne: "एक अंश", en: "One degree" },
              desc: { ne: "मानव जीवनकालमा झन्डै एक अंश।", en: "About a degree in a human lifetime." },
            },
            {
              big: "30°",
              unit: { ne: "/ २,१६० वर्ष", en: "/ 2,160 years" },
              label: { ne: "एक राशि", en: "One full sign" },
              desc: { ne: "यही अवधिलाई पश्चिमी परम्परामा “युग” भनिन्छ।", en: "The span the Western tradition calls an \"age\"." },
            },
          ],
        },
        {
          kind: "list",
          items: [
            {
              ne: "**विषुव बिन्दु** तारापुञ्जको सापेक्ष उल्टो दिशामा सर्छ — त्यसैले सायन र निरयन राशिचक्र छुट्टिन्छन्।",
              en: "**The equinox point** slides backwards against the constellations — which is what separates the tropical and sidereal zodiacs.",
            },
            {
              ne: "**ध्रुव तारा** बदलिन्छ — उत्तर आकाशीय ध्रुवले शताब्दीयौँमा फरक तारा देखाउँछ।",
              en: "**The pole star** changes — the north celestial pole points at different stars over the centuries.",
            },
            {
              ne: "**ऋतु र निरयन महिना** बिस्तारै छुट्टिन्छन् — हरेक `७२` वर्षमा झन्डै एक दिन।",
              en: "**Seasons and sidereal months** drift apart — roughly a day every `72` years.",
            },
          ],
        },
        {
          kind: "diagram",
          id: "precession-sky",
        },
      ],
    },
    {
      title: { ne: "प्राचीन ज्योतिषीलाई थाहा थियो", en: "The ancients knew" },
      eyebrow: "Hipparchus, and the siddhantas",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अयन चलन आधुनिक खोज होइन। ग्रीक ज्योतिषी हिपार्कसले ई.पू. `१२७` तिर पुराना अभिलेखसँग आफ्नो नाप तुलना गरेर यो पत्ता लगाएका थिए।",
            en: "Precession is no modern discovery. The Greek astronomer Hipparchus detected it around `127` BCE by comparing his measurements with older records.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "वैदिक सिद्धान्त ग्रन्थहरूले पनि यसलाई चिनेका थिए र *अयन चलन* भनेका थिए। केहीले यसलाई पूर्ण घुर्णन नभई एउटा सीमित दोलन (trepidation) मानेका थिए — त्यो अंश आधुनिक अवलोकनले सच्याइसकेको छ।",
            en: "The Vedic siddhantas recognised it too and named it *ayana calana*. Some treated it as a bounded oscillation — a trepidation — rather than a full circuit, a detail modern observation has since corrected.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "आजको पञ्चाङ्ग गणनामा अयन चलनको प्रभाव ~अयनांश~ मार्फत समावेश गरिन्छ — सायन देशान्तरबाट अयनांश घटाएर निरयन देशान्तर निकालिन्छ।",
            en: "In today's panchanga computation precession enters through the ~ayanamsha~ — subtract it from a tropical longitude to obtain the sidereal one.",
          },
        },
      ],
    },
  ],
};
