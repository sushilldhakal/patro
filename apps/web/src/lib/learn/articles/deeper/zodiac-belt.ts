import type { ArticleData } from "../../article-schema";

export const zodiacBelt: ArticleData = {
  slug: "zodiac-belt",
  seeAlso: ["ecliptic", "rashi", "how-we-calculate"],
  sections: [
    {
      title: { ne: "राशि पट्टी — ग्रह हिँड्ने बाटो", en: "The zodiac belt — the lane the planets keep to" },
      eyebrow: "About 9° either side",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*राशि पट्टी* क्रान्तिवृत्तको दुवैतिर फैलिएको आकाशको एउटा पट्टी हो। सूर्य, चन्द्र र सबै परम्परागत ग्रह यसैभित्र रहन्छन्।",
            en: "The *zodiac belt* is a band of sky either side of the ecliptic within which the Sun, the Moon and all the traditional grahas remain.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पट्टीको चौडाइ चन्द्र र ग्रहको अधिकतम विचलनले तय गर्छ — प्रायः `८°`–`९°` दुवैतिर मानिन्छ।",
            en: "Its width is set by the greatest deviation of the Moon and planets — usually taken as `8°`–`9°` on each side.",
          },
        },
        {
          kind: "diagram",
          id: "zodiac-belt-width",
        },
        {
          kind: "diagram",
          id: "ecliptic-belt",
        },
      ],
    },
    {
      title: { ne: "दुई नाप — देशान्तर र शर", en: "Two measurements — longitude and latitude" },
      eyebrow: "Along and across",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पट्टीभित्र कुनै पिण्डको स्थान दुई सङ्ख्याले पूर्ण हुन्छ — पट्टीको **लम्बाइमा** कति, र क्रान्तिवृत्तबाट **कति टाढा**।",
            en: "A body's place within the belt takes two numbers — how far **along** it lies, and how far **off** the ecliptic.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "देशान्तर", en: "Longitude" },
              p: {
                ne: "पट्टीको लम्बाइमा `०°`–`३६०°`। राशि, नक्षत्र, तिथि — सबै यसैबाट।",
                en: "`0°`–`360°` along the belt. Rashi, nakshatra and tithi all come from this.",
              },
            },
            {
              h: { ne: "शर", en: "Celestial latitude" },
              p: {
                ne: "क्रान्तिवृत्तबाट उत्तर वा दक्षिण। **पञ्चाङ्गमा प्रायः बेवास्ता गरिन्छ** — तर ग्रहणका लागि निर्णायक।",
                en: "North or south of the ecliptic. **Usually ignored in the panchanga** — but decisive for eclipses.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "तिथि गणना गर्दा चन्द्रको शर बेवास्ता गरिन्छ — केवल देशान्तर लिइन्छ। यो जायज सरलीकरण हो, किनभने तिथि क्रान्तिवृत्तमा प्रक्षेपित कोणान्तरले परिभाषित छ।",
            en: "Computing a tithi ignores the Moon's latitude and uses longitude alone. That is a legitimate simplification, since a tithi is defined by the separation projected onto the ecliptic.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "तर **ग्रहण**का लागि शर नै सबथोक हो — चन्द्र क्रान्तिवृत्तबाट कति टाढा छ भन्नेले ग्रहण लाग्छ कि लाग्दैन तय गर्छ।",
            en: "For an **eclipse**, though, latitude is everything — how far the Moon sits from the ecliptic decides whether one happens at all.",
          },
        },
      ],
    },
    {
      title: { ne: "पट्टीबाहिरका पिण्ड", en: "Bodies outside the belt" },
      eyebrow: "Why they are not grahas",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "परम्परागत ज्योतिषका नौ ग्रह — सूर्य, चन्द्र, मंगल, बुध, बृहस्पति, शुक्र, शनि, राहु, केतु — सबै राशि पट्टीभित्रै रहन्छन्।",
            en: "The nine traditional grahas — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rāhu and Ketu — all stay inside the belt.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यो संयोग होइन। यी सबै पृथ्वीको कक्षीय तलको नजिकै घुम्छन् (वा राहु–केतुको हकमा त्यही तलसँग सम्बन्धित बिन्दु हुन्)। सौर्यमण्डलको समतलपन नै यसको कारण हो।",
            en: "That is not coincidence. All of them move close to the plane of Earth's orbit — or, for Rāhu and Ketu, are points defined against it. The flatness of the solar system is the reason.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "आधुनिक कालमा पत्ता लागेका युरेनस, नेप्च्युन र प्लुटो पनि यही पट्टीको नजिकै हुन्छन् (प्लुटो केही बाहिर पनि जान्छ)। तर परम्परागत नौ ग्रहको सूचीमा तिनी समावेश छैनन्, किनभने खुला आँखाले देखिँदैनन्।",
            en: "The modern discoveries — Uranus, Neptune and Pluto — also stay near the belt, though Pluto sometimes strays beyond it. They are absent from the traditional nine simply because they cannot be seen with the naked eye.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "अर्थात् “नौ ग्रह” को सूची **खुला आँखाले देखिने, राशि पट्टीभित्र हिँड्ने पिण्डहरूको सूची** हो — त्यो युगको अवलोकन क्षमताको इमानदार प्रतिबिम्ब।",
            en: "The list of nine is therefore **a list of naked-eye bodies that travel within the zodiac belt** — an honest reflection of what that era could observe.",
          },
        },
      ],
    },
  ],
};
